// ============================================================
// AGROMARKET BURKINA
// API - AVIS PLATEFORME
// ============================================================

import { apiRequest } from "./client";

// ============================================================
// CONFIGURATION
// ============================================================

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// ============================================================
// OUTILS
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

function normalizeNote(note) {
  const value = Number(note);

  if (
    !Number.isInteger(value) ||
    value < 1 ||
    value > 5
  ) {
    throw new Error(
      "La note doit être un nombre entier compris entre 1 et 5."
    );
  }

  return value;
}

function normalizeCommentaire(commentaire) {
  if (
    commentaire === null ||
    commentaire === undefined
  ) {
    return null;
  }

  const value = String(commentaire).trim();

  return value || null;
}

function normalizeBoolean(
  value,
  fieldName = "La valeur"
) {
  if (typeof value !== "boolean") {
    throw new Error(
      `${fieldName} doit être une valeur booléenne.`
    );
  }

  return value;
}

// ============================================================
// CRÉER UN AVIS
// ============================================================

export async function creerAvisPlateforme({
  note,
  commentaire = null,
} = {}) {
  const normalizedNote =
    normalizeNote(note);

  const normalizedCommentaire =
    normalizeCommentaire(commentaire);

  return apiRequest(
    "/avis-plateforme",
    {
      method: "POST",
      body: JSON.stringify({
        note: normalizedNote,
        commentaire: normalizedCommentaire,
      }),
    }
  );
}

// ============================================================
// MON AVIS
// ============================================================

export async function getMonAvisPlateforme() {
  return apiRequest(
    "/avis-plateforme/moi",
    {
      method: "GET",
    }
  );
}

// ============================================================
// LISTE DES AVIS PUBLICS
// ============================================================

export async function getAvisPlateforme({
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
} = {}) {
  const safePage = normalizePage(page);
  const safeLimit = normalizeLimit(limit);

  /*
   * Le backend utilise :
   *
   * skip
   * limit
   *
   * et non :
   *
   * page
   * limit
   */

  const skip =
    (safePage - 1) * safeLimit;

  const params = new URLSearchParams();

  params.set(
    "skip",
    String(skip)
  );

  params.set(
    "limit",
    String(safeLimit)
  );

  return apiRequest(
    `/avis-plateforme?${params.toString()}`,
    {
      method: "GET",
      auth: false,
    }
  );
}

// ============================================================
// RÉCUPÉRER UN AVIS
// ============================================================

export async function getAvisPlateformeById(
  avisId
) {
  const safeId = requireId(
    avisId,
    "L'identifiant de l'avis est obligatoire."
  );

  return apiRequest(
    `/avis-plateforme/${safeId}`,
    {
      method: "GET",
      auth: false,
    }
  );
}

// ============================================================
// MODIFIER MON AVIS
// ============================================================

export async function modifierAvisPlateforme(
  avisId,
  {
    note = null,
    commentaire = null,
  } = {}
) {
  const safeId = requireId(
    avisId,
    "L'identifiant de l'avis est obligatoire."
  );

  const payload = {};

  if (
    note !== null &&
    note !== undefined
  ) {
    payload.note =
      normalizeNote(note);
  }

  if (
    commentaire !== null &&
    commentaire !== undefined
  ) {
    payload.commentaire =
      normalizeCommentaire(
        commentaire
      );
  }

  if (
    Object.keys(payload).length === 0
  ) {
    throw new Error(
      "Au moins une information doit être fournie pour modifier l'avis."
    );
  }

  return apiRequest(
    `/avis-plateforme/${safeId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

// ============================================================
// SUPPRIMER MON AVIS
// ============================================================

export async function supprimerAvisPlateforme(
  avisId
) {
  const safeId = requireId(
    avisId,
    "L'identifiant de l'avis est obligatoire."
  );

  return apiRequest(
    `/avis-plateforme/${safeId}`,
    {
      method: "DELETE",
    }
  );
}

// ============================================================
// MODÉRATION
// ============================================================

export async function getAvisPlateformeModeration({
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
} = {}) {
  const safePage = normalizePage(page);
  const safeLimit = normalizeLimit(limit);

  const skip =
    (safePage - 1) * safeLimit;

  const params = new URLSearchParams();

  params.set(
    "skip",
    String(skip)
  );

  params.set(
    "limit",
    String(safeLimit)
  );

  return apiRequest(
    `/avis-plateforme/moderation/liste?${params.toString()}`,
    {
      method: "GET",
    }
  );
}

// ============================================================
// MODÉRATION — MASQUER
// ============================================================

export async function masquerAvisPlateforme(
  avisId
) {
  const safeId = requireId(
    avisId,
    "L'identifiant de l'avis est obligatoire."
  );

  return apiRequest(
    `/avis-plateforme/moderation/${safeId}/masquer`,
    {
      method: "PATCH",
    }
  );
}

// ============================================================
// MODÉRATION — AFFICHER
// ============================================================

export async function afficherAvisPlateforme(
  avisId
) {
  const safeId = requireId(
    avisId,
    "L'identifiant de l'avis est obligatoire."
  );

  return apiRequest(
    `/avis-plateforme/moderation/${safeId}/afficher`,
    {
      method: "PATCH",
    }
  );
}

// ============================================================
// STATISTIQUES
// ============================================================

export async function getStatistiquesAvisPlateforme() {
  return apiRequest(
    "/avis-plateforme/statistiques",
    {
      method: "GET",
      auth: false,
    }
  );
}

// ============================================================
// EXTRACTION
// ============================================================

export function extractAvisPlateforme(
  response
) {
  if (Array.isArray(response)) {
    return response;
  }

  if (
    Array.isArray(response?.avis)
  ) {
    return response.avis;
  }

  if (
    Array.isArray(
      response?.avis_plateforme
    )
  ) {
    return response.avis_plateforme;
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
// NORMALISATION
// ============================================================

export function normalizeAvisPlateforme(
  avis
) {
  if (
    !avis ||
    typeof avis !== "object" ||
    Array.isArray(avis)
  ) {
    return null;
  }

  return {
    ...avis,

    id: avis.id ?? null,

    utilisateur_id:
      avis.utilisateur_id ?? null,

    note:
      avis.note !== null &&
      avis.note !== undefined
        ? Number(avis.note)
        : null,

    commentaire:
      avis.commentaire ?? null,

    est_visible:
      typeof avis.est_visible ===
      "boolean"
        ? avis.est_visible
        : true,

    date_creation:
      avis.date_creation ?? null,

    date_modification:
      avis.date_modification ?? null,
  };
}

export function normalizeAvisPlateformeList(
  response
) {
  return extractAvisPlateforme(
    response
  )
    .map(
      normalizeAvisPlateforme
    )
    .filter(Boolean);
}

// ============================================================
// PAGINATION
// ============================================================

export function extractAvisPlateformePagination(
  response,
  {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
  } = {}
) {
  /*
   * Le backend actuel retourne directement
   * une liste et ne retourne pas le nombre
   * total.
   *
   * On fournit donc une pagination frontend
   * minimale.
   */

  const safePage =
    normalizePage(page);

  const safeLimit =
    normalizeLimit(limit);

  const liste =
    extractAvisPlateforme(
      response
    );

  return {
    page: safePage,
    limit: safeLimit,
    total: liste.length,
    pages:
      liste.length >= safeLimit
        ? safePage + 1
        : safePage,
  };
}

// ============================================================
// VALIDATIONS
// ============================================================

export function isValidAvisPlateformeNote(
  note
) {
  const value = Number(note);

  return (
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

export function isValidAvisPlateformeCommentaire(
  commentaire
) {
  if (
    commentaire === null ||
    commentaire === undefined
  ) {
    return true;
  }

  return (
    String(commentaire)
      .trim()
      .length <= 1000
  );
}

export function normalizeAvisPlateformeVisibility(
  visible
) {
  return normalizeBoolean(
    visible,
    "La visibilité"
  );
}

// ============================================================
// API REGROUPÉE
// ============================================================

const avisPlateformeApi = {
  creerAvisPlateforme,
  getMonAvisPlateforme,
  getAvisPlateforme,
  getAvisPlateformeById,
  modifierAvisPlateforme,
  supprimerAvisPlateforme,
  getAvisPlateformeModeration,
  masquerAvisPlateforme,
  afficherAvisPlateforme,
  getStatistiquesAvisPlateforme,
  extractAvisPlateforme,
  extractAvisPlateformePagination,
  normalizeAvisPlateforme,
  normalizeAvisPlateformeList,
  isValidAvisPlateformeNote,
  isValidAvisPlateformeCommentaire,
  normalizeAvisPlateformeVisibility,
};

export default avisPlateformeApi;