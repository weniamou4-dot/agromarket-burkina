
// ============================================================
// AGROMARKET BURKINA
// API CLIENT
// ============================================================
//
// Fichier :
//   web/src/services/api/client.js
//
// Rôle :
//   Client HTTP centralisé pour toutes les requêtes frontend.
//
// Fonctionnalités :
//   - URL API configurable avec VITE_API_URL
//   - Authentification Bearer
//   - Timeout des requêtes
//   - Gestion JSON / texte
//   - Gestion des erreurs FastAPI
//   - Gestion FormData
//   - GET / POST / PATCH / PUT / DELETE
//   - Conservation des exports existants
//   - Export default apiClient
//
// ============================================================

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";

const API_TIMEOUT = 15000;

/*
 * ============================================================
 * EXPORTS DE BASE
 * ============================================================
 */

export { API_URL };

/*
 * ============================================================
 * AUTHENTIFICATION / SESSION
 * ============================================================
 */

/**
 * Récupère le token d'accès actuellement enregistré.
 *
 * @returns {string|null}
 */
export function getToken() {
  return localStorage.getItem(
    "access_token"
  );
}

/**
 * Vérifie si l'utilisateur possède un token.
 *
 * @returns {boolean}
 */
export function isAuthenticated() {
  return Boolean(getToken());
}

/**
 * Récupère l'utilisateur enregistré localement.
 *
 * @returns {object|null}
 */
export function getStoredUser() {
  const raw =
    localStorage.getItem(
      "current_user"
    );

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Enregistre l'utilisateur courant.
 *
 * @param {object|null} user
 */
export function saveUser(user) {
  if (!user) {
    localStorage.removeItem(
      "current_user"
    );

    return;
  }

  localStorage.setItem(
    "current_user",
    JSON.stringify(user)
  );
}

/**
 * Efface complètement la session locale.
 */
export function clearSession() {
  localStorage.removeItem(
    "access_token"
  );

  localStorage.removeItem(
    "refresh_token"
  );

  localStorage.removeItem(
    "current_user"
  );

  localStorage.removeItem(
    "user_role"
  );
}

/*
 * ============================================================
 * HEADERS
 * ============================================================
 */

/**
 * Construit les headers HTTP.
 *
 * @param {object|Headers} headers
 * @param {boolean} hasBody
 * @returns {object|Headers}
 */
function buildHeaders(
  headers = {},
  hasBody = false
) {
  const token = getToken();

  /*
   * ----------------------------------------------------------
   * Cas Headers natif
   * ----------------------------------------------------------
   */

  if (headers instanceof Headers) {
    const finalHeaders =
      new Headers(headers);

    finalHeaders.set(
      "Accept",
      "application/json"
    );

    if (token) {
      finalHeaders.set(
        "Authorization",
        `Bearer ${token}`
      );
    }

    if (
      hasBody &&
      !finalHeaders.has(
        "Content-Type"
      )
    ) {
      finalHeaders.set(
        "Content-Type",
        "application/json"
      );
    }

    return finalHeaders;
  }

  /*
   * ----------------------------------------------------------
   * Cas objet classique
   * ----------------------------------------------------------
   */

  const finalHeaders = {
    Accept: "application/json",
    ...headers,
  };

  if (token) {
    finalHeaders.Authorization =
      `Bearer ${token}`;
  }

  if (
    hasBody &&
    !finalHeaders[
      "Content-Type"
    ]
  ) {
    finalHeaders[
      "Content-Type"
    ] = "application/json";
  }

  return finalHeaders;
}

/*
 * ============================================================
 * RÉPONSE HTTP
 * ============================================================
 */

/**
 * Transforme la réponse HTTP en données exploitables.
 *
 * @param {Response} response
 * @returns {Promise<*>}
 */
async function parseResponse(
  response
) {
  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  /*
   * Réponse JSON
   */
  if (
    contentType
      .toLowerCase()
      .includes(
        "application/json"
      )
  ) {
    return response.json();
  }

  /*
   * Réponse texte
   */
  const text =
    await response.text();

  return text || null;
}

/*
 * ============================================================
 * ERREURS
 * ============================================================
 */

/**
 * Extrait un message d'erreur lisible
 * depuis une réponse FastAPI.
 *
 * @param {*} data
 * @param {number} status
 * @returns {string}
 */
function extractErrorMessage(
  data,
  status
) {
  /*
   * ----------------------------------------------------------
   * FastAPI detail
   * ----------------------------------------------------------
   */

  if (data?.detail) {
    /*
     * Erreurs de validation Pydantic
     */
    if (
      Array.isArray(
        data.detail
      )
    ) {
      return data.detail
        .map((item) => {
          if (
            typeof item ===
            "string"
          ) {
            return item;
          }

          return (
            item?.msg ||
            item?.message ||
            "Erreur de validation."
          );
        })
        .filter(Boolean)
        .join(", ");
    }

    /*
     * Erreur simple
     */
    if (
      typeof data.detail ===
      "string"
    ) {
      return data.detail;
    }

    /*
     * detail sous forme d'objet
     */
    if (
      typeof data.detail ===
      "object"
    ) {
      return (
        data.detail.message ||
        data.detail.msg ||
        "Une erreur est survenue."
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * Message direct
   * ----------------------------------------------------------
   */

  if (
    typeof data ===
      "string" &&
    data.trim()
  ) {
    return data.trim();
  }

  /*
   * ----------------------------------------------------------
   * Messages HTTP
   * ----------------------------------------------------------
   */

  const messages = {
    400:
      "Requête incorrecte.",

    401:
      "Votre session est invalide.",

    403:
      "Accès refusé.",

    404:
      "Ressource introuvable.",

    409:
      "Cette opération provoque un conflit.",

    422:
      "Les données envoyées sont invalides.",

    429:
      "Trop de requêtes. Veuillez patienter.",

    500:
      "Erreur interne du serveur.",

    502:
      "Le serveur est temporairement indisponible.",

    503:
      "Le service est temporairement indisponible.",
  };

  return (
    messages[status] ||
    `Erreur serveur (${status}).`
  );
}

/*
 * ============================================================
 * REQUÊTE PRINCIPALE
 * ============================================================
 */

/**
 * Effectue une requête HTTP vers l'API AgroMarket.
 *
 * @param {string} endpoint
 * @param {object} options
 * @returns {Promise<*>}
 */
export async function apiRequest(
  endpoint,
  options = {}
) {
  if (
    typeof endpoint !==
      "string" ||
    !endpoint.trim()
  ) {
    throw new Error(
      "L'endpoint API est invalide."
    );
  }

  const controller =
    new AbortController();

  const timeoutId =
    setTimeout(() => {
      controller.abort();
    }, API_TIMEOUT);

  const {
    auth = true,
    body,
    headers = {},
    signal,
    ...rest
  } = options;

  try {
    /*
     * --------------------------------------------------------
     * Authentification
     * --------------------------------------------------------
     */

    if (
      auth &&
      !getToken()
    ) {
      throw new Error(
        "Vous devez être connecté."
      );
    }

    /*
     * --------------------------------------------------------
     * FormData
     * --------------------------------------------------------
     */

    const isFormData =
      typeof FormData !==
        "undefined" &&
      body instanceof FormData;

    /*
     * --------------------------------------------------------
     * Headers
     * --------------------------------------------------------
     */

    const requestHeaders =
      buildHeaders(
        headers,
        body !== undefined &&
          body !== null &&
          !isFormData
      );

    /*
     * --------------------------------------------------------
     * Ne jamais définir Content-Type manuellement
     * pour FormData.
     *
     * Le navigateur doit ajouter automatiquement
     * le multipart/form-data avec son boundary.
     * --------------------------------------------------------
     */

    if (isFormData) {
      if (
        requestHeaders instanceof
        Headers
      ) {
        requestHeaders.delete(
          "Content-Type"
        );
      } else {
        delete requestHeaders[
          "Content-Type"
        ];
        delete requestHeaders[
          "content-type"
        ];
      }
    }

    /*
     * --------------------------------------------------------
     * Préparation du body
     * --------------------------------------------------------
     */

    let requestBody = body;

    /*
     * Si body est un objet JavaScript classique,
     * on le convertit en JSON.
     *
     * Les chaînes, FormData, Blob, etc. sont conservés.
     */

    if (
      body !== undefined &&
      body !== null &&
      !isFormData &&
      typeof body ===
        "object" &&
      !(body instanceof Blob) &&
      !(body instanceof ArrayBuffer)
    ) {
      requestBody =
        JSON.stringify(body);
    }

    /*
     * --------------------------------------------------------
     * Fetch
     * --------------------------------------------------------
     */

    const response =
      await fetch(
        `${API_URL}${endpoint}`,
        {
          ...rest,

          headers:
            requestHeaders,

          body:
            requestBody,

          signal:
            signal ||
            controller.signal,
        }
      );

    /*
     * --------------------------------------------------------
     * Lecture réponse
     * --------------------------------------------------------
     */

    const data =
      await parseResponse(
        response
      );

    /*
     * --------------------------------------------------------
     * Gestion des erreurs HTTP
     * --------------------------------------------------------
     */

    if (!response.ok) {
      /*
       * Session expirée / token invalide
       */
      if (
        response.status ===
        401
      ) {
        clearSession();
      }

      const error =
        new Error(
          extractErrorMessage(
            data,
            response.status
          )
        );

      /*
       * Conserve les informations utiles
       * pour les composants frontend.
       */

      error.status =
        response.status;

      error.data = data;

      throw error;
    }

    /*
     * --------------------------------------------------------
     * Succès
     * --------------------------------------------------------
     */

    return data;
  } catch (error) {
    /*
     * --------------------------------------------------------
     * Timeout
     * --------------------------------------------------------
     */

    if (
      error?.name ===
      "AbortError"
    ) {
      throw new Error(
        "Le serveur met trop de temps à répondre."
      );
    }

    /*
     * --------------------------------------------------------
     * Serveur inaccessible
     * --------------------------------------------------------
     */

    if (
      error instanceof
      TypeError
    ) {
      throw new Error(
        "Impossible de contacter le serveur AgroMarket. Vérifiez que l'API FastAPI est démarrée."
      );
    }

    throw error;
  } finally {
    clearTimeout(
      timeoutId
    );
  }
}

/*
 * ============================================================
 * PARAMÈTRES URL
 * ============================================================
 */

/**
 * Ajoute proprement des paramètres à une URL.
 *
 * @param {string} endpoint
 * @param {object} params
 * @returns {string}
 */
function appendQueryParams(
  endpoint,
  params = {}
) {
  if (
    !params ||
    typeof params !==
      "object"
  ) {
    return endpoint;
  }

  const entries =
    Object.entries(params)
      .filter(
        ([, value]) =>
          value !==
            undefined &&
          value !== null &&
          value !== ""
      );

  if (!entries.length) {
    return endpoint;
  }

  const query =
    new URLSearchParams();

  for (
    const [key, value] of
    entries
  ) {
    /*
     * Support des tableaux :
     *
     * statut=["a","b"]
     *
     * devient :
     *
     * statut=a&statut=b
     */

    if (
      Array.isArray(value)
    ) {
      for (
        const item of value
      ) {
        if (
          item !==
            undefined &&
          item !== null &&
          item !== ""
        ) {
          query.append(
            key,
            String(item)
          );
        }
      }

      continue;
    }

    query.append(
      key,
      String(value)
    );
  }

  const queryString =
    query.toString();

  if (!queryString) {
    return endpoint;
  }

  return endpoint.includes(
    "?"
  )
    ? `${endpoint}&${queryString}`
    : `${endpoint}?${queryString}`;
}

/*
 * ============================================================
 * CLIENT API
 * ============================================================
 */

/**
 * Client HTTP utilisé par les services API.
 *
 * Exemple :
 *
 *   apiClient.get("/commandes/mes")
 *
 *   apiClient.post("/commandes/", {
 *     annonce_id: 1,
 *     quantite: 2
 *   })
 *
 *   apiClient.patch(
 *     "/commandes/7/statut",
 *     { statut: "confirmee" }
 *   )
 */
const apiClient = {
  /**
   * GET
   *
   * @param {string} endpoint
   * @param {object} options
   * @returns {Promise<*>}
   */
  async get(
    endpoint,
    options = {}
  ) {
    const {
      params,
      ...requestOptions
    } = options;

    const finalEndpoint =
      appendQueryParams(
        endpoint,
        params
      );

    return apiRequest(
      finalEndpoint,
      {
        ...requestOptions,
        method: "GET",
      }
    );
  },

  /**
   * POST
   *
   * @param {string} endpoint
   * @param {*} body
   * @param {object} options
   * @returns {Promise<*>}
   */
  async post(
    endpoint,
    body,
    options = {}
  ) {
    return apiRequest(
      endpoint,
      {
        ...options,
        method: "POST",
        body,
      }
    );
  },

  /**
   * PATCH
   *
   * @param {string} endpoint
   * @param {*} body
   * @param {object} options
   * @returns {Promise<*>}
   */
  async patch(
    endpoint,
    body,
    options = {}
  ) {
    return apiRequest(
      endpoint,
      {
        ...options,
        method: "PATCH",
        body,
      }
    );
  },

  /**
   * PUT
   *
   * @param {string} endpoint
   * @param {*} body
   * @param {object} options
   * @returns {Promise<*>}
   */
  async put(
    endpoint,
    body,
    options = {}
  ) {
    return apiRequest(
      endpoint,
      {
        ...options,
        method: "PUT",
        body,
      }
    );
  },

  /**
   * DELETE
   *
   * @param {string} endpoint
   * @param {object} options
   * @returns {Promise<*>}
   */
  async delete(
    endpoint,
    options = {}
  ) {
    const {
      body,
      params,
      ...requestOptions
    } = options;

    const finalEndpoint =
      appendQueryParams(
        endpoint,
        params
      );

    return apiRequest(
      finalEndpoint,
      {
        ...requestOptions,
        method: "DELETE",
        body,
      }
    );
  },

  /**
   * Requête HTTP générique.
   *
   * @param {string} endpoint
   * @param {object} options
   * @returns {Promise<*>}
   */
  request(
    endpoint,
    options = {}
  ) {
    const {
      params,
      ...requestOptions
    } = options;

    const finalEndpoint =
      appendQueryParams(
        endpoint,
        params
      );

    return apiRequest(
      finalEndpoint,
      requestOptions
    );
  },
};

/*
 * ============================================================
 * EXPORT DEFAULT
 * ============================================================
 *
 * IMPORTANT :
 * orders.js utilise :
 *
 *   import apiClient from "./client";
 *
 * Cet export est donc indispensable.
 * ============================================================
 */

export default apiClient;
