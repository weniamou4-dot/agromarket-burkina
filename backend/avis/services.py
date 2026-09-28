
from __future__ import annotations

from math import ceil
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from models import Avis, Annonce, Commande, Utilisateur


# ============================================================
# EXCEPTIONS
# ============================================================


class AvisServiceError(Exception):
    """Erreur générale du service des avis."""


class AvisNotFoundError(AvisServiceError):
    """Avis introuvable."""


class AvisAnnonceNotFoundError(AvisServiceError):
    """Annonce introuvable."""


class AvisUtilisateurNotFoundError(AvisServiceError):
    """Utilisateur introuvable."""


class AvisCommandeNotFoundError(AvisServiceError):
    """Commande introuvable."""


class AvisPermissionError(AvisServiceError):
    """Action non autorisée."""


class AvisValidationError(AvisServiceError):
    """Données invalides."""


class AvisConflictError(AvisServiceError):
    """Conflit métier."""


# ============================================================
# CONSTANTES
# ============================================================


ROLES_ADMIN = {
    "admin",
    "administrateur",
}

ROLES_MODERATION = {
    "admin",
    "administrateur",
    "moderateur",
}


# ============================================================
# UTILITAIRES
# ============================================================


def nettoyer_texte(texte: Optional[str]) -> Optional[str]:
    """
    Nettoie un texte utilisateur :

    - suppression des espaces inutiles ;
    - remplacement des espaces multiples ;
    - conversion d'une chaîne vide en None.
    """

    if texte is None:
        return None

    texte = " ".join(texte.strip().split())

    return texte if texte else None


def obtenir_utilisateur(
    db: Session,
    utilisateur_id: int,
) -> Utilisateur:
    """
    Récupère un utilisateur par son identifiant.
    """

    utilisateur = db.get(Utilisateur, utilisateur_id)

    if utilisateur is None:
        raise AvisUtilisateurNotFoundError(
            "Utilisateur introuvable."
        )

    return utilisateur


def obtenir_annonce(
    db: Session,
    annonce_id: int,
) -> Annonce:
    """
    Récupère une annonce par son identifiant.
    """

    annonce = db.get(Annonce, annonce_id)

    if annonce is None:
        raise AvisAnnonceNotFoundError(
            "Annonce introuvable."
        )

    return annonce


def obtenir_commande(
    db: Session,
    commande_id: int,
) -> Commande:
    """
    Récupère une commande par son identifiant.
    """

    commande = db.get(Commande, commande_id)

    if commande is None:
        raise AvisCommandeNotFoundError(
            "Commande introuvable."
        )

    return commande


# ============================================================
# VÉRIFICATION DES DROITS
# ============================================================


def verifier_droits_admin(
    utilisateur: Utilisateur,
) -> None:
    """
    Vérifie que l'utilisateur possède les droits administrateur.
    """

    role = (
        getattr(utilisateur, "role", "") or ""
    ).lower()

    if role not in ROLES_ADMIN:
        raise AvisPermissionError(
            "Accès réservé aux administrateurs."
        )


def verifier_droits_moderation(
    utilisateur: Utilisateur,
) -> None:
    """
    Vérifie que l'utilisateur possède les droits de modération.
    """

    role = (
        getattr(utilisateur, "role", "") or ""
    ).lower()

    if role not in ROLES_MODERATION:
        raise AvisPermissionError(
            "Accès réservé à la modération."
        )


# ============================================================
# VÉRIFICATION MÉTIER
# ============================================================


def verifier_commande_pour_avis(
    db: Session,
    commande: Commande,
    utilisateur_id: int,
    annonce_id: int,
) -> None:
    """
    Vérifie qu'une commande peut être utilisée
    pour déposer un avis.

    Règles :

    - la commande doit appartenir à l'utilisateur ;
    - la commande doit correspondre à l'annonce ;
    - la commande doit être terminée/livrée lorsque
      son statut est renseigné.
    """

    if commande.acheteur_id != utilisateur_id:
        raise AvisPermissionError(
            "Cette commande ne vous appartient pas."
        )

    if commande.annonce_id != annonce_id:
        raise AvisValidationError(
            "La commande ne correspond pas à cette annonce."
        )

    statut = (
        getattr(commande, "statut", "") or ""
    ).lower()

    statuts_acceptes = {
        "livree",
        "livré",
        "livrée",
        "terminee",
        "terminée",
        "completee",
        "complétée",
    }

    if statut and statut not in statuts_acceptes:
        raise AvisValidationError(
            "Vous pourrez laisser un avis lorsque "
            "la commande sera terminée ou livrée."
        )


def verifier_unique_avis(
    db: Session,
    utilisateur_id: int,
    annonce_id: int,
    commande_id: Optional[int] = None,
    avis_id: Optional[int] = None,
) -> None:
    """
    Vérifie qu'un utilisateur n'a pas déjà laissé
    un avis pour cette annonce.

    La règle d'unicité est :

        utilisateur + annonce

    La commande ne change pas cette règle.
    """

    stmt = select(Avis).where(
        Avis.utilisateur_id == utilisateur_id,
        Avis.annonce_id == annonce_id,
    )

    if avis_id is not None:
        stmt = stmt.where(
            Avis.id != avis_id
        )

    avis_existant = (
        db.execute(stmt)
        .scalar_one_or_none()
    )

    if avis_existant is not None:
        raise AvisConflictError(
            "Vous avez déjà publié un avis pour cette annonce."
        )


# ============================================================
# CRÉER UN AVIS
# ============================================================


def creer_avis(
    db: Session,
    utilisateur_id: int,
    annonce_id: int,
    note: int,
    commentaire: Optional[str] = None,
    commande_id: Optional[int] = None,
) -> Avis:
    """
    Crée un avis sur une annonce.
    """

    # --------------------------------------------------------
    # Validation de la note
    # --------------------------------------------------------

    if note < 1 or note > 5:
        raise AvisValidationError(
            "La note doit être comprise entre 1 et 5."
        )

    # --------------------------------------------------------
    # Vérification utilisateur
    # --------------------------------------------------------

    utilisateur = obtenir_utilisateur(
        db,
        utilisateur_id,
    )

    # --------------------------------------------------------
    # Vérification annonce
    # --------------------------------------------------------

    annonce = obtenir_annonce(
        db,
        annonce_id,
    )

    # --------------------------------------------------------
    # Nettoyage commentaire
    # --------------------------------------------------------

    commentaire = nettoyer_texte(
        commentaire
    )

    # --------------------------------------------------------
    # Vérification commande éventuelle
    # --------------------------------------------------------

    commande = None

    if commande_id is not None:
        commande = obtenir_commande(
            db,
            commande_id,
        )

        verifier_commande_pour_avis(
            db=db,
            commande=commande,
            utilisateur_id=utilisateur.id,
            annonce_id=annonce.id,
        )

    # --------------------------------------------------------
    # Vérification unicité
    # --------------------------------------------------------

    verifier_unique_avis(
        db=db,
        utilisateur_id=utilisateur.id,
        annonce_id=annonce.id,
    )

    # --------------------------------------------------------
    # Création
    # --------------------------------------------------------

    avis = Avis(
        utilisateur_id=utilisateur.id,
        annonce_id=annonce.id,
        commande_id=commande_id,
        note=note,
        commentaire=commentaire,
        est_visible=True,
    )

    db.add(avis)

    # Flush pour obtenir l'identifiant immédiatement
    db.flush()

    return avis


# ============================================================
# OBTENIR UN AVIS
# ============================================================


def obtenir_avis(
    db: Session,
    avis_id: int,
) -> Avis:
    """
    Récupère un avis avec son utilisateur et son annonce.
    """

    stmt = (
        select(Avis)
        .options(
            selectinload(Avis.utilisateur),
            selectinload(Avis.annonce),
        )
        .where(
            Avis.id == avis_id
        )
    )

    avis = (
        db.execute(stmt)
        .scalar_one_or_none()
    )

    if avis is None:
        raise AvisNotFoundError(
            "Avis introuvable."
        )

    return avis


# ============================================================
# MODIFIER UN AVIS
# ============================================================


def modifier_avis(
    db: Session,
    avis_id: int,
    utilisateur_id: int,
    note: Optional[int] = None,
    commentaire: Optional[str] = None,
) -> Avis:
    """
    Modifie un avis appartenant à l'utilisateur connecté.
    """

    avis = obtenir_avis(
        db,
        avis_id,
    )

    # --------------------------------------------------------
    # Vérification propriétaire
    # --------------------------------------------------------

    if avis.utilisateur_id != utilisateur_id:
        raise AvisPermissionError(
            "Vous ne pouvez modifier que votre propre avis."
        )

    # --------------------------------------------------------
    # Modification note
    # --------------------------------------------------------

    if note is not None:

        if note < 1 or note > 5:
            raise AvisValidationError(
                "La note doit être comprise entre 1 et 5."
            )

        avis.note = note

    # --------------------------------------------------------
    # Modification commentaire
    # --------------------------------------------------------

    if commentaire is not None:
        avis.commentaire = nettoyer_texte(
            commentaire
        )

    db.flush()

    return avis


# ============================================================
# SUPPRIMER UN AVIS
# ============================================================


def supprimer_avis(
    db: Session,
    avis_id: int,
    utilisateur_id: int,
) -> None:
    """
    Supprime un avis appartenant à l'utilisateur connecté.
    """

    avis = obtenir_avis(
        db,
        avis_id,
    )

    # --------------------------------------------------------
    # Vérification propriétaire
    # --------------------------------------------------------

    if avis.utilisateur_id != utilisateur_id:
        raise AvisPermissionError(
            "Vous ne pouvez supprimer que votre propre avis."
        )

    db.delete(avis)
    db.flush()


# ============================================================
# MODIFIER LA VISIBILITÉ
# ============================================================


def modifier_visibilite_avis(
    db: Session,
    avis_id: int,
    visible: bool,
) -> Avis:
    """
    Modifie la visibilité publique d'un avis.

    Important :
    le modèle utilise le champ `est_visible`.
    """

    avis = obtenir_avis(
        db,
        avis_id,
    )

    avis.est_visible = visible

    db.flush()

    return avis


# ============================================================
# AVIS D'UNE ANNONCE
# ============================================================


def avis_par_annonce(
    db: Session,
    annonce_id: int,
    uniquement_visibles: bool = True,
) -> list[Avis]:
    """
    Retourne les avis associés à une annonce.
    """

    # --------------------------------------------------------
    # Vérification annonce
    # --------------------------------------------------------

    obtenir_annonce(
        db,
        annonce_id,
    )

    # --------------------------------------------------------
    # Requête
    # --------------------------------------------------------

    stmt = (
        select(Avis)
        .options(
            selectinload(Avis.utilisateur)
        )
        .where(
            Avis.annonce_id == annonce_id
        )
        .order_by(
            Avis.date_creation.desc()
        )
    )

    # --------------------------------------------------------
    # Filtre visibilité
    # --------------------------------------------------------

    if uniquement_visibles:
        stmt = stmt.where(
            Avis.est_visible.is_(True)
        )

    return list(
        db.execute(stmt)
        .scalars()
        .all()
    )


# ============================================================
# AVIS D'UN UTILISATEUR
# ============================================================


def avis_par_utilisateur(
    db: Session,
    utilisateur_id: int,
) -> list[Avis]:
    """
    Retourne tous les avis publiés par un utilisateur.
    """

    obtenir_utilisateur(
        db,
        utilisateur_id,
    )

    stmt = (
        select(Avis)
        .options(
            selectinload(Avis.annonce)
        )
        .where(
            Avis.utilisateur_id == utilisateur_id
        )
        .order_by(
            Avis.date_creation.desc()
        )
    )

    return list(
        db.execute(stmt)
        .scalars()
        .all()
    )


# ============================================================
# RECHERCHE / FILTRE
# ============================================================


def rechercher_avis(
    db: Session,
    annonce_id: Optional[int] = None,
    utilisateur_id: Optional[int] = None,
    note: Optional[int] = None,
    visible: Optional[bool] = None,
) -> list[Avis]:
    """
    Recherche des avis selon différents critères.
    """

    stmt = select(Avis)

    # --------------------------------------------------------
    # Filtre annonce
    # --------------------------------------------------------

    if annonce_id is not None:
        stmt = stmt.where(
            Avis.annonce_id == annonce_id
        )

    # --------------------------------------------------------
    # Filtre utilisateur
    # --------------------------------------------------------

    if utilisateur_id is not None:
        stmt = stmt.where(
            Avis.utilisateur_id == utilisateur_id
        )

    # --------------------------------------------------------
    # Filtre note
    # --------------------------------------------------------

    if note is not None:

        if note < 1 or note > 5:
            raise AvisValidationError(
                "La note doit être comprise entre 1 et 5."
            )

        stmt = stmt.where(
            Avis.note == note
        )

    # --------------------------------------------------------
    # Filtre visibilité
    # --------------------------------------------------------

    if visible is not None:
        stmt = stmt.where(
            Avis.est_visible == visible
        )

    # --------------------------------------------------------
    # Tri
    # --------------------------------------------------------

    stmt = stmt.order_by(
        Avis.date_creation.desc()
    )

    return list(
        db.execute(stmt)
        .scalars()
        .all()
    )


# ============================================================
# PAGINATION
# ============================================================


def paginer_avis(
    avis: list[Avis],
    page: int,
    limit: int,
) -> dict:
    """
    Paginer une liste d'avis.
    """

    if page < 1:
        page = 1

    if limit < 1:
        limit = 20

    # Protection contre une limite excessive
    if limit > 100:
        limit = 100

    total = len(avis)

    pages = (
        ceil(total / limit)
        if total
        else 1
    )

    debut = (page - 1) * limit
    fin = debut + limit

    return {
        "avis": avis[debut:fin],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
    }


# ============================================================
# STATISTIQUES
# ============================================================


def statistiques_avis(
    db: Session,
    annonce_id: Optional[int] = None,
) -> dict:
    """
    Calcule les statistiques des avis visibles.

    Retourne :

    - nombre total d'avis ;
    - moyenne ;
    - nombre d'avis pour chaque note de 1 à 5.
    """

    # --------------------------------------------------------
    # Conditions communes
    # --------------------------------------------------------

    conditions = [
        Avis.est_visible.is_(True)
    ]

    if annonce_id is not None:
        conditions.append(
            Avis.annonce_id == annonce_id
        )

    # --------------------------------------------------------
    # Nombre total
    # --------------------------------------------------------

    total = (
        db.execute(
            select(func.count(Avis.id))
            .where(*conditions)
        )
        .scalar_one()
    )

    # --------------------------------------------------------
    # Moyenne
    # --------------------------------------------------------

    moyenne = (
        db.execute(
            select(func.avg(Avis.note))
            .where(*conditions)
        )
        .scalar_one()
    )

    # --------------------------------------------------------
    # Statistiques par note
    # --------------------------------------------------------

    statistiques_notes = {}

    for note in range(1, 6):

        nombre = (
            db.execute(
                select(func.count(Avis.id))
                .where(
                    *conditions,
                    Avis.note == note,
                )
            )
            .scalar_one()
        )

        statistiques_notes[
            f"note_{note}"
        ] = int(nombre or 0)

    # --------------------------------------------------------
    # Résultat
    # --------------------------------------------------------

    return {
        "total_avis": int(total or 0),
        "moyenne": round(
            float(moyenne or 0),
            2,
        ),
        **statistiques_notes,
    }
