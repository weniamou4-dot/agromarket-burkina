
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# CONFIGURATION DE BASE
# ============================================================

class AgroAvisBaseModel(BaseModel):
    """
    Modèle Pydantic de base utilisé par les schémas des avis.

    from_attributes=True permet à Pydantic de construire les
    réponses directement à partir des objets SQLAlchemy.
    """

    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )


# ============================================================
# CRÉATION D'UN AVIS
# ============================================================

class AvisCreate(AgroAvisBaseModel):
    """
    Données nécessaires pour créer un avis.
    """

    annonce_id: int = Field(
        ...,
        gt=0,
        description="Identifiant de l'annonce concernée",
    )

    commande_id: Optional[int] = Field(
        default=None,
        gt=0,
        description="Identifiant optionnel de la commande",
    )

    note: int = Field(
        ...,
        ge=1,
        le=5,
        description="Note attribuée à l'annonce, de 1 à 5",
    )

    commentaire: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Commentaire facultatif de l'utilisateur",
    )


# ============================================================
# MODIFICATION D'UN AVIS
# ============================================================

class AvisUpdate(AgroAvisBaseModel):
    """
    Données modifiables d'un avis existant.

    Tous les champs sont optionnels afin de permettre une
    modification partielle.
    """

    note: Optional[int] = Field(
        default=None,
        ge=1,
        le=5,
        description="Nouvelle note de 1 à 5",
    )

    commentaire: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Nouveau commentaire",
    )


# ============================================================
# RÉPONSE COMPLÈTE
# ============================================================

class AvisResponse(AgroAvisBaseModel):
    """
    Représentation complète d'un avis retourné par l'API.

    IMPORTANT :
    Le modèle SQLAlchemy utilise le champ `est_visible`.
    Le schéma Pydantic doit donc utiliser exactement le même
    nom pour permettre la conversion automatique depuis SQLAlchemy.
    """

    id: int

    utilisateur_id: int

    annonce_id: int

    commande_id: Optional[int] = None

    note: int

    commentaire: Optional[str] = None

    est_visible: bool

    date_creation: datetime

    date_modification: Optional[datetime] = None


# ============================================================
# RÉSUMÉ PUBLIC
# ============================================================

class AvisResume(AgroAvisBaseModel):
    """
    Version allégée d'un avis destinée aux affichages publics.
    """

    id: int

    utilisateur_id: int

    annonce_id: int

    note: int

    commentaire: Optional[str] = None

    date_creation: datetime


# ============================================================
# PAGINATION
# ============================================================

class AvisPagination(AgroAvisBaseModel):
    """
    Informations relatives à la pagination des avis.
    """

    page: int

    limit: int

    total: int

    pages: int


class AvisListResponse(AgroAvisBaseModel):
    """
    Réponse contenant une liste d'avis et les informations
    de pagination associées.
    """

    avis: list[AvisResponse]

    pagination: AvisPagination


# ============================================================
# STATISTIQUES
# ============================================================

class AvisStatsResponse(AgroAvisBaseModel):
    """
    Statistiques globales des avis d'une annonce.
    """

    total_avis: int

    moyenne: float

    note_1: int

    note_2: int

    note_3: int

    note_4: int

    note_5: int


# ============================================================
# RÉPONSE AUX ACTIONS
# ============================================================

class AvisActionResponse(AgroAvisBaseModel):
    """
    Réponse standard après une action sur un avis.
    """

    message: str

    avis: Optional[AvisResponse] = None
