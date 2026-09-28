
// ============================================================
// AGROMARKET BURKINA
// SERVICE API — AUTHENTIFICATION
// Version professionnelle
// ============================================================

import {
  apiRequest,
  API_URL,
  clearSession,
  getToken,
  saveUser,
} from "./client";


// ============================================================
// NORMALISATION DU TÉLÉPHONE
// ============================================================

/**
 * Normalise un numéro de téléphone avant son envoi
 * au backend.
 *
 * Exemples :
 *
 * "70 00 00 00"   → "70000000"
 * "70-00-00-00"   → "70000000"
 * "70.00.00.00"   → "70000000"
 * "(70) 00 00 00" → "70000000"
 */
export function normalizeTelephone(value) {
  return String(value ?? "")
    .trim()
    .replace(/[\s\-().]/g, "");
}


// ============================================================
// INSCRIPTION
// ============================================================

export async function registerUser(userData = {}) {
  const payload = {
    ...userData,
    telephone: normalizeTelephone(
      userData.telephone
    ),
  };

  return apiRequest(
    "/auth/register",
    {
      method: "POST",
      auth: false,
      body: JSON.stringify(payload),
    }
  );
}


// ============================================================
// CONNEXION
// ============================================================

export async function loginUser(credentials = {}) {
  const payload = {
    ...credentials,
    telephone: normalizeTelephone(
      credentials.telephone
    ),
  };

  // ----------------------------------------------------------
  // DIAGNOSTIC TEMPORAIRE
  // ----------------------------------------------------------

  console.log(
    "🔐 LOGIN FRONTEND"
  );

  console.log(
    "🌐 API :",
    API_URL
  );

  /*
   * Ne jamais afficher le mot de passe
   * dans la console.
   */
  console.log(
    "📦 PAYLOAD :",
    {
      telephone: payload.telephone,
      mot_de_passe:
        payload.mot_de_passe
          ? "********"
          : "",
    }
  );

  // ----------------------------------------------------------
  // REQUÊTE LOGIN
  // ----------------------------------------------------------

  const response =
    await apiRequest(
      "/auth/login",
      {
        method: "POST",
        auth: false,
        body: JSON.stringify(
          payload
        ),
      }
    );

  // ----------------------------------------------------------
  // ACCESS TOKEN
  // ----------------------------------------------------------

  if (
    response?.access_token
  ) {
    localStorage.setItem(
      "access_token",
      response.access_token
    );
  }

  // ----------------------------------------------------------
  // REFRESH TOKEN
  // ----------------------------------------------------------

  if (
    response?.refresh_token
  ) {
    localStorage.setItem(
      "refresh_token",
      response.refresh_token
    );
  }

  // ----------------------------------------------------------
  // UTILISATEUR
  // ----------------------------------------------------------

  if (
    response?.user
  ) {
    saveUser(
      response.user
    );

    if (
      response.user.role
    ) {
      localStorage.setItem(
        "user_role",
        response.user.role
      );
    }
  }

  return response;
}


// ============================================================
// UTILISATEUR CONNECTÉ
// ============================================================

export async function getCurrentUser() {
  const user =
    await apiRequest(
      "/users/me",
      {
        method: "GET",
      }
    );

  saveUser(user);

  if (
    user?.role
  ) {
    localStorage.setItem(
      "user_role",
      user.role
    );
  }

  return user;
}


// ============================================================
// DÉCONNEXION
// ============================================================

export async function logoutUser() {
  clearSession();
}


// ============================================================
// PROFIL
// ============================================================

export async function getUserProfile() {
  return getCurrentUser();
}


export async function updateProfile(
  userData
) {
  const response =
    await apiRequest(
      "/users/me",
      {
        method: "PUT",
        body: JSON.stringify(
          userData
        ),
      }
    );

  saveUser(response);

  return response;
}


// ============================================================
// DEMANDE DE COMPTE VENDEUR
// ============================================================

export async function demanderCompteVendeur() {
  return apiRequest(
    "/users/me/demande-vendeur",
    {
      method: "POST",
    }
  );
}


export async function getMaDemandeVendeur() {
  return apiRequest(
    "/users/me/demande-vendeur",
    {
      method: "GET",
    }
  );
}


// ============================================================
// MOT DE PASSE OUBLIÉ
// ============================================================

/**
 * Demande l'envoi d'un lien de réinitialisation.
 *
 * Le backend accepte :
 *
 * {
 *   email?: string,
 *   telephone?: string
 * }
 */
export async function forgotPassword(
  data = {}
) {
  const payload = {
    ...data,
  };

  if (
    payload.telephone !== undefined
  ) {
    payload.telephone =
      normalizeTelephone(
        payload.telephone
      );
  }

  return apiRequest(
    "/auth/forgot-password",
    {
      method: "POST",
      auth: false,
      body: JSON.stringify(
        payload
      ),
    }
  );
}


// ============================================================
// RÉINITIALISATION DU MOT DE PASSE
// ============================================================

/**
 * Réinitialise le mot de passe
 * à partir du token reçu par email.
 *
 * Format attendu :
 *
 * {
 *   token: "...",
 *   nouveau_mot_de_passe: "..."
 * }
 */
export async function resetPassword(
  data
) {
  return apiRequest(
    "/auth/reset-password",
    {
      method: "POST",
      auth: false,
      body: JSON.stringify(
        data
      ),
    }
  );
}


// ============================================================
// TOKEN
// ============================================================

export {
  getToken,
};
