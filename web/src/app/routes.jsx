// ============================================================
// AGROMARKET BURKINA
// ROUTES APPLICATION
// ============================================================

import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import ProtectedRoute from "../components/ProtectedRoute";

/*
 * ============================================================
 * PAGES PUBLIQUES
 * ============================================================
 */

import Home from "../pages/Home";
import Products from "../pages/Products";
import ProductDetails from "../pages/ProductDetails";
import AvisPlateforme from "../pages/AvisPlateforme";

/*
 * ============================================================
 * AUTHENTIFICATION
 * ============================================================
 */

import Login from "../pages/Login";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import Register from "../pages/Register";

/*
 * ============================================================
 * ESPACE UTILISATEUR
 * ============================================================
 */

import Profile from "../pages/Profile";
import ModifierProfil from "../pages/ModifierProfil";
import Dashboard from "../pages/Dashboard";
import Notifications from "../pages/Notifications";

/*
 * ============================================================
 * MESSAGERIE
 * ============================================================
 */

import Messages from "../pages/Messages";
import Conversation from "../pages/Conversation";

/*
 * ============================================================
 * ESPACE VENDEUR
 * ============================================================
 */

import Publish from "../pages/Publish";
import MesAnnonces from "../pages/MesAnnonces";
import CommandesRecues from "../pages/CommandesRecues";

/*
 * ============================================================
 * COMMANDES
 * ============================================================
 */

import Orders from "../pages/Orders";
import OrderDetails from "../pages/OrderDetails";

/*
 * ============================================================
 * AVIS
 * ============================================================
 */

import Avis from "../pages/Avis";

/*
 * ============================================================
 * ADMINISTRATION
 * ============================================================
 */

import AdminDashboard from "../pages/AdminDashboard";

/*
 * ============================================================
 * MODÉRATION DES ANNONCES
 * ============================================================
 */

import ModerationDashboard from "../pages/ModerationDashboard";

/*
 * ============================================================
 * MODÉRATION DES AVIS DE LA PLATEFORME
 * ============================================================
 */

import ModerationAvisPlateforme from "../pages/ModerationAvisPlateforme";

/*
 * ============================================================
 * HISTORIQUE DE MODÉRATION
 * ============================================================
 */

import Historique from "../pages/Historique";

/*
 * ============================================================
 * INTELLIGENCE ARTIFICIELLE
 * ============================================================
 */

import AI from "../pages/AI";

/*
 * ============================================================
 * PAGE 403
 * ============================================================
 */

function ForbiddenPage() {
  return (
    <main className="page forbidden-page">
      <div className="container">
        <div className="empty-state">

          <div className="empty-state-icon">
            403
          </div>

          <h1 className="empty-state-title">
            Accès refusé
          </h1>

          <p className="empty-state-description">
            Vous n'avez pas les permissions
            nécessaires pour accéder à cette page.
          </p>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.history.back()}
          >
            Retour
          </button>

        </div>
      </div>
    </main>
  );
}

/*
 * ============================================================
 * PAGE 404
 * ============================================================
 */

function NotFoundPage() {
  return (
    <main className="page not-found-page">
      <div className="container">
        <div className="empty-state">

          <div className="empty-state-icon">
            404
          </div>

          <h1 className="empty-state-title">
            Page introuvable
          </h1>

          <p className="empty-state-description">
            La page que vous recherchez
            n'existe pas ou a été déplacée.
          </p>

          <a
            href="/"
            className="btn btn-primary"
          >
            Retour à l'accueil
          </a>

        </div>
      </div>
    </main>
  );
}

/*
 * ============================================================
 * ROUTES
 * ============================================================
 */

function AppRoutes() {
  return (
    <Routes>

      {/* ======================================================
          PUBLIC
      ======================================================= */}

      <Route
        path="/"
        element={<Home />}
      />

      <Route
        path="/produits"
        element={<Products />}
      />

      <Route
        path="/produits/:id"
        element={<ProductDetails />}
      />

      {/* ------------------------------------------------------
          AVIS DE LA PLATEFORME

          Cette page est publique :
          - consultation des avis
          - note moyenne
          - statistiques

          La création/modification/suppression d'un avis
          reste protégée par l'API backend.
      ------------------------------------------------------- */}

      <Route
        path="/avis-plateforme"
        element={<AvisPlateforme />}
      />


      {/* ======================================================
          AUTHENTIFICATION
      ======================================================= */}

      <Route
        path="/connexion"
        element={<Login />}
      />

      <Route
        path="/mot-de-passe-oublie"
        element={<ForgotPassword />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      <Route
        path="/inscription"
        element={<Register />}
      />


      {/* ======================================================
          ESPACE UTILISATEUR CONNECTÉ
      ======================================================= */}

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profil"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/modifier-profil"
        element={
          <ProtectedRoute>
            <ModifierProfil />
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />


      {/* ======================================================
          MESSAGERIE
      ======================================================= */}

      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        }
      />

      <Route
        path="/messages/:conversationId"
        element={
          <ProtectedRoute>
            <Conversation />
          </ProtectedRoute>
        }
      />


      {/* ======================================================
          ESPACE VENDEUR
      ======================================================= */}

      <Route
        path="/publier"
        element={
          <ProtectedRoute
            role="vendeur"
          >
            <Publish />
          </ProtectedRoute>
        }
      />

      <Route
        path="/mes-annonces"
        element={
          <ProtectedRoute
            role="vendeur"
          >
            <MesAnnonces />
          </ProtectedRoute>
        }
      />

      <Route
        path="/commandes-recues"
        element={
          <ProtectedRoute
            role="vendeur"
          >
            <CommandesRecues />
          </ProtectedRoute>
        }
      />


      {/* ======================================================
          COMMANDES
      ======================================================= */}

      <Route
        path="/commandes"
        element={
          <ProtectedRoute>
            <Orders />
          </ProtectedRoute>
        }
      />

      <Route
        path="/commandes/:id"
        element={
          <ProtectedRoute>
            <OrderDetails />
          </ProtectedRoute>
        }
      />


      {/* ======================================================
          AVIS
      ======================================================= */}

      <Route
        path="/avis"
        element={
          <ProtectedRoute>
            <Avis />
          </ProtectedRoute>
        }
      />


      {/* ======================================================
          INTELLIGENCE ARTIFICIELLE
      ======================================================= */}

      <Route
        path="/ai"
        element={
          <ProtectedRoute>
            <AI />
          </ProtectedRoute>
        }
      />


      {/* ======================================================
          MODÉRATION DES ANNONCES
      ======================================================= */}

      <Route
        path="/moderation"
        element={
          <ProtectedRoute
            roles={[
              "moderateur",
              "admin",
              "administrateur",
            ]}
          >
            <ModerationDashboard />
          </ProtectedRoute>
        }
      />


      {/* ======================================================
          MODÉRATION DES AVIS DE LA PLATEFORME
      ======================================================= */}

      <Route
        path="/moderation/avis-plateforme"
        element={
          <ProtectedRoute
            roles={[
              "moderateur",
              "admin",
              "administrateur",
            ]}
          >
            <ModerationAvisPlateforme />
          </ProtectedRoute>
        }
      />


      {/* ======================================================
          HISTORIQUE DE MODÉRATION
      ======================================================= */}

      <Route
        path="/historique"
        element={
          <ProtectedRoute
            roles={[
              "moderateur",
              "admin",
              "administrateur",
            ]}
          >
            <Historique />
          </ProtectedRoute>
        }
      />


      {/* ======================================================
          ADMINISTRATION
      ======================================================= */}

      <Route
        path="/admin"
        element={
          <ProtectedRoute
            roles={[
              "admin",
              "administrateur",
            ]}
          >
            <AdminDashboard />
          </ProtectedRoute>
        }
      />


      {/* ======================================================
          ERREUR 403
      ======================================================= */}

      <Route
        path="/403"
        element={<ForbiddenPage />}
      />


      {/* ======================================================
          ANCIENNES URLS / REDIRECTIONS
      ======================================================= */}

      <Route
        path="/home"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />


      {/* ======================================================
          404
      ======================================================= */}

      <Route
        path="*"
        element={<NotFoundPage />}
      />

    </Routes>
  );
}

export default AppRoutes;