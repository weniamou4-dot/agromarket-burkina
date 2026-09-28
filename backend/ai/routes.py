from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from database import get_db
from models import Utilisateur

from auth.routes import get_current_user

from ai.schemas import (
    AIHealthResponse,
    AIMessageRequest,
    AIMessageResponse,
    AIProductSuggestionRequest,
    AIProductSuggestionResponse,
    AIProductSuggestion,
)

from ai.services import (
    OPENAI_MODEL,
    ai_est_disponible,
    envoyer_message_ia,
    rechercher_produits_intelligemment,
    suggerer_noms_produits,
)


# ============================================================
# ROUTEUR
# ============================================================

router = APIRouter(
    prefix="/ai",
    tags=["Intelligence Artificielle"],
)


# ============================================================
# ÉTAT DU SERVICE
# ============================================================

@router.get(
    "/health",
    response_model=AIHealthResponse,
)
def health_ai():

    disponible = ai_est_disponible()

    return AIHealthResponse(
        available=disponible,
        provider="OpenAI",
        model=(
            OPENAI_MODEL
            if disponible
            else None
        ),
    )


# ============================================================
# ASSISTANT IA
# ============================================================

@router.post(
    "/chat",
    response_model=AIMessageResponse,
)
def chat_ai(
    data: AIMessageRequest,
    current_user: Utilisateur = Depends(
        get_current_user
    ),
):
    """
    Assistant intelligent AgroMarket.
    """

    try:
        resultat = envoyer_message_ia(
            data.message
        )

        return AIMessageResponse(
            success=True,
            message=resultat["message"],
            model=resultat.get("model"),
        )

    except ValueError as erreur:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(erreur),
        )

    except RuntimeError as erreur:

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(erreur),
        )


# ============================================================
# RECHERCHE INTELLIGENTE
# ============================================================

@router.post(
    "/produits/suggestions",
    response_model=AIProductSuggestionResponse,
)
def suggestions_produits(
    data: AIProductSuggestionRequest,
    current_user: Utilisateur = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    suggestions = (
        rechercher_produits_intelligemment(
            db=db,
            recherche=data.recherche,
            region=data.region,
            limit=data.limit,
        )
    )

    if not suggestions:

        termes = suggerer_noms_produits(
            db=db,
            recherche=data.recherche,
            limit=data.limit,
        )

        suggestions = [
            {
                "id": 0,
                "nom": nom,
                "categorie_id": None,
                "type_produit": None,
                "score": 0.0,
            }
            for nom in termes
        ]

    return AIProductSuggestionResponse(
        success=True,
        recherche=data.recherche,
        suggestions=[
            AIProductSuggestion(
                **suggestion
            )
            for suggestion in suggestions
        ],
    )