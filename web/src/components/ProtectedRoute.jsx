// src/components/ProtectedRoute.jsx

import {
  Navigate,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";


/*
 * ============================================================
 * NORMALISATION DU RÔLE
 * ============================================================
 */

function normalizeRole(role) {
  if (typeof role !== "string") {
    return "";
  }

  return role
    .trim()
    .toLowerCase();
}


/*
 * ============================================================
 * NORMALISATION DES RÔLES AUTORISÉS
 * ============================================================
 */

function normalizeAllowedRoles(role, roles) {
  const values = [];

  if (role) {
    values.push(role);
  }

  if (Array.isArray(roles)) {
    values.push(...roles);
  }

  return [
    ...new Set(
      values
        .map(normalizeRole)
        .filter(Boolean)
    ),
  ];
}


/*
 * ============================================================
 * PROTECTED ROUTE
 * ============================================================
 */

function ProtectedRoute({
  children,
  role,
  roles,
}) {
  const location = useLocation();

  const {
    user,
    loading,
    isAuthenticated,
  } = useAuth();


  /*
   * ----------------------------------------------------------
   * CHARGEMENT DE LA SESSION
   * ----------------------------------------------------------
   */

  if (loading) {
    return (
      <div
        className="route-loading"
        role="status"
        aria-live="polite"
      >
        <div
          className="spinner spinner-lg"
          aria-hidden="true"
        ></div>

        <p>
          Vérification de votre session...
        </p>
      </div>
    );
  }


  /*
   * ----------------------------------------------------------
   * UTILISATEUR NON AUTHENTIFIÉ
   * ----------------------------------------------------------
   */

  if (
    !isAuthenticated ||
    !user
  ) {
    const currentPath =
      `${location.pathname}${location.search}${location.hash}`;

    return (
      <Navigate
        to={`/connexion?redirect=${encodeURIComponent(
          currentPath
        )}`}
        replace
      />
    );
  }


  /*
   * ----------------------------------------------------------
   * RÔLES AUTORISÉS
   * ----------------------------------------------------------
   */

  const allowedRoles =
    normalizeAllowedRoles(
      role,
      roles
    );


  /*
   * ----------------------------------------------------------
   * RÔLE ACTUEL
   * ----------------------------------------------------------
   */

  const currentRole =
    normalizeRole(user.role);


  /*
   * ----------------------------------------------------------
   * VÉRIFICATION DES AUTORISATIONS
   * ----------------------------------------------------------
   */

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(
      currentRole
    )
  ) {
    return (
      <Navigate
        to="/403"
        replace
      />
    );
  }


  /*
   * ----------------------------------------------------------
   * ACCÈS AUTORISÉ
   * ----------------------------------------------------------
   */

  return children;
}


export default ProtectedRoute;