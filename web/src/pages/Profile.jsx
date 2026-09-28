
// src/pages/Profile.jsx

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  Navigate,
  useNavigate,
} from "react-router-dom";
import "../styles/pages/profile.css";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api/client";
import { getImageUrl } from "../utils/media";


// ============================================================
// CONSTANTES
// ============================================================

const ROLE_LABELS = {
  acheteur: "Acheteur",
  vendeur: "Vendeur",
  moderateur: "Modérateur",
  admin: "Administrateur",
  administrateur: "Administrateur",
};

const STATUS_LABELS = {
  actif: "Actif",
  en_attente: "En attente",
  bloque: "Bloqué",
  suspendu: "Suspendu",
};


// ============================================================
// ICÔNES
// ============================================================

function Icon({ name, size = 20 }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (name === "user") {
    return (
      <svg {...props}>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 21c.7-4.2 3-6.5 7-6.5s6.3 2.3 7 6.5" />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg {...props}>
        <path d="M6.5 3h3l1.5 4-2 1.7a14 14 0 0 0 6.3 6.3L17 13l4 1.5v3A2.5 2.5 0 0 1 18.5 20C10.5 20 4 13.5 4 5.5A2.5 2.5 0 0 1 6.5 3Z" />
      </svg>
    );
  }

  if (name === "mail") {
    return (
      <svg {...props}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    );
  }

  if (name === "location") {
    return (
      <svg {...props}>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg {...props}>
        <path d="M12 3 20 6v5c0 5-3.2 8.6-8 10-4.8-1.4-8-5-8-10V6l8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  if (name === "store") {
    return (
      <svg {...props}>
        <path d="M3 10 5 4h14l2 6" />
        <path d="M5 10v9h14v-9" />
        <path d="M8 19v-5h8v5" />
      </svg>
    );
  }

  if (name === "edit") {
    return (
      <svg {...props}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...props}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "refresh") {
    return (
      <svg {...props}>
        <path d="M20 11a8 8 0 0 0-14.7-4L4 9" />
        <path d="M4 4v5h5" />
        <path d="M4 13a8 8 0 0 0 14.7 4L20 15" />
        <path d="M20 20v-5h-5" />
      </svg>
    );
  }

  if (name === "logout") {
    return (
      <svg {...props}>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M21 4v16" />
      </svg>
    );
  }

  return null;
}


// ============================================================
// OUTILS
// ============================================================

function getInitials(name) {
  if (!name) {
    return "A";
  }

  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[1][0]
  ).toUpperCase();
}


function formatDate(value) {
  if (!value) {
    return "Non disponible";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Non disponible";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}


// ============================================================
// PAGE PROFIL
// ============================================================

function Profile() {
  const {
    isAuthenticated,
    logout,
  } = useAuth();

  const navigate = useNavigate();

  const [
    profile,
    setProfile,
  ] = useState(null);

  const [
    sellerRequest,
    setSellerRequest,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  // ==========================================================
  // CHARGER LE PROFIL
  // ==========================================================

  const loadProfile = useCallback(
    async ({
      initial = false,
    } = {}) => {
      try {
        if (initial) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setError("");
        setSuccess("");

        const data = await apiRequest(
          "/users/me",
          {
            method: "GET",
          }
        );

        setProfile(data);

        // ------------------------------------------------------
        // DEMANDE VENDEUR
        // Uniquement pour un utilisateur acheteur.
        // ------------------------------------------------------

        if (data?.role === "acheteur") {
          try {
            const demande = await apiRequest(
              "/users/me/demande-vendeur",
              {
                method: "GET",
              }
            );

            setSellerRequest(
              demande || null
            );
          } catch (err) {
            /*
             * Une absence de demande vendeur ne doit pas
             * empêcher l'affichage du profil.
             */
            console.warn(
              "Impossible de récupérer la demande vendeur :",
              err
            );

            setSellerRequest(null);
          }
        } else {
          setSellerRequest(null);
        }
      } catch (err) {
        console.error(
          "Erreur profil :",
          err
        );

        setError(
          err?.message ||
          "Impossible de charger votre profil."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );


  // ==========================================================
  // CHARGEMENT INITIAL
  // ==========================================================

  useEffect(() => {
    if (isAuthenticated === false) {
      setLoading(false);
      return;
    }

    loadProfile({
      initial: true,
    });
  }, [
    isAuthenticated,
    loadProfile,
  ]);


  // ==========================================================
  // DEMANDE DE STATUT VENDEUR
  // ==========================================================

  async function demanderStatutVendeur() {
    if (profile?.role !== "acheteur") {
      return;
    }

    if (sellerRequest?.statut === "en_attente") {
      return;
    }

    const confirm = window.confirm(
      "Voulez-vous envoyer une demande pour devenir vendeur ?"
    );

    if (!confirm) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const data = await apiRequest(
        "/users/me/demande-vendeur",
        {
          method: "POST",
        }
      );

      setSellerRequest(data);

      setSuccess(
        "Votre demande vendeur a été envoyée."
      );
    } catch (err) {
      console.error(
        "Erreur demande vendeur :",
        err
      );

      setError(
        err?.message ||
        "Impossible d'envoyer la demande vendeur."
      );
    }
  }


  // ==========================================================
  // DÉCONNEXION
  // ==========================================================

  async function handleLogout() {
    try {
      if (typeof logout === "function") {
        await logout();
      }
    } catch (err) {
      console.error(
        "Erreur logout :",
        err
      );
    } finally {
      navigate(
        "/connexion",
        {
          replace: true,
        }
      );
    }
  }


  // ==========================================================
  // CALCUL DE LA COMPLÉTUDE
  // ==========================================================

  const completion = useMemo(() => {
    if (!profile) {
      return 0;
    }

    const fields = [
      profile.nom,
      profile.telephone,
      profile.email,
      profile.adresse,
      profile.description,
    ];

    const remplis = fields.filter(
      (value) =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
    ).length;

    return Math.round(
      (remplis / fields.length) * 100
    );
  }, [profile]);


  // ==========================================================
  // REDIRECTION SI NON AUTHENTIFIÉ
  // ==========================================================

  if (
    !isAuthenticated &&
    !loading
  ) {
    return (
      <Navigate
        to="/connexion"
        replace
      />
    );
  }


  // ==========================================================
  // CHARGEMENT
  // ==========================================================

  if (loading) {
    return (
      <main className="profile-page">
        <div className="profile-loading">
          <div className="profile-loading-spinner" />

          <h1>
            Chargement du profil...
          </h1>

          <p>
            Récupération de vos informations.
          </p>
        </div>
      </main>
    );
  }


  // ==========================================================
  // DONNÉES D'AFFICHAGE
  // ==========================================================

  const displayName =
    profile?.nom ||
    "Utilisateur AgroMarket";

  const role =
    profile?.role ||
    "acheteur";

  const photoUrl =
    getImageUrl(
      profile?.photo_profil
    );

  const initials =
    getInitials(
      displayName
    );


  // ==========================================================
  // RENDU
  // ==========================================================

  return (
    <main className="profile-page">

      {/* ====================================================
          HERO
      ===================================================== */}

      <section className="profile-hero">
        <div className="profile-hero-inner">

          <div>
            <span className="profile-eyebrow">
              ESPACE PERSONNEL
            </span>

            <h1>
              Mon profil
            </h1>

            <p>
              Gérez vos informations personnelles,
              votre sécurité et votre localisation.
            </p>
          </div>

          <button
            type="button"
            className="profile-refresh-button"
            onClick={() => loadProfile()}
            disabled={refreshing}
          >
            <Icon
              name="refresh"
              size={17}
            />

            {refreshing
              ? "Actualisation..."
              : "Actualiser"}
          </button>

        </div>
      </section>


      <div className="profile-container">

        {/* ==================================================
            ALERTES
        =================================================== */}

        {error && (
          <div className="profile-alert profile-alert-error">
            <strong>
              Erreur
            </strong>

            <span>
              {error}
            </span>
          </div>
        )}

        {success && (
          <div className="profile-alert profile-alert-success">
            <Icon
              name="check"
              size={18}
            />

            <span>
              {success}
            </span>
          </div>
        )}


        {/* ==================================================
            CARTE PRINCIPALE
        =================================================== */}

        <section className="profile-main-card">

          <div className="profile-identity">

            <div className="profile-avatar">

              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={`Photo de profil de ${displayName}`}
                />
              ) : (
                <span>
                  {initials}
                </span>
              )}

            </div>

            <div className="profile-identity-content">

              <h2>
                {displayName}
              </h2>

              <div className="profile-badges">

                <span className="profile-role-badge">
                  {
                    ROLE_LABELS[role] ||
                    role
                  }
                </span>

                <span className="profile-status-badge">
                  <i />

                  {
                    STATUS_LABELS[
                      profile?.statut_compte
                    ] ||
                    profile?.statut_compte ||
                    "Non disponible"
                  }
                </span>

              </div>

            </div>

          </div>

          <Link
            to="/modifier-profil"
            className="profile-edit-button"
          >
            <Icon
              name="edit"
              size={17}
            />

            Modifier mon profil
          </Link>

        </section>


        {/* ==================================================
            GRILLE
        =================================================== */}

        <section className="profile-grid">

          {/* =================================================
              INFORMATIONS PERSONNELLES
          ================================================= */}

          <article className="profile-card">

            <div className="profile-card-header">

              <div className="profile-card-title">

                <div className="profile-card-icon">
                  <Icon
                    name="user"
                    size={19}
                  />
                </div>

                <div>
                  <span>
                    IDENTITÉ
                  </span>

                  <h2>
                    Informations personnelles
                  </h2>
                </div>

              </div>

              <Link
                to="/modifier-profil"
                className="profile-card-link"
              >
                Modifier
              </Link>

            </div>


            <div className="profile-info-list">

              <div className="profile-info-row">

                <Icon
                  name="user"
                  size={18}
                />

                <div>
                  <span>
                    Nom
                  </span>

                  <strong>
                    {profile?.nom ||
                      "Non renseigné"}
                  </strong>
                </div>

              </div>


              <div className="profile-info-row">

                <Icon
                  name="phone"
                  size={18}
                />

                <div>
                  <span>
                    Téléphone
                  </span>

                  <strong>
                    {profile?.telephone ||
                      "Non renseigné"}
                  </strong>
                </div>

                <span
                  className={
                    profile?.telephone_verifie
                      ? "profile-verified"
                      : "profile-unverified"
                  }
                >
                  {
                    profile?.telephone_verifie
                      ? "Vérifié"
                      : "Non vérifié"
                  }
                </span>

              </div>


              <div className="profile-info-row">

                <Icon
                  name="mail"
                  size={18}
                />

                <div>
                  <span>
                    Email
                  </span>

                  <strong>
                    {profile?.email ||
                      "Non renseigné"}
                  </strong>
                </div>

                <span
                  className={
                    profile?.email_verifie
                      ? "profile-verified"
                      : "profile-unverified"
                  }
                >
                  {
                    profile?.email_verifie
                      ? "Vérifié"
                      : "Non vérifié"
                  }
                </span>

              </div>


              <div className="profile-info-row">

                <Icon
                  name="location"
                  size={18}
                />

                <div>
                  <span>
                    Adresse
                  </span>

                  <strong>
                    {profile?.adresse ||
                      "Non renseignée"}
                  </strong>
                </div>

              </div>

            </div>

          </article>


          {/* =================================================
              SÉCURITÉ
          ================================================= */}

          <article className="profile-card">

            <div className="profile-card-header">

              <div className="profile-card-title">

                <div className="profile-card-icon">
                  <Icon
                    name="shield"
                    size={19}
                  />
                </div>

                <div>
                  <span>
                    SÉCURITÉ
                  </span>

                  <h2>
                    Sécurité du compte
                  </h2>
                </div>

              </div>

            </div>


            <div className="profile-security-list">

              <div className="profile-security-row">

                <div>
                  <strong>
                    Connexion
                  </strong>

                  <span>
                    {
                      profile?.methode_authentification ===
                      "google"
                        ? "Compte Google"
                        : profile?.methode_authentification ===
                          "hybride"
                        ? "Google + mot de passe"
                        : "Téléphone + mot de passe"
                    }
                  </span>
                </div>

              </div>


              <div className="profile-security-row">

                <div>
                  <strong>
                    Mot de passe
                  </strong>

                  <span>
                    {
                      profile?.mot_de_passe_defini
                        ? "Mot de passe configuré"
                        : "Aucun mot de passe local"
                    }
                  </span>
                </div>

                <Link
                  to="/modifier-profil"
                  className="profile-small-link"
                >
                  Gérer
                </Link>

              </div>


              <div className="profile-security-row">

                <div>
                  <strong>
                    Statut du compte
                  </strong>

                  <span>
                    {
                      STATUS_LABELS[
                        profile?.statut_compte
                      ] ||
                      profile?.statut_compte ||
                      "Non disponible"
                    }
                  </span>
                </div>

                <Icon
                  name="check"
                  size={18}
                />

              </div>

            </div>

          </article>


          {/* =================================================
              LOCALISATION
          ================================================= */}

          <article className="profile-card">

            <div className="profile-card-header">

              <div className="profile-card-title">

                <div className="profile-card-icon">
                  <Icon
                    name="location"
                    size={19}
                  />
                </div>

                <div>
                  <span>
                    LOCALISATION
                  </span>

                  <h2>
                    Ma localisation
                  </h2>
                </div>

              </div>

              <Link
                to="/modifier-profil"
                className="profile-card-link"
              >
                Modifier
              </Link>

            </div>


            <div className="profile-location-content">

              <div className="profile-location-address">

                <Icon
                  name="location"
                  size={22}
                />

                <div>

                  <strong>
                    {
                      profile?.adresse ||
                      "Localisation non renseignée"
                    }
                  </strong>

                  <span>
                    Source :{" "}
                    {
                      profile?.localisation_source ||
                      "inconnue"
                    }
                  </span>

                </div>

              </div>


              {/* ------------------------------------------------
                  IMPORTANT :
                  Les coordonnées GPS précises ne sont pas
                  affichées dans le profil.
                  Elles restent des données sensibles.
              ------------------------------------------------- */}

              {(profile?.latitude != null &&
                profile?.longitude != null) && (
                <div className="profile-location-private">

                  <Icon
                    name="shield"
                    size={18}
                  />

                  <div>
                    <strong>
                      Coordonnées GPS enregistrées
                    </strong>

                    <span>
                      Vos coordonnées précises sont protégées
                      et ne sont pas affichées publiquement.
                    </span>
                  </div>

                </div>
              )}

            </div>

          </article>


          {/* =================================================
              DESCRIPTION
          ================================================= */}

          <article className="profile-card">

            <div className="profile-card-header">

              <div className="profile-card-title">

                <div className="profile-card-icon">
                  <Icon
                    name="user"
                    size={19}
                  />
                </div>

                <div>
                  <span>
                    PRÉSENTATION
                  </span>

                  <h2>
                    À propos de moi
                  </h2>
                </div>

              </div>

            </div>


            <div className="profile-description-content">

              <p>
                {profile?.description ||
                  "Aucune description ajoutée pour le moment."}
              </p>

              <Link
                to="/modifier-profil"
                className="profile-card-action"
              >
                Modifier ma présentation
              </Link>

            </div>

          </article>

        </section>


        {/* ==================================================
            COMPLÉTUDE
        =================================================== */}

        <section className="profile-completion-card">

          <div className="profile-completion-header">

            <div>

              <span>
                VOTRE PROFIL
              </span>

              <h2>
                Niveau de complétude
              </h2>

              <p>
                Complétez vos informations pour profiter
                pleinement d'AgroMarket Burkina.
              </p>

            </div>

            <strong>
              {completion}%
            </strong>

          </div>


          <div className="profile-progress">

            <div
              className="profile-progress-bar"
              style={{
                width: `${completion}%`,
              }}
            />

          </div>


          {completion < 100 && (
            <Link
              to="/modifier-profil"
              className="profile-completion-link"
            >
              Compléter mon profil
            </Link>
          )}

        </section>


        {/* ==================================================
            ESPACE VENDEUR
        =================================================== */}

        {role === "acheteur" && (
          <section className="profile-seller-card">

            <div className="profile-seller-icon">

              <Icon
                name="store"
                size={25}
              />

            </div>


            <div className="profile-seller-content">

              <span>
                ESPACE VENDEUR
              </span>

              <h2>
                Vendez vos produits sur AgroMarket
              </h2>

              <p>
                Envoyez une demande pour obtenir
                le statut vendeur.
              </p>


              {sellerRequest?.statut ===
              "en_attente" ? (

                <div className="profile-request-status">

                  <Icon
                    name="clock"
                    size={17}
                  />

                  Demande en cours d'examen

                </div>

              ) : sellerRequest?.statut ===
                "acceptee" ? (

                <div className="profile-request-status">

                  <Icon
                    name="check"
                    size={17}
                  />

                  Demande acceptée

                </div>

              ) : (

                <button
                  type="button"
                  className="profile-seller-button"
                  onClick={
                    demanderStatutVendeur
                  }
                >

                  <Icon
                    name="store"
                    size={17}
                  />

                  Demander le statut vendeur

                </button>

              )}

            </div>

          </section>
        )}


        {/* ==================================================
            DATES
        =================================================== */}

        <section className="profile-meta-card">

          <div>

            <span>
              Membre depuis
            </span>

            <strong>
              {
                formatDate(
                  profile?.date_creation
                )
              }
            </strong>

          </div>


          <div>

            <span>
              Dernière modification
            </span>

            <strong>
              {
                formatDate(
                  profile?.date_modification
                )
              }
            </strong>

          </div>


          <div>

            <span>
              Dernière connexion
            </span>

            <strong>
              {
                formatDate(
                  profile?.dernier_login
                )
              }
            </strong>

          </div>

        </section>


        {/* ==================================================
            DÉCONNEXION
        =================================================== */}

        <section className="profile-bottom-actions">

          <button
            type="button"
            className="profile-logout-button"
            onClick={
              handleLogout
            }
          >

            <Icon
              name="logout"
              size={18}
            />

            Se déconnecter

          </button>

        </section>

      </div>

    </main>
  );
}


export default Profile;
