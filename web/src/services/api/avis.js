
// src/services/api/avis.js

import { apiRequest } from "./client";


// ============================================================
// CONSTANTES
// ============================================================

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;


// ============================================================
// HELPERS INTERNES
// ============================================================

function normalizePage(value) {
  const page = Number(value);

  if (!Number.isInteger(page) || page < 1) {
    return DEFAULT_PAGE;
  }

  return page;
}


function normalizeLimit(value) {
  const limit = Number(value);

  if (!Number.isInteger(limit) || limit < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(
    MAX_LIMIT,
    limit
  );
}


function requireId(
  id,
  message
) {
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
      "La note doit être comprise entre 1 et 5."
    );
  }

  return value;
}


function normalizeCommentaire(
  commentaire
) {
  if (
    commentaire === null ||
    commentaire === undefined
  ) {
    return null;
  }

  const value =
    String(commentaire).trim();

  return value || null;
}


function getErrorMessage(
  error,
  fallback
) {
  return (
    error?.message ||
    (typeof error === "string"
      ? error
      : "") ||
    fallback
  );
}


// ============================================================
// CRÉER UN AVIS
// ============================================================

/**
 * Créer un avis lié à une annonce.
 *
 * POST /avis/
 *
 * L'utilisateur doit être authentifié.
 *
 * Paramètres :
 * - annonce_id
 * - note
 * - commentaire
 * - commande_id (optionnel)
 */
export async function creerAvis({
  annonce_id,
  note,
  commentaire = null,
  commande_id = null,
} = {}) {

  const safeAnnonceId =
    requireId(
      annonce_id,
      "L'identifiant de l'annonce est requis."
    );

  const safeNote =
    normalizeNote(note);

  const body = {
    annonce_id:
      annonce_id,

    note:
      safeNote,

    commentaire:
      normalizeCommentaire(
        commentaire
      ),

    commande_id:
      commande_id === null ||
      commande_id === undefined ||
      String(commande_id).trim() === ""
        ? null
        : commande_id,
  };


  try {
    return await apiRequest(
      "/avis/",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Impossible de créer l'avis."
      )
    );
  }
}


// ============================================================
// OBTENIR UN AVIS
// ============================================================

/**
 * Récupérer un avis précis.
 *
 * GET /avis/{avis_id}
 */
export async function getAvisById(
  avisId
) {

  const safeId =
    requireId(
      avisId,
      "L'identifiant de l'avis est requis."
    );


  try {
    return await apiRequest(
      `/avis/${safeId}`,
      {
        method: "GET",
      }
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Impossible de récupérer l'avis."
      )
    );
  }
}


// ============================================================
// MODIFIER UN AVIS
// ============================================================

/**
 * Modifier un avis existant.
 *
 * PATCH /avis/{avis_id}
 */
export async function modifierAvis(
  avisId,
  {
    note = null,
    commentaire = null,
  } = {}
) {

  const safeId =
    requireId(
      avisId,
      "L'identifiant de l'avis est requis."
    );

  const body = {};


  /*
   * ----------------------------------------------------------
   * NOTE
   * ----------------------------------------------------------
   */

  if (
    note !== null &&
    note !== undefined
  ) {
    body.note =
      normalizeNote(note);
  }


  /*
   * ----------------------------------------------------------
   * COMMENTAIRE
   * ----------------------------------------------------------
   */

  if (
    commentaire !== null &&
    commentaire !== undefined
  ) {
    body.commentaire =
      normalizeCommentaire(
        commentaire
      );
  }


  /*
   * ----------------------------------------------------------
   * VÉRIFICATION DU CONTENU
   * ----------------------------------------------------------
   */

  if (
    Object.keys(body).length === 0
  ) {
    throw new Error(
      "Aucune modification n'a été fournie."
    );
  }


  try {
    return await apiRequest(
      `/avis/${safeId}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      }
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Impossible de modifier l'avis."
      )
    );
  }
}


// ============================================================
// SUPPRIMER UN AVIS
// ============================================================

/**
 * Supprimer un avis.
 *
 * DELETE /avis/{avis_id}
 */
export async function supprimerAvis(
  avisId
) {

  const safeId =
    requireId(
      avisId,
      "L'identifiant de l'avis est requis."
    );


  try {
    return await apiRequest(
      `/avis/${safeId}`,
      {
        method: "DELETE",
      }
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Impossible de supprimer l'avis."
      )
    );
  }
}


// ============================================================
// AVIS D'UNE ANNONCE
// ============================================================

/**
 * Récupérer les avis d'une annonce.
 *
 * GET /avis/annonce/{annonce_id}
 *
 * La disponibilité publique de ces avis
 * dépend des règles du backend.
 */
export async function getAvisByAnnonce(
  annonceId,
  {
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT,
  } = {}
) {

  const safeAnnonceId =
    requireId(
      annonceId,
      "L'identifiant de l'annonce est requis."
    );

  const safePage =
    normalizePage(page);

  const safeLimit =
    normalizeLimit(limit);


  const params =
    new URLSearchParams();

  params.set(
    "page",
    String(safePage)
  );

  params.set(
    "limit",
    String(safeLimit)
  );


  try {
    return await apiRequest(
      `/avis/annonce/${safeAnnonceId}?${params.toString()}`,
      {
        method: "GET",
      }
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Impossible de récupérer les avis de l'annonce."
      )
    );
  }
}


// ============================================================
// AVIS D'UN UTILISATEUR
// ============================================================

/**
 * Récupérer les avis d'un utilisateur.
 *
 * GET /avis/utilisateur/{utilisateur_id}
 */
export async function getAvisByUtilisateur(
  utilisateurId
) {

  const safeUtilisateurId =
    requireId(
      utilisateurId,
      "L'identifiant de l'utilisateur est requis."
    );


  try {
    return await apiRequest(
      `/avis/utilisateur/${safeUtilisateurId}`,
      {
        method: "GET",
      }
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Impossible de récupérer les avis de l'utilisateur."
      )
    );
  }
}


// ============================================================
// RECHERCHE / FILTRE DES AVIS
// ============================================================

/**
 * Rechercher ou filtrer les avis.
 *
 * GET /avis/
 *
 * Filtres :
 * - annonce_id
 * - utilisateur_id
 * - note
 * - page
 * - limit
 */
export async function rechercherAvis({
  annonce_id = null,
  utilisateur_id = null,
  note = null,
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
} = {}) {

  const params =
    new URLSearchParams();


  /*
   * ----------------------------------------------------------
   * ANNONCE
   * ----------------------------------------------------------
   */

  if (
    annonce_id !== null &&
    annonce_id !== undefined &&
    String(annonce_id).trim() !== ""
  ) {
    params.set(
      "annonce_id",
      String(annonce_id).trim()
    );
  }


  /*
   * ----------------------------------------------------------
   * UTILISATEUR
   * ----------------------------------------------------------
   */

  if (
    utilisateur_id !== null &&
    utilisateur_id !== undefined &&
    String(utilisateur_id).trim() !== ""
  ) {
    params.set(
      "utilisateur_id",
      String(utilisateur_id).trim()
    );
  }


  /*
   * ----------------------------------------------------------
   * NOTE
   * ----------------------------------------------------------
   */

  if (
    note !== null &&
    note !== undefined &&
    String(note).trim() !== ""
  ) {
    params.set(
      "note",
      String(
        normalizeNote(note)
      )
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


  try {
    return await apiRequest(
      `/avis/?${params.toString()}`,
      {
        method: "GET",
      }
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Impossible de rechercher les avis."
      )
    );
  }
}


// ============================================================
// STATISTIQUES DES AVIS
// ============================================================

/**
 * Récupérer les statistiques des avis.
 *
 * GET /avis/statistiques/resume
 *
 * Avec annonce :
 *
 * GET /avis/statistiques/resume?annonce_id=...
 */
export async function getAvisStats(
  annonceId = null
) {

  const params =
    new URLSearchParams();


  if (
    annonceId !== null &&
    annonceId !== undefined &&
    String(annonceId).trim() !== ""
  ) {
    params.set(
      "annonce_id",
      String(annonceId).trim()
    );
  }


  const query =
    params.toString();

  const url =
    query
      ? `/avis/statistiques/resume?${query}`
      : "/avis/statistiques/resume";


  try {
    return await apiRequest(
      url,
      {
        method: "GET",
      }
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Impossible de récupérer les statistiques des avis."
      )
    );
  }
}


// ============================================================
// MODÉRATION : VISIBILITÉ
// ============================================================

/**
 * Modifier la visibilité d'un avis.
 *
 * PATCH /avis/{avis_id}/visibilite
 *
 * visible = true  → afficher
 * visible = false → masquer
 */
export async function modifierVisibiliteAvis(
  avisId,
  visible
) {

  const safeId =
    requireId(
      avisId,
      "L'identifiant de l'avis est requis."
    );


  const params =
    new URLSearchParams();

  params.set(
    "visible",
    String(
      Boolean(visible)
    )
  );


  try {
    return await apiRequest(
      `/avis/${safeId}/visibilite?${params.toString()}`,
      {
        method: "PATCH",
      }
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Impossible de modifier la visibilité de l'avis."
      )
    );
  }
}


// ============================================================
// EXPORT PAR DÉFAUT
// ============================================================

const avisApi = {
  creerAvis,
  getAvisById,
  modifierAvis,
  supprimerAvis,
  getAvisByAnnonce,
  getAvisByUtilisateur,
  rechercherAvis,
  getAvisStats,
  modifierVisibiliteAvis,
};


export default avisApi;
