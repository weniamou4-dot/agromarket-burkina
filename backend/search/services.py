from __future__ import annotations

import math
import unicodedata
from typing import Optional

from rapidfuzz import fuzz, process
from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session, joinedload

from models import (
    Annonce,
    Categorie,
    Famille,
    Produit,
)


# ============================================================
# EXCEPTIONS
# ============================================================

class SearchServiceError(Exception):
    """Erreur générale du moteur de recherche."""


class SearchValidationError(SearchServiceError):
    """Erreur de validation des critères de recherche."""


# ============================================================
# CONSTANTES
# ============================================================

STATUT_PUBLIEE = "publiee"

TYPES_PRODUIT_AUTORISES = {
    "brut",
    "transforme",
}

MAX_LIMIT = 100

FUZZY_SCORE_MINIMUM = 60

FUZZY_MAX_CANDIDATS = 1000

FUZZY_MAX_RESULTATS = 10


# ============================================================
# NORMALISATION
# ============================================================

def normaliser_texte(
    texte: Optional[str],
) -> Optional[str]:
    """
    Nettoie et normalise un texte :

    - suppression des espaces inutiles ;
    - suppression des accents pour la recherche ;
    - conversion en minuscules.
    """

    if texte is None:
        return None

    texte = texte.strip()

    if not texte:
        return None

    texte = unicodedata.normalize(
        "NFKD",
        texte,
    )

    texte = "".join(
        caractere
        for caractere in texte
        if not unicodedata.combining(caractere)
    )

    texte = " ".join(
        texte.split()
    )

    return texte.lower()


# ============================================================
# VALIDATION
# ============================================================

def valider_parametres(
    prix_min: float | None,
    prix_max: float | None,
    page: int,
    limit: int,
    type_produit: str | None,
) -> None:

    if prix_min is not None and prix_min < 0:
        raise SearchValidationError(
            "Le prix minimum ne peut pas être négatif."
        )

    if prix_max is not None and prix_max < 0:
        raise SearchValidationError(
            "Le prix maximum ne peut pas être négatif."
        )

    if (
        prix_min is not None
        and prix_max is not None
        and prix_min > prix_max
    ):
        raise SearchValidationError(
            "Le prix minimum ne peut pas être supérieur au prix maximum."
        )

    if page < 1:
        raise SearchValidationError(
            "Le numéro de page doit être supérieur ou égal à 1."
        )

    if limit < 1 or limit > MAX_LIMIT:
        raise SearchValidationError(
            f"La limite doit être comprise entre 1 et {MAX_LIMIT}."
        )

    if (
        type_produit is not None
        and type_produit not in TYPES_PRODUIT_AUTORISES
    ):
        raise SearchValidationError(
            "Type de produit invalide. "
            "Utilisez 'brut' ou 'transforme'."
        )


# ============================================================
# QUERY DE BASE
# ============================================================

def construire_query_base(
    db: Session,
):
    """
    Construit la requête publique de base.

    Une annonce est publique seulement si :
    - son statut est 'publiee' ;
    - son produit existe ;
    - son produit est validé.
    """

    return (
        db.query(Annonce)
        .join(
            Produit,
            Annonce.produit_id == Produit.id,
        )
        .join(
            Categorie,
            Produit.categorie_id == Categorie.id,
        )
        .join(
            Famille,
            Categorie.famille_id == Famille.id,
        )
        .options(
            joinedload(Annonce.produit),
            joinedload(Annonce.vendeur),
            joinedload(Annonce.images),
        )
        .filter(
            Annonce.statut == STATUT_PUBLIEE,
            Produit.est_valide.is_(True),
        )
    )


# ============================================================
# AJOUT DES FILTRES
# ============================================================

def appliquer_filtres(
    query,
    *,
    produit: str | None = None,
    produit_id: int | None = None,
    famille_id: int | None = None,
    categorie_id: int | None = None,
    type_produit: str | None = None,
    region: str | None = None,
    province: str | None = None,
    commune: str | None = None,
    prix_min: float | None = None,
    prix_max: float | None = None,
):
    """
    Ajoute tous les filtres métier à la requête.
    """

    produit = normaliser_texte(produit)
    region = normaliser_texte(region)
    province = normaliser_texte(province)
    commune = normaliser_texte(commune)

    # --------------------------------------------------------
    # PRODUIT ID
    # --------------------------------------------------------

    if produit_id is not None:
        query = query.filter(
            Annonce.produit_id == produit_id
        )

    # --------------------------------------------------------
    # NOM DU PRODUIT
    # --------------------------------------------------------

    if produit:
        motif = f"%{produit}%"

        query = query.filter(
            or_(
                Produit.nom.ilike(motif),
                Produit.description.ilike(motif),
                Categorie.nom.ilike(motif),
                Famille.nom.ilike(motif),
            )
        )

    # --------------------------------------------------------
    # FAMILLE
    # --------------------------------------------------------

    if famille_id is not None:
        query = query.filter(
            Categorie.famille_id == famille_id
        )

    # --------------------------------------------------------
    # CATÉGORIE
    # --------------------------------------------------------

    if categorie_id is not None:
        query = query.filter(
            Produit.categorie_id == categorie_id
        )

    # --------------------------------------------------------
    # TYPE
    # --------------------------------------------------------

    if type_produit:
        query = query.filter(
            Produit.type_produit == type_produit
        )

    # --------------------------------------------------------
    # RÉGION
    # --------------------------------------------------------

    if region:
        query = query.filter(
            Annonce.region.ilike(
                f"%{region}%"
            )
        )

    # --------------------------------------------------------
    # PROVINCE
    # --------------------------------------------------------

    if province:
        query = query.filter(
            Annonce.province.ilike(
                f"%{province}%"
            )
        )

    # --------------------------------------------------------
    # COMMUNE
    # --------------------------------------------------------

    if commune:
        query = query.filter(
            Annonce.commune.ilike(
                f"%{commune}%"
            )
        )

    # --------------------------------------------------------
    # PRIX MINIMUM
    # --------------------------------------------------------

    if prix_min is not None:
        query = query.filter(
            Annonce.prix >= prix_min
        )

    # --------------------------------------------------------
    # PRIX MAXIMUM
    # --------------------------------------------------------

    if prix_max is not None:
        query = query.filter(
            Annonce.prix <= prix_max
        )

    return query


# ============================================================
# CLASSEMENT PAR PERTINENCE
# ============================================================

def appliquer_tri_pertinence(
    query,
    produit: str | None,
):
    """
    Classe les résultats selon la pertinence du nom du produit.

    Ordre :
    1. correspondance exacte ;
    2. commence par la recherche ;
    3. contient la recherche ;
    4. date de publication.
    """

    produit = normaliser_texte(produit)

    if not produit:
        return query.order_by(
            Annonce.date_publication.desc(),
            Annonce.id.desc(),
        )

    motif_exact = produit

    motif_debut = f"{produit}%"

    motif_contient = f"%{produit}%"

    score = case(
        (
            func.lower(
                Produit.nom
            ) == motif_exact,
            1,
        ),
        (
            func.lower(
                Produit.nom
            ).like(motif_debut),
            2,
        ),
        (
            func.lower(
                Produit.nom
            ).like(motif_contient),
            3,
        ),
        else_=4,
    )

    return query.order_by(
        score.asc(),
        Annonce.date_publication.desc(),
        Annonce.id.desc(),
    )


# ============================================================
# COMPTER LES RÉSULTATS
# ============================================================

def compter_resultats(
    query,
) -> int:

    return int(
        query.order_by(None)
        .with_entities(
            func.count(
                func.distinct(
                    Annonce.id
                )
            )
        )
        .scalar()
        or 0
    )


# ============================================================
# RECHERCHE FUZZY
# ============================================================

def trouver_produits_similaires(
    db: Session,
    recherche: str,
) -> list[int]:
    """
    Recherche tolérante aux fautes à l'aide de RapidFuzz.

    Exemple :
        "tomate"
        "tomates"
        "tommat"
        "tomatte"

    peuvent être rapprochés du nom réel.
    """

    recherche_normalisee = normaliser_texte(
        recherche
    )

    if not recherche_normalisee:
        return []

    produits = (
        db.query(
            Produit.id,
            Produit.nom,
        )
        .filter(
            Produit.est_valide.is_(True)
        )
        .limit(FUZZY_MAX_CANDIDATS)
        .all()
    )

    if not produits:
        return []

    choix = {
        produit.id: normaliser_texte(
            produit.nom
        ) or ""
        for produit in produits
    }

    resultats = process.extract(
        recherche_normalisee,
        choix,
        scorer=fuzz.WRatio,
        limit=FUZZY_MAX_RESULTATS,
        score_cutoff=FUZZY_SCORE_MINIMUM,
    )

    return [
        identifiant
        for _texte, score, identifiant in resultats
        if score >= FUZZY_SCORE_MINIMUM
    ]


# ============================================================
# RECHERCHE PRINCIPALE
# ============================================================

def rechercher_annonces(
    db: Session,
    *,
    produit: str | None = None,
    produit_id: int | None = None,
    famille_id: int | None = None,
    categorie_id: int | None = None,
    type_produit: str | None = None,
    region: str | None = None,
    province: str | None = None,
    commune: str | None = None,
    prix_min: float | None = None,
    prix_max: float | None = None,
    page: int = 1,
    limit: int = 20,
) -> dict:
    """
    Recherche professionnelle des annonces publiques.

    La recherche exacte est exécutée en base.
    Une recherche fuzzy est utilisée seulement si
    la recherche textuelle exacte ne donne aucun résultat.
    """

    valider_parametres(
        prix_min,
        prix_max,
        page,
        limit,
        type_produit,
    )

    query = construire_query_base(db)

    query = appliquer_filtres(
        query,
        produit=produit,
        produit_id=produit_id,
        famille_id=famille_id,
        categorie_id=categorie_id,
        type_produit=type_produit,
        region=region,
        province=province,
        commune=commune,
        prix_min=prix_min,
        prix_max=prix_max,
    )

    total = compter_resultats(query)

    # --------------------------------------------------------
    # FALLBACK FUZZY
    # --------------------------------------------------------

    if total == 0 and produit:
        ids_similaires = trouver_produits_similaires(
            db,
            produit,
        )

        if ids_similaires:

            query = construire_query_base(db)

            query = appliquer_filtres(
                query,
                produit_id=None,
                famille_id=famille_id,
                categorie_id=categorie_id,
                type_produit=type_produit,
                region=region,
                province=province,
                commune=commune,
                prix_min=prix_min,
                prix_max=prix_max,
            )

            query = query.filter(
                Annonce.produit_id.in_(
                    ids_similaires
                )
            )

            total = compter_resultats(
                query
            )

    # --------------------------------------------------------
    # TRI
    # --------------------------------------------------------

    query = appliquer_tri_pertinence(
        query,
        produit,
    )

    # --------------------------------------------------------
    # PAGINATION
    # --------------------------------------------------------

    offset = (
        page - 1
    ) * limit

    resultats = (
        query
        .offset(offset)
        .limit(limit)
        .all()
    )

    pages = (
        math.ceil(total / limit)
        if total
        else 1
    )

    return {
        "resultats": resultats,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
        "recherche": (
            normaliser_texte(produit)
        ),
    }


# ============================================================
# SUGGESTIONS
# ============================================================

def obtenir_suggestions(
    db: Session,
    recherche: str,
    limit: int = 10,
) -> list[dict]:
    """
    Retourne les produits correspondant
    à une saisie utilisateur.

    Utilise d'abord PostgreSQL,
    puis RapidFuzz si nécessaire.
    """

    recherche = normaliser_texte(
        recherche
    )

    if not recherche:
        return []

    if limit < 1:
        limit = 10

    if limit > 20:
        limit = 20

    motif = f"%{recherche}%"

    produits = (
        db.query(
            Produit.id,
            Produit.nom,
        )
        .filter(
            Produit.est_valide.is_(True),
            Produit.nom.ilike(motif),
        )
        .order_by(
            Produit.nom.asc()
        )
        .limit(limit)
        .all()
    )

    if produits:
        return [
            {
                "produit_id": produit.id,
                "nom": produit.nom,
            }
            for produit in produits
        ]

    ids_similaires = trouver_produits_similaires(
        db,
        recherche,
    )

    if not ids_similaires:
        return []

    produits = (
        db.query(
            Produit.id,
            Produit.nom,
        )
        .filter(
            Produit.id.in_(
                ids_similaires
            ),
            Produit.est_valide.is_(True),
        )
        .all()
    )

    resultat = [
        {
            "produit_id": produit.id,
            "nom": produit.nom,
        }
        for produit in produits
    ]

    return resultat[:limit]