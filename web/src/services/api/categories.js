
// web/src/services/api/categories.js

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

function appendIfValue(params, key, value) {
  if (
    value !== null &&
    value !== undefined &&
    String(value).trim() !== ""
  ) {
    params.set(
      key,
      String(value).trim()
    );
  }
}

function validateData(data) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    throw new Error(
      "Les données de la catégorie sont obligatoires."
    );
  }

  return data;
}

// ============================================================
// LISTE DES CATÉGORIES
// ============================================================

/**
 * Récupère la liste des catégories.
 *
 * Les paramètres supplémentaires sont conservés afin de
 * rester compatibles avec les éventuels filtres backend.
 *
 * @param {Object} params
 * @returns {Promise<Object|Array>}
 */
export async function getCategories(
  params = {}
) {
  if (
    !params ||
    typeof params !== "object" ||
    Array.isArray(params)
  ) {
    throw new Error(
      "Les paramètres des catégories doivent être un objet."
    );
  }

  const queryParams =
    new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {
      appendIfValue(
        queryParams,
        key,
        value
      );
    }
  );

  const query =
    queryParams.toString();

  return apiRequest(
    `/categories/${query ? `?${query}` : ""}`,
    {
      method: "GET",
      auth: false,
    }
  );
}

// ============================================================
// CATÉGORIE PAR ID
// ============================================================

/**
 * Récupère une catégorie par son identifiant.
 *
 * @param {number|string} categorieId
 * @returns {Promise<Object>}
 */
export async function getCategorieById(
  categorieId
) {
  const safeId = requireId(
    categorieId,
    "L'identifiant de la catégorie est obligatoire."
  );

  return apiRequest(
    `/categories/${safeId}`,
    {
      method: "GET",
      auth: false,
    }
  );
}

// ============================================================
// CRÉER UNE CATÉGORIE
// ============================================================

/**
 * Crée une nouvelle catégorie.
 *
 * Cette opération nécessite une authentification
 * côté backend.
 *
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createCategorie(
  data
) {
  const validatedData =
    validateData(data);

  return apiRequest(
    "/categories/",
    {
      method: "POST",
      body: JSON.stringify(
        validatedData
      ),
    }
  );
}

// ============================================================
// MODIFIER UNE CATÉGORIE
// ============================================================

/**
 * Modifie une catégorie existante.
 *
 * @param {number|string} categorieId
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function updateCategorie(
  categorieId,
  data
) {
  const safeId = requireId(
    categorieId,
    "L'identifiant de la catégorie est obligatoire."
  );

  const validatedData =
    validateData(data);

  return apiRequest(
    `/categories/${safeId}`,
    {
      method: "PUT",
      body: JSON.stringify(
        validatedData
      ),
    }
  );
}

// ============================================================
// SUPPRIMER UNE CATÉGORIE
// ============================================================

/**
 * Supprime une catégorie.
 *
 * @param {number|string} categorieId
 * @returns {Promise<Object|null>}
 */
export async function deleteCategorie(
  categorieId
) {
  const safeId = requireId(
    categorieId,
    "L'identifiant de la catégorie est obligatoire."
  );

  return apiRequest(
    `/categories/${safeId}`,
    {
      method: "DELETE",
    }
  );
}

// ============================================================
// EXTRACTION DES CATÉGORIES
// ============================================================

/**
 * Extrait proprement les catégories d'une réponse API.
 *
 * Compatible avec :
 * - tableau direct
 * - { categories: [...] }
 * - { resultats: [...] }
 * - { results: [...] }
 *
 * @param {Object|Array} response
 * @returns {Array}
 */
export function extractCategories(
  response
) {
  if (Array.isArray(response)) {
    return response;
  }

  if (
    Array.isArray(
      response?.categories
    )
  ) {
    return response.categories;
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
// EXTRACTION DE LA PAGINATION
// ============================================================

/**
 * Extrait les informations de pagination.
 *
 * @param {Object} response
 * @param {Object} fallback
 * @returns {Object}
 */
export function extractCategoriesPagination(
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
// NORMALISATION D'UNE CATÉGORIE
// ============================================================

/**
 * Normalise une catégorie.
 *
 * @param {Object} categorie
 * @returns {Object|null}
 */
export function normalizeCategorie(
  categorie
) {
  if (
    !categorie ||
    typeof categorie !== "object" ||
    Array.isArray(categorie)
  ) {
    return null;
  }

  return {
    ...categorie,

    id:
      categorie.id ?? null,

    nom:
      typeof categorie.nom === "string"
        ? categorie.nom.trim()
        : categorie.nom ?? "",

    description:
      typeof categorie.description === "string"
        ? categorie.description.trim()
        : categorie.description ?? null,
  };
}

// ============================================================
// NORMALISATION D'UNE LISTE
// ============================================================

/**
 * Normalise une liste de catégories.
 *
 * @param {Object|Array} response
 * @returns {Array}
 */
export function normalizeCategories(
  response
) {
  return extractCategories(response)
    .map(normalizeCategorie)
    .filter(Boolean);
}

// ============================================================
// API REGROUPÉE
// ============================================================

const categoriesApi = {
  getCategories,
  getCategorieById,
  createCategorie,
  updateCategorie,
  deleteCategorie,
  extractCategories,
  extractCategoriesPagination,
  normalizeCategorie,
  normalizeCategories,
};

export default categoriesApi;
