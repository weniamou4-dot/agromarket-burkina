
// ============================================================
// AGROMARKET BURKINA
// SERVICE API — HISTORIQUE DE MODÉRATION
// ============================================================

import { apiRequest } from "./client";

// ============================================================
// CONFIGURATION
// ============================================================

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// ============================================================
// UTILITAIRES INTERNES
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
  value,
  label
) {
  const id = Number(value);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      `${label} invalide.`
    );
  }

  return id;
}

function encodeId(
  value,
  label
) {
  return encodeURIComponent(
    requireId(
      value,
      label
    )
  );
}

function cleanText(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const text =
    String(value).trim();

  return text || null;
}

function appendQueryParam(
  params,
  key,
  value
) {
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

function errorMessage(
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

function extractArray(
  response,
  ...keys
) {
  if (Array.isArray(response)) {
    return response;
  }

  for (const key of keys) {
    if (
      Array.isArray(
        response?.[key]
      )
    ) {
      return response[key];
    }
  }

  return [];
}

// ============================================================
// RECHERCHER / FILTRER L'HISTORIQUE
// ============================================================

export async function getHistorique({
  annonce_id = null,
  acteur_id = null,
  action = null,
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
} = {}) {
  const params =
    new URLSearchParams();

  appendQueryParam(
    params,
    "annonce_id",
    annonce_id
  );

  appendQueryParam(
    params,
    "acteur_id",
    acteur_id
  );

  appendQueryParam(
    params,
    "action",
    cleanText(action)
  );

  params.set(
    "page",
    String(
      normalizePage(page)
    )
  );

  params.set(
    "limit",
    String(
      normalizeLimit(limit)
    )
  );

  try {
    return await apiRequest(
      `/historique/?${params.toString()}`,
      {
        method: "GET",
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de récupérer l'historique de modération."
      )
    );
  }
}

// ============================================================
// EXTRACTION DE L'HISTORIQUE
// ============================================================

export function extractHistorique(
  response
) {
  return extractArray(
    response,
    "historique",
    "historiques",
    "resultats",
    "results"
  );
}

// ============================================================
// EXTRACTION DE LA PAGINATION
// ============================================================

export function extractHistoriquePagination(
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
// CONSULTER UN HISTORIQUE PAR ID
// ============================================================

export async function getHistoriqueById(
  historiqueId
) {
  const id =
    encodeId(
      historiqueId,
      "L'identifiant de l'historique"
    );

  try {
    return await apiRequest(
      `/historique/${id}`,
      {
        method: "GET",
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de récupérer l'historique demandé."
      )
    );
  }
}

// ============================================================
// HISTORIQUE D'UNE ANNONCE
// ============================================================

export async function getHistoriqueByAnnonce(
  annonceId
) {
  const id =
    encodeId(
      annonceId,
      "L'identifiant de l'annonce"
    );

  try {
    return await apiRequest(
      `/historique/annonce/${id}`,
      {
        method: "GET",
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de récupérer l'historique de l'annonce."
      )
    );
  }
}

// ============================================================
// DERNIÈRE ACTION D'UNE ANNONCE
// ============================================================

export async function getDerniereActionAnnonce(
  annonceId
) {
  const id =
    encodeId(
      annonceId,
      "L'identifiant de l'annonce"
    );

  try {
    return await apiRequest(
      `/historique/annonce/${id}/derniere-action`,
      {
        method: "GET",
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de récupérer la dernière action de l'annonce."
      )
    );
  }
}

// ============================================================
// VÉRIFIER LA COHÉRENCE D'UNE ANNONCE
// ============================================================

export async function verifierCoherenceHistorique(
  annonceId
) {
  const id =
    encodeId(
      annonceId,
      "L'identifiant de l'annonce"
    );

  try {
    return await apiRequest(
      `/historique/annonce/${id}/coherence`,
      {
        method: "GET",
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de vérifier la cohérence de l'historique."
      )
    );
  }
}

// ============================================================
// HISTORIQUE D'UN ACTEUR
// ============================================================

export async function getHistoriqueByActeur(
  acteurId
) {
  const id =
    encodeId(
      acteurId,
      "L'identifiant de l'acteur"
    );

  try {
    return await apiRequest(
      `/historique/acteur/${id}`,
      {
        method: "GET",
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de récupérer l'historique de l'acteur."
      )
    );
  }
}

// ============================================================
// STATISTIQUES DE L'HISTORIQUE
// ============================================================

export async function getHistoriqueStats({
  annonce_id = null,
  acteur_id = null,
} = {}) {
  const params =
    new URLSearchParams();

  appendQueryParam(
    params,
    "annonce_id",
    annonce_id
  );

  appendQueryParam(
    params,
    "acteur_id",
    acteur_id
  );

  const query =
    params.toString();

  const url = query
    ? `/historique/statistiques/resume?${query}`
    : "/historique/statistiques/resume";

  try {
    return await apiRequest(
      url,
      {
        method: "GET",
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de récupérer les statistiques de l'historique."
      )
    );
  }
}

// ============================================================
// EXPORT PAR DÉFAUT
// ============================================================

const historiqueApi = {
  getHistorique,
  extractHistorique,
  extractHistoriquePagination,
  getHistoriqueById,
  getHistoriqueByAnnonce,
  getDerniereActionAnnonce,
  verifierCoherenceHistorique,
  getHistoriqueByActeur,
  getHistoriqueStats,
};

export default historiqueApi;
