// src/services/api/products.js

import {
  apiRequest,
} from "./client";


// ============================================================
// CONSTANTES
// ============================================================

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;


// ============================================================
// HELPERS INTERNES
// ============================================================

function normalizePage(page) {
  return Math.max(
    1,
    Number(page) || DEFAULT_PAGE
  );
}


function normalizeLimit(limit) {
  return Math.min(
    MAX_LIMIT,
    Math.max(
      1,
      Number(limit) || DEFAULT_LIMIT
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
    id === ""
  ) {
    throw new Error(message);
  }

  return encodeURIComponent(
    String(id)
  );
}


function appendIfValue(
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


// ============================================================
// PRODUITS DU CATALOGUE
// ============================================================

/**
 * Récupérer les produits du catalogue.
 *
 * GET /produits/
 *
 * Endpoint public.
 */
export async function getProduits({
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
} = {}) {

  const safePage =
    normalizePage(page);

  const safeLimit =
    normalizeLimit(limit);

  return apiRequest(
    `/produits/?page=${safePage}&limit=${safeLimit}`,
    {
      method: "GET",
      auth: false,
    }
  );
}


/**
 * Récupérer un produit du catalogue
 * par son identifiant.
 *
 * GET /produits/{id}
 *
 * Endpoint public.
 */
export async function getProduitById(
  produitId
) {

  const safeId =
    requireId(
      produitId,
      "L'identifiant du produit est obligatoire."
    );

  return apiRequest(
    `/produits/${safeId}`,
    {
      method: "GET",
      auth: false,
    }
  );
}


// ============================================================
// ANNONCES — VITRINE COMMERCIALE
// ============================================================

/**
 * Récupérer les annonces publiques.
 *
 * GET /annonces/
 *
 * Les annonces retournées sont les annonces
 * publiées accessibles publiquement.
 *
 * Filtres disponibles :
 * - produit
 * - categorie_id
 * - type_produit
 * - region
 * - province
 * - commune
 * - prix_min
 * - prix_max
 */
export async function getAnnonces({
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
  produit = "",
  produitId = "",
  categorieId = "",
  typeProduit = "",
  region = "",
  province = "",
  commune = "",
  prixMin = "",
  prixMax = "",
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

  appendIfValue(
    params,
    "produit",
    produit
  );

  appendIfValue(
    params,
    "produit_id",
    produitId
  );

  appendIfValue(
    params,
    "categorie_id",
    categorieId
  );

  appendIfValue(
    params,
    "type_produit",
    typeProduit
  );

  appendIfValue(
    params,
    "region",
    region
  );

  appendIfValue(
    params,
    "province",
    province
  );

  appendIfValue(
    params,
    "commune",
    commune
  );

  appendIfValue(
    params,
    "prix_min",
    prixMin
  );

  appendIfValue(
    params,
    "prix_max",
    prixMax
  );

  return apiRequest(
    `/annonces/?${params.toString()}`,
    {
      method: "GET",
      auth: false,
    }
  );
}


/**
 * Récupérer une annonce précise.
 *
 * GET /annonces/{id}
 *
 * Endpoint public.
 *
 * IMPORTANT :
 * La réponse publique ne doit pas exposer
 * les coordonnées GPS privées du vendeur.
 */
export async function getAnnonceById(
  annonceId
) {

  const safeId =
    requireId(
      annonceId,
      "L'identifiant de l'annonce est obligatoire."
    );

  return apiRequest(
    `/annonces/${safeId}`,
    {
      method: "GET",
      auth: false,
    }
  );
}


// ============================================================
// GÉOLOCALISATION / ITINÉRAIRE
// ============================================================

/**
 * Récupérer les coordonnées autorisées
 * pour établir un itinéraire vers une annonce.
 *
 * GET /annonces/{id}/itineraire
 *
 * Le backend décide si l'itinéraire est autorisé.
 *
 * Le frontend ne doit jamais essayer de contourner
 * cette règle ni utiliser les coordonnées privées
 * présentes ailleurs.
 */
export async function getAnnonceItineraire(
  annonceId
) {

  const safeId =
    requireId(
      annonceId,
      "L'identifiant de l'annonce est obligatoire."
    );

  return apiRequest(
    `/annonces/${safeId}/itineraire`,
    {
      method: "GET",
      auth: false,
    }
  );
}


// ============================================================
// ANNONCES DU VENDEUR CONNECTÉ
// ============================================================

/**
 * Récupérer les annonces du vendeur connecté.
 *
 * GET /users/me/annonces
 *
 * Endpoint authentifié.
 */
export async function getMyAnnonces() {

  return apiRequest(
    "/users/me/annonces",
    {
      method: "GET",
    }
  );
}


// ============================================================
// CRÉATION D'ANNONCE
// ============================================================

/**
 * Créer une annonce pour le vendeur connecté.
 *
 * POST /annonces/
 *
 * IMPORTANT :
 * Le vendeur est déterminé par le token JWT côté backend.
 *
 * Le frontend ne doit donc PAS envoyer vendeur_id
 * dans l'URL.
 *
 * Utilisation :
 *
 * createAnnonce({
 *   produit_nom: "...",
 *   description_produit: "...",
 *   categorie_id: 1,
 *   secteur: "agricole",
 *   type_produit: "brut",
 *   prix: 250,
 *   quantite: 150,
 *   unite: "Kg",
 *   region: "centre",
 *   province: "kadiogo",
 *   commune: "Ouagadougou",
 *   latitude: 12.37,
 *   longitude: -1.51,
 *   localisation_source: "gps",
 *   type_localisation: "domicile",
 *   visibilite_localisation: "privee"
 * })
 */
export async function createAnnonce(
  annonceData
) {

  if (
    !annonceData ||
    typeof annonceData !== "object" ||
    Array.isArray(annonceData)
  ) {
    throw new Error(
      "Les données de l'annonce sont obligatoires."
    );
  }

  return apiRequest(
    "/annonces/",
    {
      method: "POST",
      body: JSON.stringify(
        annonceData
      ),
    }
  );
}


// ============================================================
// IMAGES DES ANNONCES
// ============================================================

/**
 * Ajouter une image à une annonce.
 *
 * POST /annonces/{annonceId}/images
 *
 * L'annonce doit appartenir au vendeur connecté
 * selon les règles du backend.
 */
export async function uploadAnnonceImage(
  annonceId,
  file
) {

  const safeId =
    requireId(
      annonceId,
      "L'identifiant de l'annonce est obligatoire."
    );

  if (!(file instanceof File)) {
    throw new Error(
      "Le fichier image est obligatoire."
    );
  }

  if (
    !file.type ||
    !file.type.startsWith("image/")
  ) {
    throw new Error(
      "Le fichier sélectionné doit être une image."
    );
  }

  const formData =
    new FormData();

  formData.append(
    "file",
    file
  );

  return apiRequest(
    `/annonces/${safeId}/images`,
    {
      method: "POST",
      body: formData,
    }
  );
}


// ============================================================
// MODÉRATION
// ============================================================

/**
 * Récupérer les annonces en attente de modération.
 *
 * GET /annonces/moderation/en-attente
 *
 * Endpoint réservé à la modération.
 */
export async function getAnnoncesEnAttente() {

  return apiRequest(
    "/annonces/moderation/en-attente",
    {
      method: "GET",
    }
  );
}


/**
 * Approuver une annonce.
 *
 * PATCH /annonces/{id}/approuver
 */
export async function approuverAnnonce(
  annonceId
) {

  const safeId =
    requireId(
      annonceId,
      "L'identifiant de l'annonce est obligatoire."
    );

  return apiRequest(
    `/annonces/${safeId}/approuver`,
    {
      method: "PATCH",
    }
  );
}


/**
 * Refuser une annonce.
 *
 * PATCH /annonces/{id}/refuser
 */
export async function refuserAnnonce(
  annonceId,
  motif = ""
) {

  const safeId =
    requireId(
      annonceId,
      "L'identifiant de l'annonce est obligatoire."
    );

  const cleanMotif =
    String(
      motif ?? ""
    ).trim();

  return apiRequest(
    `/annonces/${safeId}/refuser`,
    {
      method: "PATCH",
      body: JSON.stringify({
        motif:
          cleanMotif || null,
      }),
    }
  );
}


// ============================================================
// HELPERS DE RÉPONSE — ANNONCES
// ============================================================

/**
 * Extrait les annonces d'une réponse.
 *
 * Accepte :
 *
 * [
 *   ...
 * ]
 *
 * ou :
 *
 * {
 *   annonces: [...]
 * }
 */
export function extractAnnonces(
  response
) {

  if (
    Array.isArray(response)
  ) {
    return response;
  }

  if (
    Array.isArray(
      response?.annonces
    )
  ) {
    return response.annonces;
  }

  return [];
}


/**
 * Extrait la pagination d'une réponse.
 */
export function extractPagination(
  response,
  fallback = {}
) {

  if (
    response?.pagination &&
    typeof response.pagination ===
      "object"
  ) {
    return response.pagination;
  }

  return {
    page:
      normalizePage(
        fallback.page
      ),

    limit:
      normalizeLimit(
        fallback.limit
      ),

    total: 0,

    pages: 0,
  };
}


// ============================================================
// HELPERS DE RÉPONSE — PRODUITS
// ============================================================

/**
 * Extrait les produits d'une réponse.
 *
 * Accepte :
 *
 * [
 *   ...
 * ]
 *
 * ou :
 *
 * {
 *   produits: [...]
 * }
 */
export function extractProduits(
  response
) {

  if (
    Array.isArray(response)
  ) {
    return response;
  }

  if (
    Array.isArray(
      response?.produits
    )
  ) {
    return response.produits;
  }

  return [];
}


// ============================================================
// HELPERS SPÉCIFIQUES À L'ITINÉRAIRE
// ============================================================

/**
 * Vérifie si une réponse d'itinéraire
 * contient effectivement des coordonnées.
 *
 * Cette fonction ne détermine PAS si l'accès
 * est autorisé. Cette décision appartient au backend.
 */
export function hasItineraireCoordinates(
  response
) {

  return (
    Number.isFinite(
      Number(
        response?.latitude
      )
    ) &&
    Number.isFinite(
      Number(
        response?.longitude
      )
    )
  );
}


// ============================================================
// EXPORT PAR DÉFAUT
// ============================================================

const productsApi = {
  getProduits,
  getProduitById,

  getAnnonces,
  getAnnonceById,
  getAnnonceItineraire,

  getMyAnnonces,
  createAnnonce,

  uploadAnnonceImage,

  getAnnoncesEnAttente,
  approuverAnnonce,
  refuserAnnonce,

  extractAnnonces,
  extractPagination,
  extractProduits,

  hasItineraireCoordinates,
};

export default productsApi;