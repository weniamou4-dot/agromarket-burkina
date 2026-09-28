# ============================================================
# AGROMARKET BURKINA
# SERVICES - AVIS PLATEFORME
#
# Fonctionnalités :
# - Création d'un avis sur AgroMarket
# - Modification de son avis
# - Suppression de son avis
# - Récupération des avis publics
# - Récupération de son propre avis
# - Modération des avis
# - Calcul de la note moyenne
# - Statistiques globales
# ============================================================

from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Utilisateur

from .models import AvisPlateforme


# ============================================================
# CONSTANTES
# ============================================================

NOTE_MIN = 1
NOTE_MAX = 5

LONGUEUR_COMMENTAIRE_MAX = 1000

ROLES_MODERATION = {
    "admin",
    "administrateur",
    "moderateur",
}


# ============================================================
# EXCEPTIONS MÉTIER
# ============================================================


class AvisPlateformeServiceError(Exception):
    """Exception générale du service des avis plateforme."""


class AvisPlateformeNotFoundError(
    AvisPlateformeServiceError
):
    """Avis plateforme introuvable."""


class AvisPlateformeAlreadyExistsError(
    AvisPlateformeServiceError
):
    """L'utilisateur possède déjà un avis plateforme."""


class AvisPlateformePermissionError(
    AvisPlateformeServiceError
):
    """L'utilisateur n'a pas les droits nécessaires."""


class AvisPlateformeValidationError(
    AvisPlateformeServiceError
):
    """Données d'avis invalides."""


# ============================================================
# OUTILS INTERNES
# ============================================================


def _nettoyer_commentaire(
    commentaire: str | None,
) -> str | None:
    """
    Nettoie un commentaire avant son enregistrement.
    """

    if commentaire is None:
        return None

    commentaire = commentaire.strip()

    if not commentaire:
        return None

    if len(commentaire) > LONGUEUR_COMMENTAIRE_MAX:
        raise AvisPlateformeValidationError(
            "Le commentaire ne peut pas dépasser "
            f"{LONGUEUR_COMMENTAIRE_MAX} caractères."
        )

    return commentaire


def _valider_note(note: int) -> int:
    """
    Vérifie qu'une note est comprise entre 1 et 5.
    """

    if not isinstance(note, int):
        raise AvisPlateformeValidationError(
            "La note doit être un nombre entier."
        )

    if note < NOTE_MIN or note > NOTE_MAX:
        raise AvisPlateformeValidationError(
            "La note doit être comprise entre 1 et 5."
        )

    return note


def _verifier_utilisateur_actif(
    utilisateur: Utilisateur,
) -> None:
    """
    Vérifie que le compte utilisateur est actif.
    """

    if utilisateur is None:
        raise AvisPlateformePermissionError(
            "Utilisateur introuvable."
        )

    statut = getattr(
        utilisateur,
        "statut_compte",
        "actif",
    )

    if statut != "actif":
        raise AvisPlateformePermissionError(
            "Votre compte doit être actif pour effectuer "
            "cette opération."
        )


def _verifier_moderateur(
    utilisateur: Utilisateur,
) -> None:
    """
    Vérifie que l'utilisateur possède un rôle de modération.
    """

    if utilisateur is None:
        raise AvisPlateformePermissionError(
            "Utilisateur introuvable."
        )

    role = getattr(
        utilisateur,
        "role",
        None,
    )

    if role not in ROLES_MODERATION:
        raise AvisPlateformePermissionError(
            "Vous n'avez pas les droits nécessaires "
            "pour modérer les avis."
        )


# ============================================================
# RÉCUPÉRER UN AVIS
# ============================================================


def obtenir_avis_plateforme(
    db: Session,
    avis_id: int,
) -> AvisPlateforme:
    """
    Récupère un avis plateforme par son identifiant.
    """

    avis = (
        db.query(AvisPlateforme)
        .filter(
            AvisPlateforme.id == avis_id
        )
        .first()
    )

    if avis is None:
        raise AvisPlateformeNotFoundError(
            "Avis plateforme introuvable."
        )

    return avis


# ============================================================
# RÉCUPÉRER L'AVIS D'UN UTILISATEUR
# ============================================================


def obtenir_avis_utilisateur(
    db: Session,
    utilisateur_id: int,
) -> AvisPlateforme | None:
    """
    Récupère l'avis actuel d'un utilisateur.
    """

    return (
        db.query(AvisPlateforme)
        .filter(
            AvisPlateforme.utilisateur_id
            == utilisateur_id
        )
        .first()
    )


# ============================================================
# CRÉER UN AVIS
# ============================================================


def creer_avis_plateforme(
    db: Session,
    utilisateur: Utilisateur,
    note: int,
    commentaire: str | None = None,
) -> AvisPlateforme:
    """
    Crée un avis global sur AgroMarket Burkina.

    Un utilisateur ne peut avoir qu'un seul avis actuel.
    """

    _verifier_utilisateur_actif(utilisateur)

    note = _valider_note(note)

    commentaire = _nettoyer_commentaire(
        commentaire
    )

    avis_existant = obtenir_avis_utilisateur(
        db,
        utilisateur.id,
    )

    if avis_existant is not None:
        raise AvisPlateformeAlreadyExistsError(
            "Vous avez déjà publié un avis sur AgroMarket. "
            "Vous pouvez modifier votre avis existant."
        )

    avis = AvisPlateforme(
        utilisateur_id=utilisateur.id,
        note=note,
        commentaire=commentaire,
        est_visible=True,
    )

    db.add(avis)

    try:
        db.commit()
        db.refresh(avis)

    except Exception:
        db.rollback()
        raise

    return avis


# ============================================================
# MODIFIER SON AVIS
# ============================================================


def modifier_avis_plateforme(
    db: Session,
    avis_id: int,
    utilisateur: Utilisateur,
    note: int | None = None,
    commentaire: str | None = None,
) -> AvisPlateforme:
    """
    Permet à l'auteur de modifier son propre avis.
    """

    _verifier_utilisateur_actif(utilisateur)

    avis = obtenir_avis_plateforme(
        db,
        avis_id,
    )

    if avis.utilisateur_id != utilisateur.id:
        raise AvisPlateformePermissionError(
            "Vous ne pouvez modifier que votre propre avis."
        )

    if note is not None:
        avis.note = _valider_note(note)

    if commentaire is not None:
        avis.commentaire = _nettoyer_commentaire(
            commentaire
        )

    avis.date_modification = datetime.utcnow()

    db.add(avis)

    try:
        db.commit()
        db.refresh(avis)

    except Exception:
        db.rollback()
        raise

    return avis


# ============================================================
# SUPPRIMER SON AVIS
# ============================================================


def supprimer_avis_plateforme(
    db: Session,
    avis_id: int,
    utilisateur: Utilisateur,
) -> None:
    """
    Supprime son propre avis.
    """

    _verifier_utilisateur_actif(utilisateur)

    avis = obtenir_avis_plateforme(
        db,
        avis_id,
    )

    if avis.utilisateur_id != utilisateur.id:
        raise AvisPlateformePermissionError(
            "Vous ne pouvez supprimer que votre propre avis."
        )

    db.delete(avis)

    try:
        db.commit()

    except Exception:
        db.rollback()
        raise


# ============================================================
# LISTE DES AVIS PUBLICS
# ============================================================


def obtenir_avis_publics(
    db: Session,
    skip: int = 0,
    limit: int = 20,
) -> list[AvisPlateforme]:
    """
    Retourne uniquement les avis visibles publiquement.
    """

    if skip < 0:
        skip = 0

    if limit < 1:
        limit = 20

    if limit > 100:
        limit = 100

    return (
        db.query(AvisPlateforme)
        .filter(
            AvisPlateforme.est_visible.is_(True)
        )
        .order_by(
            AvisPlateforme.date_creation.desc()
        )
        .offset(skip)
        .limit(limit)
        .all()
    )


# ============================================================
# LISTE DES AVIS POUR MODÉRATION
# ============================================================


def obtenir_avis_pour_moderation(
    db: Session,
    moderateur: Utilisateur,
    skip: int = 0,
    limit: int = 50,
) -> list[AvisPlateforme]:
    """
    Retourne tous les avis à destination de la modération.
    """

    _verifier_moderateur(moderateur)

    if skip < 0:
        skip = 0

    if limit < 1:
        limit = 50

    if limit > 100:
        limit = 100

    return (
        db.query(AvisPlateforme)
        .order_by(
            AvisPlateforme.date_creation.desc()
        )
        .offset(skip)
        .limit(limit)
        .all()
    )


# ============================================================
# MASQUER UN AVIS
# ============================================================


def masquer_avis_plateforme(
    db: Session,
    avis_id: int,
    moderateur: Utilisateur,
) -> AvisPlateforme:
    """
    Masque un avis de l'affichage public.
    """

    _verifier_moderateur(moderateur)

    avis = obtenir_avis_plateforme(
        db,
        avis_id,
    )

    avis.est_visible = False
    avis.date_modification = datetime.utcnow()

    db.add(avis)

    try:
        db.commit()
        db.refresh(avis)

    except Exception:
        db.rollback()
        raise

    return avis


# ============================================================
# RENDRE UN AVIS VISIBLE
# ============================================================


def afficher_avis_plateforme(
    db: Session,
    avis_id: int,
    moderateur: Utilisateur,
) -> AvisPlateforme:
    """
    Rend un avis à nouveau visible publiquement.
    """

    _verifier_moderateur(moderateur)

    avis = obtenir_avis_plateforme(
        db,
        avis_id,
    )

    avis.est_visible = True
    avis.date_modification = datetime.utcnow()

    db.add(avis)

    try:
        db.commit()
        db.refresh(avis)

    except Exception:
        db.rollback()
        raise

    return avis


# ============================================================
# STATISTIQUES GLOBALES
# ============================================================


def obtenir_statistiques_avis_plateforme(
    db: Session,
) -> dict:
    """
    Calcule les statistiques globales des avis visibles.
    """

    nombre_total = (
        db.query(
            func.count(AvisPlateforme.id)
        )
        .scalar()
        or 0
    )

    nombre_visibles = (
        db.query(
            func.count(AvisPlateforme.id)
        )
        .filter(
            AvisPlateforme.est_visible.is_(True)
        )
        .scalar()
        or 0
    )

    nombre_invisibles = (
        db.query(
            func.count(AvisPlateforme.id)
        )
        .filter(
            AvisPlateforme.est_visible.is_(False)
        )
        .scalar()
        or 0
    )

    moyenne = (
        db.query(
            func.avg(AvisPlateforme.note)
        )
        .filter(
            AvisPlateforme.est_visible.is_(True)
        )
        .scalar()
    )

    note_moyenne = (
        round(float(moyenne), 2)
        if moyenne is not None
        else 0.0
    )

    # --------------------------------------------------------
    # RÉPARTITION DES NOTES
    # --------------------------------------------------------

    def compter_note(note: int) -> int:
        return (
            db.query(
                func.count(AvisPlateforme.id)
            )
            .filter(
                AvisPlateforme.note == note,
                AvisPlateforme.est_visible.is_(True),
            )
            .scalar()
            or 0
        )

    return {
        "nombre_total": int(nombre_total),
        "nombre_visibles": int(nombre_visibles),
        "nombre_invisibles": int(nombre_invisibles),
        "note_moyenne": note_moyenne,
        "cinq_etoiles": int(compter_note(5)),
        "quatre_etoiles": int(compter_note(4)),
        "trois_etoiles": int(compter_note(3)),
        "deux_etoiles": int(compter_note(2)),
        "une_etoile": int(compter_note(1)),
    }