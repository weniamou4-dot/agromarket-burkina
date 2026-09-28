
// web/src/services/api/notifications.js

import { apiRequest } from "./client";

// ============================================================
// CONFIGURATION
// ============================================================

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// ============================================================
// OUTILS INTERNES
// ============================================================

function normalizePage(page) {
  const value = Number(page);

  if (!Number.isFinite(value)) {
    return DEFAULT_PAGE;
  }

  return Math.max(
    1,
    Math.floor(value)
  );
}

function normalizeLimit(limit) {
  const value = Number(limit);

  if (!Number.isFinite(value)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      Math.floor(value)
    )
  );
}

function requireId(
  id,
  message
) {
  if (
    id === null ||
    id === undefined ||
    String(id).trim() === ""
  ) {
    throw new Error(message);
  }

  return encodeURIComponent(
    String(id).trim()
  );
}

function getErrorMessage(
  error,
  fallback
) {
  if (
    error?.message &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  if (
    typeof error === "string" &&
    error.trim()
  ) {
    return error;
  }

  return fallback;
}

// ============================================================
// EXTRACTION DES NOTIFICATIONS
// ============================================================

/**
 * Extrait les notifications depuis différentes
 * structures possibles de réponse API.
 *
 * Compatible avec :
 * - [...]
 * - { notifications: [...] }
 * - { resultats: [...] }
 * - { results: [...] }
 */
export function extractNotifications(
  response
) {
  if (Array.isArray(response)) {
    return response;
  }

  if (
    Array.isArray(
      response?.notifications
    )
  ) {
    return response.notifications;
  }

  if (
    Array.isArray(
      response?.resultats
    )
  ) {
    return response.resultats;
  }

  if (
    Array.isArray(
      response?.results
    )
  ) {
    return response.results;
  }

  return [];
}

// ============================================================
// EXTRACTION D'UNE NOTIFICATION
// ============================================================

/**
 * Extrait une notification unique.
 *
 * @param {Object} response
 * @returns {Object|null}
 */
export function extractNotification(
  response
) {
  if (
    response &&
    typeof response === "object" &&
    !Array.isArray(response)
  ) {
    return response;
  }

  return null;
}

// ============================================================
// EXTRACTION DE LA PAGINATION
// ============================================================

/**
 * Extrait les informations de pagination.
 *
 * @param {Object} response
 * @param {Object} fallback
 * @returns {Object}
 */
export function extractNotificationsPagination(
  response,
  fallback = {}
) {
  if (
    response?.pagination &&
    typeof response.pagination === "object"
  ) {
    return response.pagination;
  }

  const page = normalizePage(
    fallback.page
  );

  const limit = normalizeLimit(
    fallback.limit
  );

  const total = extractNotifications(
    response
  ).length;

  return {
    page,
    limit,
    total,
    pages:
      total > 0
        ? Math.ceil(total / limit)
        : 0,
  };
}

// ============================================================
// NORMALISATION D'UNE NOTIFICATION
// ============================================================

/**
 * Normalise une notification afin de garantir
 * une structure stable côté frontend.
 *
 * Les champs inconnus renvoyés par le backend
 * sont conservés grâce au spread operator.
 *
 * @param {Object} notification
 * @returns {Object|null}
 */
export function normalizeNotification(
  notification
) {
  if (
    !notification ||
    typeof notification !== "object" ||
    Array.isArray(notification)
  ) {
    return null;
  }

  return {
    ...notification,

    id:
      notification.id !== null &&
      notification.id !== undefined
        ? Number(notification.id)
        : null,

    utilisateur_id:
      notification.utilisateur_id !== null &&
      notification.utilisateur_id !== undefined
        ? Number(
            notification.utilisateur_id
          )
        : null,

    titre:
      typeof notification.titre === "string"
        ? notification.titre.trim()
        : notification.titre ?? "",

    message:
      typeof notification.message === "string"
        ? notification.message.trim()
        : notification.message ?? "",

    est_lue:
      Boolean(
        notification.est_lue
      ),

    date_creation:
      notification.date_creation ??
      null,

    date_lecture:
      notification.date_lecture ??
      null,
  };
}

// ============================================================
// NORMALISATION D'UNE LISTE
// ============================================================

/**
 * Normalise une liste de notifications.
 *
 * @param {Object|Array} response
 * @returns {Array}
 */
export function normalizeNotifications(
  response
) {
  return extractNotifications(
    response
  )
    .map(
      normalizeNotification
    )
    .filter(Boolean);
}

// ============================================================
// RÉCUPÉRER LES NOTIFICATIONS
// ============================================================

/**
 * Récupère les notifications de l'utilisateur connecté.
 *
 * @param {Object} params
 * @returns {Promise<Object|Array>}
 */
export async function getNotifications(
  params = {}
) {
  if (
    !params ||
    typeof params !== "object" ||
    Array.isArray(params)
  ) {
    throw new Error(
      "Les paramètres des notifications doivent être un objet."
    );
  }

  const searchParams =
    new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {
      if (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
      ) {
        searchParams.set(
          key,
          String(value).trim()
        );
      }
    }
  );

  const query =
    searchParams.toString();

  try {
    const response =
      await apiRequest(
        `/notifications/${
          query
            ? `?${query}`
            : ""
        }`,
        {
          method: "GET",
        }
      );

    return response;
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Impossible de récupérer les notifications."
      )
    );
  }
}

// ============================================================
// RÉCUPÉRER UNE NOTIFICATION
// ============================================================

/**
 * Récupère une notification par son identifiant.
 *
 * @param {number|string} notificationId
 * @returns {Promise<Object>}
 */
export async function getNotificationById(
  notificationId
) {
  const safeId = requireId(
    notificationId,
    "L'identifiant de la notification est obligatoire."
  );

  try {
    const response =
      await apiRequest(
        `/notifications/${safeId}`,
        {
          method: "GET",
        }
      );

    return (
      normalizeNotification(
        extractNotification(
          response
        )
      ) ||
      response
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Impossible de récupérer cette notification."
      )
    );
  }
}

// ============================================================
// MARQUER UNE NOTIFICATION COMME LUE
// ============================================================

/**
 * Marque une notification comme lue.
 *
 * PATCH /notifications/{id}/lue
 *
 * @param {number|string} notificationId
 * @returns {Promise<Object>}
 */
export async function markNotificationAsRead(
  notificationId
) {
  const safeId = requireId(
    notificationId,
    "L'identifiant de la notification est obligatoire."
  );

  try {
    const response =
      await apiRequest(
        `/notifications/${safeId}/lue`,
        {
          method: "PATCH",
        }
      );

    return (
      normalizeNotification(
        extractNotification(
          response
        )
      ) ||
      response
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Impossible de marquer la notification comme lue."
      )
    );
  }
}

// ============================================================
// MARQUER TOUTES LES NOTIFICATIONS COMME LUES
// ============================================================

/**
 * Marque toutes les notifications comme lues.
 *
 * PATCH /notifications/toutes/lues
 *
 * @returns {Promise<Object>}
 */
export async function markAllNotificationsAsRead() {
  try {
    return await apiRequest(
      "/notifications/toutes/lues",
      {
        method: "PATCH",
      }
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Impossible de marquer toutes les notifications comme lues."
      )
    );
  }
}

// ============================================================
// COMPTER LES NOTIFICATIONS NON LUES
// ============================================================

/**
 * Compte localement les notifications non lues.
 *
 * @param {Array} notifications
 * @returns {number}
 */
export function countUnreadNotifications(
  notifications
) {
  if (!Array.isArray(notifications)) {
    return 0;
  }

  return notifications.filter(
    (notification) =>
      !notification?.est_lue
  ).length;
}

// ============================================================
// FILTRER LES NOTIFICATIONS
// ============================================================

/**
 * Filtre localement les notifications.
 *
 * @param {Array} notifications
 * @param {Object} options
 * @param {boolean|null} options.lues
 *
 * @returns {Array}
 */
export function filterNotifications(
  notifications,
  {
    lues = null,
  } = {}
) {
  if (!Array.isArray(notifications)) {
    return [];
  }

  if (lues === null) {
    return notifications;
  }

  return notifications.filter(
    (notification) =>
      Boolean(
        notification?.est_lue
      ) === Boolean(lues)
  );
}

// ============================================================
// API REGROUPÉE
// ============================================================

const notificationsApi = {
  getNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,

  extractNotifications,
  extractNotification,
  extractNotificationsPagination,

  normalizeNotification,
  normalizeNotifications,

  countUnreadNotifications,
  filterNotifications,
};

export default notificationsApi;
