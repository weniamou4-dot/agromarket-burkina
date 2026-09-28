
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from auth.dependencies import get_current_user

from .schemas import (
    ConversationCreate,
    ConversationListResponse,
    ConversationResponse,
    MessageCreate,
    MessageListResponse,
    MessageResponse,
    MessagerieActionResponse,
    MessagesLusResponse,
)
from .services import (
    compter_messages_non_lus,
    envoyer_message,
    lister_conversations,
    lister_messages,
    marquer_messages_comme_lus,
    modifier_statut_conversation,
    obtenir_conversation,
    obtenir_ou_creer_conversation,
)


# ============================================================
# ROUTER
# ============================================================

messagerie_router = APIRouter(
    prefix="/messagerie",
    tags=["Messagerie"],
)


# ============================================================
# CRÉER / RÉCUPÉRER UNE CONVERSATION
# ============================================================

@messagerie_router.post(
    "/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_200_OK,
    summary="Créer ou récupérer une conversation",
    description=(
        "Crée ou récupère une conversation entre l'utilisateur "
        "connecté et le vendeur d'une annonce."
    ),
)
def creer_ou_recuperer_conversation(
    payload: ConversationCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Crée ou récupère une conversation pour une annonce publiée.
    """

    try:
        conversation = obtenir_ou_creer_conversation(
            db=db,
            utilisateur_id=current_user.id,
            annonce_id=payload.annonce_id,
        )

        db.commit()

        return conversation

    except PermissionError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc

    except ValueError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        db.rollback()

        print(
            "\n"
            "============================================================\n"
            "ERREUR MESSAGERIE — CRÉATION CONVERSATION\n"
            "============================================================"
        )
        print(
            f"Type : {type(exc).__name__}"
        )
        print(
            f"Message : {exc}"
        )
        print(
            "============================================================\n"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Impossible de créer la conversation.",
        ) from exc


# ============================================================
# LISTE DES CONVERSATIONS
# ============================================================

@messagerie_router.get(
    "/conversations",
    response_model=ConversationListResponse,
    summary="Lister mes conversations",
)
def mes_conversations(
    page: int = Query(
        1,
        ge=1,
        description="Numéro de page.",
    ),
    limit: int = Query(
        20,
        ge=1,
        le=100,
        description="Nombre de conversations par page.",
    ),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retourne uniquement les conversations
    de l'utilisateur connecté.
    """

    try:
        return lister_conversations(
            db=db,
            utilisateur_id=current_user.id,
            page=page,
            limit=limit,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        print(
            "\n"
            "============================================================\n"
            "ERREUR MESSAGERIE — LISTE CONVERSATIONS\n"
            "============================================================"
        )
        print(
            f"Type : {type(exc).__name__}"
        )
        print(
            f"Message : {exc}"
        )
        print(
            "============================================================\n"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Impossible de récupérer les conversations.",
        ) from exc


# ============================================================
# DÉTAIL D'UNE CONVERSATION
# ============================================================

@messagerie_router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationResponse,
    summary="Récupérer une conversation",
)
def detail_conversation(
    conversation_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retourne une conversation à laquelle
    l'utilisateur connecté participe.
    """

    try:
        return obtenir_conversation(
            db=db,
            conversation_id=conversation_id,
            utilisateur_id=current_user.id,
        )

    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        print(
            "\n"
            "============================================================\n"
            "ERREUR MESSAGERIE — DÉTAIL CONVERSATION\n"
            "============================================================"
        )
        print(
            f"Type : {type(exc).__name__}"
        )
        print(
            f"Message : {exc}"
        )
        print(
            "============================================================\n"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Impossible de récupérer la conversation.",
        ) from exc


# ============================================================
# LISTE DES MESSAGES
# ============================================================

@messagerie_router.get(
    "/conversations/{conversation_id}/messages",
    response_model=MessageListResponse,
    summary="Lister les messages d'une conversation",
)
def messages_conversation(
    conversation_id: int,
    page: int = Query(
        1,
        ge=1,
        description="Numéro de page.",
    ),
    limit: int = Query(
        50,
        ge=1,
        le=100,
        description="Nombre de messages par page.",
    ),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retourne les messages d'une conversation.

    Seuls les deux participants peuvent accéder
    aux messages.
    """

    try:
        return lister_messages(
            db=db,
            conversation_id=conversation_id,
            utilisateur_id=current_user.id,
            page=page,
            limit=limit,
        )

    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        print(
            "\n"
            "============================================================\n"
            "ERREUR MESSAGERIE — LISTE MESSAGES\n"
            "============================================================"
        )
        print(
            f"Type : {type(exc).__name__}"
        )
        print(
            f"Message : {exc}"
        )
        print(
            "============================================================\n"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Impossible de récupérer les messages.",
        ) from exc


# ============================================================
# ENVOYER UN MESSAGE
# ============================================================

@messagerie_router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Envoyer un message",
)
def envoyer_un_message(
    conversation_id: int,
    payload: MessageCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Envoie un message dans une conversation existante.
    """

    try:
        message = envoyer_message(
            db=db,
            conversation_id=conversation_id,
            utilisateur_id=current_user.id,
            contenu=payload.nettoyer_contenu(),
        )

        db.commit()

        return message

    except PermissionError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc

    except ValueError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        db.rollback()

        print(
            "\n"
            "============================================================\n"
            "ERREUR MESSAGERIE — ENVOI MESSAGE\n"
            "============================================================"
        )
        print(
            f"Type : {type(exc).__name__}"
        )
        print(
            f"Message : {exc}"
        )
        print(
            "============================================================\n"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Impossible d'envoyer le message.",
        ) from exc


# ============================================================
# MARQUER LES MESSAGES COMME LUS
# ============================================================

@messagerie_router.patch(
    "/conversations/{conversation_id}/messages/lues",
    response_model=MessagesLusResponse,
    summary="Marquer les messages comme lus",
)
def marquer_messages_lus(
    conversation_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Marque comme lus les messages reçus
    dans la conversation.
    """

    try:
        nombre = marquer_messages_comme_lus(
            db=db,
            conversation_id=conversation_id,
            utilisateur_id=current_user.id,
        )

        db.commit()

        return {
            "success": True,
            "messages_marques_lus": nombre,
            "message": (
                f"{nombre} message(s) marqué(s) comme lu(s)."
            ),
        }

    except PermissionError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc

    except ValueError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        db.rollback()

        print(
            "\n"
            "============================================================\n"
            "ERREUR MESSAGERIE — MESSAGES LUS\n"
            "============================================================"
        )
        print(
            f"Type : {type(exc).__name__}"
        )
        print(
            f"Message : {exc}"
        )
        print(
            "============================================================\n"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Impossible de marquer les messages comme lus.",
        ) from exc


# ============================================================
# NOMBRE DE MESSAGES NON LUS
# ============================================================

@messagerie_router.get(
    "/messages/non-lus",
    response_model=MessagerieActionResponse,
    summary="Compter les messages non lus",
)
def nombre_messages_non_lus(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retourne le nombre total de messages non lus
    pour l'utilisateur connecté.
    """

    try:
        nombre = compter_messages_non_lus(
            db=db,
            utilisateur_id=current_user.id,
        )

        return {
            "success": True,
            "message": str(nombre),
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        print(
            "\n"
            "============================================================\n"
            "ERREUR MESSAGERIE — MESSAGES NON LUS\n"
            "============================================================"
        )
        print(
            f"Type : {type(exc).__name__}"
        )
        print(
            f"Message : {exc}"
        )
        print(
            "============================================================\n"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Impossible de compter les messages non lus.",
        ) from exc


# ============================================================
# ACTIVER / DÉSACTIVER UNE CONVERSATION
# ============================================================

@messagerie_router.patch(
    "/conversations/{conversation_id}/statut",
    response_model=ConversationResponse,
    summary="Modifier le statut d'une conversation",
)
def changer_statut_conversation(
    conversation_id: int,
    active: bool = Query(
        ...,
        description="True pour activer, False pour désactiver.",
    ),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Active ou désactive une conversation.

    Seul un participant peut modifier son statut.
    """

    try:
        conversation = modifier_statut_conversation(
            db=db,
            conversation_id=conversation_id,
            utilisateur_id=current_user.id,
            active=active,
        )

        db.commit()

        return conversation

    except PermissionError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc

    except ValueError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        db.rollback()

        print(
            "\n"
            "============================================================\n"
            "ERREUR MESSAGERIE — STATUT CONVERSATION\n"
            "============================================================"
        )
        print(
            f"Type : {type(exc).__name__}"
        )
        print(
            f"Message : {exc}"
        )
        print(
            "============================================================\n"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Impossible de modifier le statut de la conversation.",
        ) from exc
