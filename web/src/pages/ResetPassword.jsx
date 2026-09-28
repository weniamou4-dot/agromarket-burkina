// ============================================================
// AGROMARKET BURKINA
// PAGE RÉINITIALISATION DU MOT DE PASSE
// ============================================================

import {
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  resetPassword,
} from "../services/api/auth";


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
// PAGE
// ============================================================

function ResetPassword() {

  const navigate =
    useNavigate();

  const [
    searchParams,
  ] = useSearchParams();

  const token =
    useMemo(
      () =>
        searchParams.get("token")?.trim() || "",
      [searchParams]
    );


  const [
    nouveauMotDePasse,
    setNouveauMotDePasse,
  ] = useState("");

  const [
    confirmation,
    setConfirmation,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmation,
    setShowConfirmation,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState(false);


  // ==========================================================
  // VALIDATION
  // ==========================================================

  function validate() {

    if (!token) {
      return (
        "Le lien de réinitialisation est invalide ou incomplet."
      );
    }

    if (!nouveauMotDePasse) {
      return (
        "Veuillez saisir votre nouveau mot de passe."
      );
    }

    if (nouveauMotDePasse.length < 8) {
      return (
        "Le mot de passe doit contenir au moins 8 caractères."
      );
    }

    if (nouveauMotDePasse !== confirmation) {
      return (
        "Les deux mots de passe ne correspondent pas."
      );
    }

    return "";
  }


  // ==========================================================
  // SOUMISSION
  // ==========================================================

  async function handleSubmit(event) {

    event.preventDefault();

    setError("");

    const validationError =
      validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {

      setSubmitting(true);

      await resetPassword({
        token,
        nouveau_mot_de_passe:
          nouveauMotDePasse,
      });

      setSuccess(true);

    } catch (err) {

      console.error(
        "Erreur réinitialisation mot de passe :",
        err
      );

      setError(
        err?.message ||
        "Impossible de réinitialiser votre mot de passe."
      );

    } finally {

      setSubmitting(false);

    }
  }


  // ==========================================================
  // SUCCÈS
  // ==========================================================

  if (success) {
    return (
      <main className="page auth-page">

        <section className="auth-form-area">

          <div className="auth-form-wrapper">

            <header className="auth-form-header">

              <div className="auth-form-heading-icon">
                <Icon
                  name="check"
                  size={24}
                />
              </div>

              <h1>
                Mot de passe modifié
              </h1>

              <p>
                Votre nouveau mot de passe a été
                enregistré avec succès.
              </p>

            </header>


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
                Vous pouvez maintenant vous
                connecter avec votre nouveau
                mot de passe.
              </span>

            </div>


            <button
              type="button"
              className="btn btn-primary btn-lg auth-submit"
              onClick={() =>
                navigate("/connexion")
              }
            >
              <span>
                Se connecter
              </span>

              <Icon
                name="arrow"
                size={18}
              />
            </button>

          </div>

        </section>

      </main>
    );
  }


  // ==========================================================
  // FORMULAIRE
  // ==========================================================

  return (
    <main className="page auth-page">

      <section className="auth-form-area">

        <div className="auth-form-wrapper">

          <header className="auth-form-header">

            <div className="auth-form-heading-icon">
              <Icon
                name="lock"
                size={24}
              />
            </div>

            <h1>
              Nouveau mot de passe
            </h1>

            <p>
              Choisissez un nouveau mot de passe
              sécurisé pour votre compte.
            </p>

          </header>


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
                  Réinitialisation impossible
                </strong>

                <span>
                  {error}
                </span>
              </div>

            </div>
          )}


          <form
            className="auth-form"
            onSubmit={handleSubmit}
            noValidate
          >

            {/* =================================================
                NOUVEAU MOT DE PASSE
            ================================================== */}

            <div className="form-group">

              <label
                htmlFor="nouveauMotDePasse"
                className="form-label"
              >
                Nouveau mot de passe
              </label>

              <div className="auth-input-wrapper">

                <span className="auth-input-icon">
                  <Icon
                    name="lock"
                    size={19}
                  />
                </span>

                <input
                  id="nouveauMotDePasse"
                  name="nouveauMotDePasse"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  className="form-input auth-input auth-password-input"
                  value={nouveauMotDePasse}
                  onChange={(event) => {
                    setNouveauMotDePasse(
                      event.target.value
                    );

                    if (error) {
                      setError("");
                    }
                  }}
                  placeholder="Votre nouveau mot de passe"
                  autoComplete="new-password"
                  autoFocus
                  disabled={submitting}
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                  disabled={submitting}
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

              <span className="form-help">
                Minimum 8 caractères.
              </span>

            </div>


            {/* =================================================
                CONFIRMATION
            ================================================== */}

            <div className="form-group">

              <label
                htmlFor="confirmation"
                className="form-label"
              >
                Confirmer le mot de passe
              </label>

              <div className="auth-input-wrapper">

                <span className="auth-input-icon">
                  <Icon
                    name="lock"
                    size={19}
                  />
                </span>

                <input
                  id="confirmation"
                  name="confirmation"
                  type={
                    showConfirmation
                      ? "text"
                      : "password"
                  }
                  className="form-input auth-input auth-password-input"
                  value={confirmation}
                  onChange={(event) => {
                    setConfirmation(
                      event.target.value
                    );

                    if (error) {
                      setError("");
                    }
                  }}
                  placeholder="Confirmez votre mot de passe"
                  autoComplete="new-password"
                  disabled={submitting}
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() =>
                    setShowConfirmation(
                      (current) => !current
                    )
                  }
                  disabled={submitting}
                  aria-label={
                    showConfirmation
                      ? "Masquer la confirmation"
                      : "Afficher la confirmation"
                  }
                >
                  <Icon
                    name={
                      showConfirmation
                        ? "eye-off"
                        : "eye"
                    }
                    size={19}
                  />
                </button>

              </div>

            </div>


            {/* =================================================
                BOUTON
            ================================================== */}

            <button
              type="submit"
              className="btn btn-primary btn-lg auth-submit"
              disabled={submitting || !token}
            >

              {submitting ? (
                <>
                  <span
                    className="spinner spinner-sm"
                    aria-hidden="true"
                  />

                  <span>
                    Enregistrement...
                  </span>
                </>
              ) : (
                <>
                  <span>
                    Modifier le mot de passe
                  </span>

                  <Icon
                    name="arrow"
                    size={18}
                  />
                </>
              )}

            </button>

          </form>


          <div className="auth-register">

            <span>
              Vous préférez vous connecter ?
            </span>

            <Link
              to="/connexion"
              className="auth-register-link"
            >
              Se connecter
              <Icon
                name="arrow"
                size={15}
              />
            </Link>

          </div>


          <Link
            to="/"
            className="auth-back-home"
          >
            ← Retour à l'accueil
          </Link>

        </div>

      </section>

    </main>
  );
}


export default ResetPassword;