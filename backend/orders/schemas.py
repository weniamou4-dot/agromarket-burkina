# ============================================================
# AGROMARKET BURKINA
# ORDERS / SCHEMAS
# Version professionnelle stabilisée
#
# Fonctionnalités :
# - création de commande
# - consultation
# - modification du statut
# - annulation
# - pagination
# - préparation des notifications
# - préparation des statistiques
#
# Compatible avec le modèle Commande actuel.
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

class AgroOrderBaseModel(BaseModel):
    """
    Configuration commune des schémas Commande.
    """

    model_config = ConfigDict(
        from_attributes=True,
        str_strip_whitespace=True,
        extra="forbid",
    )


# ============================================================
# STATUTS COMMANDE
# ============================================================

class StatutCommande(str, Enum):
    """
    Cycle de vie d'une commande.
    """

    EN_ATTENTE = "en_attente"

    CONFIRMEE = "confirmee"

    PREPAREE = "preparee"

    LIVREE = "livree"

    ANNULEE = "annulee"


# ============================================================
# CRÉATION D'UNE COMMANDE
# ============================================================

class CommandeCreate(
    AgroOrderBaseModel
):
    """
    Création d'une commande.

    Le prix unitaire et le prix total ne sont
    jamais imposés par le frontend.

    Le backend doit récupérer le prix actuel
    de l'annonce et calculer le montant total.
    """

    annonce_id: int = Field(
        ...,
        gt=0,
        description="Identifiant de l'annonce.",
        examples=[12],
    )

    quantite: float = Field(
        ...,
        gt=0,
        description="Quantité commandée.",
        examples=[25],
    )


# ============================================================
# MODIFICATION D'UNE COMMANDE
# ============================================================

class CommandeUpdate(
    AgroOrderBaseModel
):
    """
    Modification contrôlée d'une commande.

    Ce schéma est volontairement limité.

    Le prix et l'acheteur ne peuvent pas être
    modifiés directement.
    """

    quantite: float | None = Field(
        default=None,
        gt=0,
        description="Nouvelle quantité.",
    )


# ============================================================
# CHANGEMENT DE STATUT
# ============================================================

class CommandeStatusUpdate(
    AgroOrderBaseModel
):
    """
    Modification du statut d'une commande.
    """

    statut: StatutCommande = Field(
        ...,
        description="Nouveau statut.",
    )

    motif: str | None = Field(
        default=None,
        max_length=2000,
        description=(
            "Motif facultatif associé "
            "au changement de statut."
        ),
    )

    @field_validator("motif")
    @classmethod
    def nettoyer_motif(
        cls,
        value: str | None,
    ) -> str | None:

        if value is None:
            return None

        value = value.strip()

        return value if value else None


# ============================================================
# RÉSUMÉ ANNONCE
# ============================================================

class CommandeAnnonceResume(
    AgroOrderBaseModel
):
    """
    Informations essentielles de l'annonce
    utilisée dans une commande.
    """

    id: int = Field(
        ...,
        ge=1,
    )

    produit_nom: str = Field(
        ...,
        min_length=2,
        max_length=150,
    )

    vendeur_nom: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    prix_unitaire: float = Field(
        ...,
        gt=0,
    )

    unite: str = Field(
        ...,
        min_length=1,
        max_length=30,
    )

    region: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )


# ============================================================
# RÉPONSE COMMANDE
# ============================================================

class CommandeResponse(
    AgroOrderBaseModel
):
    """
    Réponse complète d'une commande.
    """

    id: int = Field(
        ...,
        ge=1,
    )

    acheteur_id: int = Field(
        ...,
        gt=0,
    )

    annonce_id: int = Field(
        ...,
        gt=0,
    )

    quantite: float = Field(
        ...,
        gt=0,
    )

    prix_unitaire: float = Field(
        ...,
        gt=0,
    )

    prix_total: float = Field(
        ...,
        gt=0,
    )

    statut: StatutCommande

    date_commande: datetime

    annonce: CommandeAnnonceResume | None = (
        None
    )


# ============================================================
# RÉSUMÉ COMMANDE
# ============================================================
# ============================================================
# RÉSUMÉ COMMANDE
# ============================================================

class CommandeResume(
    AgroOrderBaseModel
):
    """
    Version légère utilisée dans les listes.

    Contient également les informations nécessaires
    à l'affichage d'une commande côté frontend :
    - nom de l'acheteur
    - nom du produit
    - nom du vendeur
    """

    id: int = Field(
        ...,
        ge=1,
    )

    acheteur_id: int = Field(
        ...,
        gt=0,
    )

    acheteur_nom: str = Field(
        ...,
        min_length=2,
        max_length=150,
    )

    annonce_id: int = Field(
        ...,
        gt=0,
    )

    quantite: float = Field(
        ...,
        gt=0,
    )

    prix_unitaire: float = Field(
        ...,
        gt=0,
    )

    prix_total: float = Field(
        ...,
        gt=0,
    )

    statut: StatutCommande

    date_commande: datetime

    annonce: CommandeAnnonceResume | None = None

# ============================================================
# PAGINATION
# ============================================================

class CommandePagination(
    AgroOrderBaseModel
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
# LISTE COMMANDES ACHETEUR
# ============================================================

class CommandesAcheteurResponse(
    AgroOrderBaseModel
):
    """
    Liste paginée des commandes
    de l'acheteur connecté.
    """

    commandes: list[
        CommandeResume
    ] = Field(
        default_factory=list,
    )

    pagination: CommandePagination


# ============================================================
# LISTE COMMANDES VENDEUR
# ============================================================

class CommandesVendeurResponse(
    AgroOrderBaseModel
):
    """
    Liste paginée des commandes reçues
    par un vendeur.
    """

    commandes: list[
        CommandeResume
    ] = Field(
        default_factory=list,
    )

    pagination: CommandePagination


# ============================================================
# LISTE COMMANDES ADMIN
# ============================================================

class CommandesAdminResponse(
    AgroOrderBaseModel
):
    """
    Liste administrative des commandes.
    """

    commandes: list[
        CommandeResponse
    ] = Field(
        default_factory=list,
    )

    pagination: CommandePagination


# ============================================================
# RÉPONSE APRÈS ACTION
# ============================================================

class CommandeActionResponse(
    AgroOrderBaseModel
):
    """
    Réponse standard après une action
    sur une commande.
    """

    message: str = Field(
        ...,
        min_length=2,
        max_length=500,
    )

    commande: CommandeResponse


# ============================================================
# ANNULATION
# ============================================================

class CommandeCancelRequest(
    AgroOrderBaseModel
):
    """
    Données facultatives lors de l'annulation.
    """

    motif: str | None = Field(
        default=None,
        max_length=2000,
        description="Motif d'annulation.",
    )

    @field_validator("motif")
    @classmethod
    def nettoyer_motif(
        cls,
        value: str | None,
    ) -> str | None:

        if value is None:
            return None

        value = value.strip()

        return value if value else None


# ============================================================
# STATISTIQUES COMMANDES
# ============================================================

class CommandesStatsResponse(
    AgroOrderBaseModel
):
    """
    Statistiques des commandes.
    """

    total: int = Field(
        default=0,
        ge=0,
    )

    en_attente: int = Field(
        default=0,
        ge=0,
    )

    confirmees: int = Field(
        default=0,
        ge=0,
    )

    preparees: int = Field(
        default=0,
        ge=0,
    )

    livrees: int = Field(
        default=0,
        ge=0,
    )

    annulees: int = Field(
        default=0,
        ge=0,
    )

    chiffre_total: float = Field(
        default=0,
        ge=0,
    )


# ============================================================
# FILTRE DES COMMANDES
# ============================================================

class CommandeFilter(
    AgroOrderBaseModel
):
    """
    Filtres généraux utilisés par les services
    et les routes.
    """

    statut: StatutCommande | None = None

    annonce_id: int | None = Field(
        default=None,
        gt=0,
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