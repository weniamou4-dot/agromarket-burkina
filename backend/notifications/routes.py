from __future__ import annotations

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy.orm import Session

from auth.routes import get_current_user
from database import get_db
from models import Utilisateur

from notifications.schemas import (
    NotificationActionResponse,
    NotificationCountResponse,
    NotificationCreate,
    NotificationListResponse,
    NotificationReadResponse,
    NotificationResponse,
)
from notifications.services import (
    NotificationPermissionError,
    NotificationServiceError,
    NotificationValidationError,
    creer_notification,
    lister_notifications,
    compter_notifications,
    compter_notifications_non_lues,
    marquer_comme_lue,
    marquer_toutes_comme_lues,
    supprimer_notification,
    supprimer_notifications_lues,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


# ============================================================
# ERREURS
# ============================================================

def convertir_erreur(
    exc: Exception,
) -> HTTPException:

    if isinstance(
        exc,
        NotificationPermissionError,
    ):
        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        )

    if isinstance(
        exc,
        NotificationValidationError,
    ):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Une erreur est survenue.",
    )


# ============================================================
# MES NOTIFICATIONS
# ============================================================

@router.get(
    "/",
    response_model=NotificationListResponse,
)
def mes_notifications(
    non_lues: bool = Query(
        default=False,
    ),
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
    ),
    db: Session = Depends(get_db),
    utilisateur: Utilisateur = Depends(
        get_current_user
    ),
):

    try:

        notifications = lister_notifications(
            db=db,
            utilisateur_id=utilisateur.id,
            uniquement_non_lues=non_lues,
            limit=limit,
        )

        total = compter_notifications(
            db,
            utilisateur.id,
        )

        non_lues_total = (
            compter_notifications_non_lues(
                db,
                utilisateur.id,
            )
        )

        return NotificationListResponse(
            notifications=notifications,
            total=total,
            non_lues=non_lues_total,
        )

    except NotificationServiceError as exc:
        raise convertir_erreur(exc)


# ============================================================
# COMPTEUR
# ============================================================

@router.get(
    "/compteur",
    response_model=NotificationCountResponse,
)
def compteur_notifications_route(
    db: Session = Depends(get_db),
    utilisateur: Utilisateur = Depends(
        get_current_user
    ),
):

    try:

        total = compter_notifications(
            db,
            utilisateur.id,
        )

        non_lues = (
            compter_notifications_non_lues(
                db,
                utilisateur.id,
            )
        )

        return NotificationCountResponse(
            total=total,
            non_lues=non_lues,
        )

    except NotificationServiceError as exc:
        raise convertir_erreur(exc)


# ============================================================
# CRÉER UNE NOTIFICATION
# ============================================================

@router.post(
    "/",
    response_model=NotificationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_notification(
    data: NotificationCreate,
    db: Session = Depends(get_db),
    utilisateur: Utilisateur = Depends(
        get_current_user
    ),
):

    # Une notification concernant son propre compte
    # ne peut pas être envoyée librement par un utilisateur.
    if (
        data.utilisateur_id
        != utilisateur.id
    ):

        role = (
            getattr(
                utilisateur,
                "role",
                "",
            )
            or ""
        ).lower()

        if role not in {
            "admin",
            "administrateur",
        }:

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Vous n'êtes pas autorisé "
                    "à créer une notification "
                    "pour cet utilisateur."
                ),
            )

    try:

        notification = creer_notification(
            db=db,
            utilisateur_id=data.utilisateur_id,
            type_notification=data.type,
            titre=data.titre,
            message=data.message,
            lien=data.lien,
            reference_id=data.reference_id,
        )

        db.commit()
        db.refresh(notification)

        return notification

    except NotificationServiceError as exc:

        db.rollback()
        raise convertir_erreur(exc)


# ============================================================
# MARQUER UNE NOTIFICATION COMME LUE
# ============================================================

@router.patch(
    "/{notification_id}/lue",
    response_model=NotificationReadResponse,
)
def lire_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    utilisateur: Utilisateur = Depends(
        get_current_user
    ),
):

    try:

        notification = marquer_comme_lue(
            db=db,
            notification_id=notification_id,
            utilisateur_id=utilisateur.id,
        )

        db.commit()
        db.refresh(notification)

        return NotificationReadResponse(
            message="Notification marquée comme lue.",
            notification=notification,
        )

    except NotificationServiceError as exc:

        db.rollback()
        raise convertir_erreur(exc)


# ============================================================
# TOUT MARQUER COMME LU
# ============================================================

@router.patch(
    "/lues/toutes",
    response_model=NotificationActionResponse,
)
def lire_toutes_notifications(
    db: Session = Depends(get_db),
    utilisateur: Utilisateur = Depends(
        get_current_user
    ),
):

    try:

        total = marquer_toutes_comme_lues(
            db,
            utilisateur.id,
        )

        db.commit()

        return NotificationActionResponse(
            message=(
                f"{total} notification(s) "
                "marquée(s) comme lue(s)."
            )
        )

    except NotificationServiceError as exc:

        db.rollback()
        raise convertir_erreur(exc)


# ============================================================
# SUPPRIMER
# ============================================================

@router.delete(
    "/{notification_id}",
    response_model=NotificationActionResponse,
)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    utilisateur: Utilisateur = Depends(
        get_current_user
    ),
):

    try:

        supprimer_notification(
            db=db,
            notification_id=notification_id,
            utilisateur_id=utilisateur.id,
        )

        db.commit()

        return NotificationActionResponse(
            message="Notification supprimée avec succès."
        )

    except NotificationServiceError as exc:

        db.rollback()
        raise convertir_erreur(exc)


# ============================================================
# SUPPRIMER LES NOTIFICATIONS LUES
# ============================================================

@router.delete(
    "/lues",
    response_model=NotificationActionResponse,
)
def delete_notifications_lues(
    db: Session = Depends(get_db),
    utilisateur: Utilisateur = Depends(
        get_current_user
    ),
):

    try:

        total = supprimer_notifications_lues(
            db,
            utilisateur.id,
        )

        db.commit()

        return NotificationActionResponse(
            message=(
                f"{total} notification(s) "
                "lue(s) supprimée(s)."
            )
        )

    except NotificationServiceError as exc:

        db.rollback()
        raise convertir_erreur(exc)