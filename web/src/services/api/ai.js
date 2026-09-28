
// ============================================================
// AGROMARKET BURKINA
// SERVICE API — AI
// ============================================================

import { apiRequest } from "./client";

// ============================================================
// CONFIGURATION
// ============================================================

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

// ============================================================
// UTILITAIRES INTERNES
// ============================================================

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
// ÉTAT DU SERVICE AI
// ============================================================

/**
 * Vérifie l'état du service AI.
 *
 * GET /ai/health
 */
export async function getAIHealth() {
  try {
    return await apiRequest(
      "/ai/health",
      {
        method: "GET",
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Le service AI est actuellement indisponible."
      )
    );
  }
}

// ============================================================
// CHAT AVEC L'ASSISTANT AI
// ============================================================

/**
 * Envoie un message à l'assistant AI.
 *
 * POST /ai/chat
 */
export async function envoyerMessageAI(
  message
) {
  const cleanMessage =
    cleanText(message);

  if (!cleanMessage) {
    throw new Error(
      "Le message est requis."
    );
  }

  try {
    return await apiRequest(
      "/ai/chat",
      {
        method: "POST",
        body: JSON.stringify({
          message:
            cleanMessage,
        }),
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de communiquer avec l'assistant AI."
      )
    );
  }
}

// ============================================================
// SUGGESTIONS INTELLIGENTES DE PRODUITS
// ============================================================

/**
 * Demande des suggestions de produits
 * à partir d'une recherche.
 *
 * POST /ai/produits/suggestions
 */
export async function suggererProduits({
  recherche,
  region = null,
  limit = DEFAULT_LIMIT,
} = {}) {
  const cleanRecherche =
    cleanText(recherche);

  if (!cleanRecherche) {
    throw new Error(
      "La recherche est requise."
    );
  }

  const cleanRegion =
    cleanText(region);

  const safeLimit =
    normalizeLimit(limit);

  try {
    return await apiRequest(
      "/ai/produits/suggestions",
      {
        method: "POST",
        body: JSON.stringify({
          recherche:
            cleanRecherche,
          region:
            cleanRegion,
          limit:
            safeLimit,
        }),
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible d'obtenir les suggestions de produits AI."
      )
    );
  }
}

// ============================================================
// EXTRACTION DES SUGGESTIONS
// ============================================================

/**
 * Transforme différentes structures
 * de réponse en tableau de suggestions.
 */
export function extractSuggestions(
  response
) {
  return extractArray(
    response,
    "suggestions",
    "produits",
    "resultats",
    "results"
  );
}

// ============================================================
// EXPORT PAR DÉFAUT
// ============================================================

const aiApi = {
  getAIHealth,
  envoyerMessageAI,
  suggererProduits,
  extractSuggestions,
};

export default aiApi;