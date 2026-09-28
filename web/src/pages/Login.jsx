// ============================================================
// AGROMARKET BURKINA
// PAGE CONNEXION
// Version professionnelle
// ============================================================

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import "../styles/pages/login.css";
import { useAuth } from "../context/AuthContext";


// ============================================================
// ICÔNES
// ============================================================

function Icon({
  name,
  size = 20,
}) {
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

    case "phone":
      return (
        <svg {...common}>
          <path d="M7 3.8h3l1.4 4-1.9 1.5a14.2 14.2 0 0 0 5.2 5.2l1.5-1.9 4 1.4v3c0 .9-.7 1.6-1.6 1.6C11.1 18.6 5.4 12.9 5.4 6.4c0-.9.7-1.6 1.6-1.6Z" />
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
          <path
            d="M8 10V7a4 4 0 0 1 8 0v3"
          />
        </svg>
      );

    case "eye":
      return (
        <svg {...common}>
          <path
            d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
          />
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
          <path
            d="M10.6 6.2A10 10 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.2 3.8"
          />
          <path
            d="M6.5 6.6C4 8.4 2.5 12 2.5 12S6 18 12 18c1.2 0 2.3-.2 3.3-.7"
          />
          <path
            d="M9.8 9.8a3 3 0 0 0 4.4 4.4"
          />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h13" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 19 6v5c0 4.7-2.8 7.9-7 10-4.2-2.1-7-5.3-7-10V6l7-3Z" />
          <path d="m9.5 12 1.7 1.7 3.6-3.6" />
        </svg>
      );

    case "user":
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="8"
            r="3.5"
          />
          <path
            d="M5 20c.8-3.3 3.1-5 7-5s6.2 1.7 7 5"
          />
        </svg>
      );

    case "market":
      return (
        <svg {...common}>
          <path d="M4 10h16" />
          <path d="M5 10v9h14v-9" />
          <path d="M3 10 5 4h14l2 6" />
          <path d="M9 19v-5h6v5" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "info":
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="12"
            r="9"
          />
          <path d="M12 10v6" />
          <path d="M12 7h.01" />
        </svg>
      );

    case "close":
      return (
        <svg {...common}>
          <path d="m6 6 12 12" />
          <path d="m18 6-12 12" />
        </svg>
      );

    default:
      return null;
  }
}


// ============================================================
// REDIRECTION
// ============================================================

function getRedirectPath(location) {
  const params =
    new URLSearchParams(
      location.search
    );

  const redirect =
    params.get("redirect");

  if (
    redirect &&
    redirect.startsWith("/")
  ) {
    return redirect;
  }

  return "/";
}


// ============================================================
// PAGE CONNEXION
// ============================================================

function Login() {

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const {
    user,
    login,
    loading: authLoading,
  } = useAuth();


  // ==========================================================
  // ÉTATS
  // ==========================================================

  const [
    telephone,
    setTelephone,
  ] = useState("");

  const [
    motDePasse,
    setMotDePasse,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    rememberMe,
    setRememberMe,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    touched,
    setTouched,
  ] = useState({
    telephone: false,
    motDePasse: false,
  });


  const isLoading =
    submitting ||
    authLoading;


  // ==========================================================
  // REDIRECTION
  // ==========================================================

  const redirectPath =
    useMemo(
      () =>
        getRedirectPath(
          location
        ),
      [location]
    );


  useEffect(() => {

    if (
      user &&
      !authLoading
    ) {
      navigate(
        redirectPath,
        {
          replace: true,
        }
      );
    }

  }, [
    user,
    authLoading,
    redirectPath,
    navigate,
  ]);


  // ==========================================================
  // VALIDATION TÉLÉPHONE
  // ==========================================================

  function validateTelephone(
    value
  ) {

    const phone =
      value.trim();

    if (!phone) {
      return (
        "Veuillez saisir votre numéro de téléphone."
      );
    }

    if (phone.length < 8) {
      return (
        "Le numéro de téléphone semble incomplet."
      );
    }

    return "";
  }


  // ==========================================================
  // VALIDATION MOT DE PASSE
  // ==========================================================

  function validatePassword(
    value
  ) {

    if (!value) {
      return (
        "Veuillez saisir votre mot de passe."
      );
    }

    if (value.length < 8) {
      return (
        "Le mot de passe doit contenir au moins 8 caractères."
      );
    }

    return "";
  }


  // ==========================================================
  // VALIDATION FORMULAIRE
  // ==========================================================

  function validateForm() {

    const phoneError =
      validateTelephone(
        telephone
      );

    if (phoneError) {
      return phoneError;
    }

    const passwordError =
      validatePassword(
        motDePasse
      );

    if (passwordError) {
      return passwordError;
    }

    return "";
  }


  // ==========================================================
  // CONNEXION
  // ==========================================================

  async function handleSubmit(
    event
  ) {

    event.preventDefault();

    setError("");
    setSuccess("");

    setTouched({
      telephone: true,
      motDePasse: true,
    });

    const validationError =
      validateForm();

    if (validationError) {
      setError(
        validationError
      );
      return;
    }

    try {

      setSubmitting(true);

      await login({
        telephone:
          telephone.trim(),
        mot_de_passe:
          motDePasse,
      });

      setSuccess(
        "Connexion réussie."
      );

      navigate(
        redirectPath,
        {
          replace: true,
        }
      );

    } catch (err) {

      console.error(
        "Erreur de connexion :",
        err
      );

      let message =
        "Impossible de vous connecter. Vérifiez vos identifiants.";

      if (err?.message) {
        message =
          err.message;
      }

      setError(message);

    } finally {

      setSubmitting(false);

    }
  }


  // ==========================================================
  // BLUR
  // ==========================================================

  function handleBlur(
    field
  ) {

    setTouched(
      (current) => ({
        ...current,
        [field]: true,
      })
    );
  }


  // ==========================================================
  // TÉLÉPHONE
  // ==========================================================

  function handleTelephoneChange(
    event
  ) {

    setTelephone(
      event.target.value
    );

    if (error) {
      setError("");
    }
  }


  // ==========================================================
  // MOT DE PASSE
  // ==========================================================

  function handlePasswordChange(
    event
  ) {

    setMotDePasse(
      event.target.value
    );

    if (error) {
      setError("");
    }
  }


  // ==========================================================
  // ERREURS CHAMPS
  // ==========================================================

  const telephoneError =
    touched.telephone
      ? validateTelephone(
          telephone
        )
      : "";

  const passwordError =
    touched.motDePasse
      ? validatePassword(
          motDePasse
        )
      : "";


  // ==========================================================
  // UTILISATEUR DÉJÀ CONNECTÉ
  // ==========================================================

  if (
    user &&
    !authLoading
  ) {
    return (
      <Navigate
        to={redirectPath}
        replace
      />
    );
  }


  // ==========================================================
  // AFFICHAGE
  // ==========================================================

  return (
    <main className="page auth-page login-page">

      <section className="auth-layout">

        {/* ==================================================
            PRÉSENTATION
        =================================================== */}

        <aside className="auth-presentation login-presentation">

          <div className="auth-presentation-content">

            <Link
              to="/"
              className="auth-brand"
              aria-label="Retour à l'accueil AgroMarket"
            >

              <div className="auth-brand-logo">

                <img
                  src="/logo-agromarket.png"
                  alt="Logo AgroMarket Burkina"
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
                AGROMARKET BURKINA
              </span>

              <h1>
                Votre marché agricole,
                <span>
                  toujours à portée de main.
                </span>
              </h1>

              <p>
                Connectez-vous pour retrouver
                vos produits, vos commandes,
                vos annonces et votre espace personnel.
              </p>

            </div>


            <div className="auth-presentation-features">

              <div className="auth-feature">

                <div className="auth-feature-icon">
                  <Icon
                    name="shield"
                    size={20}
                  />
                </div>

                <div>

                  <strong>
                    Plateforme sécurisée
                  </strong>

                  <span>
                    Vos informations sont protégées
                    et votre accès est contrôlé.
                  </span>

                </div>

              </div>


              <div className="auth-feature">

                <div className="auth-feature-icon">
                  <Icon
                    name="market"
                    size={20}
                  />
                </div>

                <div>

                  <strong>
                    Un marché agricole local
                  </strong>

                  <span>
                    Découvrez les produits proposés
                    partout au Burkina Faso.
                  </span>

                </div>

              </div>


              <div className="auth-feature">

                <div className="auth-feature-icon">
                  <Icon
                    name="user"
                    size={20}
                  />
                </div>

                <div>

                  <strong>
                    Un espace adapté à votre rôle
                  </strong>

                  <span>
                    Acheteur, vendeur, modérateur
                    ou administrateur.
                  </span>

                </div>

              </div>

            </div>

          </div>


          <div className="auth-presentation-footer">

            <span>
              🇧🇫
            </span>

            Une plateforme pensée pour
            le Burkina Faso.

          </div>

        </aside>


        {/* ==================================================
            FORMULAIRE
        =================================================== */}

        <section className="auth-form-area login-form-area">

          <div className="auth-form-wrapper">

            <header className="auth-form-header">

              <span className="auth-mobile-eyebrow">
                AgroMarket Burkina
              </span>

              <div className="auth-form-heading-icon">

                <Icon
                  name="user"
                  size={24}
                />

              </div>

              <h2>
                Bienvenue
              </h2>

              <p>
                Connectez-vous à votre compte
                AgroMarket Burkina.
              </p>

            </header>


            {/* =================================================
                ERREUR
            ================================================== */}

            {error && (
              <div
                className="alert alert-danger auth-alert"
                role="alert"
                aria-live="assertive"
              >

                <div className="auth-alert-icon">

                  <Icon
                    name="info"
                    size={18}
                  />

                </div>

                <div>

                  <strong>
                    Connexion impossible
                  </strong>

                  <span>
                    {error}
                  </span>

                </div>

                <button
                  type="button"
                  className="auth-alert-close"
                  onClick={() =>
                    setError("")
                  }
                  aria-label="Fermer le message"
                >

                  <Icon
                    name="close"
                    size={16}
                  />

                </button>

              </div>
            )}


            {/* =================================================
                SUCCÈS
            ================================================== */}

            {success && (
              <div
                className="alert alert-success auth-alert"
                role="status"
                aria-live="polite"
              >

                <div className="auth-alert-icon">

                  <Icon
                    name="check"
                    size={18}
                  />

                </div>

                <span>
                  {success}
                </span>

              </div>
            )}


            {/* =================================================
                FORMULAIRE
            ================================================== */}

            <form
              className="auth-form"
              onSubmit={handleSubmit}
              noValidate
            >

              {/* =================================================
                  TÉLÉPHONE
              ================================================== */}

              <div
                className={`form-group ${
                  telephoneError
                    ? "has-error"
                    : ""
                }`}
              >

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
                      size={19}
                    />

                  </span>

                  <input
                    id="telephone"
                    name="telephone"
                    type="tel"
                    inputMode="tel"
                    className="form-input auth-input"
                    value={telephone}
                    onChange={
                      handleTelephoneChange
                    }
                    onBlur={() =>
                      handleBlur(
                        "telephone"
                      )
                    }
                    placeholder="70 00 00 00"
                    autoComplete="tel"
                    autoFocus
                    disabled={isLoading}
                    aria-invalid={
                      Boolean(
                        telephoneError
                      )
                    }
                    aria-describedby={
                      telephoneError
                        ? "telephone-error"
                        : undefined
                    }
                  />

                </div>


                {telephoneError && (
                  <span
                    id="telephone-error"
                    className="form-error"
                  >
                    {telephoneError}
                  </span>
                )}

              </div>


              {/* =================================================
                  MOT DE PASSE
              ================================================== */}

              <div
                className={`form-group ${
                  passwordError
                    ? "has-error"
                    : ""
                }`}
              >

                <div className="auth-password-header">

                  <label
                    htmlFor="motDePasse"
                    className="form-label"
                  >
                    Mot de passe
                  </label>

                  <span className="auth-secure-label">

                    <Icon
                      name="lock"
                      size={14}
                    />

                    Sécurisé

                  </span>

                </div>


                <div className="auth-input-wrapper">

                  <span className="auth-input-icon">

                    <Icon
                      name="lock"
                      size={19}
                    />

                  </span>


                  <input
                    id="motDePasse"
                    name="motDePasse"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    className="form-input auth-input auth-password-input"
                    value={motDePasse}
                    onChange={
                      handlePasswordChange
                    }
                    onBlur={() =>
                      handleBlur(
                        "motDePasse"
                      )
                    }
                    placeholder="Votre mot de passe"
                    autoComplete="current-password"
                    disabled={isLoading}
                    aria-invalid={
                      Boolean(
                        passwordError
                      )
                    }
                    aria-describedby={
                      passwordError
                        ? "password-error"
                        : undefined
                    }
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
                    disabled={isLoading}
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                  >

                    <Icon
                      name={
                        showPassword
                          ? "eye-off"
                          : "eye"
                      }
                      size={19}
                    />

                  </button>

                </div>


                {passwordError && (
                  <span
                    id="password-error"
                    className="form-error"
                  >
                    {passwordError}
                  </span>
                )}

              </div>


              {/* =================================================
                  OPTIONS
              ================================================== */}

              <div className="auth-options">

                <label className="auth-checkbox">

                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(
                        event.target.checked
                      )
                    }
                    disabled={isLoading}
                  />

                  <span>
                    Se souvenir de moi
                  </span>

                </label>


                {/* =================================================
                    MOT DE PASSE OUBLIÉ
                ================================================== */}

                <Link
                  to="/mot-de-passe-oublie"
                  className="auth-forgot-link"
                  aria-label="Réinitialiser votre mot de passe"
                >
                  Mot de passe oublié ?
                </Link>

              </div>


              {/* =================================================
                  BOUTON CONNEXION
              ================================================== */}

              <button
                type="submit"
                className="btn btn-primary btn-lg auth-submit"
                disabled={isLoading}
              >

                {isLoading ? (
                  <>
                    <span
                      className="spinner spinner-sm"
                      aria-hidden="true"
                    />

                    <span>
                      Connexion en cours...
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      Se connecter
                    </span>

                    <Icon
                      name="arrow"
                      size={18}
                    />
                  </>
                )}

              </button>

            </form>


            {/* =================================================
                INSCRIPTION
            ================================================== */}

            <div className="auth-register">

              <span>
                Vous n'avez pas encore
                de compte ?
              </span>

              <Link
                to="/inscription"
                className="auth-register-link"
              >
                Créer un compte

                <Icon
                  name="arrow"
                  size={15}
                />

              </Link>

            </div>


            {/* =================================================
                RETOUR ACCUEIL
            ================================================== */}

            <Link
              to="/"
              className="auth-back-home"
            >
              ← Retour à l'accueil
            </Link>


            {/* =================================================
                SÉCURITÉ
            ================================================== */}

            <div className="auth-security-note">

              <Icon
                name="shield"
                size={16}
              />

              <span>
                Votre connexion est sécurisée.
              </span>

            </div>

          </div>

        </section>

      </section>

    </main>
  );
}


export default Login;