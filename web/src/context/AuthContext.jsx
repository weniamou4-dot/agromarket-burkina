// src/context/AuthContext.jsx

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  loginUser,
  registerUser,
  getCurrentUser,
  logoutUser,
} from "../services/api/auth";

import {
  clearSession,
  getToken,
  getStoredUser,
  saveUser,
} from "../services/api/client";


/*
 * ============================================================
 * CONTEXTE
 * ============================================================
 */

const AuthContext =
  createContext(null);


/*
 * ============================================================
 * UTILITAIRES
 * ============================================================
 */

function normalizeRole(role) {
  if (!role) {
    return null;
  }

  return String(role)
    .trim()
    .toLowerCase();
}


function isAdminRole(role) {
  const normalized =
    normalizeRole(role);

  return (
    normalized === "admin" ||
    normalized === "administrateur"
  );
}


function isModeratorRole(role) {
  return (
    normalizeRole(role) ===
    "moderateur"
  );
}


function isSellerRole(role) {
  return (
    normalizeRole(role) ===
    "vendeur"
  );
}


/*
 * ============================================================
 * PROVIDER
 * ============================================================
 */

export function AuthProvider({
  children,
}) {
  const [
    user,
    setUser,
  ] = useState(() =>
    getStoredUser()
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState(null);

  /*
   * ----------------------------------------------------------
   * UTILISATEUR CONNECTÉ
   * ----------------------------------------------------------
   */

  const isAuthenticated =
    Boolean(
      user && getToken()
    );

  /*
   * ----------------------------------------------------------
   * RÔLES
   * ----------------------------------------------------------
   */

  const role =
    normalizeRole(
      user?.role
    );

  const isVendeur =
    isSellerRole(role);

  const isModerateur =
    isModeratorRole(role);

  const isAdmin =
    isAdminRole(role);

  /*
   * ----------------------------------------------------------
   * METTRE À JOUR L'UTILISATEUR
   * ----------------------------------------------------------
   */

  const updateUser =
    useCallback(
      (newUser) => {
        if (!newUser) {
          setUser(null);
          saveUser(null);
          return;
        }

        setUser(newUser);
        saveUser(newUser);

        const normalizedRole =
          normalizeRole(
            newUser.role
          );

        if (
          normalizedRole
        ) {
          localStorage.setItem(
            "user_role",
            normalizedRole
          );
        } else {
          localStorage.removeItem(
            "user_role"
          );
        }
      },
      []
    );

  /*
   * ----------------------------------------------------------
   * CHARGER LA SESSION EXISTANTE
   * ----------------------------------------------------------
   */

  const restoreSession =
    useCallback(
      async () => {
        const token =
          getToken();

        if (!token) {
          setUser(null);
          setLoading(false);
          return;
        }

        try {
          setLoading(true);
          setError(null);

          /*
           * Le backend reste la source de vérité.
           * Le user du localStorage sert seulement
           * à éviter un écran vide pendant le chargement.
           */

          const currentUser =
            await getCurrentUser();

          updateUser(
            currentUser
          );
        } catch (err) {
          console.warn(
            "Session AgroMarket invalide ou expirée :",
            err
          );

          clearSession();
          setUser(null);

          /*
           * Une erreur 401 signifie simplement
           * que la session locale n'est plus valide.
           * Elle ne doit pas transformer le démarrage
           * de l'application en écran d'erreur.
           */
        } finally {
          setLoading(false);
        }
      },
      [updateUser]
    );

  /*
   * ----------------------------------------------------------
   * RESTAURER LA SESSION AU DÉMARRAGE
   * ----------------------------------------------------------
   */

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  /*
   * ----------------------------------------------------------
   * CONNEXION
   * ----------------------------------------------------------
   */

  const login =
    useCallback(
      async (credentials) => {
        try {
          setSubmitting(true);
          setError(null);

          const response =
            await loginUser(
              credentials
            );

          /*
           * Certaines API renvoient déjà
           * l'utilisateur avec le token.
           */

          if (
            response?.user
          ) {
            updateUser(
              response.user
            );
          } else {
            /*
             * Si l'API ne renvoie pas
             * l'utilisateur, on demande
             * immédiatement le profil courant.
             */

            const currentUser =
              await getCurrentUser();

            updateUser(
              currentUser
            );
          }

          return response;
        } catch (err) {
          console.error(
            "Erreur AuthContext.login :",
            err
          );

          setError(
            err.message ||
              "Impossible de vous connecter."
          );

          throw err;
        } finally {
          setSubmitting(false);
        }
      },
      [updateUser]
    );

  /*
   * ----------------------------------------------------------
   * INSCRIPTION
   * ----------------------------------------------------------
   */

  const register =
    useCallback(
      async (userData) => {
        try {
          setSubmitting(true);
          setError(null);

          const response =
            await registerUser(
              userData
            );

          /*
           * Dans notre logique actuelle,
           * l'inscription publique n'a pas
           * forcément besoin de connecter
           * automatiquement l'utilisateur.
           */

          return response;
        } catch (err) {
          console.error(
            "Erreur AuthContext.register :",
            err
          );

          setError(
            err.message ||
              "Impossible de créer votre compte."
          );

          throw err;
        } finally {
          setSubmitting(false);
        }
      },
      []
    );

  /*
   * ----------------------------------------------------------
   * RAFRAÎCHIR LE PROFIL
   * ----------------------------------------------------------
   */

  const refreshUser =
    useCallback(
      async () => {
        try {
          setError(null);

          const currentUser =
            await getCurrentUser();

          updateUser(
            currentUser
          );

          return currentUser;
        } catch (err) {
          /*
           * Une erreur pendant un refresh
           * de session doit invalider la session.
           */

          clearSession();
          setUser(null);

          setError(
            err.message ||
              "Votre session n'est plus valide."
          );

          throw err;
        }
      },
      [updateUser]
    );

  /*
   * ----------------------------------------------------------
   * DÉCONNEXION
   * ----------------------------------------------------------
   */

  const logout =
    useCallback(
      async () => {
        try {
          setSubmitting(true);
          setError(null);

          await logoutUser();
        } catch (err) {
          console.warn(
            "Erreur lors de la déconnexion :",
            err
          );
        } finally {
          /*
           * Même si un éventuel appel serveur
           * échoue, la session locale doit être
           * supprimée.
           */

          clearSession();
          setUser(null);
          setSubmitting(false);
        }
      },
      []
    );

  /*
   * ----------------------------------------------------------
   * EFFACER L'ERREUR
   * ----------------------------------------------------------
   */

  const clearError =
    useCallback(() => {
      setError(null);
    }, []);

  /*
   * ----------------------------------------------------------
   * VALEUR DU CONTEXTE
   * ----------------------------------------------------------
   */

  const contextValue =
    useMemo(
      () => ({
        /*
         * Utilisateur
         */
        user,

        role,

        /*
         * État
         */
        loading,
        submitting,
        error,
        isAuthenticated,

        /*
         * Rôles
         */
        isVendeur,
        isModerateur,
        isAdmin,

        /*
         * Actions
         */
        login,
        register,
        logout,
        refreshUser,
        updateUser,
        restoreSession,
        clearError,
      }),
      [
        user,
        role,
        loading,
        submitting,
        error,
        isAuthenticated,
        isVendeur,
        isModerateur,
        isAdmin,
        login,
        register,
        logout,
        refreshUser,
        updateUser,
        restoreSession,
        clearError,
      ]
    );

  return (
    <AuthContext.Provider
      value={contextValue}
    >
      {children}
    </AuthContext.Provider>
  );
}


/*
 * ============================================================
 * HOOK
 * ============================================================
 */

export function useAuth() {
  const context =
    useContext(
      AuthContext
    );

  if (!context) {
    throw new Error(
      "useAuth() doit être utilisé à l'intérieur de <AuthProvider>."
    );
  }

  return context;
}


export default AuthContext;