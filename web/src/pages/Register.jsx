import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import "../styles/pages/register.css";

import { useAuth } from "../context/AuthContext";

// ============================================================
// ICÔNES
// ============================================================

function Icon({ name, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  switch (name) {
    case "user":
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="8"
            r="3.5"
          />
          <path d="M5 20c.8-3.3 3.1-5 7-5s6.2 1.7 7 5" />
        </svg>
      );

    case "phone":
      return (
        <svg {...common}>
          <path d="M7 4h3l1.5 4-2 1.5a14 14 0 0 0 5 5l1.5-2 4 1.5v3c0 .8-.7 1.5-1.5 1.5C11.2 18.5 5.5 12.8 5.5 5.5 5.5 4.7 6.2 4 7 4Z" />
        </svg>
      );

    case "mail":
      return (
        <svg {...common}>
          <rect
            x="3.5"
            y="5"
            width="17"
            height="14"
            rx="2"
          />
          <path d="m5 7 7 5 7-5" />
        </svg>
      );

    case "lock":
      return (
        <svg {...common}>
          <rect
            x="4"
            y="10"
            width="16"
            height="10"
            rx="2"
          />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      );

    case "eye":
      return (
        <svg {...common}>
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
          <circle
            cx="12"
            cy="12"
            r="2.5"
          />
        </svg>
      );

    case "eye-off":
      return (
        <svg {...common}>
          <path d="m3 3 18 18" />
          <path d="M10.7 6.2A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17.7 17.7 0 0 1-3.1 3.7" />
          <path d="M6.6 6.6C4.1 8.3 2.5 12 2.5 12S6 18 12 18c1.2 0 2.3-.2 3.3-.7" />
          <path d="M9.8 9.8a3 3 0 0 0 4.4 4.4" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h13" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

    default:
      return null;
  }
}

// ============================================================
// UTILITAIRE ERREUR
// ============================================================

function extraireMessageErreur(error) {
  if (!error) {
    return "Impossible de créer votre compte.";
  }

  // ----------------------------------------------------------
  // API CLIENT AGROMARKET
  // client.js utilise fetch() et place la réponse
  // serveur dans error.data
  // ----------------------------------------------------------

  const data = error.data;

  if (data?.detail) {
    const detail = data.detail;

    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          return (
            item?.msg ||
            item?.message ||
            "Erreur de validation."
          );
        })
        .join(" ");
    }

    if (typeof detail === "string") {
      return detail;
    }
  }

  // ----------------------------------------------------------
  // COMPATIBILITÉ AXIOS
  // ----------------------------------------------------------

  const axiosDetail =
    error.response?.data?.detail;

  if (axiosDetail) {
    if (Array.isArray(axiosDetail)) {
      return axiosDetail
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          return (
            item?.msg ||
            item?.message ||
            "Erreur de validation."
          );
        })
        .join(" ");
    }

    if (typeof axiosDetail === "string") {
      return axiosDetail;
    }
  }

  // ----------------------------------------------------------
  // ERREUR JAVASCRIPT
  // ----------------------------------------------------------

  if (
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return "Impossible de créer votre compte.";
}

// ============================================================
// UTILITAIRE TÉLÉPHONE
// ============================================================

function normaliserTelephone(value) {
  return String(value || "")
    .replace(/[\s\-().]/g, "")
    .trim();
}

// ============================================================
// PAGE INSCRIPTION
// ============================================================

function Register() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    user,
    register,
    loading: authLoading,
  } = useAuth();

  // ==========================================================
  // FORMULAIRE
  // ==========================================================

  const [form, setForm] = useState({
    nom: "",
    telephone: "",
    email: "",
    mot_de_passe: "",
    confirmation_mot_de_passe: "",
  });

  // ==========================================================
  // ÉTATS UI
  // ==========================================================

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [acceptTerms, setAcceptTerms] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  // ==========================================================
  // REDIRECTION SI DÉJÀ CONNECTÉ
  // ==========================================================

  useEffect(() => {
    if (user && !authLoading) {
      navigate("/", {
        replace: true,
      });
    }
  }, [
    user,
    authLoading,
    navigate,
  ]);

  // ==========================================================
  // GESTION DES CHAMPS
  // ==========================================================

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  // ==========================================================
  // VALIDATION
  // ==========================================================

  const validation = useMemo(() => {
    const errors = {};

    // --------------------------------------------------------
    // NOM
    // --------------------------------------------------------

    const nom = form.nom.trim();

    if (!nom) {
      errors.nom =
        "Le nom est obligatoire.";
    } else if (nom.length < 2) {
      errors.nom =
        "Le nom doit contenir au moins 2 caractères.";
    }

    // --------------------------------------------------------
    // TÉLÉPHONE
    // --------------------------------------------------------

    const telephone =
      form.telephone.trim();

    const telephoneNormalise =
      normaliserTelephone(
        telephone
      );

    if (!telephone) {
      errors.telephone =
        "Le numéro de téléphone est obligatoire.";
    } else if (
      telephoneNormalise.length < 8
    ) {
      errors.telephone =
        "Le numéro de téléphone semble invalide.";
    }

    // --------------------------------------------------------
    // EMAIL
    // --------------------------------------------------------

    const email =
      form.email.trim();

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      errors.email =
        "L'adresse email n'est pas valide.";
    }

    // --------------------------------------------------------
    // MOT DE PASSE
    // --------------------------------------------------------

    const password =
      form.mot_de_passe;

    if (!password) {
      errors.mot_de_passe =
        "Le mot de passe est obligatoire.";
    } else if (
      password.length < 8
    ) {
      errors.mot_de_passe =
        "Le mot de passe doit contenir au moins 8 caractères.";
    } else if (
      !/[a-z]/.test(password)
    ) {
      errors.mot_de_passe =
        "Le mot de passe doit contenir au moins une lettre minuscule.";
    } else if (
      !/[A-Z]/.test(password)
    ) {
      errors.mot_de_passe =
        "Le mot de passe doit contenir au moins une lettre majuscule.";
    } else if (
      !/[0-9]/.test(password)
    ) {
      errors.mot_de_passe =
        "Le mot de passe doit contenir au moins un chiffre.";
    }

    // --------------------------------------------------------
    // CONFIRMATION
    // --------------------------------------------------------

    if (
      !form.confirmation_mot_de_passe
    ) {
      errors.confirmation_mot_de_passe =
        "Veuillez confirmer votre mot de passe.";
    } else if (
      form.confirmation_mot_de_passe !==
      form.mot_de_passe
    ) {
      errors.confirmation_mot_de_passe =
        "Les mots de passe ne correspondent pas.";
    }

    // --------------------------------------------------------
    // CONDITIONS
    // --------------------------------------------------------

    if (!acceptTerms) {
      errors.terms =
        "Vous devez accepter les conditions d'utilisation.";
    }

    return errors;
  }, [
    form,
    acceptTerms,
  ]);

  // ==========================================================
  // SOUMISSION
  // ==========================================================

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    // --------------------------------------------------------
    // VALIDATION CLIENT
    // --------------------------------------------------------

    if (
      Object.keys(validation).length > 0
    ) {
      const firstError =
        Object.values(validation)[0];

      setError(firstError);
      return;
    }

    // --------------------------------------------------------
    // INSCRIPTION
    // --------------------------------------------------------

    try {
      setSubmitting(true);

      /*
       * ------------------------------------------------------
       * DONNÉES ENVOYÉES AU BACKEND
       * ------------------------------------------------------
       *
       * Le backend définit lui-même :
       * - role
       * - statut_compte
       * - google_id
       * - méthode d'authentification
       *
       * Le téléphone est normalisé avant l'envoi.
       */

      const userData = {
        nom:
          form.nom.trim(),

        telephone:
          normaliserTelephone(
            form.telephone
          ),

        email:
          form.email.trim()
            ? form.email.trim()
            : null,

        mot_de_passe:
          form.mot_de_passe,
        confidentialite_acceptee:
          acceptTerms,
      };

      /*
       * ------------------------------------------------------
       * LOG DE DIAGNOSTIC
       * ------------------------------------------------------
       *
       * Le mot de passe n'est jamais affiché.
       */

      console.log(
        "Inscription AgroMarket :",
        {
          ...userData,
          mot_de_passe: "[masqué]",
        }
      );

      /*
       * ------------------------------------------------------
       * APPEL API
       * ------------------------------------------------------
       */

      const response =
        await register(userData);

      console.log(
        "Inscription réussie :",
        response
      );

      // ------------------------------------------------------
      // SUCCÈS
      // ------------------------------------------------------

      setSuccess(
        "Votre compte a été créé avec succès. Redirection vers la connexion..."
      );

      // ------------------------------------------------------
      // REDIRECTION
      // ------------------------------------------------------

      const params =
        new URLSearchParams(
          location.search
        );

      const redirect =
        params.get("redirect");

      const destination =
        redirect &&
        redirect.startsWith("/") &&
        !redirect.startsWith("//")
          ? `/connexion?redirect=${encodeURIComponent(
              redirect
            )}`
          : "/connexion";

      window.setTimeout(() => {
        navigate(
          destination,
          {
            replace: true,
          }
        );
      }, 900);

    } catch (error) {
      console.error(
        "Erreur inscription AgroMarket :",
        error
      );

      setError(
        extraireMessageErreur(
          error
        )
      );

    } finally {
      setSubmitting(false);
    }
  }

  // ==========================================================
  // ÉTAT LOADING
  // ==========================================================

  const loading =
    submitting ||
    authLoading;

  // ==========================================================
  // FORCE DU MOT DE PASSE
  // ==========================================================

  const passwordChecks = {
    length:
      form.mot_de_passe.length >= 8,

    lowercase:
      /[a-z]/.test(
        form.mot_de_passe
      ),

    uppercase:
      /[A-Z]/.test(
        form.mot_de_passe
      ),

    number:
      /[0-9]/.test(
        form.mot_de_passe
      ),
  };

  // ==========================================================
  // RENDU
  // ==========================================================

  return (
    <main className="page auth-page">

      <section className="auth-layout">

        {/* ==================================================
            PRÉSENTATION
        =================================================== */}

        <div className="auth-presentation">

          <div className="auth-presentation-content">

            <Link
              to="/"
              className="auth-brand"
            >

              <div className="auth-brand-logo">

                <img
                  src="/logo-agromarket.png"
                  alt="AgroMarket Burkina Faso"
                />

              </div>

              <div>
                <strong>
                  AgroMarket
                </strong>

                <span>
                  Burkina Faso
                </span>
              </div>

            </Link>

            <div className="auth-presentation-copy">

              <span className="section-eyebrow">
                Rejoignez AgroMarket
              </span>

              <h1>
                Construisons ensemble
                <span>
                  le marché agricole.
                </span>
              </h1>

              <p>
                Créez votre compte gratuitement
                et accédez à un espace pensé pour
                faciliter vos échanges agricoles
                au Burkina Faso.
              </p>

            </div>

            <div className="auth-presentation-features">

              {/* ------------------------------------------------
                  AVANTAGE 1
              ------------------------------------------------- */}

              <div className="auth-feature">

                <div className="auth-feature-icon">

                  <Icon
                    name="check"
                    size={20}
                  />

                </div>

                <div>

                  <strong>
                    Inscription simple
                  </strong>

                  <span>
                    Quelques informations suffisent
                    pour créer votre compte.
                  </span>

                </div>

              </div>

              {/* ------------------------------------------------
                  AVANTAGE 2
              ------------------------------------------------- */}

              <div className="auth-feature">

                <div className="auth-feature-icon">

                  <Icon
                    name="user"
                    size={20}
                  />

                </div>

                <div>

                  <strong>
                    Un espace personnel
                  </strong>

                  <span>
                    Gérez vos activités depuis
                    votre espace AgroMarket.
                  </span>

                </div>

              </div>

            </div>

          </div>

          <div className="auth-presentation-footer">
            🇧🇫 Une plateforme pensée pour
            le Burkina Faso.
          </div>

        </div>

        {/* ==================================================
            FORMULAIRE
        =================================================== */}

        <div className="auth-form-area">

          <div className="auth-form-wrapper">

            {/* ------------------------------------------------
                HEADER
            ------------------------------------------------- */}

            <div className="auth-form-header">

              <span className="auth-mobile-eyebrow">
                AgroMarket Burkina
              </span>

              <h2>
                Créer votre compte
              </h2>

              <p>
                Commencez votre expérience
                AgroMarket en quelques étapes.
              </p>

            </div>

            {/* ------------------------------------------------
                ERREUR
            ------------------------------------------------- */}

            {error && (
              <div
                className="alert alert-danger auth-alert"
                role="alert"
              >

                <strong>
                  Inscription impossible
                </strong>

                <span>
                  {error}
                </span>

              </div>
            )}

            {/* ------------------------------------------------
                SUCCÈS
            ------------------------------------------------- */}

            {success && (
              <div
                className="alert alert-success auth-alert"
                role="status"
              >
                {success}
              </div>
            )}

            {/* =================================================
                FORM
            ================================================== */}

            <form
              className="auth-form"
              onSubmit={handleSubmit}
              noValidate
            >

              {/* =================================================
                  NOM
              ================================================== */}

              <div className="form-group">

                <label
                  htmlFor="nom"
                  className="form-label"
                >
                  Nom
                </label>

                <div className="auth-input-wrapper">

                  <span className="auth-input-icon">

                    <Icon
                      name="user"
                      size={18}
                    />

                  </span>

                  <input
                    id="nom"
                    name="nom"
                    type="text"
                    value={form.nom}
                    onChange={handleChange}
                    className="form-input auth-input"
                    placeholder="Votre nom"
                    autoComplete="name"
                    maxLength={100}
                    disabled={loading}
                    required
                  />

                </div>

              </div>

              {/* =================================================
                  TÉLÉPHONE
              ================================================== */}

              <div className="form-group">

                <label
                  htmlFor="telephone"
                  className="form-label"
                >
                  Numéro de téléphone
                </label>

                <div className="auth-input-wrapper">

                  <span className="auth-input-icon">

                    <Icon
                      name="phone"
                      size={18}
                    />

                  </span>

                  <input
                    id="telephone"
                    name="telephone"
                    type="tel"
                    value={form.telephone}
                    onChange={handleChange}
                    className="form-input auth-input"
                    placeholder="Ex. : 70 00 00 00"
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength={20}
                    disabled={loading}
                    required
                  />

                </div>

              </div>

              {/* =================================================
                  EMAIL
              ================================================== */}

              <div className="form-group">

                <label
                  htmlFor="email"
                  className="form-label"
                >
                  Adresse email

                  <span className="text-muted">
                    {" "}
                    (facultatif)
                  </span>

                </label>

                <div className="auth-input-wrapper">

                  <span className="auth-input-icon">

                    <Icon
                      name="mail"
                      size={18}
                    />

                  </span>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    className="form-input auth-input"
                    placeholder="vous@exemple.com"
                    autoComplete="email"
                    maxLength={150}
                    disabled={loading}
                  />

                </div>

              </div>

              {/* =================================================
                  MOT DE PASSE
              ================================================== */}

              <div className="form-group">

                <label
                  htmlFor="mot_de_passe"
                  className="form-label"
                >
                  Mot de passe
                </label>

                <div className="auth-input-wrapper">

                  <span className="auth-input-icon">

                    <Icon
                      name="lock"
                      size={18}
                    />

                  </span>

                  <input
                    id="mot_de_passe"
                    name="mot_de_passe"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      form.mot_de_passe
                    }
                    onChange={handleChange}
                    className="form-input auth-input auth-password-input"
                    placeholder="Choisissez un mot de passe"
                    autoComplete="new-password"
                    maxLength={128}
                    disabled={loading}
                    required
                  />

                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                    disabled={loading}
                  >

                    <Icon
                      name={
                        showPassword
                          ? "eye-off"
                          : "eye"
                      }
                      size={18}
                    />

                  </button>

                </div>

                {/* ------------------------------------------------
                    EXIGENCES
                ------------------------------------------------- */}

                <div className="password-requirements">

                  <span
                    className={
                      passwordChecks.length
                        ? "valid"
                        : ""
                    }
                  >
                    {passwordChecks.length
                      ? "✓"
                      : "○"}{" "}
                    8 caractères minimum
                  </span>

                  <span
                    className={
                      passwordChecks.lowercase
                        ? "valid"
                        : ""
                    }
                  >
                    {passwordChecks.lowercase
                      ? "✓"
                      : "○"}{" "}
                    Une lettre minuscule
                  </span>

                  <span
                    className={
                      passwordChecks.uppercase
                        ? "valid"
                        : ""
                    }
                  >
                    {passwordChecks.uppercase
                      ? "✓"
                      : "○"}{" "}
                    Une lettre majuscule
                  </span>

                  <span
                    className={
                      passwordChecks.number
                        ? "valid"
                        : ""
                    }
                  >
                    {passwordChecks.number
                      ? "✓"
                      : "○"}{" "}
                    Un chiffre
                  </span>

                </div>

              </div>

              {/* =================================================
                  CONFIRMATION
              ================================================== */}

              <div className="form-group">

                <label
                  htmlFor="confirmation_mot_de_passe"
                  className="form-label"
                >
                  Confirmer le mot de passe
                </label>

                <div className="auth-input-wrapper">

                  <span className="auth-input-icon">

                    <Icon
                      name="lock"
                      size={18}
                    />

                  </span>

                  <input
                    id="confirmation_mot_de_passe"
                    name="confirmation_mot_de_passe"
                    type={
                      showConfirmation
                        ? "text"
                        : "password"
                    }
                    value={
                      form.confirmation_mot_de_passe
                    }
                    onChange={handleChange}
                    className="form-input auth-input auth-password-input"
                    placeholder="Confirmez votre mot de passe"
                    autoComplete="new-password"
                    maxLength={128}
                    disabled={loading}
                    required
                  />

                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() =>
                      setShowConfirmation(
                        (current) =>
                          !current
                      )
                    }
                    aria-label={
                      showConfirmation
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                    disabled={loading}
                  >

                    <Icon
                      name={
                        showConfirmation
                          ? "eye-off"
                          : "eye"
                      }
                      size={18}
                    />

                  </button>

                </div>

              </div>

              {/* =================================================
                  CONDITIONS
              ================================================== */}

              <label className="auth-checkbox auth-terms">

                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(event) =>
                    setAcceptTerms(
                      event.target.checked
                    )
                  }
                  disabled={loading}
                  required
                />

                <span>

                  J'accepte les{" "}

                  <Link
                    to="/conditions"
                    target="_blank"
                    rel="noreferrer"
                  >
                    conditions d'utilisation
                  </Link>

                  {" "}et la{" "}

                  <Link
                    to="/confidentialite"
                    target="_blank"
                    rel="noreferrer"
                  >
                    politique de confidentialité
                  </Link>

                  .

                </span>

              </label>

              {/* =================================================
                  INFORMATION COMPTE
              ================================================== */}

              <div className="alert alert-info">

                <span>
                  Votre inscription crée automatiquement
                  un compte acheteur. Vous pourrez ensuite
                  effectuer une demande pour devenir vendeur.
                </span>

              </div>

              {/* =================================================
                  BOUTON
              ================================================== */}

              <button
                type="submit"
                className="btn btn-primary btn-lg auth-submit"
                disabled={loading}
              >

                {loading ? (
                  <>
                    <span className="spinner spinner-sm"></span>
                    Création du compte...
                  </>
                ) : (
                  <>
                    Créer mon compte

                    <Icon
                      name="arrow"
                      size={18}
                    />

                  </>
                )}

              </button>

            </form>

            {/* =================================================
                CONNEXION
            ================================================== */}

            <div className="auth-register">

              <span>
                Vous avez déjà un compte ?
              </span>

              <Link to="/connexion">

                Se connecter

                <Icon
                  name="arrow"
                  size={15}
                />

              </Link>

            </div>

            {/* =================================================
                RETOUR
            ================================================== */}

            <Link
              to="/"
              className="auth-back-home"
            >
              ← Retour à l'accueil
            </Link>

          </div>

        </div>

      </section>

    </main>
  );
}

export default Register;