from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# BASE
# ============================================================

class NotificationBaseModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )


# ============================================================
# TYPE DE NOTIFICATION
# ============================================================

class TypeNotification(str, Enum):
    """
    Types utilisés par AgroMarket Burkina.
    """

    INFO = "info"

    COMMANDE = "commande"

    COMMANDE_NOUVELLE = "commande_nouvelle"

    COMMANDE_ACCEPTEE = "commande_confirmee"

    COMMANDE_REFUSEE = "commande_preparee"

    COMMANDE_LIVREE = "commande_livree"

    COMMANDE_ANNULEE = "commande_annulee"

    MODERATION = "moderation"
    ANNONCE_SOUMISE = "annonce_soumise"

    ANNONCE_APPROUVEE = "annonce_approuvee"

    ANNONCE_REFUSEE = "annonce_refusee"

    ANNONCE_REMISE_EN_MODERATION = (
        "annonce_remise_en_moderation"
        )

    VENDEUR = "vendeur"

    VENDEUR_ACCEPTE = "vendeur_accepte"

    VENDEUR_REFUSE = "vendeur_refuse"

    SYSTEME = "systeme"


# ============================================================
# CRÉATION
# ============================================================

class NotificationCreate(NotificationBaseModel):

    utilisateur_id: int = Field(
        ...,
        gt=0,
    )

    type: TypeNotification = (
        TypeNotification.INFO
    )

    titre: str = Field(
        ...,
        min_length=2,
        max_length=150,
    )

    message: str = Field(
        ...,
        min_length=2,
        max_length=1000,
    )

    lien: str | None = Field(
        default=None,
        max_length=500,
    )

    reference_id: int | None = Field(
        default=None,
        gt=0,
    )


# ============================================================
# RÉPONSE
# ============================================================

class NotificationResponse(
    NotificationBaseModel
):

    id: int

    utilisateur_id: int

    type: TypeNotification

    titre: str

    message: str

    est_lue: bool

    date_lecture: datetime | None = None

    lien: str | None = None

    reference_id: int | None = None

    date_creation: datetime


# ============================================================
# LISTE
# ============================================================

class NotificationListResponse(
    NotificationBaseModel
):

    notifications: list[
        NotificationResponse
    ]

    total: int

    non_lues: int


# ============================================================
# COMPTEUR
# ============================================================

class NotificationCountResponse(
    NotificationBaseModel
):

    total: int

    non_lues: int


# ============================================================
# ACTION
# ============================================================

class NotificationActionResponse(
    NotificationBaseModel
):

    message: str


# ============================================================
# MARQUER COMME LUE
# ============================================================

class NotificationReadResponse(
    NotificationBaseModel
):

    message: str

    notification: NotificationResponse