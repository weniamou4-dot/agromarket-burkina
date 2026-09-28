import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/pages/ForgotPassword.css";
import { forgotPassword } from "../services/api/auth";

// ============================================================
// ICÔNES
// ============================================================

const PhoneIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M6.62 10.79a15.46 15.46 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z"
    />
  </svg>
);

const MailIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5-8-5V6l8 5 8-5v2Z"
    />
  </svg>
);

const LockIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm-7-2a2 2 0 0 1 4 0v2h-4V6Zm5 13H9v-3a3 3 0 1 1 6 0v3Zm-3-5a1 1 0 0 0-1 1v2h2v-2a1 1 0 0 0-1-1Z"
    />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.42-1.41L7.83 13H20v-2Z" />
  </svg>
);

const ShieldIcon = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M12 2 4 5v6c0 5.25 3.4 10.16 8 11 4.6-.84 8-5.75 8-11V5l-8-3Zm0 17.9c-3.04-.82-6-4.42-6-8.9V6.38l6-2.25 6 2.25V11c0 4.48-2.96 8.08-6 8.9ZM10.59 13.59 8 11l-1.41 1.41 4 4 7-7L16.18 8l-5.59 5.59Z"
    />
  </svg>
);

// ============================================================
// COMPOSANT
// ============================================================

export default function ForgotPassword() {
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // ==========================================================
  // SOUMISSION DU FORMULAIRE
  // ==========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const telephoneValue = telephone.trim();
    const emailValue = email.trim().toLowerCase();

    // --------------------------------------------------------
    // VALIDATION DU NUMÉRO
    // --------------------------------------------------------

    if (!telephoneValue) {
      setError("Veuillez saisir votre numéro de téléphone.");
      return;
    }

    if (telephoneValue.length < 8) {
      setError("Le numéro de téléphone doit contenir au moins 8 caractères.");
      return;
    }

    // --------------------------------------------------------
    // VALIDATION DE L'EMAIL
    // --------------------------------------------------------

    if (!emailValue) {
      setError("Veuillez saisir votre adresse email.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(emailValue)) {
      setError("Veuillez saisir une adresse email valide.");
      return;
    }

    // --------------------------------------------------------
    // ENVOI AU BACKEND
    // --------------------------------------------------------

    try {
      setSubmitting(true);

      await forgotPassword({
        telephone: telephoneValue,
        email: emailValue,
      });

      /*
       * Pour des raisons de sécurité, on ne révèle pas si
       * le compte existe ou non.
       */
      setSuccess(
        "Si les informations correspondent à un compte valide, " +
        "un lien de réinitialisation vient de vous être envoyé par email."
      );

      // On vide les champs après succès.
      setTelephone("");
      setEmail("");
    } catch (err) {
      console.error("Erreur réinitialisation mot de passe :", err);

      const message =
        err?.message ||
        err?.detail ||
        "Une erreur est survenue. Veuillez réessayer.";

      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================================
  // AFFICHAGE
  // ==========================================================

  return (
    <main className="page auth-page">
      <div className="auth-form-area">
        <div className="auth-form-wrapper">

          {/* ==================================================
              EN-TÊTE
          ================================================== */}

          <div className="auth-form-header">
            <div className="auth-form-heading-icon">
              <LockIcon />
            </div>

            <h1>Mot de passe oublié ?</h1>

            <p>
              Entrez le numéro de téléphone et l'adresse email
              associés à votre compte.
            </p>
          </div>

          {/* ==================================================
              MESSAGES
          ================================================== */}

          {error && (
            <div
              className="alert alert-danger auth-alert"
              role="alert"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="alert alert-success auth-alert"
              role="status"
            >
              {success}
            </div>
          )}

          {/* ==================================================
              FORMULAIRE
          ================================================== */}

          {!success && (
            <form
              className="auth-form"
              onSubmit={handleSubmit}
              noValidate
            >
              {/* =================================================
                  TÉLÉPHONE
              ================================================= */}

              <div className="form-group">
                <label
                  htmlFor="telephone"
                  className="form-label"
                >
                  Numéro de téléphone
                </label>

                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <PhoneIcon />
                  </span>

                  <input
                    id="telephone"
                    name="telephone"
                    type="tel"
                    className="form-input auth-input"
                    placeholder="Ex. 55258266"
                    value={telephone}
                    onChange={(event) => {
                      setTelephone(event.target.value);
                      setError("");
                    }}
                    autoComplete="tel"
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              {/* =================================================
                  EMAIL
              ================================================= */}

              <div className="form-group">
                <label
                  htmlFor="email"
                  className="form-label"
                >
                  Adresse email
                </label>

                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <MailIcon />
                  </span>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="form-input auth-input"
                    placeholder="Ex. exemple@gmail.com"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError("");
                    }}
                    autoComplete="email"
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              {/* =================================================
                  INFORMATION DE SÉCURITÉ
              ================================================= */}

              <div className="auth-security-info">
                <ShieldIcon />

                <span>
                  Pour votre sécurité, votre numéro de téléphone
                  et votre adresse email doivent correspondre aux
                  informations de votre compte.
                </span>
              </div>

              {/* =================================================
                  BOUTON
              ================================================= */}

              <button
                type="submit"
                className="auth-submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner spinner-sm" />
                    Vérification...
                  </>
                ) : (
                  "Réinitialiser mon mot de passe"
                )}
              </button>
            </form>
          )}

          {/* ==================================================
              APRÈS SUCCÈS
          ================================================== */}

          {success && (
            <div className="auth-form">
              <Link
                to="/connexion"
                className="auth-submit"
              >
                Retour à la connexion
              </Link>
            </div>
          )}

          {/* ==================================================
              LIEN CONNEXION
          ================================================== */}

          <div className="auth-register">
            Vous vous souvenez de votre mot de passe ?{" "}
            <Link
              to="/connexion"
              className="auth-register-link"
            >
              Se connecter
            </Link>
          </div>

          {/* ==================================================
              RETOUR ACCUEIL
          ================================================== */}

          <div className="auth-back-home">
            <Link to="/">
              <ArrowLeftIcon />
              Retour à l'accueil
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
}