# ============================================================
# AGROMARKET BURKINA
# HISTORIQUE / SCHEMAS
# Version professionnelle stabilisée
#
# Fonctionnalités :
# - historique des actions de modération
# - consultation par annonce
# - consultation par acteur
# - filtrage par action
# - pagination
# - statistiques
#
# Compatible avec le modèle :
#     HistoriqueModeration
# ============================================================

from datetime import datetime
from enum import Enum

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


# ============================================================
# CONFIGURATION COMMUNE
# ============================================================

class AgroHistoriqueBaseModel(BaseModel):
    """
    Configuration commune aux schémas du module Historique.
    """

    model_config = ConfigDict(
        from_attributes=True,
        str_strip_whitespace=True,
        extra="forbid",
    )


# ============================================================
# ACTIONS DE MODÉRATION
# ============================================================

class ActionModeration(str, Enum):
    """
    Actions officiellement enregistrées dans
    l'historique de modération.
    """

    SOUMISE = "soumise"

    APPROUVEE = "approuvee"

    REFUSEE = "refusee"

    REMISE_EN_MODERATION = (
        "remise_en_moderation"
    )


# ============================================================
# STATUTS D'ANNONCE
# ============================================================

class HistoriqueStatutAnnonce(str, Enum):
    """
    Statuts d'annonce utilisés lors du suivi
    des changements.
    """

    EN_ATTENTE = "en_attente"

    PUBLIEE = "publiee"

    REFUSEE = "refusee"


# ============================================================
# ACTEUR — RÉSUMÉ
# ============================================================

class HistoriqueActeurResume(
    AgroHistoriqueBaseModel
):
    """
    Informations publiques minimales
    de l'utilisateur ayant effectué l'action.
    """

    id: int = Field(
        ...,
        ge=1,
        description="Identifiant de l'acteur.",
    )

    nom: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Nom de l'acteur.",
    )

    role: str = Field(
        ...,
        min_length=2,
        max_length=30,
        description="Rôle de l'acteur.",
    )


# ============================================================
# CRÉATION INTERNE D'UN HISTORIQUE
# ============================================================

class HistoriqueModerationCreate(
    AgroHistoriqueBaseModel
):
    """
    Schéma utilisé par le backend pour créer
    une entrée d'historique.

    Ce schéma n'est pas destiné à être modifié
    directement par le frontend.
    """

    annonce_id: int = Field(
        ...,
        gt=0,
        description="Identifiant de l'annonce.",
    )

    acteur_id: int = Field(
        ...,
        gt=0,
        description="Identifiant de l'acteur.",
    )

    action: ActionModeration = Field(
        ...,
        description="Action effectuée.",
    )

    ancien_statut: (
        HistoriqueStatutAnnonce | None
    ) = Field(
        default=None,
        description="Ancien statut de l'annonce.",
    )

    nouveau_statut: (
        HistoriqueStatutAnnonce | None
    ) = Field(
        default=None,
        description="Nouveau statut de l'annonce.",
    )

    motif: str | None = Field(
        default=None,
        max_length=2000,
        description="Motif éventuel de l'action.",
    )

    @field_validator("motif")
    @classmethod
    def nettoyer_motif(
        cls,
        value: str | None,
    ) -> str | None:
        """
        Supprime les espaces inutiles.
        """

        if value is None:
            return None

        value = value.strip()

        return value if value else None


# ============================================================
# RÉPONSE HISTORIQUE
# ============================================================

class HistoriqueModerationResponse(
    AgroHistoriqueBaseModel
):
    """
    Représentation complète d'une action
    de modération.
    """

    id: int = Field(
        ...,
        ge=1,
        description="Identifiant de l'historique.",
    )

    annonce_id: int = Field(
        ...,
        gt=0,
        description="Identifiant de l'annonce.",
    )

    acteur_id: int = Field(
        ...,
        gt=0,
        description="Identifiant de l'acteur.",
    )

    action: ActionModeration = Field(
        ...,
        description="Action effectuée.",
    )

    ancien_statut: (
        HistoriqueStatutAnnonce | None
    ) = Field(
        default=None,
    )

    nouveau_statut: (
        HistoriqueStatutAnnonce | None
    ) = Field(
        default=None,
    )

    motif: str | None = Field(
        default=None,
        max_length=2000,
    )

    date_action: datetime = Field(
        ...,
        description="Date de l'action.",
    )

    acteur: HistoriqueActeurResume | None = (
        None
    )


# ============================================================
# RÉSUMÉ HISTORIQUE
# ============================================================

class HistoriqueModerationResume(
    AgroHistoriqueBaseModel
):
    """
    Version légère pour les listes.
    """

    id: int = Field(
        ...,
        ge=1,
    )

    annonce_id: int = Field(
        ...,
        gt=0,
    )

    action: ActionModeration

    ancien_statut: (
        HistoriqueStatutAnnonce | None
    ) = None

    nouveau_statut: (
        HistoriqueStatutAnnonce | None
    ) = None

    date_action: datetime


# ============================================================
# FILTRE HISTORIQUE
# ============================================================

class HistoriqueFilter(
    AgroHistoriqueBaseModel
):
    """
    Paramètres de filtrage de l'historique.
    """

    annonce_id: int | None = Field(
        default=None,
        gt=0,
    )

    acteur_id: int | None = Field(
        default=None,
        gt=0,
    )

    action: ActionModeration | None = (
        None
    )

    page: int = Field(
        default=1,
        ge=1,
    )

    limit: int = Field(
        default=20,
        ge=1,
        le=100,
    )


# ============================================================
# PAGINATION
# ============================================================

class HistoriquePagination(
    AgroHistoriqueBaseModel
):
    """
    Métadonnées de pagination.
    """

    page: int = Field(
        ...,
        ge=1,
    )

    limit: int = Field(
        ...,
        ge=1,
        le=100,
    )

    total: int = Field(
        ...,
        ge=0,
    )

    pages: int = Field(
        ...,
        ge=0,
    )


# ============================================================
# LISTE HISTORIQUE
# ============================================================

class HistoriqueListResponse(
    AgroHistoriqueBaseModel
):
    """
    Liste paginée des historiques.
    """

    historiques: list[
        HistoriqueModerationResponse
    ] = Field(
        default_factory=list,
        description="Liste des actions.",
    )

    pagination: HistoriquePagination


# ============================================================
# HISTORIQUE D'UNE ANNONCE
# ============================================================

class HistoriqueAnnonceResponse(
    AgroHistoriqueBaseModel
):
    """
    Historique complet d'une annonce.
    """

    annonce_id: int = Field(
        ...,
        gt=0,
    )

    historiques: list[
        HistoriqueModerationResponse
    ] = Field(
        default_factory=list,
    )

    total: int = Field(
        default=0,
        ge=0,
    )


# ============================================================
# HISTORIQUE D'UN ACTEUR
# ============================================================

class HistoriqueActeurResponse(
    AgroHistoriqueBaseModel
):
    """
    Historique des actions réalisées
    par un modérateur ou administrateur.
    """

    acteur_id: int = Field(
        ...,
        gt=0,
    )

    historiques: list[
        HistoriqueModerationResponse
    ] = Field(
        default_factory=list,
    )

    total: int = Field(
        default=0,
        ge=0,
    )


# ============================================================
# STATISTIQUES HISTORIQUE
# ============================================================

class HistoriqueStatsResponse(
    AgroHistoriqueBaseModel
):
    """
    Statistiques des actions de modération.
    """

    total_actions: int = Field(
        default=0,
        ge=0,
    )

    soumissions: int = Field(
        default=0,
        ge=0,
    )

    approbations: int = Field(
        default=0,
        ge=0,
    )

    refus: int = Field(
        default=0,
        ge=0,
    )

    remises_en_moderation: int = Field(
        default=0,
        ge=0,
    )


# ============================================================
# RÉPONSE APRÈS ACTION
# ============================================================

class HistoriqueActionResponse(
    AgroHistoriqueBaseModel
):
    """
    Réponse standard après enregistrement
    d'une action.
    """

    message: str = Field(
        ...,
        min_length=2,
        max_length=500,
    )

    historique: HistoriqueModerationResponse