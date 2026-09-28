from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Notification, Utilisateur

from notifications.schemas import TypeNotification


# ============================================================
# AGROMARKET BURKINA
# NOTIFICATIONS / SERVICES
# ============================================================


# ============================================================
# EXCEPTIONS
# ============================================================

class NotificationServiceError(Exception):
    """Erreur générale du service notification."""


class NotificationNotFoundError(
    NotificationServiceError
):
    """Notification introuvable."""


class NotificationUtilisateurNotFoundError(
    NotificationServiceError
):
    """Utilisateur introuvable."""


class NotificationPermissionError(
    NotificationServiceError
):
    """Accès non autorisé."""


class NotificationValidationError(
    NotificationServiceError
):
    """Données invalides."""


# ============================================================
# OUTILS
# ============================================================

def nettoyer_texte(
    valeur: Optional[str],
) -> Optional[str]:

    if valeur is None:
        return None

    valeur = " ".join(
        valeur.strip().split()
    )

    return valeur or None


def obtenir_utilisateur(
    db: Session,
    utilisateur_id: int,
) -> Utilisateur:

    utilisateur = (
        db.query(Utilisateur)
        .filter(
            Utilisateur.id
            == utilisateur_id
        )
        .first()
    )

    if utilisateur is None:
        raise NotificationUtilisateurNotFoundError(
            "Utilisateur introuvable."
        )

    return utilisateur


def obtenir_notification(
    db: Session,
    notification_id: int,
) -> Notification:

    notification = (
        db.query(Notification)
        .filter(
            Notification.id
            == notification_id
        )
        .first()
    )

    if notification is None:
        raise NotificationNotFoundError(
            "Notification introuvable."
        )

    return notification


def normaliser_type(
    type_notification,
) -> str:

    if isinstance(
        type_notification,
        TypeNotification,
    ):
        return type_notification.value

    valeur = (
        str(type_notification)
        .strip()
        .lower()
    )

    valeurs_valides = {
        item.value
        for item in TypeNotification
    }

    if valeur not in valeurs_valides:
        raise NotificationValidationError(
            "Type de notification invalide."
        )

    return valeur


# ============================================================
# CRÉER UNE NOTIFICATION
# ============================================================

def creer_notification(
    db: Session,
    utilisateur_id: int,
    type_notification,
    titre: str,
    message: str,
    lien: str | None = None,
    reference_id: int | None = None,
) -> Notification:

    utilisateur = obtenir_utilisateur(
        db,
        utilisateur_id,
    )

    titre = nettoyer_texte(titre)
    message = nettoyer_texte(message)
    lien = nettoyer_texte(lien)

    if not titre:
        raise NotificationValidationError(
            "Le titre est obligatoire."
        )

    if not message:
        raise NotificationValidationError(
            "Le message est obligatoire."
        )

    type_notification = normaliser_type(
        type_notification
    )

    notification = Notification(
        utilisateur_id=utilisateur.id,
        type=type_notification,
        titre=titre,
        message=message,
        est_lue=False,
        date_lecture=None,
        lien=lien,
        reference_id=reference_id,
    )

    db.add(notification)
    db.flush()

    return notification


# ============================================================
# NOTIFICATIONS SYSTÈME
# ============================================================

def notifier_utilisateur(
    db: Session,
    utilisateur_id: int,
    titre: str,
    message: str,
    type_notification=TypeNotification.INFO,
    lien: str | None = None,
    reference_id: int | None = None,
) -> Notification:

    return creer_notification(
        db=db,
        utilisateur_id=utilisateur_id,
        type_notification=type_notification,
        titre=titre,
        message=message,
        lien=lien,
        reference_id=reference_id,
    )


# ============================================================
# LISTER LES NOTIFICATIONS
# ============================================================

def lister_notifications(
    db: Session,
    utilisateur_id: int,
    uniquement_non_lues: bool = False,
    limit: int = 50,
) -> list[Notification]:

    obtenir_utilisateur(
        db,
        utilisateur_id,
    )

    limit = max(
        1,
        min(limit, 100),
    )

    query = (
        db.query(Notification)
        .filter(
            Notification.utilisateur_id
            == utilisateur_id
        )
    )

    if uniquement_non_lues:
        query = query.filter(
            Notification.est_lue.is_(False)
        )

    return (
        query
        .order_by(
            Notification.date_creation.desc(),
            Notification.id.desc(),
        )
        .limit(limit)
        .all()
    )


# ============================================================
# TOTAL
# ============================================================

def compter_notifications(
    db: Session,
    utilisateur_id: int,
) -> int:

    obtenir_utilisateur(
        db,
        utilisateur_id,
    )

    return int(
        db.query(
            func.count(Notification.id)
        )
        .filter(
            Notification.utilisateur_id
            == utilisateur_id
        )
        .scalar()
        or 0
    )


# ============================================================
# NON LUES
# ============================================================

def compter_notifications_non_lues(
    db: Session,
    utilisateur_id: int,
) -> int:

    obtenir_utilisateur(
        db,
        utilisateur_id,
    )

    return int(
        db.query(
            func.count(Notification.id)
        )
        .filter(
            Notification.utilisateur_id
            == utilisateur_id,
            Notification.est_lue.is_(False),
        )
        .scalar()
        or 0
    )


# ============================================================
# MARQUER COMME LUE
# ============================================================

def marquer_comme_lue(
    db: Session,
    notification_id: int,
    utilisateur_id: int,
) -> Notification:

    notification = obtenir_notification(
        db,
        notification_id,
    )

    if (
        notification.utilisateur_id
        != utilisateur_id
    ):
        raise NotificationPermissionError(
            "Cette notification ne vous appartient pas."
        )

    if not notification.est_lue:

        notification.est_lue = True

        notification.date_lecture = (
            datetime.now(timezone.utc)
        )

        db.flush()

    return notification


# ============================================================
# MARQUER TOUTES LES NOTIFICATIONS COMME LUES
# ============================================================

def marquer_toutes_comme_lues(
    db: Session,
    utilisateur_id: int,
) -> int:

    obtenir_utilisateur(
        db,
        utilisateur_id,
    )

    notifications = (
        db.query(Notification)
        .filter(
            Notification.utilisateur_id
            == utilisateur_id,
            Notification.est_lue.is_(False),
        )
        .all()
    )

    maintenant = datetime.now(
        timezone.utc
    )

    for notification in notifications:

        notification.est_lue = True
        notification.date_lecture = maintenant

    db.flush()

    return len(notifications)


# ============================================================
# SUPPRIMER
# ============================================================

def supprimer_notification(
    db: Session,
    notification_id: int,
    utilisateur_id: int,
) -> None:

    notification = obtenir_notification(
        db,
        notification_id,
    )

    if (
        notification.utilisateur_id
        != utilisateur_id
    ):
        raise NotificationPermissionError(
            "Cette notification ne vous appartient pas."
        )

    db.delete(notification)
    db.flush()


# ============================================================
# SUPPRIMER TOUTES LES NOTIFICATIONS LUES
# ============================================================

def supprimer_notifications_lues(
    db: Session,
    utilisateur_id: int,
) -> int:

    obtenir_utilisateur(
        db,
        utilisateur_id,
    )

    notifications = (
        db.query(Notification)
        .filter(
            Notification.utilisateur_id
            == utilisateur_id,
            Notification.est_lue.is_(True),
        )
        .all()
    )

    total = len(notifications)

    for notification in notifications:
        db.delete(notification)

    db.flush()

    return total