
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# MODÈLE DE BASE
# ============================================================

class AgroMessagerieBaseModel(BaseModel):
    """
    Modèle Pydantic de base pour les réponses de messagerie.

    Permet de convertir directement les objets SQLAlchemy
    en réponses API.
    """

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# CONVERSATION
# ============================================================

class ConversationCreate(BaseModel):
    """
    Données nécessaires pour créer ou récupérer
    une conversation liée à une annonce.
    """

    annonce_id: int = Field(
        ...,
        gt=0,
        description="Identifiant de l'annonce concernée.",
    )


# ============================================================
# UTILISATEUR DANS LA MESSAGERIE
# ============================================================

class MessagerieUtilisateurResponse(
    AgroMessagerieBaseModel
):
    """
    Informations publiques minimales d'un utilisateur
    nécessaires dans la messagerie.

    Le numéro de téléphone n'est volontairement pas exposé
    dans les réponses de messagerie.
    """

    id: int

    nom: str

    photo_profil: Optional[str] = None

    role: str


# ============================================================
# ANNONCE DANS LA MESSAGERIE
# ============================================================

class MessagerieAnnonceResponse(
    AgroMessagerieBaseModel
):
    """
    Informations minimales d'une annonce affichées
    dans une conversation.
    """

    id: int

    produit_id: int

    prix: float

    quantite: float

    unite: str

    region: str

    province: Optional[str] = None

    commune: Optional[str] = None

    statut: str


# ============================================================
# CRÉATION D'UN MESSAGE
# ============================================================

class MessageCreate(BaseModel):
    """
    Données nécessaires pour envoyer un message.
    """

    contenu: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description=(
            "Contenu du message. "
            "Maximum 2000 caractères."
        ),
    )

    def nettoyer_contenu(self) -> str:
        """
        Supprime les espaces inutiles au début et à la fin.
        """

        return self.contenu.strip()


# ============================================================
# RÉPONSE MESSAGE
# ============================================================

class MessageResponse(
    AgroMessagerieBaseModel
):
    """
    Représentation d'un message retourné par l'API.
    """

    id: int

    conversation_id: int

    expediteur_id: int

    contenu: str

    est_lu: bool

    date_lecture: Optional[datetime] = None

    date_creation: datetime

    expediteur: Optional[
        MessagerieUtilisateurResponse
    ] = None


# ============================================================
# LISTE DES MESSAGES
# ============================================================

class MessageListResponse(BaseModel):
    """
    Réponse paginée contenant les messages
    d'une conversation.
    """

    messages: list[MessageResponse] = Field(
        default_factory=list
    )

    total: int = Field(
        ...,
        ge=0,
    )

    page: int = Field(
        ...,
        ge=1,
    )

    limit: int = Field(
        ...,
        ge=1,
    )

    pages: int = Field(
        ...,
        ge=0,
    )


# ============================================================
# RÉPONSE CONVERSATION
# ============================================================

class ConversationResponse(
    AgroMessagerieBaseModel
):
    """
    Informations principales d'une conversation.
    """

    id: int

    annonce_id: Optional[int] = None

    vendeur_id: int

    acheteur_id: int

    date_creation: datetime

    date_modification: datetime

    derniere_activite: datetime

    est_active: bool

    vendeur: Optional[
        MessagerieUtilisateurResponse
    ] = None

    acheteur: Optional[
        MessagerieUtilisateurResponse
    ] = None

    annonce: Optional[
        MessagerieAnnonceResponse
    ] = None


# ============================================================
# ÉLÉMENT DE LISTE DES CONVERSATIONS
# ============================================================

class ConversationListItemResponse(
    AgroMessagerieBaseModel
):
    """
    Représentation simplifiée d'une conversation
    dans la liste des conversations.
    """

    id: int

    annonce_id: Optional[int] = None

    vendeur_id: int

    acheteur_id: int

    derniere_activite: datetime

    est_active: bool

    vendeur: Optional[
        MessagerieUtilisateurResponse
    ] = None

    acheteur: Optional[
        MessagerieUtilisateurResponse
    ] = None

    annonce: Optional[
        MessagerieAnnonceResponse
    ] = None

    dernier_message: Optional[
        MessageResponse
    ] = None

    messages_non_lus: int = Field(
        default=0,
        ge=0,
    )


# ============================================================
# LISTE DES CONVERSATIONS
# ============================================================

class ConversationListResponse(BaseModel):
    """
    Réponse paginée contenant les conversations
    de l'utilisateur connecté.
    """

    conversations: list[
        ConversationListItemResponse
    ] = Field(
        default_factory=list
    )

    total: int = Field(
        ...,
        ge=0,
    )

    page: int = Field(
        ...,
        ge=1,
    )

    limit: int = Field(
        ...,
        ge=1,
    )

    pages: int = Field(
        ...,
        ge=0,
    )


# ============================================================
# DÉTAIL COMPLET D'UNE CONVERSATION
# ============================================================

class ConversationDetailResponse(
    AgroMessagerieBaseModel
):
    """
    Détail complet d'une conversation avec ses messages.
    """

    id: int

    annonce_id: Optional[int] = None

    vendeur_id: int

    acheteur_id: int

    date_creation: datetime

    date_modification: datetime

    derniere_activite: datetime

    est_active: bool

    vendeur: Optional[
        MessagerieUtilisateurResponse
    ] = None

    acheteur: Optional[
        MessagerieUtilisateurResponse
    ] = None

    annonce: Optional[
        MessagerieAnnonceResponse
    ] = None

    messages: list[
        MessageResponse
    ] = Field(
        default_factory=list
    )

    messages_non_lus: int = Field(
        default=0,
        ge=0,
    )


# ============================================================
# ACTION DE MESSAGERIE
# ============================================================

class MessagerieActionResponse(BaseModel):
    """
    Réponse générique pour une action de messagerie.
    """

    success: bool

    message: str


# ============================================================
# MESSAGES MARQUÉS COMME LUS
# ============================================================

class MessagesLusResponse(BaseModel):
    """
    Résultat de l'opération de marquage des messages
    comme lus.
    """

    success: bool

    messages_marques_lus: int = Field(
        ...,
        ge=0,
    )

    message: str
