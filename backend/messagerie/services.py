from math import ceil
from typing import Optional

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, joinedload

from models import Annonce, Conversation, Message, Utilisateur


# ============================================================
# CONSTANTES
# ============================================================

MAX_MESSAGE_LENGTH = 2000
DEFAULT_PAGE = 1
DEFAULT_LIMIT = 50
MAX_LIMIT = 100


# ============================================================
# OUTILS INTERNES
# ============================================================

def _calculer_pages(total: int, limit: int) -> int:
    """Calcule le nombre total de pages."""
    if total <= 0:
        return 0

    return ceil(total / limit)


def _normaliser_contenu(contenu: str) -> str:
    """Nettoie et valide le contenu d'un message."""
    if not isinstance(contenu, str):
        raise ValueError("Le contenu du message doit être une chaîne de caractères.")

    contenu = contenu.strip()

    if not contenu:
        raise ValueError("Le message ne peut pas être vide.")

    if len(contenu) > MAX_MESSAGE_LENGTH:
        raise ValueError(
            f"Le message ne peut pas dépasser {MAX_MESSAGE_LENGTH} caractères."
        )

    return contenu


def _obtenir_conversation(
    db: Session,
    conversation_id: int,
) -> Conversation:
    """Récupère une conversation par son identifiant."""
    conversation = (
        db.query(Conversation)
        .options(
            joinedload(Conversation.vendeur),
            joinedload(Conversation.acheteur),
            joinedload(Conversation.annonce),
        )
        .filter(Conversation.id == conversation_id)
        .first()
    )

    if conversation is None:
        raise ValueError("Conversation introuvable.")

    return conversation


def _verifier_participant(
    conversation: Conversation,
    utilisateur_id: int,
) -> None:
    """
    Vérifie que l'utilisateur connecté participe à la conversation.
    """
    if utilisateur_id not in (
        conversation.vendeur_id,
        conversation.acheteur_id,
    ):
        raise PermissionError(
            "Vous n'êtes pas autorisé à accéder à cette conversation."
        )


# ============================================================
# CRÉER / RÉCUPÉRER UNE CONVERSATION
# ============================================================

def obtenir_ou_creer_conversation(
    db: Session,
    utilisateur_id: int,
    annonce_id: int,
) -> Conversation:
    """
    Récupère une conversation existante ou en crée une nouvelle.

    Règles :
    - l'annonce doit exister ;
    - l'annonce doit être publiée pour démarrer une nouvelle conversation ;
    - le vendeur ne peut pas démarrer une conversation avec lui-même ;
    - l'utilisateur connecté devient l'acheteur ;
    - une seule conversation existe entre un acheteur et un vendeur
      pour une même annonce.
    """

    if utilisateur_id <= 0:
        raise ValueError("Identifiant utilisateur invalide.")

    if annonce_id <= 0:
        raise ValueError("Identifiant annonce invalide.")

    utilisateur = (
        db.query(Utilisateur)
        .filter(Utilisateur.id == utilisateur_id)
        .first()
    )

    if utilisateur is None:
        raise ValueError("Utilisateur introuvable.")

    annonce = (
        db.query(Annonce)
        .options(joinedload(Annonce.produit))
        .filter(Annonce.id == annonce_id)
        .first()
    )

    if annonce is None:
        raise ValueError("Annonce introuvable.")

    if annonce.vendeur_id == utilisateur_id:
        raise PermissionError(
            "Vous ne pouvez pas démarrer une conversation avec vous-même."
        )

    # --------------------------------------------------------
    # Conversation déjà existante
    # --------------------------------------------------------

    conversation = (
        db.query(Conversation)
        .options(
            joinedload(Conversation.vendeur),
            joinedload(Conversation.acheteur),
            joinedload(Conversation.annonce),
        )
        .filter(
            Conversation.annonce_id == annonce_id,
            Conversation.vendeur_id == annonce.vendeur_id,
            Conversation.acheteur_id == utilisateur_id,
        )
        .first()
    )

    if conversation is not None:
        return conversation

    # --------------------------------------------------------
    # Nouvelle conversation
    # --------------------------------------------------------

    if annonce.statut != "publiee":
        raise ValueError(
            "Une conversation ne peut être démarrée que pour une annonce publiée."
        )

    conversation = Conversation(
        annonce_id=annonce.id,
        vendeur_id=annonce.vendeur_id,
        acheteur_id=utilisateur_id,
        est_active=True,
    )

    db.add(conversation)
    db.flush()

    # Recharge les relations
    conversation = (
        db.query(Conversation)
        .options(
            joinedload(Conversation.vendeur),
            joinedload(Conversation.acheteur),
            joinedload(Conversation.annonce),
        )
        .filter(Conversation.id == conversation.id)
        .first()
    )

    return conversation


# ============================================================
# RÉCUPÉRER UNE CONVERSATION
# ============================================================

def obtenir_conversation(
    db: Session,
    conversation_id: int,
    utilisateur_id: int,
) -> Conversation:
    """
    Récupère une conversation uniquement si l'utilisateur
    connecté en est un participant.
    """

    if conversation_id <= 0:
        raise ValueError("Identifiant conversation invalide.")

    conversation = _obtenir_conversation(
        db=db,
        conversation_id=conversation_id,
    )

    _verifier_participant(
        conversation=conversation,
        utilisateur_id=utilisateur_id,
    )

    return conversation


# ============================================================
# LISTE DES CONVERSATIONS
# ============================================================

def lister_conversations(
    db: Session,
    utilisateur_id: int,
    page: int = DEFAULT_PAGE,
    limit: int = DEFAULT_LIMIT,
) -> dict:
    """
    Liste les conversations de l'utilisateur connecté.

    Les conversations les plus récentes sont affichées en premier.
    """

    if utilisateur_id <= 0:
        raise ValueError("Identifiant utilisateur invalide.")

    page = max(page, 1)
    limit = min(max(limit, 1), MAX_LIMIT)

    filtre_participant = or_(
        Conversation.vendeur_id == utilisateur_id,
        Conversation.acheteur_id == utilisateur_id,
    )

    total = (
        db.query(func.count(Conversation.id))
        .filter(filtre_participant)
        .scalar()
        or 0
    )

    conversations = (
        db.query(Conversation)
        .options(
            joinedload(Conversation.vendeur),
            joinedload(Conversation.acheteur),
            joinedload(Conversation.annonce),
        )
        .filter(filtre_participant)
        .order_by(Conversation.derniere_activite.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    resultats = []

    for conversation in conversations:

        # ----------------------------------------------------
        # Dernier message
        # ----------------------------------------------------

        dernier_message = (
            db.query(Message)
            .options(joinedload(Message.expediteur))
            .filter(
                Message.conversation_id == conversation.id
            )
            .order_by(Message.date_creation.desc())
            .first()
        )

        # ----------------------------------------------------
        # Nombre de messages non lus
        # ----------------------------------------------------

        messages_non_lus = (
            db.query(func.count(Message.id))
            .filter(
                Message.conversation_id == conversation.id,
                Message.expediteur_id != utilisateur_id,
                Message.est_lu.is_(False),
            )
            .scalar()
            or 0
        )

        resultats.append(
            {
                "id": conversation.id,
                "annonce_id": conversation.annonce_id,
                "vendeur_id": conversation.vendeur_id,
                "acheteur_id": conversation.acheteur_id,
                "derniere_activite": conversation.derniere_activite,
                "est_active": conversation.est_active,
                "vendeur": conversation.vendeur,
                "acheteur": conversation.acheteur,
                "annonce": conversation.annonce,
                "dernier_message": dernier_message,
                "messages_non_lus": messages_non_lus,
            }
        )

    return {
        "conversations": resultats,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": _calculer_pages(total, limit),
    }


# ============================================================
# LISTE DES MESSAGES
# ============================================================

def lister_messages(
    db: Session,
    conversation_id: int,
    utilisateur_id: int,
    page: int = DEFAULT_PAGE,
    limit: int = DEFAULT_LIMIT,
) -> dict:
    """
    Liste les messages d'une conversation.

    L'utilisateur doit obligatoirement être participant.
    """

    if conversation_id <= 0:
        raise ValueError("Identifiant conversation invalide.")

    if utilisateur_id <= 0:
        raise ValueError("Identifiant utilisateur invalide.")

    page = max(page, 1)
    limit = min(max(limit, 1), MAX_LIMIT)

    conversation = _obtenir_conversation(
        db=db,
        conversation_id=conversation_id,
    )

    _verifier_participant(
        conversation=conversation,
        utilisateur_id=utilisateur_id,
    )

    total = (
        db.query(func.count(Message.id))
        .filter(Message.conversation_id == conversation_id)
        .scalar()
        or 0
    )

    # Les messages sont retournés du plus ancien au plus récent
    # dans la page demandée.
    offset = (page - 1) * limit

    messages = (
        db.query(Message)
        .options(joinedload(Message.expediteur))
        .filter(
            Message.conversation_id == conversation_id
        )
        .order_by(Message.date_creation.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    messages.reverse()

    return {
        "messages": messages,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": _calculer_pages(total, limit),
    }


# ============================================================
# ENVOYER UN MESSAGE
# ============================================================

def envoyer_message(
    db: Session,
    conversation_id: int,
    utilisateur_id: int,
    contenu: str,
) -> Message:
    """
    Envoie un message dans une conversation.

    Règles :
    - l'utilisateur doit participer à la conversation ;
    - le message ne peut pas être vide ;
    - maximum 2000 caractères ;
    - l'expéditeur devient automatiquement l'utilisateur connecté ;
    - la date de dernière activité de la conversation est mise à jour.
    """

    if conversation_id <= 0:
        raise ValueError("Identifiant conversation invalide.")

    if utilisateur_id <= 0:
        raise ValueError("Identifiant utilisateur invalide.")

    conversation = _obtenir_conversation(
        db=db,
        conversation_id=conversation_id,
    )

    _verifier_participant(
        conversation=conversation,
        utilisateur_id=utilisateur_id,
    )

    if not conversation.est_active:
        raise ValueError(
            "Cette conversation est actuellement inactive."
        )

    contenu = _normaliser_contenu(contenu)

    # Vérification supplémentaire de l'utilisateur
    utilisateur = (
        db.query(Utilisateur)
        .filter(Utilisateur.id == utilisateur_id)
        .first()
    )

    if utilisateur is None:
        raise ValueError("Utilisateur introuvable.")

    message = Message(
        conversation_id=conversation.id,
        expediteur_id=utilisateur_id,
        contenu=contenu,
        est_lu=False,
    )

    db.add(message)

    # La conversation est considérée comme active dès
    # qu'un nouveau message est envoyé.
    conversation.derniere_activite = func.now()
    conversation.date_modification = func.now()

    db.flush()

    # Recharge le message avec son expéditeur
    message = (
        db.query(Message)
        .options(joinedload(Message.expediteur))
        .filter(Message.id == message.id)
        .first()
    )

    return message


# ============================================================
# MARQUER LES MESSAGES COMME LUS
# ============================================================

def marquer_messages_comme_lus(
    db: Session,
    conversation_id: int,
    utilisateur_id: int,
) -> int:
    """
    Marque comme lus les messages reçus par l'utilisateur connecté.

    Les messages envoyés par l'utilisateur lui-même ne sont jamais
    concernés.
    """

    if conversation_id <= 0:
        raise ValueError("Identifiant conversation invalide.")

    if utilisateur_id <= 0:
        raise ValueError("Identifiant utilisateur invalide.")

    conversation = _obtenir_conversation(
        db=db,
        conversation_id=conversation_id,
    )

    _verifier_participant(
        conversation=conversation,
        utilisateur_id=utilisateur_id,
    )

    messages = (
        db.query(Message)
        .filter(
            Message.conversation_id == conversation_id,
            Message.expediteur_id != utilisateur_id,
            Message.est_lu.is_(False),
        )
        .all()
    )

    if not messages:
        return 0

    for message in messages:
        message.est_lu = True
        message.date_lecture = func.now()

    db.flush()

    return len(messages)


# ============================================================
# NOMBRE TOTAL DE MESSAGES NON LUS
# ============================================================

def compter_messages_non_lus(
    db: Session,
    utilisateur_id: int,
) -> int:
    """
    Retourne le nombre total de messages non lus de l'utilisateur.
    """

    if utilisateur_id <= 0:
        raise ValueError("Identifiant utilisateur invalide.")

    total = (
        db.query(func.count(Message.id))
        .join(
            Conversation,
            Conversation.id == Message.conversation_id,
        )
        .filter(
            or_(
                Conversation.vendeur_id == utilisateur_id,
                Conversation.acheteur_id == utilisateur_id,
            ),
            Message.expediteur_id != utilisateur_id,
            Message.est_lu.is_(False),
        )
        .scalar()
        or 0
    )

    return total


# ============================================================
# ACTIVER / DÉSACTIVER UNE CONVERSATION
# ============================================================

def modifier_statut_conversation(
    db: Session,
    conversation_id: int,
    utilisateur_id: int,
    active: bool,
) -> Conversation:
    """
    Active ou désactive une conversation.

    Seul un participant peut modifier son statut.
    """

    if conversation_id <= 0:
        raise ValueError("Identifiant conversation invalide.")

    conversation = _obtenir_conversation(
        db=db,
        conversation_id=conversation_id,
    )

    _verifier_participant(
        conversation=conversation,
        utilisateur_id=utilisateur_id,
    )

    conversation.est_active = bool(active)
    conversation.date_modification = func.now()

    db.flush()

    return conversation