
// ============================================================
// AGROMARKET BURKINA
// API SERVICE
// ============================================================
//
// Centralisation de toutes les communications entre React
// et l'API FastAPI.
//
// Backend : http://127.0.0.1:8000
// ============================================================

const API_URL = "http://127.0.0.1:8000";


// ============================================================
// CONFIGURATION
// ============================================================

const API_TIMEOUT = 15000;


// ============================================================
// TOKEN & AUTHENTIFICATION
// ============================================================

export function getToken() {
  return localStorage.getItem("access_token");
}


export function isAuthenticated() {
  return Boolean(getToken());
}


export function getUserRole() {
  return localStorage.getItem("user_role");
}


export function isAdmin() {
  const role = getUserRole();

  return (
    role === "admin" ||
    role === "administrateur"
  );
}


export function isVendeur() {
  return getUserRole() === "vendeur";
}


export function isAcheteur() {
  return getUserRole() === "acheteur";
}


// ============================================================
// DÉCONNEXION
// ============================================================

export function logoutUser() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_role");
}


// ============================================================
// HEADERS
// ============================================================

function getAuthHeaders() {
  const token = getToken();

  if (!token) {
    return {
      "Content-Type": "application/json",
    };
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}


function getPublicHeaders() {
  return {
    "Content-Type": "application/json",
  };
}


// ============================================================
// LECTURE SÉCURISÉE DE LA RÉPONSE
// ============================================================

async function parseResponse(response) {
  const contentType =
    response.headers.get("content-type");

  if (
    contentType &&
    contentType.includes("application/json")
  ) {
    return await response.json();
  }

  const text = await response.text();

  return text || null;
}


// ============================================================
// EXTRAIRE LE MESSAGE D'ERREUR FASTAPI
// ============================================================

function getErrorMessage(data, fallback) {

  // Exemple FastAPI :
  //
  // {
  //   "detail": "Téléphone déjà utilisé"
  // }

  if (data?.detail) {

    // Validation Pydantic / FastAPI

    if (Array.isArray(data.detail)) {

      return data.detail
        .map((error) => {

          if (typeof error === "string") {
            return error;
          }

          return (
            error.msg ||
            error.message ||
            "Erreur de validation."
          );

        })
        .join(", ");
    }

    if (typeof data.detail === "string") {
      return data.detail;
    }
  }


  if (typeof data === "string" && data.trim()) {
    return data;
  }


  return fallback;
}


// ============================================================
// REQUÊTE HTTP CENTRALISÉE
// ============================================================

async function apiRequest(
  endpoint,
  options = {}
) {

  const controller =
    new AbortController();

  const timeoutId =
    setTimeout(
      () => controller.abort(),
      API_TIMEOUT
    );


  try {

    const response = await fetch(
      `${API_URL}${endpoint}`,
      {
        ...options,

        signal:
          options.signal ||
          controller.signal,
      }
    );


    const data =
      await parseResponse(response);


    // --------------------------------------------------------
    // TOKEN EXPIRÉ / NON AUTORISÉ
    // --------------------------------------------------------

    if (
      response.status === 401 ||
      response.status === 403
    ) {

      // On ne supprime pas automatiquement le token
      // pour toutes les erreurs 403.
      //
      // Cela permet de distinguer :
      // 401 = session invalide
      // 403 = accès interdit

      if (response.status === 401) {
        logoutUser();
      }

      throw new Error(
        getErrorMessage(
          data,
          response.status === 401
            ? "Votre session a expiré. Veuillez vous reconnecter."
            : "Accès refusé."
        )
      );
    }


    // --------------------------------------------------------
    // AUTRES ERREURS HTTP
    // --------------------------------------------------------

    if (!response.ok) {

      throw new Error(
        getErrorMessage(
          data,
          `Erreur serveur (${response.status}).`
        )
      );
    }


    return data;


  } catch (error) {

    // --------------------------------------------------------
    // TIMEOUT
    // --------------------------------------------------------

    if (error.name === "AbortError") {

      throw new Error(
        "Le serveur met trop de temps à répondre."
      );
    }


    // --------------------------------------------------------
    // ERREUR RÉSEAU
    // --------------------------------------------------------

    if (
      error instanceof TypeError
    ) {

      throw new Error(
        "Impossible de contacter le serveur AgroMarket. Vérifiez que l'API FastAPI est démarrée."
      );
    }


    throw error;


  } finally {

    clearTimeout(timeoutId);
  }
}


// ============================================================
// AUTHENTIFICATION
// ============================================================


// ------------------------------------------------------------
// INSCRIPTION
// ------------------------------------------------------------

export async function registerUser(
  userData
) {

  return await apiRequest(
    "/auth/register",
    {
      method: "POST",

      headers:
        getPublicHeaders(),

      body:
        JSON.stringify(userData),
    }
  );
}


// ------------------------------------------------------------
// CONNEXION
// ------------------------------------------------------------

export async function loginUser(
  credentials
) {

  return await apiRequest(
    "/auth/login",
    {
      method: "POST",

      headers:
        getPublicHeaders(),

      body:
        JSON.stringify(credentials),
    }
  );
}


// ------------------------------------------------------------
// PROFIL UTILISATEUR CONNECTÉ
// ------------------------------------------------------------

export async function getUserProfile(
  token = getToken()
) {

  if (!token) {
    throw new Error(
      "Vous devez être connecté."
    );
  }

  return await apiRequest(
    "/users/me",
    {
      method: "GET",

      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );
}


// ============================================================
// DEMANDE POUR DEVENIR VENDEUR
// ============================================================


// ------------------------------------------------------------
// ENVOYER UNE DEMANDE VENDEUR
// ------------------------------------------------------------

export async function demanderCompteVendeur(
  token = getToken()
) {

  if (!token) {
    throw new Error(
      "Vous devez être connecté."
    );
  }

  return await apiRequest(
    "/users/me/demande-vendeur",
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );
}


// ------------------------------------------------------------
// RÉCUPÉRER MA DEMANDE VENDEUR
// ------------------------------------------------------------

export async function getMaDemandeVendeur(
  token = getToken()
) {

  if (!token) {
    throw new Error(
      "Vous devez être connecté."
    );
  }

  return await apiRequest(
    "/users/me/demande-vendeur",
    {
      method: "GET",

      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );
}


// ============================================================
// ANNONCES
// ============================================================


// ------------------------------------------------------------
// TOUTES LES ANNONCES PUBLIÉES
// ------------------------------------------------------------

export async function getAnnonces() {

  return await apiRequest(
    "/annonces",
    {
      method: "GET",

      headers:
        getPublicHeaders(),
    }
  );
}


// ------------------------------------------------------------
// MES ANNONCES
// VENDEUR
// ------------------------------------------------------------

export async function getMyAnnonces(
  token = getToken()
) {

  if (!token) {
    throw new Error(
      "Vous devez être connecté."
    );
  }

  return await apiRequest(
    "/users/me/annonces",
    {
      method: "GET",

      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );
}


// ------------------------------------------------------------
// ENVOYER UNE IMAGE D'ANNONCE
// ------------------------------------------------------------

export async function uploadAnnonceImage(
  annonceId,
  imageFile,
  token = getToken()
) {

  if (!token) {
    throw new Error(
      "Vous devez être connecté."
    );
  }


  if (!imageFile) {
    throw new Error(
      "Veuillez sélectionner une image."
    );
  }


  const formData =
    new FormData();


  formData.append(
    "file",
    imageFile
  );


  return await apiRequest(
    `/annonces/${annonceId}/images`,
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${token}`,
      },

      // IMPORTANT :
      // Ne pas mettre Content-Type ici.
      // Le navigateur ajoute automatiquement
      // multipart/form-data avec sa boundary.

      body: formData,
    }
  );
}


// ============================================================
// ADMINISTRATION
// ============================================================


// ------------------------------------------------------------
// DEMANDES VENDEUR
// ------------------------------------------------------------

export async function getDemandesVendeur(
  token = getToken()
) {

  if (!token) {
    throw new Error(
      "Vous devez être connecté."
    );
  }

  return await apiRequest(
    "/admin/demandes-vendeur",
    {
      method: "GET",

      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );
}


// ------------------------------------------------------------
// ACCEPTER UNE DEMANDE VENDEUR
// ------------------------------------------------------------

export async function accepterDemandeVendeur(
  demandeId,
  motif = "",
  token = getToken()
) {

  if (!token) {
    throw new Error(
      "Vous devez être connecté."
    );
  }


  return await apiRequest(
    `/admin/demandes-vendeur/${demandeId}/accepter`,
    {
      method: "PATCH",

      headers: getAuthHeaders(),

      body: JSON.stringify({
        motif:
          motif.trim() || null,
      }),
    }
  );
}


// ------------------------------------------------------------
// REFUSER UNE DEMANDE VENDEUR
// ------------------------------------------------------------

export async function refuserDemandeVendeur(
  demandeId,
  motif = "",
  token = getToken()
) {

  if (!token) {
    throw new Error(
      "Vous devez être connecté."
    );
  }


  return await apiRequest(
    `/admin/demandes-vendeur/${demandeId}/refuser`,
    {
      method: "PATCH",

      headers: getAuthHeaders(),

      body: JSON.stringify({
        motif:
          motif.trim() || null,
      }),
    }
  );
}


// ============================================================
// MODÉRATION DES ANNONCES
// ============================================================


// ------------------------------------------------------------
// ANNONCES EN ATTENTE
// ------------------------------------------------------------

export async function getAnnoncesEnAttente(
  token = getToken()
) {

  if (!token) {
    throw new Error(
      "Vous devez être connecté."
    );
  }

  return await apiRequest(
    "/annonces/moderation/en-attente",
    {
      method: "GET",

      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );
}


// ------------------------------------------------------------
// APPROUVER UNE ANNONCE
// ------------------------------------------------------------

export async function approuverAnnonce(
  annonceId,
  token = getToken()
) {

  if (!token) {
    throw new Error(
      "Vous devez être connecté."
    );
  }

  return await apiRequest(
    `/annonces/${annonceId}/approuver`,
    {
      method: "PATCH",

      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );
}


// ------------------------------------------------------------
// REFUSER UNE ANNONCE
// ------------------------------------------------------------

export async function refuserAnnonce(
  annonceId,
  token = getToken()
) {

  if (!token) {
    throw new Error(
      "Vous devez être connecté."
    );
  }

  return await apiRequest(
    `/annonces/${annonceId}/refuser`,
    {
      method: "PATCH",

      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );
}


// ============================================================
// COMMANDES
// ============================================================


// ------------------------------------------------------------
// MES COMMANDES
// ACHETEUR
// ------------------------------------------------------------

export async function getMesCommandes(
  token = getToken()
) {

  if (!token) {
    throw new Error(
      "Vous devez être connecté."
    );
  }

  return await apiRequest(
    "/commandes/mes-commandes",
    {
      method: "GET",

      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );
}


// ------------------------------------------------------------
// COMMANDES REÇUES
// VENDEUR
// ------------------------------------------------------------

export async function getCommandesRecues(
  token = getToken()
) {

  if (!token) {
    throw new Error(
      "Vous devez être connecté."
    );
  }

  return await apiRequest(
    "/commandes/commandes-recues",
    {
      method: "GET",

      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );
}


// ------------------------------------------------------------
// CRÉER UNE COMMANDE
// ------------------------------------------------------------

export async function creerCommande(
  commandeData,
  token = getToken()
) {

  if (!token) {
    throw new Error(
      "Vous devez être connecté."
    );
  }

  return await apiRequest(
    "/commandes",
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${token}`,
        "Content-Type":
          "application/json",
      },

      body:
        JSON.stringify(
          commandeData
        ),
    }
  );
}


// ------------------------------------------------------------
// ACCEPTER UNE COMMANDE
// VENDEUR
// ------------------------------------------------------------

export async function accepterCommande(
  commandeId,
  token = getToken()
) {

  if (!token) {
    throw new Error(
      "Vous devez être connecté."
    );
  }

  return await apiRequest(
    `/commandes/${commandeId}/accepter`,
    {
      method: "PATCH",

      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );
}


// ------------------------------------------------------------
// REFUSER UNE COMMANDE
// VENDEUR
// ------------------------------------------------------------

export async function refuserCommande(
  commandeId,
  token = getToken()
) {

  if (!token) {
    throw new Error(
      "Vous devez être connecté."
    );
  }

  return await apiRequest(
    `/commandes/${commandeId}/refuser`,
    {
      method: "PATCH",

      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );
}


// ============================================================
// UTILITAIRES
// ============================================================


// ------------------------------------------------------------
// URL D'UNE IMAGE
// ------------------------------------------------------------

export function getImageUrl(
  imagePath
) {

  if (!imagePath) {
    return null;
  }


  // URL déjà complète

  if (
    imagePath.startsWith("http://") ||
    imagePath.startsWith("https://")
  ) {
    return imagePath;
  }


  // Chemin relatif

  if (imagePath.startsWith("/")) {
    return `${API_URL}${imagePath}`;
  }


  return `${API_URL}/${imagePath}`;
}


// ------------------------------------------------------------
// URL DE L'API
// ------------------------------------------------------------

export function getApiUrl() {
  return API_URL;
}
