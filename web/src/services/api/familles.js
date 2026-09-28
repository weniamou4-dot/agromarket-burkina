
// web/src/services/api/familles.js

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

  return Math.max(1, Math.floor(value));
}

function normalizeLimit(limit) {
  const value = Number(limit);

  if (!Number.isFinite(value)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(
    MAX_LIMIT,
    Math.max(1, Math.floor(value))
  );
}

function requireId(id, message) {
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

function validateData(data) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    throw new Error(
      "Les données de la famille sont obligatoires."
    );
  }

  return data;
}

// ============================================================
// LISTE DES FAMILLES
// ============================================================

/**
 * Récupère les familles de produits.
 *
 * @param {Object} params
 * @returns {Promise<Object|Array>}
 */
export async function getFamilles(
  params = {}
) {
  if (
    !params ||
    typeof params !== "object" ||
    Array.isArray(params)
  ) {
    throw new Error(
      "Les paramètres des familles doivent être un objet."
    );
  }

  const queryParams =
    new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {
      if (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
      ) {
        queryParams.set(
          key,
          String(value).trim()
        );
      }
    }
  );

  const query =
    queryParams.toString();

  return apiRequest(
    `/familles/${query ? `?${query}` : ""}`,
    {
      method: "GET",
      auth: false,
    }
  );
}

// ============================================================
// FAMILLE PAR ID
// ============================================================

/**
 * Récupère une famille par son identifiant.
 *
 * @param {number|string} familleId
 * @returns {Promise<Object>}
 */
export async function getFamilleById(
  familleId
) {
  const safeId = requireId(
    familleId,
    "L'identifiant de la famille est obligatoire."
  );

  return apiRequest(
    `/familles/${safeId}`,
    {
      method: "GET",
      auth: false,
    }
  );
}

// ============================================================
// CRÉER UNE FAMILLE
// ============================================================

/**
 * Crée une nouvelle famille.
 *
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createFamille(
  data
) {
  const validatedData =
    validateData(data);

  return apiRequest(
    "/familles/",
    {
      method: "POST",
      body: JSON.stringify(
        validatedData
      ),
    }
  );
}

// ============================================================
// MODIFIER UNE FAMILLE
// ============================================================

/**
 * Modifie une famille existante.
 *
 * @param {number|string} familleId
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function updateFamille(
  familleId,
  data
) {
  const safeId = requireId(
    familleId,
    "L'identifiant de la famille est obligatoire."
  );

  const validatedData =
    validateData(data);

  return apiRequest(
    `/familles/${safeId}`,
    {
      method: "PUT",
      body: JSON.stringify(
        validatedData
      ),
    }
  );
}

// ============================================================
// SUPPRIMER UNE FAMILLE
// ============================================================

/**
 * Supprime une famille.
 *
 * @param {number|string} familleId
 * @returns {Promise<Object|null>}
 */
export async function deleteFamille(
  familleId
) {
  const safeId = requireId(
    familleId,
    "L'identifiant de la famille est obligatoire."
  );

  return apiRequest(
    `/familles/${safeId}`,
    {
      method: "DELETE",
    }
  );
}

// ============================================================
// EXTRACTION DES FAMILLES
// ============================================================

/**
 * Extrait les familles depuis différentes
 * structures de réponse API.
 *
 * @param {Object|Array} response
 * @returns {Array}
 */
export function extractFamilles(
  response
) {
  if (Array.isArray(response)) {
    return response;
  }

  if (
    Array.isArray(response?.familles)
  ) {
    return response.familles;
  }

  if (
    Array.isArray(response?.resultats)
  ) {
    return response.resultats;
  }

  if (
    Array.isArray(response?.results)
  ) {
    return response.results;
  }

  return [];
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
export function extractFamillesPagination(
  response,
  fallback = {}
) {
  if (
    response?.pagination &&
    typeof response.pagination === "object"
  ) {
    return response.pagination;
  }

  return {
    page: normalizePage(
      fallback.page
    ),
    limit: normalizeLimit(
      fallback.limit
    ),
    total: 0,
    pages: 0,
  };
}

// ============================================================
// NORMALISATION D'UNE FAMILLE
// ============================================================

/**
 * Normalise une famille.
 *
 * @param {Object} famille
 * @returns {Object|null}
 */
export function normalizeFamille(
  famille
) {
  if (
    !famille ||
    typeof famille !== "object" ||
    Array.isArray(famille)
  ) {
    return null;
  }

  return {
    ...famille,

    id:
      famille.id ?? null,

    nom:
      typeof famille.nom === "string"
        ? famille.nom.trim()
        : famille.nom ?? "",

    description:
      typeof famille.description === "string"
        ? famille.description.trim()
        : famille.description ?? null,

    categorie_id:
      famille.categorie_id ??
      famille.categorieId ??
      null,
  };
}

// ============================================================
// NORMALISATION D'UNE LISTE
// ============================================================

/**
 * Normalise une liste de familles.
 *
 * @param {Object|Array} response
 * @returns {Array}
 */
export function normalizeFamilles(
  response
) {
  return extractFamilles(response)
    .map(normalizeFamille)
    .filter(Boolean);
}

// ============================================================
// API REGROUPÉE
// ============================================================

const famillesApi = {
  getFamilles,
  getFamilleById,
  createFamille,
  updateFamille,
  deleteFamille,
  extractFamilles,
  extractFamillesPagination,
  normalizeFamille,
  normalizeFamilles,
};

export default famillesApi;
