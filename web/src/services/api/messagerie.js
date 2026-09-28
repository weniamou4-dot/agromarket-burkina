
import { apiRequest } from "./client";

/*
 * ============================================================
 * MESSAGERIE — AGROMARKET BURKINA
 * ============================================================
 *
 * Toutes les requêtes passent par client.js afin de bénéficier
 * automatiquement :
 * - du JWT stocké dans localStorage ;
 * - de l'Authorization Bearer ;
 * - de la gestion du timeout ;
 * - de la gestion des erreurs ;
 * - de la déconnexion automatique en cas de 401.
 *
 * Les endpoints correspondent au backend :
 *
 * POST  /messagerie/conversations
 * GET   /messagerie/conversations
 * GET   /messagerie/conversations/{id}
 * GET   /messagerie/conversations/{id}/messages
 * POST  /messagerie/conversations/{id}/messages
 * PATCH /messagerie/conversations/{id}/messages/lues
 * GET   /messagerie/messages/non-lus
 * PATCH /messagerie/conversations/{id}/statut
 */


/*
 * ============================================================
 * CONVERSATIONS
 * ============================================================
 */

/**
 * Crée une conversation avec le vendeur d'une annonce
 * ou récupère la conversation existante.
 *
 * @param {number} annonceId
 * @returns {Promise<object>}
 */
export async function creerOuRecupererConversation(
  annonceId
) {
  const id = Number(annonceId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Identifiant d'annonce invalide.");
  }

  return apiRequest(
    "/messagerie/conversations",
    {
      method: "POST",
      body: JSON.stringify({
        annonce_id: id,
      }),
    }
  );
}


/**
 * Récupère les conversations de l'utilisateur connecté.
 *
 * @param {object} options
 * @param {number} options.page
 * @param {number} options.limit
 * @returns {Promise<object>}
 */
export async function getMesConversations({
  page = 1,
  limit = 20,
} = {}) {
  const safePage = Math.max(
    1,
    Number(page) || 1
  );

  const safeLimit = Math.min(
    100,
    Math.max(
      1,
      Number(limit) || 20
    )
  );

  const params = new URLSearchParams({
    page: String(safePage),
    limit: String(safeLimit),
  });

  return apiRequest(
    `/messagerie/conversations?${params.toString()}`,
    {
      method: "GET",
    }
  );
}


/**
 * Récupère une conversation précise.
 *
 * @param {number} conversationId
 * @returns {Promise<object>}
 */
export async function getConversationById(
  conversationId
) {
  const id = Number(conversationId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(
      "Identifiant de conversation invalide."
    );
  }

  return apiRequest(
    `/messagerie/conversations/${id}`,
    {
      method: "GET",
    }
  );
}


/*
 * ============================================================
 * MESSAGES
 * ============================================================
 */

/**
 * Récupère les messages d'une conversation.
 *
 * @param {number} conversationId
 * @param {object} options
 * @param {number} options.page
 * @param {number} options.limit
 * @returns {Promise<object>}
 */
export async function getMessagesConversation(
  conversationId,
  {
    page = 1,
    limit = 50,
  } = {}
) {
  const id = Number(conversationId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(
      "Identifiant de conversation invalide."
    );
  }

  const safePage = Math.max(
    1,
    Number(page) || 1
  );

  const safeLimit = Math.min(
    100,
    Math.max(
      1,
      Number(limit) || 50
    )
  );

  const params = new URLSearchParams({
    page: String(safePage),
    limit: String(safeLimit),
  });

  return apiRequest(
    `/messagerie/conversations/${id}/messages?${params.toString()}`,
    {
      method: "GET",
    }
  );
}


/**
 * Envoie un message dans une conversation.
 *
 * @param {number} conversationId
 * @param {string} contenu
 * @returns {Promise<object>}
 */
export async function envoyerMessage(
  conversationId,
  contenu
) {
  const id = Number(conversationId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(
      "Identifiant de conversation invalide."
    );
  }

  if (
    typeof contenu !== "string" ||
    !contenu.trim()
  ) {
    throw new Error(
      "Le message ne peut pas être vide."
    );
  }

  const message = contenu.trim();

  if (message.length > 2000) {
    throw new Error(
      "Le message ne peut pas dépasser 2000 caractères."
    );
  }

  return apiRequest(
    `/messagerie/conversations/${id}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        contenu: message,
      }),
    }
  );
}


/*
 * ============================================================
 * MESSAGES LUS
 * ============================================================
 */

/**
 * Marque les messages reçus comme lus.
 *
 * @param {number} conversationId
 * @returns {Promise<object>}
 */
export async function marquerMessagesCommeLus(
  conversationId
) {
  const id = Number(conversationId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(
      "Identifiant de conversation invalide."
    );
  }

  return apiRequest(
    `/messagerie/conversations/${id}/messages/lues`,
    {
      method: "PATCH",
    }
  );
}


/**
 * Récupère le nombre total de messages non lus.
 *
 * Le backend actuel retourne :
 *
 * {
 *   success: true,
 *   message: "3"
 * }
 *
 * Cette fonction normalise la valeur afin que le frontend
 * puisse toujours utiliser un nombre.
 *
 * @returns {Promise<number>}
 */
export async function compterMessagesNonLus() {
  const response = await apiRequest(
    "/messagerie/messages/non-lus",
    {
      method: "GET",
    }
  );

  const nombre = Number(
    response?.nombre_messages_non_lus ??
    response?.count ??
    response?.total ??
    response?.message
  );

  return Number.isFinite(nombre)
    ? Math.max(0, nombre)
    : 0;
}


/*
 * ============================================================
 * STATUT CONVERSATION
 * ============================================================
 */

/**
 * Active ou désactive une conversation.
 *
 * @param {number} conversationId
 * @param {boolean} active
 * @returns {Promise<object>}
 */
export async function modifierStatutConversation(
  conversationId,
  active
) {
  const id = Number(conversationId);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(
      "Identifiant de conversation invalide."
    );
  }

  const params = new URLSearchParams({
    active: String(Boolean(active)),
  });

  return apiRequest(
    `/messagerie/conversations/${id}/statut?${params.toString()}`,
    {
      method: "PATCH",
    }
  );
}


/*
 * ============================================================
 * ALIASES
 * ============================================================
 *
 * Quelques alias facilitent l'utilisation du service dans
 * les composants sans multiplier les implémentations.
 */


/**
 * Alias de getMesConversations.
 */
export const getConversations =
  getMesConversations;


/**
 * Alias de getMessagesConversation.
 */
export const getMessages =
  getMessagesConversation;


/**
 * Alias de compterMessagesNonLus.
 */
export const getMessagesNonLus =
  compterMessagesNonLus;


/**
 * Alias de marquerMessagesCommeLus.
 */
export const markMessagesAsRead =
  marquerMessagesCommeLus;


/**
 * Alias de envoyerMessage.
 */
export const sendMessage =
  envoyerMessage;


/**
 * Alias de creerOuRecupererConversation.
 */
export const createOrGetConversation =
  creerOuRecupererConversation;


/**
 * Alias de getConversationById.
 */
export const getConversation =
  getConversationById;