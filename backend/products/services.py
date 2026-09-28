# ============================================================
# AGROMARKET BURKINA
# PRODUCTS / SERVICES
# Version professionnelle complète et sécurisée
#
# Responsabilités :
# - gestion des produits
# - gestion des annonces
# - géolocalisation
# - protection des localisations privées
# - recherche exacte
# - recherche floue RapidFuzz
# - correction de recherche
# - préparation pour AI
# - modération
# - historique de modération
# - notifications métier
# - gestion des doublons
# - gestion des images
# - gestion secteur / type de produit
# - recherche par proximité
# - préparation itinéraire sécurisé
#
# IMPORTANT :
# - aucune route FastAPI ici
# - aucun Depends() ici
# - aucun APIRouter() ici
# - les commits sont laissés aux routes
#   pour permettre des transactions propres
# ============================================================

from __future__ import annotations

import math
import re
import unicodedata

from pathlib import Path
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from rapidfuzz import fuzz, process

from models import (
    Annonce,
    Categorie,
    HistoriqueModeration,
    ImageAnnonce,
    Notification,
    Produit,
    Utilisateur,
)

from products.schemas import (
    AnnonceCreate,
    AnnonceUpdate,
    LocalisationSource,
    ProduitCreate,
    ProduitUpdate,
    SecteurProduit,
    TypeLocalisation,
    TypeProduit,
    VisibiliteLocalisation,
)


# ============================================================
# EXCEPTIONS MÉTIER
# ============================================================


class ProductServiceError(Exception):
    """
    Erreur générale du module Produits.
    """


class ProductNotFoundError(ProductServiceError):
    """
    Produit introuvable.
    """


class AnnouncementNotFoundError(ProductServiceError):
    """
    Annonce introuvable.
    """


class CategoryNotFoundError(ProductServiceError):
    """
    Catégorie introuvable.
    """


class ProductAlreadyExistsError(ProductServiceError):
    """
    Produit déjà existant.
    """


class AnnouncementAlreadyProcessedError(ProductServiceError):
    """
    Annonce déjà traitée.
    """


class ProductValidationError(ProductServiceError):
    """
    Données métier invalides.
    """


class ProductPermissionError(ProductServiceError):
    """
    Opération non autorisée.
    """


# ============================================================
# CONSTANTES
# ============================================================


STATUT_ANNONCE_EN_ATTENTE = "en_attente"
STATUT_ANNONCE_PUBLIEE = "publiee"
STATUT_ANNONCE_REFUSEE = "refusee"


STATUTS_ANNONCE_VALIDES = {
    STATUT_ANNONCE_EN_ATTENTE,
    STATUT_ANNONCE_PUBLIEE,
    STATUT_ANNONCE_REFUSEE,
}


# ============================================================
# TYPES DE PRODUITS
# ============================================================


TYPE_BRUT = "brut"
TYPE_TRANSFORME = "transforme"


TYPES_PRODUIT_VALIDES = {
    TYPE_BRUT,
    TYPE_TRANSFORME,
}


# ============================================================
# SECTEURS DE PRODUITS
# ============================================================

# IMPORTANT :
#
# "agricole" correspond à la valeur utilisée
# dans le modèle SQLAlchemy et dans PostgreSQL.
#
# Ne pas remplacer par "produit_agricole"
# sans migration complète de la base.


SECTEUR_AGRICOLE = "agricole"
SECTEUR_ELEVAGE = "elevage"
SECTEUR_MATERIEL_AGRICOLE = "materiel_agricole"
SECTEUR_ENGRAIS = "engrais"
SECTEUR_PHYTOSANITAIRE = "phytosanitaire"


SECTEURS_AVEC_TYPE = {
    SECTEUR_AGRICOLE,
    SECTEUR_ELEVAGE,
}


SECTEURS_SANS_TYPE = {
    SECTEUR_MATERIEL_AGRICOLE,
    SECTEUR_ENGRAIS,
    SECTEUR_PHYTOSANITAIRE,
}


SECTEURS_PRODUIT_VALIDES = (
    SECTEURS_AVEC_TYPE
    | SECTEURS_SANS_TYPE
)


# ============================================================
# LOCALISATION
# ============================================================


SOURCE_GPS = "gps"
SOURCE_MANUELLE = "manuelle"
SOURCE_INCONNUE = "inconnue"


SOURCES_LOCALISATION_VALIDES = {
    SOURCE_GPS,
    SOURCE_MANUELLE,
    SOURCE_INCONNUE,
}


TYPE_LOCALISATION_DOMICILE = "domicile"
TYPE_LOCALISATION_POINT_DE_VENTE = "point_vente"
TYPE_LOCALISATION_POINT_DE_RENCONTRE = "point_rencontre"


TYPES_LOCALISATION_VALIDES = {
    TYPE_LOCALISATION_DOMICILE,
    TYPE_LOCALISATION_POINT_DE_VENTE,
    TYPE_LOCALISATION_POINT_DE_RENCONTRE,
}


VISIBILITE_PRIVEE = "privee"
VISIBILITE_PUBLIQUE = "publique"


VISIBILITES_LOCALISATION_VALIDES = {
    VISIBILITE_PRIVEE,
    VISIBILITE_PUBLIQUE,
}


# ============================================================
# RÔLES
# ============================================================


ROLE_ADMIN = {
    "admin",
    "administrateur",
}


ROLE_MODERATION = {
    "moderateur",
    "admin",
    "administrateur",
}


# ============================================================
# NOTIFICATIONS
# ============================================================


TYPE_NOTIFICATION_ANNONCE_SOUMISE = (
    "annonce_soumise"
)


TYPE_NOTIFICATION_ANNONCE_APPROUVEE = (
    "annonce_approuvee"
)


TYPE_NOTIFICATION_ANNONCE_REFUSEE = (
    "annonce_refusee"
)


TYPE_NOTIFICATION_ANNONCE_REMISE = (
    "annonce_remise_en_moderation"
)


TYPE_NOTIFICATION_ANNONCE_MODERATION = (
    "annonce_soumise"
)


# ============================================================
# HISTORIQUE MODÉRATION
# ============================================================


ACTION_HISTORIQUE_SOUMISE = "soumise"


ACTION_HISTORIQUE_APPROUVEE = (
    "approuvee"
)


ACTION_HISTORIQUE_REFUSEE = (
    "refusee"
)


ACTION_HISTORIQUE_REMISE = (
    "remise_en_moderation"
)


# ============================================================
# RAPIDFUZZ
# ============================================================


SEUIL_CORRECTION_RAPIDFUZZ = 70


MAX_CANDIDATS_FUZZY = 200


# ============================================================
# NORMALISATION TEXTE
# ============================================================


def nettoyer_texte(
    valeur: str | None,
) -> str | None:
    """
    Nettoie un texte.

    - supprime les espaces au début et à la fin ;
    - retourne None si le texte est vide.
    """

    if valeur is None:
        return None

    valeur = valeur.strip()

    return valeur if valeur else None


def normaliser_recherche(
    valeur: str | None,
) -> str:
    """
    Normalise une recherche pour les comparaisons
    intelligentes.

    Exemple :

        "  Maïs   Jaune "
            ↓
        "mais jaune"
    """

    if not valeur:
        return ""

    valeur = valeur.strip().lower()

    valeur = unicodedata.normalize(
        "NFKD",
        valeur,
    )

    valeur = "".join(
        caractere
        for caractere in valeur
        if not unicodedata.combining(
            caractere
        )
    )

    valeur = re.sub(
        r"[^a-z0-9]+",
        " ",
        valeur,
    )

    valeur = re.sub(
        r"\s+",
        " ",
        valeur,
    )

    return valeur.strip()


# ============================================================
# NORMALISATION ENUM
# ============================================================


def valeur_enum(
    valeur: Any,
) -> str | None:
    """
    Convertit un Enum ou une chaîne en chaîne.
    """

    if valeur is None:
        return None

    if hasattr(
        valeur,
        "value",
    ):
        return str(
            valeur.value
        )

    return str(
        valeur
    )


# ============================================================
# VALIDATION SECTEUR / TYPE
# ============================================================


def valider_secteur_type(
    secteur: Any,
    type_produit: Any = None,
) -> tuple[str, str | None]:
    """
    Vérifie la cohérence entre le secteur
    et le type de produit.

    Agriculture
        -> brut ou transforme

    Élevage
        -> brut ou transforme

    Matériel agricole
        -> aucun type

    Engrais
        -> aucun type

    Phytosanitaire
        -> aucun type
    """

    secteur_valeur = valeur_enum(
        secteur
    )

    if (
        secteur_valeur
        not in SECTEURS_PRODUIT_VALIDES
    ):
        raise ProductValidationError(
            "Secteur de produit invalide."
        )

    type_valeur = valeur_enum(
        type_produit
    )

    # --------------------------------------------------------
    # AGRICULTURE / ÉLEVAGE
    # --------------------------------------------------------

    if (
        secteur_valeur
        in SECTEURS_AVEC_TYPE
    ):

        if (
            type_valeur
            not in TYPES_PRODUIT_VALIDES
        ):
            raise ProductValidationError(
                "Les secteurs agricole et élevage "
                "doivent avoir un type : brut ou transforme."
            )

        return (
            secteur_valeur,
            type_valeur,
        )

    # --------------------------------------------------------
    # MATÉRIEL / ENGRAIS / PHYTOSANITAIRE
    # --------------------------------------------------------

    if type_valeur is not None:

        raise ProductValidationError(
            "Les secteurs matériel agricole, engrais "
            "et phytosanitaire ne peuvent pas avoir "
            "de type brut ou transforme."
        )

    return (
        secteur_valeur,
        None,
    )


# ============================================================
# VALIDATION GÉOLOCALISATION
# ============================================================


def valider_geolocalisation(
    latitude: float | None,
    longitude: float | None,
    source: Any = None,
) -> tuple[
    float | None,
    float | None,
    str,
]:
    """
    Valide latitude, longitude et source.

    Règles :

    - aucun point -> source inconnue ;
    - latitude et longitude obligatoires ensemble ;
    - coordonnées présentes -> source GPS ou manuelle ;
    - source inconnue avec coordonnées ->
      localisation considérée comme manuelle.
    """

    source_valeur = (
        valeur_enum(source)
        or SOURCE_INCONNUE
    )

    if (
        source_valeur
        not in SOURCES_LOCALISATION_VALIDES
    ):
        raise ProductValidationError(
            "Source de localisation invalide."
        )

    # --------------------------------------------------------
    # Aucune coordonnée
    # --------------------------------------------------------

    if (
        latitude is None
        and longitude is None
    ):
        return (
            None,
            None,
            SOURCE_INCONNUE,
        )

    # --------------------------------------------------------
    # Une seule coordonnée
    # --------------------------------------------------------

    if (
        latitude is None
        or longitude is None
    ):
        raise ProductValidationError(
            "La latitude et la longitude "
            "doivent être fournies ensemble."
        )

    # --------------------------------------------------------
    # Conversion numérique
    # --------------------------------------------------------

    try:

        latitude = float(
            latitude
        )

        longitude = float(
            longitude
        )

    except (
        TypeError,
        ValueError,
    ):

        raise ProductValidationError(
            "Les coordonnées géographiques "
            "doivent être numériques."
        )

    # --------------------------------------------------------
    # Limites géographiques
    # --------------------------------------------------------

    if not -90 <= latitude <= 90:

        raise ProductValidationError(
            "La latitude doit être comprise "
            "entre -90 et 90."
        )

    if not -180 <= longitude <= 180:

        raise ProductValidationError(
            "La longitude doit être comprise "
            "entre -180 et 180."
        )

    # --------------------------------------------------------
    # Source
    # --------------------------------------------------------

    if (
        source_valeur
        == SOURCE_INCONNUE
    ):
        source_valeur = (
            SOURCE_MANUELLE
        )

    return (
        latitude,
        longitude,
        source_valeur,
    )


# ============================================================
# VALIDATION LOCALISATION MÉTIER
# ============================================================


def valider_localisation(
    latitude: float | None,
    longitude: float | None,
    source: Any,
    type_localisation: Any,
    visibilite_localisation: Any,
) -> tuple[
    float | None,
    float | None,
    str,
    str,
    str,
]:
    """
    Validation complète de la localisation d'une annonce.

    Règles de sécurité :

    1. latitude et longitude doivent être cohérentes ;
    2. une localisation publique doit disposer
       de coordonnées ;
    3. un domicile ne peut jamais être public ;
    4. une localisation privée peut ne pas avoir
       de coordonnées publiques ;
    5. les coordonnées sont conservées côté serveur
       mais leur exposition dépend de la visibilité.
    """

    type_valeur = (
        valeur_enum(
            type_localisation
        )
        or TYPE_LOCALISATION_DOMICILE
    )

    visibilite_valeur = (
        valeur_enum(
            visibilite_localisation
        )
        or VISIBILITE_PRIVEE
    )

    # --------------------------------------------------------
    # Type
    # --------------------------------------------------------

    if (
        type_valeur
        not in TYPES_LOCALISATION_VALIDES
    ):
        raise ProductValidationError(
            "Type de localisation invalide."
        )

    # --------------------------------------------------------
    # Visibilité
    # --------------------------------------------------------

    if (
        visibilite_valeur
        not in VISIBILITES_LOCALISATION_VALIDES
    ):
        raise ProductValidationError(
            "Visibilité de localisation invalide."
        )

    # --------------------------------------------------------
    # Coordonnées
    # --------------------------------------------------------

    (
        latitude,
        longitude,
        source_valeur,
    ) = valider_geolocalisation(
        latitude,
        longitude,
        source,
    )

    # --------------------------------------------------------
    # Localisation publique
    # --------------------------------------------------------

    if (
        visibilite_valeur
        == VISIBILITE_PUBLIQUE
    ):

        if (
            latitude is None
            or longitude is None
        ):
            raise ProductValidationError(
                "Une localisation publique "
                "doit disposer de coordonnées GPS."
            )

    # --------------------------------------------------------
    # DOMICILE
    # --------------------------------------------------------

    if (
        type_valeur
        == TYPE_LOCALISATION_DOMICILE
        and
        visibilite_valeur
        == VISIBILITE_PUBLIQUE
    ):

        raise ProductValidationError(
            "La localisation du domicile "
            "ne peut jamais être publique."
        )

    return (
        latitude,
        longitude,
        source_valeur,
        type_valeur,
        visibilite_valeur,
    )


# ============================================================
# VÉRIFIER SI UNE LOCALISATION PEUT ÊTRE UTILISÉE
# POUR UN ITINÉRAIRE PUBLIC
# ============================================================


def localisation_itineraire_autorisee(
    annonce: Annonce,
) -> bool:
    """
    Vérifie si les coordonnées exactes d'une annonce
    peuvent être utilisées pour un itinéraire public.

    Sécurité :

    - visibilité publique obligatoire ;
    - coordonnées obligatoires ;
    - le domicile est toujours interdit ;
    - une localisation approximative n'est pas suffisante
      pour un itinéraire exact.
    """

    type_localisation = valeur_enum(
        getattr(
            annonce,
            "type_localisation",
            None,
        )
    )

    visibilite = valeur_enum(
        getattr(
            annonce,
            "visibilite_localisation",
            None,
        )
    )

    latitude = getattr(
        annonce,
        "latitude",
        None,
    )

    longitude = getattr(
        annonce,
        "longitude",
        None,
    )

    if (
        type_localisation
        == TYPE_LOCALISATION_DOMICILE
    ):
        return False

    if (
        visibilite
        != VISIBILITE_PUBLIQUE
    ):
        return False

    if (
        latitude is None
        or longitude is None
    ):
        return False

    return True


# ============================================================
# OBTENIR COORDONNÉES POUR ITINÉRAIRE
# ============================================================


def obtenir_coordonnees_itineraire(
    db: Session,
    annonce_id: int,
) -> dict[str, Any]:
    """
    Retourne les coordonnées uniquement lorsqu'un
    itinéraire public est autorisé.

    Cette fonction ne doit être appelée par une route
    publique qu'après application de cette règle métier.
    """

    annonce = obtenir_annonce_public(
        db,
        annonce_id,
    )

    if not localisation_itineraire_autorisee(
        annonce
    ):
        raise ProductPermissionError(
            "L'itinéraire vers cette localisation "
            "n'est pas disponible publiquement."
        )

    return {
        "latitude": float(
            annonce.latitude
        ),
        "longitude": float(
            annonce.longitude
        ),
        "type_localisation": (
            valeur_enum(
                annonce.type_localisation
            )
        ),
        "message": (
            "Itinéraire disponible vers "
            "le point de localisation public."
        ),
    }


# ============================================================
# CALCUL DISTANCE HAVERSINE
# ============================================================


def calculer_distance_km(
    latitude1: float,
    longitude1: float,
    latitude2: float,
    longitude2: float,
) -> float:
    """
    Calcule la distance entre deux points
    géographiques avec la formule de Haversine.

    Retour en kilomètres.
    """

    rayon_terre_km = 6371.0

    lat1 = math.radians(
        latitude1
    )

    lat2 = math.radians(
        latitude2
    )

    delta_lat = math.radians(
        latitude2 - latitude1
    )

    delta_lon = math.radians(
        longitude2 - longitude1
    )

    valeur = (
        math.sin(
            delta_lat / 2
        ) ** 2
        +
        math.cos(lat1)
        *
        math.cos(lat2)
        *
        math.sin(
            delta_lon / 2
        ) ** 2
    )

    valeur = min(
        1.0,
        max(
            0.0,
            valeur,
        ),
    )

    distance = (
        2
        *
        rayon_terre_km
        *
        math.asin(
            math.sqrt(
                valeur
            )
        )
    )

    return round(
        distance,
        3,
    )


# ============================================================
# OBTENIR CATÉGORIE
# ============================================================


def obtenir_categorie(
    db: Session,
    categorie_id: int,
) -> Categorie:
    """
    Récupère une catégorie.
    """

    categorie = (
        db.query(
            Categorie
        )
        .filter(
            Categorie.id
            == categorie_id
        )
        .first()
    )

    if categorie is None:

        raise CategoryNotFoundError(
            "Catégorie introuvable."
        )

    return categorie


# ============================================================
# OBTENIR PRODUIT
# ============================================================


def obtenir_produit(
    db: Session,
    produit_id: int,
    charger_categorie: bool = True,
) -> Produit:
    """
    Récupère un produit.
    """

    query = db.query(
        Produit
    )

    if charger_categorie:

        query = query.options(
            selectinload(
                Produit.categorie
            )
        )

    produit = (
        query
        .filter(
            Produit.id
            == produit_id
        )
        .first()
    )

    if produit is None:

        raise ProductNotFoundError(
            "Produit introuvable."
        )

    return produit


# ============================================================
# OBTENIR PRODUIT PUBLIC
# ============================================================


def obtenir_produit_public(
    db: Session,
    produit_id: int,
) -> Produit:
    """
    Récupère uniquement un produit validé.
    """

    produit = (
        db.query(
            Produit
        )
        .options(
            selectinload(
                Produit.categorie
            )
        )
        .filter(
            Produit.id
            == produit_id,

            Produit.est_valide
            .is_(True),
        )
        .first()
    )

    if produit is None:

        raise ProductNotFoundError(
            "Produit introuvable ou "
            "non disponible publiquement."
        )

    return produit


# ============================================================
# OBTENIR ANNONCE
# ============================================================


def obtenir_annonce(
    db: Session,
    annonce_id: int,
) -> Annonce:
    """
    Récupère une annonce avec ses relations.
    """

    annonce = (
        db.query(
            Annonce
        )
        .options(
            selectinload(
                Annonce.produit
            ),
            selectinload(
                Annonce.vendeur
            ),
            selectinload(
                Annonce.images
            ),
        )
        .filter(
            Annonce.id
            == annonce_id
        )
        .first()
    )

    if annonce is None:

        raise AnnouncementNotFoundError(
            "Annonce introuvable."
        )

    return annonce


# ============================================================
# OBTENIR ANNONCE PUBLIQUE
# ============================================================


def obtenir_annonce_public(
    db: Session,
    annonce_id: int,
) -> Annonce:
    """
    Récupère une annonce publiquement disponible.

    Attention :
    cette fonction récupère les coordonnées côté serveur.
    Les routes doivent utiliser les schémas publics
    qui ne les exposent pas directement.
    """

    annonce = (
        db.query(
            Annonce
        )
        .join(
            Produit,
            Annonce.produit_id
            == Produit.id,
        )
        .options(
            selectinload(
                Annonce.produit
            ),
            selectinload(
                Annonce.vendeur
            ),
            selectinload(
                Annonce.images
            ),
        )
        .filter(
            Annonce.id
            == annonce_id,

            Annonce.statut
            == STATUT_ANNONCE_PUBLIEE,

            Produit.est_valide
            .is_(True),
        )
        .first()
    )

    if annonce is None:

        raise AnnouncementNotFoundError(
            "Annonce introuvable ou "
            "non disponible publiquement."
        )

    return annonce


# ============================================================
# RECHERCHER UN PRODUIT EXISTANT
# ============================================================


def trouver_produit_existant(
    db: Session,
    nom: str,
    categorie_id: int,
    secteur: Any,
    type_produit: Any = None,
) -> Produit | None:
    """
    Recherche un produit correspondant au :

    - nom ;
    - catégorie ;
    - secteur ;
    - type lorsque le secteur le permet.

    Pour les secteurs sans type,
    type_produit doit être NULL.
    """

    secteur_valeur, type_valeur = (
        valider_secteur_type(
            secteur,
            type_produit,
        )
    )

    nom_normalise = (
        normaliser_recherche(
            nom
        )
    )

    query = (
        db.query(
            Produit
        )
        .filter(
            Produit.categorie_id
            == categorie_id,

            Produit.secteur
            == secteur_valeur,
        )
    )

    if type_valeur is None:

        query = query.filter(
            Produit.type_produit
            .is_(None)
        )

    else:

        query = query.filter(
            Produit.type_produit
            == type_valeur
        )

    produits = (
        query
        .all()
    )

    for produit in produits:

        if (
            normaliser_recherche(
                produit.nom
            )
            == nom_normalise
        ):

            return produit

    return None


# ============================================================
# VÉRIFIER DOUBLON PRODUIT
# ============================================================


def verifier_doublon_produit(
    db: Session,
    nom: str,
    categorie_id: int,
    secteur: Any,
    type_produit: Any = None,
    produit_id: int | None = None,
) -> None:
    """
    Empêche deux produits identiques dans :

    - la même catégorie ;
    - le même secteur ;
    - le même type lorsque applicable.
    """

    secteur_valeur, type_valeur = (
        valider_secteur_type(
            secteur,
            type_produit,
        )
    )

    produit = (
        trouver_produit_existant(
            db=db,
            nom=nom,
            categorie_id=categorie_id,
            secteur=secteur_valeur,
            type_produit=type_valeur,
        )
    )

    if (
        produit is not None
        and (
            produit_id is None
            or produit.id != produit_id
        )
    ):

        raise ProductAlreadyExistsError(
            "Un produit portant le même nom "
            "existe déjà dans cette catégorie, "
            "ce secteur et ce type."
        )


# ============================================================
# CRÉER PRODUIT ADMIN
# ============================================================


def creer_produit_admin(
    db: Session,
    data: ProduitCreate,
) -> Produit:
    """
    Création directe d'un produit par
    l'administration.

    Le produit est immédiatement validé.
    """

    nom = nettoyer_texte(
        data.nom
    )

    if not nom:

        raise ProductValidationError(
            "Le nom du produit est obligatoire."
        )

    secteur, type_produit = (
        valider_secteur_type(
            data.secteur,
            data.type_produit,
        )
    )

    categorie = obtenir_categorie(
        db,
        data.categorie_id,
    )

    verifier_doublon_produit(
        db=db,
        nom=nom,
        categorie_id=categorie.id,
        secteur=secteur,
        type_produit=type_produit,
    )

    produit = Produit(
        nom=nom,

        description=nettoyer_texte(
            data.description
        ),

        categorie_id=categorie.id,

        secteur=secteur,

        type_produit=type_produit,

        est_valide=True,
    )

    db.add(
        produit
    )

    db.flush()

    return produit


# ============================================================
# MODIFIER PRODUIT
# ============================================================


def modifier_produit(
    db: Session,
    produit_id: int,
    data: ProduitUpdate,
) -> Produit:
    """
    Modification partielle d'un produit.
    """

    produit = obtenir_produit(
        db,
        produit_id,
    )

    fields_set = getattr(
        data,
        "model_fields_set",
        set(),
    )

    nouveau_nom = produit.nom

    nouvelle_categorie = (
        produit.categorie_id
    )

    nouveau_secteur = (
        produit.secteur
    )

    nouveau_type = (
        produit.type_produit
    )

    modification = False

    # --------------------------------------------------------
    # NOM
    # --------------------------------------------------------

    if "nom" in fields_set:

        nom = nettoyer_texte(
            data.nom
        )

        if not nom:

            raise ProductValidationError(
                "Le nom du produit est obligatoire."
            )

        nouveau_nom = nom

        modification = True

    # --------------------------------------------------------
    # CATÉGORIE
    # --------------------------------------------------------

    if "categorie_id" in fields_set:

        if data.categorie_id is None:

            raise ProductValidationError(
                "La catégorie est obligatoire."
            )

        obtenir_categorie(
            db,
            data.categorie_id,
        )

        nouvelle_categorie = (
            data.categorie_id
        )

        modification = True

    # --------------------------------------------------------
    # SECTEUR
    # --------------------------------------------------------

    if "secteur" in fields_set:

        secteur = valeur_enum(
            data.secteur
        )

        if (
            secteur
            not in SECTEURS_PRODUIT_VALIDES
        ):

            raise ProductValidationError(
                "Secteur de produit invalide."
            )

        nouveau_secteur = (
            secteur
        )

        modification = True

    # --------------------------------------------------------
    # TYPE
    # --------------------------------------------------------

    if "type_produit" in fields_set:

        nouveau_type = valeur_enum(
            data.type_produit
        )

        modification = True

    # --------------------------------------------------------
    # DESCRIPTION
    # --------------------------------------------------------

    if "description" in fields_set:

        produit.description = (
            nettoyer_texte(
                data.description
            )
        )

        modification = True

    # --------------------------------------------------------
    # COHÉRENCE
    # --------------------------------------------------------

    (
        nouveau_secteur,
        nouveau_type,
    ) = valider_secteur_type(
        nouveau_secteur,
        nouveau_type,
    )

    # --------------------------------------------------------
    # DOUBLON
    # --------------------------------------------------------

    if modification:

        verifier_doublon_produit(
            db=db,
            nom=nouveau_nom,
            categorie_id=nouvelle_categorie,
            secteur=nouveau_secteur,
            type_produit=nouveau_type,
            produit_id=produit.id,
        )

    # --------------------------------------------------------
    # APPLICATION
    # --------------------------------------------------------

    produit.nom = (
        nouveau_nom
    )

    produit.categorie_id = (
        nouvelle_categorie
    )

    produit.secteur = (
        nouveau_secteur
    )

    produit.type_produit = (
        nouveau_type
    )

    return produit


# ============================================================
# SUPPRIMER PRODUIT
# ============================================================


def supprimer_produit(
    db: Session,
    produit_id: int,
) -> None:
    """
    Supprime un produit seulement s'il
    n'est associé à aucune annonce.
    """

    produit = obtenir_produit(
        db,
        produit_id,
        charger_categorie=False,
    )

    if produit.annonces:

        raise ProductValidationError(
            "Impossible de supprimer ce produit "
            "car il est utilisé par une ou plusieurs "
            "annonces."
        )

    db.delete(
        produit
    )

    db.flush()


# ============================================================
# CRÉER NOTIFICATION INTERNE
# ============================================================


def ajouter_notification(
    db: Session,
    utilisateur_id: int,
    type_notification: str,
    titre: str,
    message: str,
    lien: str | None = None,
    reference_id: int | None = None,
) -> Notification:
    """
    Ajoute une notification sans commit.
    """

    notification = Notification(
        utilisateur_id=utilisateur_id,

        type=type_notification,

        titre=titre.strip(),

        message=message.strip(),

        est_lue=False,

        date_lecture=None,

        lien=(
            lien.strip()
            if lien
            else None
        ),

        reference_id=reference_id,
    )

    db.add(
        notification
    )

    db.flush()

    return notification


# ============================================================
# DESTINATAIRES DE LA MODÉRATION
# ============================================================


def obtenir_destinataires_moderation(
    db: Session,
    exclude_user_id: int | None = None,
) -> list[Utilisateur]:
    """
    Retourne tous les utilisateurs capables de traiter
    les annonces en modération.

    Chaque utilisateur reçoit sa propre notification.
    """

    query = (
        db.query(Utilisateur)
        .filter(
            Utilisateur.role.in_(ROLE_MODERATION)
        )
    )

    if exclude_user_id is not None:
        query = query.filter(
            Utilisateur.id != exclude_user_id
        )

    return (
        query
        .order_by(Utilisateur.id.asc())
        .all()
    )


# ============================================================
# NOTIFICATION AUX MODÉRATEURS
# ============================================================


def notifier_moderateurs_annonce_soumise(
    db: Session,
    annonce: Annonce,
) -> list[Notification]:
    """Informe les modérateurs/admins d'une nouvelle annonce."""

    notifications = []

    for utilisateur in obtenir_destinataires_moderation(db):
        notifications.append(
            ajouter_notification(
                db=db,
                utilisateur_id=utilisateur.id,
                type_notification=TYPE_NOTIFICATION_ANNONCE_MODERATION,
                titre="Nouvelle annonce à modérer",
                message=(
                    f"L'annonce « {annonce.produit.nom} » "
                    "est en attente de modération."
                ),
                lien=f"/annonces/{annonce.id}",
                reference_id=annonce.id,
            )
        )

    return notifications


# ============================================================
# NOTIFICATION REMISE EN MODÉRATION
# ============================================================


def notifier_annonce_remise_en_moderation(
    db: Session,
    annonce: Annonce,
    vendeur: Utilisateur | None = None,
) -> list[Notification]:
    """
    Informe le vendeur et les modérateurs/admins qu'une annonce
    modifiée doit être à nouveau modérée.
    """

    notifications = []

    if vendeur is not None:
        notifications.append(
            ajouter_notification(
                db=db,
                utilisateur_id=vendeur.id,
                type_notification=TYPE_NOTIFICATION_ANNONCE_REMISE,
                titre="Annonce remise en modération",
                message=(
                    f"Votre annonce « {annonce.produit.nom} » "
                    "a été remise en modération après modification."
                ),
                lien=f"/annonces/{annonce.id}",
                reference_id=annonce.id,
            )
        )

    exclude_user_id = (
        vendeur.id
        if vendeur is not None and vendeur.role in ROLE_MODERATION
        else None
    )

    for utilisateur in obtenir_destinataires_moderation(
        db=db,
        exclude_user_id=exclude_user_id,
    ):
        notifications.append(
            ajouter_notification(
                db=db,
                utilisateur_id=utilisateur.id,
                type_notification=TYPE_NOTIFICATION_ANNONCE_REMISE,
                titre="Annonce remise en modération",
                message=(
                    f"L'annonce « {annonce.produit.nom} » "
                    "a été modifiée et nécessite une nouvelle modération."
                ),
                lien=f"/annonces/{annonce.id}",
                reference_id=annonce.id,
            )
        )

    return notifications


# ============================================================
# AJOUTER HISTORIQUE MODÉRATION
# ============================================================


def ajouter_historique_moderation(
    db: Session,
    annonce: Annonce,
    acteur: Utilisateur,
    action: str,
    ancien_statut: str | None,
    nouveau_statut: str | None,
    motif: str | None = None,
) -> HistoriqueModeration:
    """
    Enregistre une action de modération.
    """

    actions_valides = {
        ACTION_HISTORIQUE_SOUMISE,
        ACTION_HISTORIQUE_APPROUVEE,
        ACTION_HISTORIQUE_REFUSEE,
        ACTION_HISTORIQUE_REMISE,
    }

    if action not in actions_valides:

        raise ProductValidationError(
            "Action d'historique invalide."
        )

    historique = HistoriqueModeration(
        annonce_id=annonce.id,

        acteur_id=acteur.id,

        action=action,

        ancien_statut=ancien_statut,

        nouveau_statut=nouveau_statut,

        motif=nettoyer_texte(
            motif
        ),
    )

    db.add(
        historique
    )

    db.flush()

    return historique


# ============================================================
# NOTIFICATION SOUMISSION
# ============================================================


def notifier_annonce_soumise(
    db: Session,
    annonce: Annonce,
) -> Notification:
    """
    Notification au vendeur après soumission.
    """

    return ajouter_notification(
        db=db,

        utilisateur_id=(
            annonce.vendeur_id
        ),

        type_notification=(
            TYPE_NOTIFICATION_ANNONCE_SOUMISE
        ),

        titre="Annonce soumise",

        message=(
            f"Votre annonce "
            f"« {annonce.produit.nom} » "
            f"a été envoyée en modération."
        ),

        lien=f"/annonces/{annonce.id}",

        reference_id=annonce.id,
    )


# ============================================================
# NOTIFICATION APPROBATION
# ============================================================


def notifier_annonce_approuvee(
    db: Session,
    annonce: Annonce,
) -> Notification:
    """
    Notification au vendeur après approbation.
    """

    return ajouter_notification(
        db=db,

        utilisateur_id=(
            annonce.vendeur_id
        ),

        type_notification=(
            TYPE_NOTIFICATION_ANNONCE_APPROUVEE
        ),

        titre="Annonce approuvée",

        message=(
            f"Votre annonce "
            f"« {annonce.produit.nom} » "
            f"a été approuvée et publiée."
        ),

        lien=f"/annonces/{annonce.id}",

        reference_id=annonce.id,
    )


# ============================================================
# NOTIFICATION REFUS
# ============================================================


def notifier_annonce_refusee(
    db: Session,
    annonce: Annonce,
    motif: str | None = None,
) -> Notification:
    """
    Notification au vendeur après refus.
    """

    message = (
        f"Votre annonce "
        f"« {annonce.produit.nom} » "
        f"a été refusée."
    )

    motif_nettoye = nettoyer_texte(
        motif
    )

    if motif_nettoye:

        message += (
            f" Motif : {motif_nettoye}"
        )

    return ajouter_notification(
        db=db,

        utilisateur_id=(
            annonce.vendeur_id
        ),

        type_notification=(
            TYPE_NOTIFICATION_ANNONCE_REFUSEE
        ),

        titre="Annonce refusée",

        message=message,

        lien=f"/annonces/{annonce.id}",

        reference_id=annonce.id,
    )


# ============================================================
# CRÉER ANNONCE
# ============================================================


def creer_annonce(
    db: Session,
    vendeur: Utilisateur,
    data: AnnonceCreate,
) -> Annonce:
    """
    Création complète d'une annonce.

    Règles :

    - vendeur obligatoire ;
    - produit existant réutilisé ;
    - produit absent créé automatiquement ;
    - produit nouvellement créé = non validé ;
    - annonce = en attente ;
    - historique = soumise ;
    - notification vendeur = soumise ;
    - localisation privée par défaut ;
    - domicile jamais public.
    """

    if vendeur.role != "vendeur":

        raise ProductPermissionError(
            "Seul un vendeur peut créer une annonce."
        )

    # ========================================================
    # PRODUIT
    # ========================================================

    nom_produit = nettoyer_texte(
        data.produit_nom
    )

    if not nom_produit:

        raise ProductValidationError(
            "Le nom du produit est obligatoire."
        )

    categorie = obtenir_categorie(
        db,
        data.categorie_id,
    )

    # ========================================================
    # SECTEUR / TYPE
    # ========================================================

    secteur, type_produit = (
        valider_secteur_type(
            data.secteur,
            data.type_produit,
        )
    )

    # ========================================================
    # DONNÉES ANNONCE
    # ========================================================

    unite = nettoyer_texte(
        data.unite
    )

    region = nettoyer_texte(
        data.region
    )

    province = nettoyer_texte(
        data.province
    )

    commune = nettoyer_texte(
        data.commune
    )

    if not unite:

        raise ProductValidationError(
            "L'unité est obligatoire."
        )

    if not region:

        raise ProductValidationError(
            "La région est obligatoire."
        )

    # ========================================================
    # LOCALISATION
    # ========================================================

    (
        latitude,
        longitude,
        source,
        type_localisation,
        visibilite_localisation,
    ) = valider_localisation(
        latitude=data.latitude,
        longitude=data.longitude,
        source=data.localisation_source,
        type_localisation=data.type_localisation,
        visibilite_localisation=(
            data.visibilite_localisation
        ),
    )

    # ========================================================
    # PRODUIT EXISTANT
    # ========================================================

    produit = (
        trouver_produit_existant(
            db=db,
            nom=nom_produit,
            categorie_id=categorie.id,
            secteur=secteur,
            type_produit=type_produit,
        )
    )

    # ========================================================
    # CRÉER PRODUIT
    # ========================================================

    if produit is None:

        produit = Produit(
            nom=nom_produit,

            description=(
                nettoyer_texte(
                    data.description_produit
                )
            ),

            categorie_id=categorie.id,

            secteur=secteur,

            type_produit=type_produit,

            est_valide=False,
        )

        db.add(
            produit
        )

        db.flush()

    elif (
        not produit.description
        and data.description_produit
    ):

        produit.description = (
            nettoyer_texte(
                data.description_produit
            )
        )

    # ========================================================
    # CRÉER ANNONCE
    # ========================================================

    annonce = Annonce(
        produit_id=produit.id,

        vendeur_id=vendeur.id,

        prix=float(
            data.prix
        ),

        quantite=float(
            data.quantite
        ),

        unite=unite,

        region=region,

        province=province,

        commune=commune,

        latitude=latitude,

        longitude=longitude,

        localisation_source=source,

        type_localisation=(
            type_localisation
        ),

        visibilite_localisation=(
            visibilite_localisation
        ),

        statut=(
            STATUT_ANNONCE_EN_ATTENTE
        ),
    )

    db.add(
        annonce
    )

    db.flush()

    # ========================================================
    # HISTORIQUE
    # ========================================================

    ajouter_historique_moderation(
        db=db,

        annonce=annonce,

        acteur=vendeur,

        action=(
            ACTION_HISTORIQUE_SOUMISE
        ),

        ancien_statut=None,

        nouveau_statut=(
            STATUT_ANNONCE_EN_ATTENTE
        ),
    )

    # ========================================================
    # NOTIFICATION
    # ========================================================

    notifier_annonce_soumise(
        db,
        annonce,
    )

    notifier_moderateurs_annonce_soumise(
        db,
        annonce,
    )

    return obtenir_annonce(
        db,
        annonce.id,
    )


# ============================================================
# MODIFIER ANNONCE
# ============================================================


def modifier_annonce(
    db: Session,
    annonce_id: int,
    current_user: Utilisateur,
    data: AnnonceUpdate,
) -> Annonce:
    """
    Modifie une annonce.

    Autorisé :

    - vendeur propriétaire ;
    - administrateur.

    Une modification faite par le vendeur
    remet l'annonce en modération.

    La validation de localisation est effectuée
    après fusion des anciennes et nouvelles valeurs.
    """

    annonce = obtenir_annonce(
        db,
        annonce_id,
    )

    est_proprietaire = (
        annonce.vendeur_id
        == current_user.id
    )

    est_admin = (
        current_user.role
        in ROLE_ADMIN
    )

    if not (
        est_proprietaire
        or est_admin
    ):

        raise ProductPermissionError(
            "Vous n'êtes pas autorisé "
            "à modifier cette annonce."
        )

    ancien_statut = (
        annonce.statut
    )

    fields_set = getattr(
        data,
        "model_fields_set",
        set(),
    )

    modification = False

    # ========================================================
    # PRIX
    # ========================================================

    if "prix" in fields_set:

        if data.prix is None:

            raise ProductValidationError(
                "Le prix ne peut pas être nul."
            )

        annonce.prix = float(
            data.prix
        )

        modification = True

    # ========================================================
    # QUANTITÉ
    # ========================================================

    if "quantite" in fields_set:

        if data.quantite is None:

            raise ProductValidationError(
                "La quantité ne peut pas être nulle."
            )

        annonce.quantite = float(
            data.quantite
        )

        modification = True

    # ========================================================
    # UNITÉ
    # ========================================================

    if "unite" in fields_set:

        unite = nettoyer_texte(
            data.unite
        )

        if not unite:

            raise ProductValidationError(
                "L'unité ne peut pas être vide."
            )

        annonce.unite = unite

        modification = True

    # ========================================================
    # RÉGION
    # ========================================================

    if "region" in fields_set:

        region = nettoyer_texte(
            data.region
        )

        if not region:

            raise ProductValidationError(
                "La région ne peut pas être vide."
            )

        annonce.region = region

        modification = True

    # ========================================================
    # PROVINCE
    # ========================================================

    if "province" in fields_set:

        annonce.province = (
            nettoyer_texte(
                data.province
            )
        )

        modification = True

    # ========================================================
    # COMMUNE
    # ========================================================

    if "commune" in fields_set:

        annonce.commune = (
            nettoyer_texte(
                data.commune
            )
        )

        modification = True

    # ========================================================
    # GÉOLOCALISATION
    # ========================================================

    localisation_modifiee = (
        "latitude"
        in fields_set

        or "longitude"
        in fields_set

        or "localisation_source"
        in fields_set

        or "type_localisation"
        in fields_set

        or "visibilite_localisation"
        in fields_set
    )

    if localisation_modifiee:

        # ----------------------------------------------------
        # Fusion avec les anciennes valeurs
        # ----------------------------------------------------

        latitude = (
            data.latitude
            if "latitude"
            in fields_set
            else annonce.latitude
        )

        longitude = (
            data.longitude
            if "longitude"
            in fields_set
            else annonce.longitude
        )

        source = (
            data.localisation_source
            if "localisation_source"
            in fields_set
            else annonce.localisation_source
        )

        type_localisation = (
            data.type_localisation
            if "type_localisation"
            in fields_set
            else annonce.type_localisation
        )

        visibilite_localisation = (
            data.visibilite_localisation
            if "visibilite_localisation"
            in fields_set
            else annonce.visibilite_localisation
        )

        # ----------------------------------------------------
        # Validation finale
        # ----------------------------------------------------

        (
            latitude,
            longitude,
            source,
            type_localisation,
            visibilite_localisation,
        ) = valider_localisation(
            latitude=latitude,
            longitude=longitude,
            source=source,
            type_localisation=(
                type_localisation
            ),
            visibilite_localisation=(
                visibilite_localisation
            ),
        )

        # ----------------------------------------------------
        # Application
        # ----------------------------------------------------

        annonce.latitude = latitude

        annonce.longitude = longitude

        annonce.localisation_source = (
            source
        )

        annonce.type_localisation = (
            type_localisation
        )

        annonce.visibilite_localisation = (
            visibilite_localisation
        )

        modification = True

    # ========================================================
    # AUCUNE MODIFICATION
    # ========================================================

    if not modification:

        return annonce

    # ========================================================
    # VENDEUR → REMISE EN MODÉRATION
    # ========================================================

    if est_proprietaire:

        if (
            ancien_statut
            != STATUT_ANNONCE_EN_ATTENTE
        ):

            annonce.statut = (
                STATUT_ANNONCE_EN_ATTENTE
            )

            ajouter_historique_moderation(
                db=db,

                annonce=annonce,

                acteur=current_user,

                action=(
                    ACTION_HISTORIQUE_REMISE
                ),

                ancien_statut=ancien_statut,

                nouveau_statut=(
                    STATUT_ANNONCE_EN_ATTENTE
                ),
            )

            notifier_annonce_remise_en_moderation(
                db=db,
                annonce=annonce,
                vendeur=current_user,
            )

        else:

            annonce.statut = (
                STATUT_ANNONCE_EN_ATTENTE
            )

    return annonce


# ============================================================
# APPROUVER ANNONCE
# ============================================================


def approuver_annonce(
    db: Session,
    annonce_id: int,
    moderateur: Utilisateur,
) -> Annonce:
    """
    Approuve une annonce.

    Effets :

    - annonce -> publiée ;
    - produit -> validé ;
    - historique -> approuvée ;
    - vendeur -> notification.
    """

    if (
        moderateur.role
        not in ROLE_MODERATION
    ):

        raise ProductPermissionError(
            "Accès réservé aux modérateurs "
            "et administrateurs."
        )

    annonce = obtenir_annonce(
        db,
        annonce_id,
    )

    if (
        annonce.statut
        != STATUT_ANNONCE_EN_ATTENTE
    ):

        raise AnnouncementAlreadyProcessedError(
            "Seule une annonce en attente "
            "peut être approuvée."
        )

    if annonce.produit is None:

        raise ProductValidationError(
            "Le produit associé est introuvable."
        )

    # ========================================================
    # VALIDATION LOCALISATION AVANT PUBLICATION
    # ========================================================

    (
        latitude,
        longitude,
        source,
        type_localisation,
        visibilite_localisation,
    ) = valider_localisation(
        latitude=annonce.latitude,
        longitude=annonce.longitude,
        source=annonce.localisation_source,
        type_localisation=(
            annonce.type_localisation
        ),
        visibilite_localisation=(
            annonce.visibilite_localisation
        ),
    )

    annonce.latitude = latitude

    annonce.longitude = longitude

    annonce.localisation_source = (
        source
    )

    annonce.type_localisation = (
        type_localisation
    )

    annonce.visibilite_localisation = (
        visibilite_localisation
    )

    ancien_statut = (
        annonce.statut
    )

    annonce.statut = (
        STATUT_ANNONCE_PUBLIEE
    )

    annonce.produit.est_valide = True

    ajouter_historique_moderation(
        db=db,

        annonce=annonce,

        acteur=moderateur,

        action=(
            ACTION_HISTORIQUE_APPROUVEE
        ),

        ancien_statut=ancien_statut,

        nouveau_statut=(
            STATUT_ANNONCE_PUBLIEE
        ),
    )

    notifier_annonce_approuvee(
        db,
        annonce,
    )

    return annonce


# ============================================================
# REFUSER ANNONCE
# ============================================================


def refuser_annonce(
    db: Session,
    annonce_id: int,
    moderateur: Utilisateur,
    motif: str | None = None,
) -> Annonce:
    """
    Refuse une annonce.

    Le produit n'est pas automatiquement supprimé
    ni invalidé.
    """

    if (
        moderateur.role
        not in ROLE_MODERATION
    ):

        raise ProductPermissionError(
            "Accès réservé aux modérateurs "
            "et administrateurs."
        )

    annonce = obtenir_annonce(
        db,
        annonce_id,
    )

    if (
        annonce.statut
        != STATUT_ANNONCE_EN_ATTENTE
    ):

        raise AnnouncementAlreadyProcessedError(
            "Seule une annonce en attente "
            "peut être refusée."
        )

    ancien_statut = (
        annonce.statut
    )

    annonce.statut = (
        STATUT_ANNONCE_REFUSEE
    )

    motif = nettoyer_texte(
        motif
    )

    ajouter_historique_moderation(
        db=db,

        annonce=annonce,

        acteur=moderateur,

        action=(
            ACTION_HISTORIQUE_REFUSEE
        ),

        ancien_statut=ancien_statut,

        nouveau_statut=(
            STATUT_ANNONCE_REFUSEE
        ),

        motif=motif,
    )

    notifier_annonce_refusee(
        db,
        annonce,
        motif,
    )

    return annonce


# ============================================================
# VALIDATION FILTRE SECTEUR
# ============================================================


def valider_filtre_secteur_type(
    secteur: Any = None,
    type_produit: Any = None,
) -> tuple[
    str | None,
    str | None,
]:
    """
    Valide les filtres de recherche secteur/type.

    Cas :

    - aucun secteur + aucun type -> autorisé ;
    - secteur agricole + type -> autorisé ;
    - secteur élevage + type -> autorisé ;
    - secteur matériel/engrais/phytosanitaire
      sans type -> autorisé ;
    - type seul -> autorisé ;
    - secteur sans type + type fourni -> erreur.
    """

    secteur_valeur = valeur_enum(
        secteur
    )

    type_valeur = valeur_enum(
        type_produit
    )

    if secteur_valeur is None:

        if (
            type_valeur is not None
            and type_valeur
            not in TYPES_PRODUIT_VALIDES
        ):

            raise ProductValidationError(
                "Type de produit invalide."
            )

        return (
            None,
            type_valeur,
        )

    secteur_valeur, type_valeur = (
        valider_secteur_type(
            secteur_valeur,
            type_valeur,
        )
    )

    return (
        secteur_valeur,
        type_valeur,
    )


# ============================================================
# LISTE PRODUITS PUBLICS
# ============================================================


def lister_produits_publics(
    db: Session,
    categorie_id: int | None = None,
    type_produit: str | None = None,
    secteur: str | None = None,
) -> list[Produit]:
    """
    Retourne les produits validés.

    Filtres :

    - catégorie ;
    - secteur ;
    - type.
    """

    (
        secteur_valeur,
        type_valeur,
    ) = valider_filtre_secteur_type(
        secteur,
        type_produit,
    )

    query = (
        db.query(
            Produit
        )
        .options(
            selectinload(
                Produit.categorie
            )
        )
        .filter(
            Produit.est_valide
            .is_(True)
        )
    )

    if categorie_id is not None:

        query = query.filter(
            Produit.categorie_id
            == categorie_id
        )

    if secteur_valeur is not None:

        query = query.filter(
            Produit.secteur
            == secteur_valeur
        )

    if type_valeur is not None:

        query = query.filter(
            Produit.type_produit
            == type_valeur
        )

    return (
        query
        .order_by(
            Produit.nom.asc()
        )
        .all()
    )


# ============================================================
# RECHERCHE PRODUITS EXACTE
# ============================================================


def rechercher_produits_exactement(
    db: Session,
    recherche: str | None = None,
    categorie_id: int | None = None,
    type_produit: str | None = None,
    secteur: str | None = None,
    limit: int = 20,
) -> list[Produit]:
    """
    Recherche classique sur le catalogue public.
    """

    (
        secteur_valeur,
        type_valeur,
    ) = valider_filtre_secteur_type(
        secteur,
        type_produit,
    )

    query = (
        db.query(
            Produit
        )
        .options(
            selectinload(
                Produit.categorie
            )
        )
        .filter(
            Produit.est_valide
            .is_(True)
        )
    )

    if categorie_id is not None:

        query = query.filter(
            Produit.categorie_id
            == categorie_id
        )

    if secteur_valeur is not None:

        query = query.filter(
            Produit.secteur
            == secteur_valeur
        )

    if type_valeur is not None:

        query = query.filter(
            Produit.type_produit
            == type_valeur
        )

    texte = nettoyer_texte(
        recherche
    )

    if texte:

        query = query.filter(
            Produit.nom.ilike(
                f"%{texte}%"
            )
        )

    return (
        query
        .order_by(
            Produit.nom.asc()
        )
        .limit(
            limit
        )
        .all()
    )


# ============================================================
# RECHERCHE INTELLIGENTE PRODUITS
# ============================================================


def rechercher_produits_intelligemment(
    db: Session,
    recherche: str,
    categorie_id: int | None = None,
    type_produit: str | None = None,
    secteur: str | None = None,
    limit: int = 20,
) -> dict:
    """
    Recherche intelligente :

    1. normalisation ;
    2. recherche exacte ;
    3. recherche partielle ;
    4. RapidFuzz ;
    5. suggestion de correction.
    """

    (
        secteur_valeur,
        type_valeur,
    ) = valider_filtre_secteur_type(
        secteur,
        type_produit,
    )

    texte_original = (
        recherche or ""
    ).strip()

    texte_normalise = (
        normaliser_recherche(
            texte_original
        )
    )

    if not texte_normalise:

        return {
            "recherche_originale": (
                texte_original
            ),
            "correction": None,
            "produits": [],
            "scores": {},
        }

    # ========================================================
    # CANDIDATS
    # ========================================================

    query = (
        db.query(
            Produit
        )
        .options(
            selectinload(
                Produit.categorie
            )
        )
        .filter(
            Produit.est_valide
            .is_(True)
        )
    )

    if categorie_id is not None:

        query = query.filter(
            Produit.categorie_id
            == categorie_id
        )

    if secteur_valeur is not None:

        query = query.filter(
            Produit.secteur
            == secteur_valeur
        )

    if type_valeur is not None:

        query = query.filter(
            Produit.type_produit
            == type_valeur
        )

    produits = (
        query
        .order_by(
            Produit.nom.asc()
        )
        .limit(
            MAX_CANDIDATS_FUZZY
        )
        .all()
    )

    if not produits:

        return {
            "recherche_originale": (
                texte_original
            ),
            "correction": None,
            "produits": [],
            "scores": {},
        }

    noms = {
        produit.id: (
            normaliser_recherche(
                produit.nom
            )
        )
        for produit in produits
    }

    # ========================================================
    # RAPIDFUZZ
    # ========================================================

    mapping_nom_id = {
        nom: produit_id
        for produit_id, nom
        in noms.items()
    }

    matches = process.extract(
        texte_normalise,

        list(
            mapping_nom_id.keys()
        ),

        scorer=fuzz.WRatio,

        limit=limit,
    )

    resultats = []

    scores = {}

    for (
        nom_normalise,
        score,
        _,
    ) in matches:

        produit_id = (
            mapping_nom_id[
                nom_normalise
            ]
        )

        for produit in produits:

            if produit.id == produit_id:

                resultats.append(
                    produit
                )

                scores[
                    produit.id
                ] = round(
                    float(score),
                    2,
                )

                break

    # ========================================================
    # CORRECTION
    # ========================================================

    correction = None

    if matches:

        (
            meilleur_nom,
            meilleur_score,
            _,
        ) = matches[0]

        if (
            meilleur_score
            >= SEUIL_CORRECTION_RAPIDFUZZ
            and meilleur_nom
            != texte_normalise
        ):

            for produit in produits:

                if (
                    noms[
                        produit.id
                    ]
                    == meilleur_nom
                ):

                    correction = (
                        produit.nom
                    )

                    break

    return {
        "recherche_originale": (
            texte_original
        ),

        "correction": correction,

        "produits": resultats,

        "scores": scores,
    }


# ============================================================
# RECHERCHE INTELLIGENTE ANNONCES
# ============================================================


def rechercher_annonces_intelligemment(
    db: Session,
    recherche: str | None = None,
    region: str | None = None,
    province: str | None = None,
    commune: str | None = None,
    produit_id: int | None = None,
    categorie_id: int | None = None,
    type_produit: str | None = None,
    secteur: str | None = None,
    prix_min: float | None = None,
    prix_max: float | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    rayon_km: float | None = None,
    limit: int = 20,
) -> dict:
    """
    Recherche intelligente des annonces.

    La recherche tient compte de :

    - produit ;
    - région ;
    - province ;
    - commune ;
    - prix ;
    - catégorie ;
    - secteur ;
    - type ;
    - proximité géographique ;
    - RapidFuzz.

    IMPORTANT SÉCURITÉ :

    Pour une recherche publique par proximité,
    seules les annonces dont la localisation est
    explicitement publique peuvent être utilisées.

    Les coordonnées d'un domicile privé ou approximatif
    ne participent donc pas au calcul public de proximité.
    """

    (
        secteur_valeur,
        type_valeur,
    ) = valider_filtre_secteur_type(
        secteur,
        type_produit,
    )

    # ========================================================
    # VALIDATION PRIX
    # ========================================================

    if (
        prix_min is not None
        and prix_max is not None
        and prix_min > prix_max
    ):

        raise ProductValidationError(
            "Le prix minimum ne peut pas "
            "être supérieur au prix maximum."
        )

    # ========================================================
    # VALIDATION PROXIMITÉ
    # ========================================================

    if (
        rayon_km is not None
        and (
            latitude is None
            or longitude is None
        )
    ):

        raise ProductValidationError(
            "Latitude et longitude obligatoires "
            "pour une recherche par rayon."
        )

    if (
        latitude is not None
        or longitude is not None
    ):

        latitude, longitude, _ = (
            valider_geolocalisation(
                latitude,
                longitude,
                SOURCE_MANUELLE,
            )
        )

    # ========================================================
    # REQUÊTE
    # ========================================================

    query = (
        db.query(
            Annonce
        )
        .join(
            Produit,
            Annonce.produit_id
            == Produit.id,
        )
        .options(
            selectinload(
                Annonce.produit
            ),
            selectinload(
                Annonce.vendeur
            ),
            selectinload(
                Annonce.images
            ),
        )
        .filter(
            Annonce.statut
            == STATUT_ANNONCE_PUBLIEE,

            Produit.est_valide
            .is_(True),
        )
    )

    # ========================================================
    # RÉGION
    # ========================================================

    if region:

        query = query.filter(
            Annonce.region.ilike(
                f"%{region.strip()}%"
            )
        )

    # ========================================================
    # PROVINCE
    # ========================================================

    if province:

        query = query.filter(
            Annonce.province.ilike(
                f"%{province.strip()}%"
            )
        )

    # ========================================================
    # COMMUNE
    # ========================================================

    if commune:

        query = query.filter(
            Annonce.commune.ilike(
                f"%{commune.strip()}%"
            )
        )

    # ========================================================
    # PRODUIT
    # ========================================================

    if produit_id is not None:

        query = query.filter(
            Annonce.produit_id
            == produit_id
        )

    # ========================================================
    # CATÉGORIE
    # ========================================================

    if categorie_id is not None:

        query = query.filter(
            Produit.categorie_id
            == categorie_id
        )

    # ========================================================
    # SECTEUR
    # ========================================================

    if secteur_valeur is not None:

        query = query.filter(
            Produit.secteur
            == secteur_valeur
        )

    # ========================================================
    # TYPE
    # ========================================================

    if type_valeur is not None:

        query = query.filter(
            Produit.type_produit
            == type_valeur
        )

    # ========================================================
    # PRIX MINIMUM
    # ========================================================

    if prix_min is not None:

        query = query.filter(
            Annonce.prix
            >= prix_min
        )

    # ========================================================
    # PRIX MAXIMUM
    # ========================================================

    if prix_max is not None:

        query = query.filter(
            Annonce.prix
            <= prix_max
        )

    # ========================================================
    # RÉCUPÉRATION
    # ========================================================

    annonces = (
        query
        .order_by(
            Annonce.date_publication.desc()
        )
        .limit(
            MAX_CANDIDATS_FUZZY
        )
        .all()
    )

    # ========================================================
    # RECHERCHE TEXTE
    # ========================================================

    texte = (
        normaliser_recherche(
            recherche
        )
        if recherche
        else ""
    )

    scores = {}

    if texte:

        noms = {
            annonce.id: (
                normaliser_recherche(
                    annonce.produit.nom
                )
            )
            for annonce
            in annonces
        }

        mapping = {
            nom: annonce_id
            for annonce_id, nom
            in noms.items()
        }

        matches = process.extract(
            texte,

            list(
                mapping.keys()
            ),

            scorer=fuzz.WRatio,

            limit=MAX_CANDIDATS_FUZZY,
        )

        ordre = []

        for (
            nom,
            score,
            _,
        ) in matches:

            annonce_id = (
                mapping[nom]
            )

            scores[
                annonce_id
            ] = round(
                float(score),
                2,
            )

            ordre.append(
                annonce_id
            )

        positions = {
            annonce_id: index
            for index, annonce_id
            in enumerate(ordre)
        }

        annonces.sort(
            key=lambda annonce: (
                -scores.get(
                    annonce.id,
                    0,
                ),

                positions.get(
                    annonce.id,
                    999999,
                ),
            )
        )

    # ========================================================
    # RECHERCHE PAR PROXIMITÉ SÉCURISÉE
    # ========================================================

    distance_map = {}

    if (
        latitude is not None
        and longitude is not None
    ):

        annonces_avec_coordonnees = []

        for annonce in annonces:

            # ------------------------------------------------
            # SÉCURITÉ :
            # on ne calcule jamais publiquement
            # la distance vers un domicile privé.
            # ------------------------------------------------

            if not localisation_itineraire_autorisee(
                annonce
            ):
                continue

            if (
                annonce.latitude
                is None
                or annonce.longitude
                is None
            ):
                continue

            distance = (
                calculer_distance_km(
                    latitude,
                    longitude,
                    annonce.latitude,
                    annonce.longitude,
                )
            )

            if (
                rayon_km is not None
                and distance > rayon_km
            ):
                continue

            distance_map[
                annonce.id
            ] = distance

            annonces_avec_coordonnees.append(
                annonce
            )

        annonces = (
            annonces_avec_coordonnees
        )

        annonces.sort(
            key=lambda annonce: (
                distance_map.get(
                    annonce.id,
                    float("inf"),
                )
            )
        )

    # ========================================================
    # LIMITE FINALE
    # ========================================================

    annonces = annonces[
        :limit
    ]

    # ========================================================
    # CORRECTION
    # ========================================================

    correction = None

    if texte and scores:

        meilleure_annonce_id = max(
            scores,
            key=scores.get,
        )

        meilleur_score = (
            scores[
                meilleure_annonce_id
            ]
        )

        if (
            meilleur_score
            >= SEUIL_CORRECTION_RAPIDFUZZ
        ):

            for annonce in annonces:

                if (
                    annonce.id
                    == meilleure_annonce_id
                ):

                    nom_produit = (
                        annonce.produit.nom
                    )

                    if (
                        normaliser_recherche(
                            nom_produit
                        )
                        != texte
                    ):

                        correction = (
                            nom_produit
                        )

                    break

    return {
        "recherche_originale": (
            recherche
        ),

        "correction": correction,

        "annonces": annonces,

        "scores": scores,

        "distances_km": distance_map,
    }


# ============================================================
# LISTE ANNONCES EN ATTENTE
# ============================================================


def lister_annonces_en_attente(
    db: Session,
) -> list[Annonce]:
    """
    Retourne les annonces en attente.
    """

    return (
        db.query(
            Annonce
        )
        .options(
            selectinload(
                Annonce.produit
            ),
            selectinload(
                Annonce.vendeur
            ),
            selectinload(
                Annonce.images
            ),
        )
        .filter(
            Annonce.statut
            == STATUT_ANNONCE_EN_ATTENTE
        )
        .order_by(
            Annonce.date_publication.asc(),
            Annonce.id.asc(),
        )
        .all()
    )


# ============================================================
# MODÉRATION — DÉTAIL
# ============================================================


def obtenir_annonce_moderation(
    db: Session,
    annonce_id: int,
) -> Annonce:
    """
    Récupère une annonce pour la modération.

    Les modérateurs autorisés peuvent accéder
    aux coordonnées exactes afin de contrôler
    les informations fournies par le vendeur.
    """

    annonce = obtenir_annonce(
        db,
        annonce_id,
    )

    if (
        annonce.statut
        != STATUT_ANNONCE_EN_ATTENTE
    ):

        raise AnnouncementAlreadyProcessedError(
            "Cette annonce a déjà été traitée."
        )

    return annonce


# ============================================================
# IMAGE
# ============================================================


def creer_image_annonce(
    db: Session,
    annonce_id: int,
    url: str,
) -> ImageAnnonce:
    """
    Crée une référence d'image en base.
    """

    annonce = obtenir_annonce(
        db,
        annonce_id,
    )

    url = nettoyer_texte(
        url
    )

    if not url:

        raise ProductValidationError(
            "L'URL de l'image est obligatoire."
        )

    image = ImageAnnonce(
        annonce_id=annonce.id,
        url=url,
    )

    db.add(
        image
    )

    db.flush()

    return image


# ============================================================
# SUPPRIMER IMAGE
# ============================================================


def supprimer_image_annonce(
    db: Session,
    annonce_id: int,
    image_id: int,
) -> tuple[
    ImageAnnonce,
    Path | None,
]:
    """
    Supprime une image de la base.

    Retourne également le chemin éventuel
    permettant à la route de supprimer le fichier.
    """

    image = (
        db.query(
            ImageAnnonce
        )
        .filter(
            ImageAnnonce.id
            == image_id,

            ImageAnnonce.annonce_id
            == annonce_id,
        )
        .first()
    )

    if image is None:

        raise ProductServiceError(
            "Image introuvable."
        )

    chemin = None

    if image.url.startswith(
        "/uploads/"
    ):

        chemin = Path(
            image.url.lstrip("/")
        )

    db.delete(
        image
    )

    db.flush()

    return (
        image,
        chemin,
    )


# ============================================================
# SUPPRESSION ANNONCE
# ============================================================


def supprimer_annonce(
    db: Session,
    annonce_id: int,
    current_user: Utilisateur,
) -> list[Path]:
    """
    Supprime une annonce appartenant au vendeur
    connecté ou à l'administration.

    Retourne les fichiers à supprimer sur disque.
    """

    annonce = obtenir_annonce(
        db,
        annonce_id,
    )

    est_proprietaire = (
        annonce.vendeur_id
        == current_user.id
    )

    est_admin = (
        current_user.role
        in ROLE_ADMIN
    )

    if not (
        est_proprietaire
        or est_admin
    ):

        raise ProductPermissionError(
            "Vous n'êtes pas autorisé "
            "à supprimer cette annonce."
        )

    chemins = []

    for image in annonce.images:

        if image.url.startswith(
            "/uploads/"
        ):

            chemins.append(
                Path(
                    image.url.lstrip("/")
                )
            )

    db.delete(
        annonce
    )

    db.flush()

    return chemins


# ============================================================
# VÉRIFIER DROITS MODÉRATION
# ============================================================


def verifier_droits_moderation(
    utilisateur: Utilisateur,
) -> None:
    """
    Vérifie les droits de modération.
    """

    if (
        utilisateur.role
        not in ROLE_MODERATION
    ):

        raise ProductPermissionError(
            "Accès réservé aux modérateurs "
            "et administrateurs."
        )


# ============================================================
# RÉCUPÉRER HISTORIQUE ANNONCE
# ============================================================


def obtenir_historique_annonce(
    db: Session,
    annonce_id: int,
) -> list[HistoriqueModeration]:
    """
    Retourne l'historique chronologique
    d'une annonce.
    """

    obtenir_annonce(
        db,
        annonce_id,
    )

    return (
        db.query(
            HistoriqueModeration
        )
        .options(
            selectinload(
                HistoriqueModeration.acteur
            )
        )
        .filter(
            HistoriqueModeration.annonce_id
            == annonce_id
        )
        .order_by(
            HistoriqueModeration.date_action.asc(),
            HistoriqueModeration.id.asc(),
        )
        .all()
    )


# ============================================================
# STATISTIQUES PRODUITS
# ============================================================


def statistiques_produits(
    db: Session,
) -> dict[str, int]:
    """
    Statistiques de base du catalogue.
    """

    total = (
        db.query(
            func.count(
                Produit.id
            )
        )
        .scalar()
        or 0
    )

    valides = (
        db.query(
            func.count(
                Produit.id
            )
        )
        .filter(
            Produit.est_valide
            .is_(True)
        )
        .scalar()
        or 0
    )

    non_valides = (
        total
        - valides
    )

    bruts = (
        db.query(
            func.count(
                Produit.id
            )
        )
        .filter(
            Produit.type_produit
            == TYPE_BRUT,

            Produit.est_valide
            .is_(True),
        )
        .scalar()
        or 0
    )

    transformes = (
        db.query(
            func.count(
                Produit.id
            )
        )
        .filter(
            Produit.type_produit
            == TYPE_TRANSFORME,

            Produit.est_valide
            .is_(True),
        )
        .scalar()
        or 0
    )

    agricoles = (
        db.query(
            func.count(
                Produit.id
            )
        )
        .filter(
            Produit.secteur
            == SECTEUR_AGRICOLE,

            Produit.est_valide
            .is_(True),
        )
        .scalar()
        or 0
    )

    elevage = (
        db.query(
            func.count(
                Produit.id
            )
        )
        .filter(
            Produit.secteur
            == SECTEUR_ELEVAGE,

            Produit.est_valide
            .is_(True),
        )
        .scalar()
        or 0
    )

    materiel_agricole = (
        db.query(
            func.count(
                Produit.id
            )
        )
        .filter(
            Produit.secteur
            == SECTEUR_MATERIEL_AGRICOLE,

            Produit.est_valide
            .is_(True),
        )
        .scalar()
        or 0
    )

    engrais = (
        db.query(
            func.count(
                Produit.id
            )
        )
        .filter(
            Produit.secteur
            == SECTEUR_ENGRAIS,

            Produit.est_valide
            .is_(True),
        )
        .scalar()
        or 0
    )

    phytosanitaires = (
        db.query(
            func.count(
                Produit.id
            )
        )
        .filter(
            Produit.secteur
            == SECTEUR_PHYTOSANITAIRE,

            Produit.est_valide
            .is_(True),
        )
        .scalar()
        or 0
    )

    return {
        "total": total,

        "valides": valides,

        "non_valides": non_valides,

        "bruts": bruts,

        "transformes": transformes,

        "agricoles": agricoles,

        "elevage": elevage,

        "materiel_agricole": (
            materiel_agricole
        ),

        "engrais": engrais,

        "phytosanitaires": (
            phytosanitaires
        ),
    }


# ============================================================
# STATISTIQUES ANNONCES
# ============================================================


def statistiques_annonces(
    db: Session,
) -> dict[str, int]:
    """
    Statistiques des annonces.

    Inclut également les informations de localisation.
    """

    total = (
        db.query(
            func.count(
                Annonce.id
            )
        )
        .scalar()
        or 0
    )

    en_attente = (
        db.query(
            func.count(
                Annonce.id
            )
        )
        .filter(
            Annonce.statut
            == STATUT_ANNONCE_EN_ATTENTE
        )
        .scalar()
        or 0
    )

    publiees = (
        db.query(
            func.count(
                Annonce.id
            )
        )
        .filter(
            Annonce.statut
            == STATUT_ANNONCE_PUBLIEE
        )
        .scalar()
        or 0
    )

    refusees = (
        db.query(
            func.count(
                Annonce.id
            )
        )
        .filter(
            Annonce.statut
            == STATUT_ANNONCE_REFUSEE
        )
        .scalar()
        or 0
    )

    geolocalisees = (
        db.query(
            func.count(
                Annonce.id
            )
        )
        .filter(
            Annonce.latitude
            .isnot(None),

            Annonce.longitude
            .isnot(None),
        )
        .scalar()
        or 0
    )

    # ========================================================
    # LOCALISATIONS PUBLIQUES
    # ========================================================

    localisations_publiques = (
        db.query(
            func.count(
                Annonce.id
            )
        )
        .filter(
            Annonce.visibilite_localisation
            == VISIBILITE_PUBLIQUE,

            Annonce.latitude
            .isnot(None),

            Annonce.longitude
            .isnot(None),
        )
        .scalar()
        or 0
    )

    # ========================================================
    # LOCALISATIONS APPROXIMATIVES
    # ========================================================

    localisations_approximatives = (
        db.query(
            func.count(
                Annonce.id
            )
        )
        .filter(
            Annonce.visibilite_localisation
            == VISIBILITE_PRIVEE,
        )
        .scalar()
        or 0
    )

    # ========================================================
    # LOCALISATIONS PRIVÉES
    # ========================================================

    localisations_privees = (
        db.query(
            func.count(
                Annonce.id
            )
        )
        .filter(
            Annonce.visibilite_localisation
            == VISIBILITE_PRIVEE,
        )
        .scalar()
        or 0
    )

    # ========================================================
    # DOMICILES
    # ========================================================

    domiciles = (
        db.query(
            func.count(
                Annonce.id
            )
        )
        .filter(
            Annonce.type_localisation
            == TYPE_LOCALISATION_DOMICILE,
        )
        .scalar()
        or 0
    )

    return {
        "total": total,

        "en_attente": en_attente,

        "publiees": publiees,

        "refusees": refusees,

        "geolocalisees": geolocalisees,

        "localisations_publiques": (
            localisations_publiques
        ),

        "localisations_approximatives": (
            localisations_approximatives
        ),

        "localisations_privees": (
            localisations_privees
        ),

        "domiciles": domiciles,
    }