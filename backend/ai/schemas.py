from pydantic import BaseModel, Field


class AIMessageRequest(BaseModel):
    """
    Requête envoyée à l'assistant AgroMarket.
    """

    message: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="Question ou demande de l'utilisateur.",
    )


class AIMessageResponse(BaseModel):
    """
    Réponse de l'assistant IA.
    """

    success: bool
    message: str
    model: str | None = None


class AIHealthResponse(BaseModel):
    """
    État du service IA.
    """

    available: bool
    provider: str
    model: str | None = None


class AIProductSuggestionRequest(BaseModel):
    """
    Demande de recommandation de produits.
    """

    recherche: str = Field(
        ...,
        min_length=1,
        max_length=200,
    )

    region: str | None = Field(
        default=None,
        max_length=100,
    )

    limit: int = Field(
        default=5,
        ge=1,
        le=20,
    )


class AIProductSuggestion(BaseModel):
    """
    Produit suggéré par le moteur local.
    """

    id: int
    nom: str
    categorie_id: int | None = None
    type_produit: str | None = None
    score: float


class AIProductSuggestionResponse(BaseModel):
    """
    Liste des suggestions.
    """

    success: bool
    recherche: str
    suggestions: list[AIProductSuggestion]