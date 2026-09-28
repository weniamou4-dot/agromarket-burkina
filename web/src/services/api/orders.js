/**
 * ============================================================
 * AGROMARKET BURKINA
 * API COMMANDES
 * ============================================================
 *
 * Fichier :
 *   web/src/services/api/orders.js
 *
 * Rôle :
 *   Centralise toutes les opérations API liées aux commandes.
 *
 * IMPORTANT :
 *   Ce fichier utilise apiRequest() depuis client.js.
 *
 * Backend :
 *   GET    /commandes/mes
 *   GET    /commandes/vendeur
 *   GET    /commandes/admin
 *   GET    /commandes/mes/statistiques
 *   GET    /commandes/vendeur/statistiques
 *   GET    /commandes/admin/statistiques
 *   GET    /commandes/{commande_id}
 *   POST   /commandes/
 *   PATCH  /commandes/{commande_id}
 *   PATCH  /commandes/{commande_id}/statut
 *   PATCH  /commandes/{commande_id}/annuler
 *   GET    /commandes/disponibilite/{annonce_id}
 * ============================================================
 */

import { apiRequest } from "./client";

/*
 * ============================================================
 * CONSTANTES
 * ============================================================
 */

export const ORDER_STATUS = Object.freeze({
  EN_ATTENTE: "en_attente",
  CONFIRMEE: "confirmee",
  PREPAREE: "preparee",
  LIVREE: "livree",
  ANNULEE: "annulee",
});

export const ORDER_ACTION = Object.freeze({
  ACCEPTER: "accepter",
  REFUSER: "refuser",
});

/*
 * ============================================================
 * UTILITAIRES
 * ============================================================
 */

function toPositiveInteger(value) {
  const number = Number(value);

  if (!Number.isInteger(number) || number < 1) {
    return null;
  }

  return number;
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

/**
 * Construit une query string propre.
 */
function buildQueryParams(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
}

/**
 * Extrait les commandes d'une réponse API.
 */
function extractCommandes(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (
    !response ||
    typeof response !== "object"
  ) {
    return [];
  }

  if (Array.isArray(response.commandes)) {
    return response.commandes;
  }

  if (Array.isArray(response.resultats)) {
    return response.resultats;
  }

  if (Array.isArray(response.results)) {
    return response.results;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  return [];
}

/**
 * Extrait la pagination.
 */
function extractPagination(response) {
  if (
    !response ||
    typeof response !== "object"
  ) {
    return null;
  }

  if (
    response.pagination &&
    typeof response.pagination === "object"
  ) {
    return response.pagination;
  }

  return null;
}

/**
 * Normalise une pagination.
 */
function normalizePagination(pagination) {
  if (
    !pagination ||
    typeof pagination !== "object"
  ) {
    return null;
  }

  return {
    ...pagination,

    page:
      Number.isInteger(
        Number(pagination.page)
      )
        ? Number(pagination.page)
        : 1,

    limit:
      Number.isInteger(
        Number(pagination.limit)
      )
        ? Number(pagination.limit)
        : 20,

    total:
      Number.isFinite(
        Number(pagination.total)
      )
        ? Number(pagination.total)
        : 0,

    pages:
      Number.isFinite(
        Number(pagination.pages)
      )
        ? Number(pagination.pages)
        : 0,
  };
}

/**
 * Normalise une commande.
 */
function normalizeCommande(commande) {
  if (
    !commande ||
    typeof commande !== "object"
  ) {
    return null;
  }

  const id = toPositiveInteger(
    commande.id
  );

  if (!id) {
    return null;
  }

  const annonceId =
    toPositiveInteger(
      commande.annonce_id
    );

  const acheteurId =
    toPositiveInteger(
      commande.acheteur_id
    );

  const vendeurId =
    toPositiveInteger(
      commande.vendeur_id ??
        commande.annonce?.vendeur_id ??
        commande.annonce?.vendeur?.id
    );

  const quantite =
    toFiniteNumber(
      commande.quantite,
      0
    );

  const prixUnitaire =
    toFiniteNumber(
      commande.prix_unitaire ??
        commande.prix ??
        commande.annonce?.prix_unitaire ??
        commande.annonce?.prix,
      0
    );

  const prixTotal =
    toFiniteNumber(
      commande.prix_total ??
        commande.total ??
        prixUnitaire * quantite,
      0
    );

  return {
    ...commande,

    id,

    annonce_id: annonceId,

    acheteur_id: acheteurId,

    vendeur_id: vendeurId,

    quantite,

    prix_unitaire: prixUnitaire,

    prix_total: prixTotal,

    statut:
      typeof commande.statut === "string"
        ? commande.statut.toLowerCase()
        : ORDER_STATUS.EN_ATTENTE,

    date_commande:
      commande.date_commande ??
      commande.created_at ??
      null,
  };
}

/**
 * Normalise une liste.
 */
function normalizeCommandes(response) {
  return extractCommandes(response)
    .map(normalizeCommande)
    .filter(Boolean);
}

/**
 * Extrait une commande depuis une réponse
 * de création/modification/action.
 */
function extractCommande(response) {
  if (
    !response ||
    typeof response !== "object"
  ) {
    return null;
  }

  if (
    response.commande &&
    typeof response.commande === "object"
  ) {
    return normalizeCommande(
      response.commande
    );
  }

  if (
    response.data &&
    typeof response.data === "object"
  ) {
    if (
      response.data.commande &&
      typeof response.data.commande === "object"
    ) {
      return normalizeCommande(
        response.data.commande
      );
    }

    return normalizeCommande(
      response.data
    );
  }

  return normalizeCommande(response);
}

/**
 * Construit la pagination.
 */
function buildPaginationParams(options = {}) {
  const page =
    Number.isInteger(
      Number(options.page)
    ) &&
    Number(options.page) >= 1
      ? Number(options.page)
      : 1;

  const limit =
    Number.isInteger(
      Number(options.limit)
    ) &&
    Number(options.limit) >= 1
      ? Math.min(
          Number(options.limit),
          100
        )
      : 20;

  return {
    page,
    limit,
  };
}

/*
 * ============================================================
 * CRÉATION
 * ============================================================
 */

export async function createCommande(
  payload = {}
) {
  const annonceId =
    toPositiveInteger(
      payload.annonce_id ??
        payload.annonceId
    );

  const quantite =
    toFiniteNumber(
      payload.quantite,
      0
    );

  if (!annonceId) {
    throw new Error(
      "L'identifiant de l'annonce est obligatoire."
    );
  }

  if (
    !Number.isFinite(quantite) ||
    quantite <= 0
  ) {
    throw new Error(
      "La quantité doit être supérieure à zéro."
    );
  }

  const response =
    await apiRequest(
      "/commandes/",
      {
        method: "POST",
        body: JSON.stringify({
          annonce_id: annonceId,
          quantite,
        }),
      }
    );

  return (
    extractCommande(response) ||
    response
  );
}

/*
 * ============================================================
 * DISPONIBILITÉ
 * ============================================================
 */

export async function checkCommandeDisponibilite(
  annonceId
) {
  const id =
    toPositiveInteger(annonceId);

  if (!id) {
    throw new Error(
      "L'identifiant de l'annonce est invalide."
    );
  }

  return apiRequest(
    `/commandes/disponibilite/${id}`
  );
}

export const getCommandeDisponibilite =
  checkCommandeDisponibilite;

/*
 * ============================================================
 * COMMANDES ACHETEUR
 * ============================================================
 */

export async function getMesCommandes(
  options = {}
) {
  const {
    page,
    limit,
  } =
    buildPaginationParams(
      options
    );

  const query =
    buildQueryParams({
      page,
      limit,
      statut: options.statut,
    });

  const response =
    await apiRequest(
      `/commandes/mes${query}`
    );

  return {
    commandes:
      normalizeCommandes(
        response
      ),

    pagination:
      normalizePagination(
        extractPagination(
          response
        )
      ),

    raw: response,
  };
}

/*
 * ============================================================
 * COMMANDES VENDEUR
 * ============================================================
 */

export async function getCommandesRecues(
  options = {}
) {
  const {
    page,
    limit,
  } =
    buildPaginationParams(
      options
    );

  const query =
    buildQueryParams({
      page,
      limit,
      statut: options.statut,
    });

  const response =
    await apiRequest(
      `/commandes/vendeur${query}`
    );

  return {
    commandes:
      normalizeCommandes(
        response
      ),

    pagination:
      normalizePagination(
        extractPagination(
          response
        )
      ),

    raw: response,
  };
}

export const getCommandesVendeur =
  getCommandesRecues;

/*
 * ============================================================
 * COMMANDES ADMIN
 * ============================================================
 */

export async function getCommandesAdmin(
  options = {}
) {
  const {
    page,
    limit,
  } =
    buildPaginationParams(
      options
    );

  const query =
    buildQueryParams({
      page,
      limit,
      statut: options.statut,
    });

  const response =
    await apiRequest(
      `/commandes/admin${query}`
    );

  return {
    commandes:
      normalizeCommandes(
        response
      ),

    pagination:
      normalizePagination(
        extractPagination(
          response
        )
      ),

    raw: response,
  };
}

/*
 * ============================================================
 * COMMANDE PAR ID
 * ============================================================
 */

export async function getCommandeById(
  commandeId
) {
  const id =
    toPositiveInteger(
      commandeId
    );

  if (!id) {
    throw new Error(
      "L'identifiant de la commande est invalide."
    );
  }

  const response =
    await apiRequest(
      `/commandes/${id}`
    );

  return (
    extractCommande(
      response
    ) || response
  );
}

/*
 * ============================================================
 * MODIFICATION QUANTITÉ
 * ============================================================
 */

export async function updateCommandeQuantite(
  commandeId,
  quantite
) {
  const id =
    toPositiveInteger(
      commandeId
    );

  const nouvelleQuantite =
    toFiniteNumber(
      quantite,
      0
    );

  if (!id) {
    throw new Error(
      "L'identifiant de la commande est invalide."
    );
  }

  if (
    !Number.isFinite(
      nouvelleQuantite
    ) ||
    nouvelleQuantite <= 0
  ) {
    throw new Error(
      "La quantité doit être supérieure à zéro."
    );
  }

  const response =
    await apiRequest(
      `/commandes/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          quantite:
            nouvelleQuantite,
        }),
      }
    );

  return (
    extractCommande(
      response
    ) || response
  );
}

export const modifierQuantiteCommande =
  updateCommandeQuantite;

/*
 * ============================================================
 * CHANGEMENT DE STATUT
 * ============================================================
 */

export async function changerStatutCommande(
  commandeId,
  statut
) {
  const id =
    toPositiveInteger(
      commandeId
    );

  if (!id) {
    throw new Error(
      "L'identifiant de la commande est invalide."
    );
  }

  if (
    typeof statut !== "string" ||
    !statut.trim()
  ) {
    throw new Error(
      "Le statut de la commande est obligatoire."
    );
  }

  const normalizedStatus =
    statut.trim().toLowerCase();

  if (
    !Object.values(
      ORDER_STATUS
    ).includes(
      normalizedStatus
    )
  ) {
    throw new Error(
      `Statut de commande invalide : ${statut}`
    );
  }

  const response =
    await apiRequest(
      `/commandes/${id}/statut`,
      {
        method: "PATCH",
        body: JSON.stringify({
          statut:
            normalizedStatus,
        }),
      }
    );

  return (
    extractCommande(
      response
    ) || response
  );
}

/*
 * ============================================================
 * ACCEPTER
 * ============================================================
 */

export async function accepterCommande(
  commandeId
) {
  return changerStatutCommande(
    commandeId,
    ORDER_STATUS.CONFIRMEE
  );
}

/*
 * ============================================================
 * REFUSER
 * ============================================================
 *
 * Dans le backend AgroMarket actuel,
 * le refus correspond au statut "annulee".
 * ============================================================
 */

export async function refuserCommande(
  commandeId
) {
  return changerStatutCommande(
    commandeId,
    ORDER_STATUS.ANNULEE
  );
}

/*
 * ============================================================
 * ANNULATION
 * ============================================================
 */

export async function annulerCommande(
  commandeId,
  motif = undefined
) {
  const id =
    toPositiveInteger(
      commandeId
    );

  if (!id) {
    throw new Error(
      "L'identifiant de la commande est invalide."
    );
  }

  const options = {
    method: "PATCH",
  };

  if (
    typeof motif === "string" &&
    motif.trim()
  ) {
    options.body =
      JSON.stringify({
        motif: motif.trim(),
      });
  }

  const response =
    await apiRequest(
      `/commandes/${id}/annuler`,
      options
    );

  return (
    extractCommande(
      response
    ) || response
  );
}

/*
 * ============================================================
 * STATISTIQUES ACHETEUR
 * ============================================================
 */

export async function getMesCommandesStats() {
  const response =
    await apiRequest(
      "/commandes/mes/statistiques"
    );

  return normalizeStats(
    response
  );
}

/*
 * ============================================================
 * STATISTIQUES VENDEUR
 * ============================================================
 */

export async function getCommandesVendeurStats() {
  const response =
    await apiRequest(
      "/commandes/vendeur/statistiques"
    );

  return normalizeStats(
    response
  );
}

export const getCommandesRecuesStats =
  getCommandesVendeurStats;

/*
 * ============================================================
 * STATISTIQUES ADMIN
 * ============================================================
 */

export async function getCommandesAdminStats() {
  const response =
    await apiRequest(
      "/commandes/admin/statistiques"
    );

  return normalizeStats(
    response
  );
}

/*
 * ============================================================
 * NORMALISATION STATISTIQUES
 * ============================================================
 */

function normalizeStats(
  response
) {
  const source =
    response?.statistiques ??
    response?.stats ??
    response?.data ??
    response ??
    {};

  return {
    ...source,

    total:
      toFiniteNumber(
        source.total,
        0
      ),

    en_attente:
      toFiniteNumber(
        source.en_attente,
        0
      ),

    confirmees:
      toFiniteNumber(
        source.confirmees,
        0
      ),

    preparees:
      toFiniteNumber(
        source.preparees,
        0
      ),

    livrees:
      toFiniteNumber(
        source.livrees,
        0
      ),

    annulees:
      toFiniteNumber(
        source.annulees,
        0
      ),

    chiffre_total:
      toFiniteNumber(
        source.chiffre_total,
        0
      ),
  };
}

/*
 * ============================================================
 * COMPATIBILITÉ DASHBOARDS
 * ============================================================
 */

export function getCommandesStats(
  commandes = []
) {
  const liste =
    Array.isArray(commandes)
      ? commandes
      : [];

  const stats = {
    total: liste.length,

    en_attente: 0,

    confirmees: 0,

    preparees: 0,

    livrees: 0,

    annulees: 0,

    chiffre_total: 0,
  };

  for (
    const commande of liste
  ) {
    if (!commande) {
      continue;
    }

    const statut =
      String(
        commande.statut || ""
      ).toLowerCase();

    if (
      Object.prototype.hasOwnProperty.call(
        stats,
        statut
      )
    ) {
      stats[statut] += 1;
    }

    if (
      statut !==
      ORDER_STATUS.ANNULEE
    ) {
      stats.chiffre_total +=
        calculateOrderTotal(
          commande
        );
    }
  }

  return stats;
}

/*
 * ============================================================
 * CALCUL TOTAL
 * ============================================================
 */

export function calculateOrderTotal(
  commande = {}
) {
  const prixUnitaire =
    toFiniteNumber(
      commande.prix_unitaire ??
        commande.prix ??
        commande.annonce?.prix_unitaire ??
        commande.annonce?.prix,
      0
    );

  const quantite =
    toFiniteNumber(
      commande.quantite,
      0
    );

  if (
    prixUnitaire < 0 ||
    quantite < 0
  ) {
    return 0;
  }

  return (
    prixUnitaire *
    quantite
  );
}

/*
 * ============================================================
 * HELPERS STATUTS
 * ============================================================
 */

export function isCommandeEnAttente(
  commande
) {
  return (
    commande?.statut ===
    ORDER_STATUS.EN_ATTENTE
  );
}

export function isCommandeConfirmee(
  commande
) {
  return (
    commande?.statut ===
    ORDER_STATUS.CONFIRMEE
  );
}

export function isCommandePreparee(
  commande
) {
  return (
    commande?.statut ===
    ORDER_STATUS.PREPAREE
  );
}

export function isCommandeLivree(
  commande
) {
  return (
    commande?.statut ===
    ORDER_STATUS.LIVREE
  );
}

export function isCommandeAnnulee(
  commande
) {
  return (
    commande?.statut ===
    ORDER_STATUS.ANNULEE
  );
}

/*
 * ============================================================
 * EXPORT PAR DÉFAUT
 * ============================================================
 */

const ordersApi = {
  ORDER_STATUS,
  ORDER_ACTION,

  createCommande,

  checkCommandeDisponibilite,
  getCommandeDisponibilite,

  getMesCommandes,
  getCommandesRecues,
  getCommandesVendeur,
  getCommandesAdmin,

  getCommandeById,

  updateCommandeQuantite,
  modifierQuantiteCommande,

  changerStatutCommande,

  accepterCommande,
  refuserCommande,
  annulerCommande,

  getMesCommandesStats,
  getCommandesVendeurStats,
  getCommandesRecuesStats,
  getCommandesAdminStats,

  getCommandesStats,

  calculateOrderTotal,

  isCommandeEnAttente,
  isCommandeConfirmee,
  isCommandePreparee,
  isCommandeLivree,
  isCommandeAnnulee,
};

export default ordersApi;