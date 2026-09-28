
// web/src/services/api/admin.js

import { apiRequest } from "./client";

/*
 * ============================================================
 * AGROMARKET BURKINA
 * SERVICE API — ADMINISTRATION
 * ============================================================
 *
 * Responsabilités :
 *
 * - statistiques administratives ;
 * - gestion des utilisateurs ;
 * - demandes vendeur ;
 * - gestion des familles ;
 * - gestion des catégories ;
 * - gestion des modérateurs ;
 * - modération des annonces.
 *
 * IMPORTANT :
 * Ce fichier contient uniquement la communication
 * avec l'API d'administration.
 *
 * ============================================================
 */


/*
 * ============================================================
 * CONFIGURATION
 * ============================================================
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;


/*
 * ============================================================
 * RÔLES ADMINISTRATIFS
 * ============================================================
 */

export const ADMIN_ROLES = Object.freeze([
  "admin",
  "administrateur",
]);


/*
 * ============================================================
 * STATUTS DE COMPTE
 * ============================================================
 */

export const ACCOUNT_STATUS = Object.freeze({
  ACTIF: "actif",
  EN_ATTENTE: "en_attente",
  BLOQUE: "bloque",
  SUSPENDU: "suspendu",
});


/*
 * ============================================================
 * OUTILS INTERNES
 * ============================================================
 */


/**
 * Normalise une page.
 */
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


/**
 * Normalise une limite.
 */
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


/**
 * Valide un identifiant numérique.
 */
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


/**
 * Encode un identifiant pour une URL.
 */
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


/**
 * Nettoie un texte.
 */
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


/**
 * Valide un objet de données.
 */
function validateObject(
  data,
  message
) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    throw new Error(message);
  }

  return data;
}


/**
 * Vérifie qu'un payload contient au moins
 * une propriété.
 */
function ensurePayload(
  payload,
  message
) {
  if (
    !payload ||
    typeof payload !== "object" ||
    Object.keys(payload).length === 0
  ) {
    throw new Error(message);
  }

  return payload;
}


/**
 * Extrait un message d'erreur exploitable.
 */
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


/**
 * Ajoute une valeur à une URLSearchParams
 * uniquement lorsqu'elle est exploitable.
 */
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


/**
 * Extrait un tableau depuis différentes
 * structures de réponse API.
 */
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


/*
 * ============================================================
 * STATISTIQUES ADMINISTRATIVES
 * ============================================================
 *
 * GET /admin/statistiques
 * ============================================================
 */

export async function getAdminStatistiques() {
  try {
    return await apiRequest(
      "/admin/statistiques",
      {
        method: "GET",
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de récupérer les statistiques administratives."
      )
    );
  }
}


/*
 * ============================================================
 * UTILISATEURS
 * ============================================================
 *
 * GET /admin/utilisateurs
 * ============================================================
 */

export async function getAdminUtilisateurs({
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
  role = "",
  statut = "",
} = {}) {
  const params =
    new URLSearchParams();

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

  appendQueryParam(
    params,
    "role",
    role
  );

  appendQueryParam(
    params,
    "statut",
    statut
  );

  try {
    return await apiRequest(
      `/admin/utilisateurs?${params.toString()}`,
      {
        method: "GET",
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de récupérer les utilisateurs."
      )
    );
  }
}


/*
 * ============================================================
 * EXTRACTION DES UTILISATEURS
 * ============================================================
 */

export function extractAdminUtilisateurs(
  response
) {
  return extractArray(
    response,
    "utilisateurs",
    "users",
    "resultats",
    "results"
  );
}


/*
 * ============================================================
 * DEMANDES VENDEUR
 * ============================================================
 */


/**
 * GET /admin/demandes-vendeur
 */
export async function getDemandesVendeur() {
  try {
    return await apiRequest(
      "/admin/demandes-vendeur",
      {
        method: "GET",
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de récupérer les demandes vendeur."
      )
    );
  }
}


/**
 * Extrait les demandes vendeur.
 */
export function extractDemandesVendeur(
  response
) {
  return extractArray(
    response,
    "demandes",
    "demandes_vendeur",
    "resultats",
    "results"
  );
}


/**
 * PATCH /admin/demandes-vendeur/{id}/accepter
 */
export async function accepterDemandeVendeur(
  demandeId,
  motif = ""
) {
  const id =
    encodeId(
      demandeId,
      "Identifiant de la demande"
    );

  try {
    return await apiRequest(
      `/admin/demandes-vendeur/${id}/accepter`,
      {
        method: "PATCH",
        body: JSON.stringify({
          motif:
            cleanText(motif),
        }),
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible d'accepter la demande vendeur."
      )
    );
  }
}


/**
 * PATCH /admin/demandes-vendeur/{id}/refuser
 */
export async function refuserDemandeVendeur(
  demandeId,
  motif
) {
  const id =
    encodeId(
      demandeId,
      "Identifiant de la demande"
    );

  const cleanMotif =
    cleanText(motif);

  if (!cleanMotif) {
    throw new Error(
      "Le motif du refus est obligatoire."
    );
  }

  try {
    return await apiRequest(
      `/admin/demandes-vendeur/${id}/refuser`,
      {
        method: "PATCH",
        body: JSON.stringify({
          motif:
            cleanMotif,
        }),
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de refuser la demande vendeur."
      )
    );
  }
}


/*
 * ============================================================
 * FAMILLES
 * ============================================================
 *
 * Routes :
 *
 * GET    /familles/
 * POST   /familles/
 * GET    /familles/{famille_id}
 * PATCH  /familles/{famille_id}
 * DELETE /familles/{famille_id}
 *
 * ============================================================
 */


/**
 * GET /familles/
 */
export async function getFamillesAdmin({
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
} = {}) {
  const params =
    new URLSearchParams();

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
      `/familles/?${params.toString()}`,
      {
        method: "GET",
        auth: false,
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de récupérer les familles."
      )
    );
  }
}


/**
 * POST /familles/
 */
export async function createFamille({
  nom,
  description = "",
} = {}) {
  const cleanNom =
    cleanText(nom);

  if (!cleanNom) {
    throw new Error(
      "Le nom de la famille est obligatoire."
    );
  }

  try {
    return await apiRequest(
      "/familles/",
      {
        method: "POST",
        body: JSON.stringify({
          nom: cleanNom,
          description:
            cleanText(description),
        }),
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de créer la famille."
      )
    );
  }
}


/**
 * GET /familles/{id}
 */
export async function getFamilleById(
  familleId
) {
  const id =
    encodeId(
      familleId,
      "Identifiant de la famille"
    );

  try {
    return await apiRequest(
      `/familles/${id}`,
      {
        method: "GET",
        auth: false,
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de récupérer la famille."
      )
    );
  }
}


/**
 * PATCH /familles/{id}
 */
export async function updateFamille(
  familleId,
  {
    nom,
    description,
  } = {}
) {
  const id =
    encodeId(
      familleId,
      "Identifiant de la famille"
    );

  const payload = {};

  if (
    nom !== undefined
  ) {
    const cleanNom =
      cleanText(nom);

    if (!cleanNom) {
      throw new Error(
        "Le nom de la famille est obligatoire."
      );
    }

    payload.nom =
      cleanNom;
  }

  if (
    description !== undefined
  ) {
    payload.description =
      cleanText(description);
  }

  ensurePayload(
    payload,
    "Aucune donnée à modifier pour la famille."
  );

  try {
    return await apiRequest(
      `/familles/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(
          payload
        ),
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de modifier la famille."
      )
    );
  }
}


/**
 * DELETE /familles/{id}
 */
export async function deleteFamille(
  familleId
) {
  const id =
    encodeId(
      familleId,
      "Identifiant de la famille"
    );

  try {
    return await apiRequest(
      `/familles/${id}`,
      {
        method: "DELETE",
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de supprimer la famille."
      )
    );
  }
}


/*
 * ============================================================
 * CATÉGORIES
 * ============================================================
 *
 * Routes :
 *
 * GET    /categories/
 * POST   /categories/
 * GET    /categories/{categorie_id}
 * PATCH  /categories/{categorie_id}
 * DELETE /categories/{categorie_id}
 *
 * ============================================================
 */


/**
 * GET /categories/
 */
export async function getCategoriesAdmin({
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
} = {}) {
  const params =
    new URLSearchParams();

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
      `/categories/?${params.toString()}`,
      {
        method: "GET",
        auth: false,
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de récupérer les catégories."
      )
    );
  }
}


/**
 * POST /categories/
 */
export async function createCategorie({
  nom,
  description = "",
  famille_id,
} = {}) {
  const cleanNom =
    cleanText(nom);

  if (!cleanNom) {
    throw new Error(
      "Le nom de la catégorie est obligatoire."
    );
  }

  const familleId =
    requireId(
      famille_id,
      "Identifiant de la famille"
    );

  try {
    return await apiRequest(
      "/categories/",
      {
        method: "POST",
        body: JSON.stringify({
          nom: cleanNom,
          description:
            cleanText(description),
          famille_id:
            familleId,
        }),
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de créer la catégorie."
      )
    );
  }
}


/**
 * GET /categories/{id}
 */
export async function getCategorieById(
  categorieId
) {
  const id =
    encodeId(
      categorieId,
      "Identifiant de la catégorie"
    );

  try {
    return await apiRequest(
      `/categories/${id}`,
      {
        method: "GET",
        auth: false,
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de récupérer la catégorie."
      )
    );
  }
}


/**
 * PATCH /categories/{id}
 */
export async function updateCategorie(
  categorieId,
  {
    nom,
    description,
    famille_id,
  } = {}
) {
  const id =
    encodeId(
      categorieId,
      "Identifiant de la catégorie"
    );

  const payload = {};

  if (
    nom !== undefined
  ) {
    const cleanNom =
      cleanText(nom);

    if (!cleanNom) {
      throw new Error(
        "Le nom de la catégorie est obligatoire."
      );
    }

    payload.nom =
      cleanNom;
  }

  if (
    description !== undefined
  ) {
    payload.description =
      cleanText(description);
  }

  if (
    famille_id !== undefined
  ) {
    payload.famille_id =
      requireId(
        famille_id,
        "Identifiant de la famille"
      );
  }

  ensurePayload(
    payload,
    "Aucune donnée à modifier pour la catégorie."
  );

  try {
    return await apiRequest(
      `/categories/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(
          payload
        ),
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de modifier la catégorie."
      )
    );
  }
}


/**
 * DELETE /categories/{id}
 */
export async function deleteCategorie(
  categorieId
) {
  const id =
    encodeId(
      categorieId,
      "Identifiant de la catégorie"
    );

  try {
    return await apiRequest(
      `/categories/${id}`,
      {
        method: "DELETE",
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de supprimer la catégorie."
      )
    );
  }
}


/*
 * ============================================================
 * MODÉRATEURS
 * ============================================================
 */


/**
 * GET /admin/moderateurs
 */
export async function getModerateurs() {
  try {
    return await apiRequest(
      "/admin/moderateurs",
      {
        method: "GET",
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de récupérer les modérateurs."
      )
    );
  }
}


/**
 * Extrait les modérateurs.
 */
export function extractModerateurs(
  response
) {
  return extractArray(
    response,
    "moderateurs",
    "resultats",
    "results"
  );
}


/**
 * POST /admin/moderateurs
 */
export async function createModerateur({
  nom,
  telephone,
  email = "",
  mot_de_passe,
} = {}) {
  const cleanNom =
    cleanText(nom);

  const cleanTelephone =
    cleanText(telephone);

  const cleanEmail =
    cleanText(email);

  const password =
    String(
      mot_de_passe ?? ""
    );

  if (!cleanNom) {
    throw new Error(
      "Le nom du modérateur est obligatoire."
    );
  }

  if (!cleanTelephone) {
    throw new Error(
      "Le téléphone du modérateur est obligatoire."
    );
  }

  if (
    password.length < 8
  ) {
    throw new Error(
      "Le mot de passe doit contenir au moins 8 caractères."
    );
  }

  try {
    return await apiRequest(
      "/admin/moderateurs",
      {
        method: "POST",
        body: JSON.stringify({
          nom: cleanNom,
          telephone: cleanTelephone,
          email: cleanEmail,
          mot_de_passe: password,
        }),
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de créer le modérateur."
      )
    );
  }
}


/**
 * GET /admin/moderateurs/{id}
 */
export async function getModerateurById(
  moderateurId
) {
  const id =
    encodeId(
      moderateurId,
      "Identifiant du modérateur"
    );

  try {
    return await apiRequest(
      `/admin/moderateurs/${id}`,
      {
        method: "GET",
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de récupérer le modérateur."
      )
    );
  }
}


/**
 * PATCH /admin/moderateurs/{id}
 */
export async function updateModerateur(
  moderateurId,
  data = {}
) {
  const id =
    encodeId(
      moderateurId,
      "Identifiant du modérateur"
    );

  validateObject(
    data,
    "Les données du modérateur sont obligatoires."
  );

  const payload = {};

  if (
    data.nom !== undefined
  ) {
    payload.nom =
      cleanText(data.nom);
  }

  if (
    data.telephone !== undefined
  ) {
    payload.telephone =
      cleanText(
        data.telephone
      );
  }

  if (
    data.email !== undefined
  ) {
    payload.email =
      cleanText(data.email);
  }

  ensurePayload(
    payload,
    "Aucune donnée à modifier pour le modérateur."
  );

  try {
    return await apiRequest(
      `/admin/moderateurs/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(
          payload
        ),
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de modifier le modérateur."
      )
    );
  }
}


/**
 * PATCH /admin/moderateurs/{id}/mot-de-passe
 */
export async function updateModerateurPassword(
  moderateurId,
  mot_de_passe
) {
  const id =
    encodeId(
      moderateurId,
      "Identifiant du modérateur"
    );

  const password =
    String(
      mot_de_passe ?? ""
    );

  if (
    password.length < 8
  ) {
    throw new Error(
      "Le mot de passe doit contenir au moins 8 caractères."
    );
  }

  try {
    return await apiRequest(
      `/admin/moderateurs/${id}/mot-de-passe`,
      {
        method: "PATCH",
        body: JSON.stringify({
          mot_de_passe:
            password,
        }),
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de modifier le mot de passe."
      )
    );
  }
}


/**
 * PATCH /admin/moderateurs/{id}/statut
 */
export async function updateModerateurStatus(
  moderateurId,
  statut_compte
) {
  const id =
    encodeId(
      moderateurId,
      "Identifiant du modérateur"
    );

  if (
    ![
      ACCOUNT_STATUS.ACTIF,
      ACCOUNT_STATUS.BLOQUE,
      ACCOUNT_STATUS.SUSPENDU,
    ].includes(
      statut_compte
    )
  ) {
    throw new Error(
      "Statut de modérateur invalide."
    );
  }

  try {
    return await apiRequest(
      `/admin/moderateurs/${id}/statut`,
      {
        method: "PATCH",
        body: JSON.stringify({
          statut_compte,
        }),
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de modifier le statut du modérateur."
      )
    );
  }
}


/**
 * DELETE /admin/moderateurs/{id}
 */
export async function deleteModerateur(
  moderateurId
) {
  const id =
    encodeId(
      moderateurId,
      "Identifiant du modérateur"
    );

  try {
    return await apiRequest(
      `/admin/moderateurs/${id}`,
      {
        method: "DELETE",
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de supprimer le modérateur."
      )
    );
  }
}


/*
 * ============================================================
 * MODÉRATION DES ANNONCES
 * ============================================================
 */


/**
 * GET /annonces/moderation/en-attente
 */
export async function getAnnoncesEnAttente() {
  try {
    return await apiRequest(
      "/annonces/moderation/en-attente",
      {
        method: "GET",
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de récupérer les annonces en attente."
      )
    );
  }
}


/**
 * Extrait les annonces en attente.
 */
export function extractAnnoncesEnAttente(
  response
) {
  return extractArray(
    response,
    "annonces",
    "resultats",
    "results"
  );
}


/**
 * PATCH /annonces/{id}/approuver
 */
export async function approuverAnnonce(
  annonceId
) {
  const id =
    encodeId(
      annonceId,
      "Identifiant de l'annonce"
    );

  try {
    return await apiRequest(
      `/annonces/${id}/approuver`,
      {
        method: "PATCH",
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible d'approuver l'annonce."
      )
    );
  }
}


/**
 * PATCH /annonces/{id}/refuser
 */
export async function refuserAnnonce(
  annonceId,
  motif
) {
  const id =
    encodeId(
      annonceId,
      "Identifiant de l'annonce"
    );

  const cleanMotif =
    cleanText(motif);

  if (!cleanMotif) {
    throw new Error(
      "Le motif du refus est obligatoire."
    );
  }

  try {
    return await apiRequest(
      `/annonces/${id}/refuser`,
      {
        method: "PATCH",
        body: JSON.stringify({
          motif:
            cleanMotif,
        }),
      }
    );
  } catch (error) {
    throw new Error(
      errorMessage(
        error,
        "Impossible de refuser l'annonce."
      )
    );
  }
}


/*
 * ============================================================
 * EXPORT PAR DÉFAUT
 * ============================================================
 */

const adminApi = {
  getAdminStatistiques,
  getAdminUtilisateurs,
  extractAdminUtilisateurs,

  getDemandesVendeur,
  extractDemandesVendeur,
  accepterDemandeVendeur,
  refuserDemandeVendeur,

  getFamillesAdmin,
  createFamille,
  getFamilleById,
  updateFamille,
  deleteFamille,

  getCategoriesAdmin,
  createCategorie,
  getCategorieById,
  updateCategorie,
  deleteCategorie,

  getModerateurs,
  extractModerateurs,
  createModerateur,
  getModerateurById,
  updateModerateur,
  updateModerateurPassword,
  updateModerateurStatus,
  deleteModerateur,

  getAnnoncesEnAttente,
  extractAnnoncesEnAttente,
  approuverAnnonce,
  refuserAnnonce,
};

export default adminApi;
