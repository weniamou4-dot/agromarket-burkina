// src/services/api/search.js

import { apiRequest } from "./client";

/*
 * ============================================================
 * AGROMARKET BURKINA
 * SERVICE DE RECHERCHE
 * ============================================================
 *
 * Recherche principale :
 *
 * GET /recherche/annonces
 *
 * Paramètres supportés :
 *
 * - produit
 * - produit_id
 * - famille_id
 * - categorie_id
 * - type_produit
 * - region
 * - province
 * - commune
 * - prix_min
 * - prix_max
 * - page
 * - limit
 *
 * Suggestions :
 *
 * GET /recherche/suggestions
 *
 * - q
 * - limit
 *
 * ============================================================
 */


/*
 * ============================================================
 * CONSTANTES
 * ============================================================
 */

export const SEARCH_DEFAULT_LIMIT = 20;

export const SEARCH_MAX_LIMIT = 100;

export const SEARCH_MIN_QUERY_LENGTH = 2;


/*
 * ============================================================
 * UTILITAIRES INTERNES
 * ============================================================
 */

function cleanText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}


function isProvided(value) {
  return (
    value !== null &&
    value !== undefined &&
    String(value).trim() !== ""
  );
}


function normalizePage(value) {
  const page = Number(value);

  if (!Number.isInteger(page) || page < 1) {
    return 1;
  }

  return page;
}


function normalizeLimit(value) {
  const limit = Number(value);

  if (!Number.isInteger(limit) || limit < 1) {
    return SEARCH_DEFAULT_LIMIT;
  }

  return Math.min(
    SEARCH_MAX_LIMIT,
    limit
  );
}


function normalizeId(value) {
  if (!isProvided(value)) {
    return "";
  }

  return String(value).trim();
}


function getErrorMessage(error, fallback) {
  return (
    error?.message ||
    error?.detail ||
    error?.response?.data?.detail ||
    (typeof error === "string" ? error : "") ||
    fallback
  );
}


/*
 * ============================================================
 * CONSTRUCTION DES PARAMÈTRES
 * ============================================================
 */

export function buildSearchParams({
  produit = "",
  produitId = "",
  familleId = "",
  categorieId = "",
  typeProduit = "",
  region = "",
  province = "",
  commune = "",
  prixMin = "",
  prixMax = "",
  page = 1,
  limit = SEARCH_DEFAULT_LIMIT,
} = {}) {
  const params = new URLSearchParams();


  /*
   * ----------------------------------------------------------
   * PRODUIT
   * ----------------------------------------------------------
   */

  const produitValue = cleanText(produit);

  if (produitValue) {
    params.set(
      "produit",
      produitValue
    );
  }


  /*
   * ----------------------------------------------------------
   * PRODUIT ID
   * ----------------------------------------------------------
   */

  const produitIdValue = normalizeId(
    produitId
  );

  if (produitIdValue) {
    params.set(
      "produit_id",
      produitIdValue
    );
  }


  /*
   * ----------------------------------------------------------
   * FAMILLE ID
   * ----------------------------------------------------------
   */

  const familleIdValue = normalizeId(
    familleId
  );

  if (familleIdValue) {
    params.set(
      "famille_id",
      familleIdValue
    );
  }


  /*
   * ----------------------------------------------------------
   * CATÉGORIE ID
   * ----------------------------------------------------------
   */

  const categorieIdValue = normalizeId(
    categorieId
  );

  if (categorieIdValue) {
    params.set(
      "categorie_id",
      categorieIdValue
    );
  }


  /*
   * ----------------------------------------------------------
   * TYPE DE PRODUIT
   * ----------------------------------------------------------
   */

  const typeValue = cleanText(
    typeProduit
  );

  if (typeValue) {
    params.set(
      "type_produit",
      typeValue
    );
  }


  /*
   * ----------------------------------------------------------
   * RÉGION
   * ----------------------------------------------------------
   */

  const regionValue = cleanText(
    region
  );

  if (regionValue) {
    params.set(
      "region",
      regionValue
    );
  }


  /*
   * ----------------------------------------------------------
   * PROVINCE
   * ----------------------------------------------------------
   */

  const provinceValue = cleanText(
    province
  );

  if (provinceValue) {
    params.set(
      "province",
      provinceValue
    );
  }


  /*
   * ----------------------------------------------------------
   * COMMUNE
   * ----------------------------------------------------------
   */

  const communeValue = cleanText(
    commune
  );

  if (communeValue) {
    params.set(
      "commune",
      communeValue
    );
  }


  /*
   * ----------------------------------------------------------
   * PRIX MINIMUM
   * ----------------------------------------------------------
   */

  if (isProvided(prixMin)) {
    params.set(
      "prix_min",
      String(prixMin).trim()
    );
  }


  /*
   * ----------------------------------------------------------
   * PRIX MAXIMUM
   * ----------------------------------------------------------
   */

  if (isProvided(prixMax)) {
    params.set(
      "prix_max",
      String(prixMax).trim()
    );
  }


  /*
   * ----------------------------------------------------------
   * PAGINATION
   * ----------------------------------------------------------
   */

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


  return params;
}


/*
 * ============================================================
 * RECHERCHE PRINCIPALE
 * ============================================================
 *
 * GET /recherche/annonces
 *
 * Endpoint public.
 *
 * IMPORTANT :
 * apiRequest() retourne directement les données de l'API.
 *
 * ============================================================
 */

export async function searchAnnonces(
  filters = {}
) {
  const params = buildSearchParams(
    filters
  );

  try {
    const response = await apiRequest(
      `/recherche/annonces?${params.toString()}`,
      {
        method: "GET",
        auth: false,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "Erreur searchAnnonces :",
      error
    );

    throw new Error(
      getErrorMessage(
        error,
        "Impossible d'effectuer la recherche."
      )
    );
  }
}


/*
 * ============================================================
 * SUGGESTIONS
 * ============================================================
 */

export async function searchSuggestions(
  query,
  options = {}
) {
  return getSearchSuggestions(
    query,
    options
  );
}


/*
 * ============================================================
 * SUGGESTIONS DE RECHERCHE
 * ============================================================
 *
 * GET /recherche/suggestions
 *
 * ============================================================
 */

export async function getSearchSuggestions(
  query,
  {
    limit = 8,
  } = {}
) {
  const value = cleanText(query);

  /*
   * Requête trop courte
   */

  if (
    value.length <
    SEARCH_MIN_QUERY_LENGTH
  ) {
    return [];
  }


  /*
   * Limite sécurisée
   */

  const numericLimit = Number(
    limit
  );

  const safeLimit =
    Number.isInteger(
      numericLimit
    ) &&
    numericLimit >= 1
      ? Math.min(
          20,
          numericLimit
        )
      : 8;


  /*
   * Paramètres
   */

  const params = new URLSearchParams();

  params.set(
    "q",
    value
  );

  params.set(
    "limit",
    String(safeLimit)
  );


  try {
    const response = await apiRequest(
      `/recherche/suggestions?${params.toString()}`,
      {
        method: "GET",
        auth: false,
      }
    );

    return normalizeSuggestions(
      response
    );
  } catch (error) {
    console.error(
      "Erreur getSearchSuggestions :",
      error
    );

    throw new Error(
      getErrorMessage(
        error,
        "Impossible de récupérer les suggestions."
      )
    );
  }
}


/*
 * ============================================================
 * NORMALISER UNE SUGGESTION
 * ============================================================
 */

export function normalizeSuggestion(
  suggestion
) {
  /*
   * Chaîne simple
   */

  if (
    typeof suggestion ===
    "string"
  ) {
    const value = cleanText(
      suggestion
    );

    return {
      id: null,
      produit_id: null,
      nom: value,
      value,
    };
  }


  /*
   * Protection
   */

  if (
    !suggestion ||
    typeof suggestion !== "object"
  ) {
    return {
      id: null,
      produit_id: null,
      nom: "",
      value: "",
    };
  }


  /*
   * Objet
   */

  const nom = cleanText(
    suggestion?.nom ??
    suggestion?.name ??
    suggestion?.libelle ??
    suggestion?.label ??
    suggestion?.text ??
    suggestion?.value
  );

  const value = cleanText(
    suggestion?.value ??
    nom
  );


  return {
    id:
      suggestion?.id ??
      null,

    produit_id:
      suggestion?.produit_id ??
      suggestion?.produitId ??
      suggestion?.id ??
      null,

    nom,

    value,
  };
}


/*
 * ============================================================
 * NORMALISATION DES SUGGESTIONS
 * ============================================================
 */

export function normalizeSuggestions(
  response
) {
  let suggestions = [];


  /*
   * Tableau direct
   */

  if (
    Array.isArray(response)
  ) {
    suggestions = response;
  }


  /*
   * { suggestions: [] }
   */

  else if (
    Array.isArray(
      response?.suggestions
    )
  ) {
    suggestions =
      response.suggestions;
  }


  /*
   * { resultats: [] }
   */

  else if (
    Array.isArray(
      response?.resultats
    )
  ) {
    suggestions =
      response.resultats;
  }


  /*
   * { results: [] }
   */

  else if (
    Array.isArray(
      response?.results
    )
  ) {
    suggestions =
      response.results;
  }


  /*
   * { data: [] }
   */

  else if (
    Array.isArray(
      response?.data
    )
  ) {
    suggestions =
      response.data;
  }


  /*
   * { data: { suggestions: [] } }
   */

  else if (
    Array.isArray(
      response?.data?.suggestions
    )
  ) {
    suggestions =
      response.data.suggestions;
  }


  /*
   * { data: { resultats: [] } }
   */

  else if (
    Array.isArray(
      response?.data?.resultats
    )
  ) {
    suggestions =
      response.data.resultats;
  }


  return suggestions
    .map(
      normalizeSuggestion
    )
    .filter(
      (suggestion) =>
        Boolean(
          cleanText(
            suggestion.nom
          )
        )
    );
}


/*
 * ============================================================
 * COMPATIBILITÉ AVEC HOME.JSX
 * ============================================================
 */

export async function fetchSuggestions(
  query,
  options = {}
) {
  return searchSuggestions(
    query,
    options
  );
}


/*
 * ============================================================
 * EXTRACTION DES RÉSULTATS
 * ============================================================
 */

export function extractSearchResults(
  response
) {
  /*
   * Tableau direct
   */

  if (
    Array.isArray(response)
  ) {
    return response;
  }


  /*
   * { resultats: [] }
   */

  if (
    Array.isArray(
      response?.resultats
    )
  ) {
    return response.resultats;
  }


  /*
   * { annonces: [] }
   */

  if (
    Array.isArray(
      response?.annonces
    )
  ) {
    return response.annonces;
  }


  /*
   * { results: [] }
   */

  if (
    Array.isArray(
      response?.results
    )
  ) {
    return response.results;
  }


  /*
   * { data: [] }
   */

  if (
    Array.isArray(
      response?.data
    )
  ) {
    return response.data;
  }


  /*
   * { data: { resultats: [] } }
   */

  if (
    Array.isArray(
      response?.data?.resultats
    )
  ) {
    return response.data.resultats;
  }


  /*
   * { data: { annonces: [] } }
   */

  if (
    Array.isArray(
      response?.data?.annonces
    )
  ) {
    return response.data.annonces;
  }


  /*
   * { data: { results: [] } }
   */

  if (
    Array.isArray(
      response?.data?.results
    )
  ) {
    return response.data.results;
  }


  return [];
}


/*
 * ============================================================
 * EXTRACTION DE LA PAGINATION
 * ============================================================
 */

export function extractSearchPagination(
  response,
  fallback = {}
) {
  const pagination =
    response?.pagination ??
    response?.data?.pagination;


  /*
   * Pagination backend
   */

  if (
    pagination &&
    typeof pagination ===
      "object"
  ) {
    const total =
      Number(
        pagination.total
      ) || 0;

    const page =
      normalizePage(
        pagination.page ??
        fallback.page ??
        1
      );

    const limit =
      normalizeLimit(
        pagination.limit ??
        fallback.limit ??
        SEARCH_DEFAULT_LIMIT
      );

    const calculatedPages =
      total > 0
        ? Math.ceil(
            total / limit
          )
        : 0;

    return {
      total,

      page,

      limit,

      pages:
        Number(
          pagination.pages
        ) > 0
          ? Number(
              pagination.pages
            )
          : calculatedPages,
    };
  }


  /*
   * Fallback
   */

  const results =
    extractSearchResults(
      response
    );

  const page =
    normalizePage(
      fallback.page ?? 1
    );

  const limit =
    normalizeLimit(
      fallback.limit ??
      SEARCH_DEFAULT_LIMIT
    );


  return {
    total:
      results.length,

    page,

    limit,

    pages:
      results.length > 0
        ? Math.ceil(
            results.length /
            limit
          )
        : 0,
  };
}


/*
 * ============================================================
 * EXTRACTION DU NOM DU PRODUIT
 * ============================================================
 *
 * Cette fonction accepte plusieurs formats possibles
 * provenant du backend.
 *
 * ============================================================
 */

function extractProductName(
  annonce,
  produit
) {
  const candidates = [
    /*
     * Objet produit
     */

    produit?.nom,

    produit?.name,

    produit?.libelle,

    produit?.label,

    /*
     * Champs directs de l'annonce
     */

    annonce?.produit_nom,

    annonce?.produitNom,

    annonce?.nom_produit,

    annonce?.nomProduit,

    annonce?.produit_name,

    annonce?.product_name,

    annonce?.nom,

    annonce?.name,
  ];


  for (
    const candidate of candidates
  ) {
    const value =
      cleanText(candidate);

    if (value) {
      return value;
    }
  }


  return null;
}


/*
 * ============================================================
 * EXTRACTION DU SECTEUR
 * ============================================================
 */

function extractProductSector(
  annonce,
  produit
) {
  const candidates = [
    produit?.secteur,

    produit?.secteur_produit,

    produit?.family?.secteur,

    produit?.famille?.secteur,

    produit?.famille_produit?.secteur,

    annonce?.secteur,

    annonce?.secteur_produit,

    annonce?.produit_secteur,

    annonce?.produit?.secteur,
  ];


  for (
    const candidate of candidates
  ) {
    const value =
      cleanText(candidate);

    if (value) {
      return value;
    }
  }


  return null;
}


/*
 * ============================================================
 * EXTRACTION DU TYPE DE PRODUIT
 * ============================================================
 */

function extractProductType(
  annonce,
  produit
) {
  const candidates = [
    produit?.type_produit,

    produit?.typeProduit,

    produit?.type,

    annonce?.type_produit,

    annonce?.typeProduit,

    annonce?.produit_type,
  ];


  for (
    const candidate of candidates
  ) {
    const value =
      cleanText(candidate);

    if (value) {
      return value;
    }
  }


  return null;
}


/*
 * ============================================================
 * NORMALISER UNE ANNONCE
 * ============================================================
 */

export function normalizeSearchAnnonce(
  annonce
) {
  /*
   * Protection
   */

  if (
    !annonce ||
    typeof annonce !== "object" ||
    Array.isArray(annonce)
  ) {
    return null;
  }


  /*
   * ----------------------------------------------------------
   * COPIE DE L'OBJET PRODUIT
   * ----------------------------------------------------------
   */

  const produitSource =
    annonce?.produit;

  const produit =
    produitSource &&
    typeof produitSource ===
      "object" &&
    !Array.isArray(
      produitSource
    )
      ? {
          ...produitSource,
        }
      : {};


  /*
   * ----------------------------------------------------------
   * NOM DU PRODUIT
   * ----------------------------------------------------------
   */

  const produitNom =
    extractProductName(
      annonce,
      produit
    );


  /*
   * ----------------------------------------------------------
   * SECTEUR
   * ----------------------------------------------------------
   */

  const secteur =
    extractProductSector(
      annonce,
      produit
    );


  /*
   * ----------------------------------------------------------
   * TYPE
   * ----------------------------------------------------------
   */

  const typeProduit =
    extractProductType(
      annonce,
      produit
    );


  /*
   * ----------------------------------------------------------
   * ID PRODUIT
   * ----------------------------------------------------------
   */

  const produitId =
    produit?.id ??
    annonce?.produit_id ??
    annonce?.produitId ??
    null;


  /*
   * ----------------------------------------------------------
   * PRODUIT NORMALISÉ
   * ----------------------------------------------------------
   */

  const produitNormalise = {
    ...produit,

    id:
      produitId,

    nom:
      produitNom,

    secteur:
      secteur,

    type_produit:
      typeProduit,
  };


  /*
   * ----------------------------------------------------------
   * ANNONCE NORMALISÉE
   * ----------------------------------------------------------
   *
   * Toutes les propriétés originales sont conservées.
   */

  return {
    ...annonce,

    produit:
      produitNormalise,

    produit_nom:
      produitNom,

    secteur:
      secteur,

    type_produit:
      typeProduit,
  };
}


/*
 * ============================================================
 * NORMALISER LA RÉPONSE DE RECHERCHE
 * ============================================================
 */

export function normalizeSearchResponse(
  response,
  fallback = {}
) {
  /*
   * Extraction
   */

  const rawResults =
    extractSearchResults(
      response
    );


  /*
   * Normalisation
   */

  const resultats =
    rawResults
      .map(
        normalizeSearchAnnonce
      )
      .filter(Boolean);


  /*
   * Résultat final
   */

  return {
    resultats,

    pagination:
      extractSearchPagination(
        response,
        fallback
      ),

    /*
     * Réponse brute conservée pour
     * débogage / évolution future.
     */

    raw:
      response,
  };
}


/*
 * ============================================================
 * EXÉCUTER UNE RECHERCHE COMPLÈTE
 * ============================================================
 *
 * Fonction utilisée par Products.jsx.
 *
 * ============================================================
 */

export async function executeSearch(
  filters = {}
) {
  try {
    /*
     * --------------------------------------------------------
     * APPEL API
     * --------------------------------------------------------
     */

    const response =
      await searchAnnonces(
        filters
      );


    /*
     * --------------------------------------------------------
     * EXTRACTION BRUTE
     * --------------------------------------------------------
     */

    const rawResults =
      extractSearchResults(
        response
      );


    /*
     * --------------------------------------------------------
     * DEBUG RÉPONSE BRUTE
     * --------------------------------------------------------
     *
     * Permet de vérifier exactement ce que renvoie
     * le backend.
     */

    console.log(
      "================ AGROMARKET SEARCH DEBUG ================"
    );

    console.log(
      "🔎 SEARCH API - réponse brute :",
      response
    );

    console.log(
      "🔎 SEARCH API - nombre de résultats :",
      rawResults.length
    );

    console.log(
      "🔎 SEARCH API - PREMIER RESULTAT BRUT COMPLET :",
      JSON.stringify(
        rawResults[0] ?? null,
        null,
        2
      )
    );


    /*
     * --------------------------------------------------------
     * NORMALISATION
     * --------------------------------------------------------
     *
     * IMPORTANT :
     * La normalisation doit être effectuée AVANT
     * d'utiliser la variable normalized.
     */

    const normalized =
      normalizeSearchResponse(
        response,
        {
          page:
            filters.page,

          limit:
            filters.limit,
        }
      );


    /*
     * --------------------------------------------------------
     * DEBUG RÉSULTAT NORMALISÉ
     * --------------------------------------------------------
     */

    console.log(
      "🔎 SEARCH API - PREMIER RESULTAT NORMALISE COMPLET :",
      JSON.stringify(
        normalized.resultats[0] ?? null,
        null,
        2
      )
    );

    console.log(
      "🔎 SEARCH API - produit normalisé :",
      normalized
        .resultats[0]
        ?.produit
    );

    console.log(
      "🔎 SEARCH API - nom normalisé :",
      normalized
        .resultats[0]
        ?.produit
        ?.nom ??
      null
    );

    console.log(
      "🔎 SEARCH API - produit_nom normalisé :",
      normalized
        .resultats[0]
        ?.produit_nom ??
      null
    );

    console.log(
      "========================================================="
    );


    /*
     * --------------------------------------------------------
     * RETOUR
     * --------------------------------------------------------
     */

    return normalized;

  } catch (error) {
    console.error(
      "Erreur executeSearch :",
      error
    );

    throw error;
  }
}


/*
 * ============================================================
 * RECHERCHE PAR NOM DE PRODUIT
 * ============================================================
 */

export async function searchProduct(
  productName,
  options = {}
) {
  return executeSearch({
    ...options,

    produit:
      cleanText(
        productName
      ),

    page:
      normalizePage(
        options.page
      ),

    limit:
      normalizeLimit(
        options.limit
      ),
  });
}


/*
 * ============================================================
 * RECHERCHE PAR PRODUIT ID
 * ============================================================
 */

export async function searchByProductId(
  produitId,
  options = {}
) {
  return executeSearch({
    ...options,

    produitId,

    page:
      normalizePage(
        options.page
      ),

    limit:
      normalizeLimit(
        options.limit
      ),
  });
}


/*
 * ============================================================
 * RECHERCHE PAR FAMILLE
 * ============================================================
 */

export async function searchByFamily(
  familleId,
  options = {}
) {
  return executeSearch({
    ...options,

    familleId,

    page:
      normalizePage(
        options.page
      ),

    limit:
      normalizeLimit(
        options.limit
      ),
  });
}


/*
 * ============================================================
 * RECHERCHE PAR CATÉGORIE
 * ============================================================
 */

export async function searchByCategory(
  categorieId,
  options = {}
) {
  return executeSearch({
    ...options,

    categorieId,

    page:
      normalizePage(
        options.page
      ),

    limit:
      normalizeLimit(
        options.limit
      ),
  });
}


/*
 * ============================================================
 * RECHERCHE PAR LOCALISATION
 * ============================================================
 */

export async function searchByLocation({
  region = "",
  province = "",
  commune = "",
  ...options
} = {}) {
  return executeSearch({
    ...options,

    region,
    province,
    commune,

    page:
      normalizePage(
        options.page
      ),

    limit:
      normalizeLimit(
        options.limit
      ),
  });
}


/*
 * ============================================================
 * RECHERCHE PAR PRIX
 * ============================================================
 */

export async function searchByPrice({
  prixMin = "",
  prixMax = "",
  ...options
} = {}) {
  return executeSearch({
    ...options,

    prixMin,
    prixMax,

    page:
      normalizePage(
        options.page
      ),

    limit:
      normalizeLimit(
        options.limit
      ),
  });
}


/*
 * ============================================================
 * CONSTRUIRE UNE REQUÊTE EN LANGAGE NATUREL
 * ============================================================
 */

export function buildNaturalSearchQuery({
  recherche = "",
  region = "",
  province = "",
  commune = "",
  typeProduit = "",
  prixMin = "",
  prixMax = "",
} = {}) {
  const parts = [];


  /*
   * Recherche
   */

  const rechercheValue =
    cleanText(
      recherche
    );

  if (rechercheValue) {
    parts.push(
      rechercheValue
    );
  }


  /*
   * Région
   */

  const regionValue =
    cleanText(
      region
    );

  if (regionValue) {
    parts.push(
      `région ${regionValue}`
    );
  }


  /*
   * Province
   */

  const provinceValue =
    cleanText(
      province
    );

  if (provinceValue) {
    parts.push(
      `province ${provinceValue}`
    );
  }


  /*
   * Commune
   */

  const communeValue =
    cleanText(
      commune
    );

  if (communeValue) {
    parts.push(
      `commune ${communeValue}`
    );
  }


  /*
   * Type produit
   */

  const typeValue =
    cleanText(
      typeProduit
    ).toLowerCase();

  if (typeValue) {
    if (
      typeValue === "brut"
    ) {
      parts.push(
        "produit brut"
      );
    } else if (
      typeValue === "transforme" ||
      typeValue === "transformé"
    ) {
      parts.push(
        "produit transformé"
      );
    } else {
      parts.push(
        typeValue
      );
    }
  }


  /*
   * Prix minimum
   */

  if (
    isProvided(prixMin)
  ) {
    parts.push(
      `prix minimum ${String(
        prixMin
      ).trim()} FCFA`
    );
  }


  /*
   * Prix maximum
   */

  if (
    isProvided(prixMax)
  ) {
    parts.push(
      `prix maximum ${String(
        prixMax
      ).trim()} FCFA`
    );
  }


  return parts.join(
    " "
  );
}


/*
 * ============================================================
 * PRÉPARATION D'UNE REQUÊTE AI
 * ============================================================
 *
 * Cette fonction ne fait aucun appel externe.
 *
 * ============================================================
 */

export function prepareAISearchRequest(
  filters = {}
) {
  const produit =
    cleanText(
      filters.recherche ??
      filters.produit
    );


  return {
    query:
      buildNaturalSearchQuery(
        filters
      ),

    filters: {
      produit:
        produit ||
        null,

      produit_id:
        filters.produitId ??
        null,

      famille_id:
        filters.familleId ??
        null,

      categorie_id:
        filters.categorieId ??
        null,

      type_produit:
        filters.typeProduit ??
        null,

      region:
        cleanText(
          filters.region
        ) || null,

      province:
        cleanText(
          filters.province
        ) || null,

      commune:
        cleanText(
          filters.commune
        ) || null,

      prix_min:
        filters.prixMin !==
        undefined
          ? filters.prixMin
          : null,

      prix_max:
        filters.prixMax !==
        undefined
          ? filters.prixMax
          : null,
    },
  };
}


/*
 * ============================================================
 * EXPORT PAR DÉFAUT
 * ============================================================
 */

const searchApi = {
  buildSearchParams,

  searchAnnonces,

  searchSuggestions,
  getSearchSuggestions,
  fetchSuggestions,

  normalizeSuggestion,
  normalizeSuggestions,

  extractSearchResults,
  extractSearchPagination,

  normalizeSearchAnnonce,
  normalizeSearchResponse,

  executeSearch,

  searchProduct,
  searchByProductId,
  searchByFamily,
  searchByCategory,
  searchByLocation,
  searchByPrice,

  buildNaturalSearchQuery,
  prepareAISearchRequest,
};


export default searchApi;