// src/components/Footer.jsx

import { Link } from "react-router-dom";

function Icon({ name, size = 18 }) {
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

    case "location":
      return (
        <svg {...common}>
          <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );

    case "facebook":
      return (
        <svg {...common}>
          <path d="M14 8h2V4h-2.2C10.6 4 9 5.8 9 8.8V11H6v4h3v5h4v-5h3l1-4h-4V9c0-.7.3-1 1-1Z" />
        </svg>
      );

    case "instagram":
      return (
        <svg {...common}>
          <rect
            x="3.5"
            y="3.5"
            width="17"
            height="17"
            rx="4"
          />
          <circle cx="12" cy="12" r="4" />
          <circle
            cx="17.5"
            cy="6.5"
            r="0.8"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      );

    case "twitter":
      return (
        <svg {...common}>
          <path d="M4 4h4.5l4 5.2L17 4h3l-6 7 6.5 9H16l-4.8-6.1L6.5 20H3.5l6.8-8.2L4 4Z" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h13" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

    case "chevron":
      return (
        <svg {...common}>
          <path d="m7 9 5 5 5-5" />
        </svg>
      );

    default:
      return null;
  }
}

function Footer() {
  const currentYear =
    new Date().getFullYear();

  return (
    <footer className="footer">

      {/* =====================================================
          PARTIE PRINCIPALE
      ====================================================== */}

      <div className="footer-main">

        <div className="footer-container">

          {/* =================================================
              IDENTITÉ
          ================================================== */}

          <div className="footer-brand-column">

            <Link
              to="/"
              className="footer-brand"
              aria-label="AgroMarket Burkina"
            >
              <div className="footer-logo">
                <img
                  src="/logo-agromarket.png"
                  alt="AgroMarket"
                />
              </div>

              <div className="footer-brand-text">
                <strong>
                  AgroMarket
                </strong>

                <span>
                  Burkina Faso
                </span>
              </div>
            </Link>

            <p className="footer-description">
              La plateforme agricole burkinabè
              qui rapproche producteurs,
              vendeurs et acheteurs partout
              au Burkina Faso.
            </p>

            <div className="footer-socials">

              <a
                href="#"
                className="footer-social"
                aria-label="Facebook"
              >
                <Icon
                  name="facebook"
                />
              </a>

              <a
                href="#"
                className="footer-social"
                aria-label="Instagram"
              >
                <Icon
                  name="instagram"
                />
              </a>

              <a
                href="#"
                className="footer-social"
                aria-label="X"
              >
                <Icon
                  name="twitter"
                />
              </a>

            </div>
          </div>

          {/* =================================================
              NAVIGATION
          ================================================== */}

          <div className="footer-column">

            <h2>
              AgroMarket
            </h2>

            <nav
              className="footer-links"
              aria-label="Navigation AgroMarket"
            >
              <Link to="/">
                Accueil
              </Link>

              <Link to="/produits">
                Produits
              </Link>

              <Link to="/produits">
                Catégories
              </Link>

              <Link to="/connexion">
                Connexion
              </Link>

              <Link to="/inscription">
                Créer un compte
              </Link>
            </nav>

          </div>

          {/* =================================================
              VENDEURS
          ================================================== */}

          <div className="footer-column">

            <h2>
              Vendeurs
            </h2>

            <nav
              className="footer-links"
              aria-label="Espace vendeur"
            >
              <Link to="/publier">
                Publier une annonce
              </Link>

              <Link to="/dashboard">
                Tableau de bord
              </Link>

              <Link to="/profil">
                Mon profil
              </Link>

              <Link to="/dashboard">
                Mes annonces
              </Link>
            </nav>

          </div>

          {/* =================================================
              CONTACT
          ================================================== */}

          <div className="footer-column">

            <h2>
              Nous contacter
            </h2>

            <div className="footer-contact">

              <div className="footer-contact-item">
                <span className="footer-contact-icon">
                  <Icon
                    name="location"
                  />
                </span>

                <span>
                  Ouagadougou,
                  Burkina Faso
                </span>
              </div>

              <div className="footer-contact-item">
                <span className="footer-contact-icon">
                  <Icon
                    name="phone"
                  />
                </span>

                <a href="tel:(+226)00000000">
                  (+226) 55 02 12 66
                </a>
              </div>

              <div className="footer-contact-item">
                <span className="footer-contact-icon">
                  <Icon
                    name="mail"
                  />
                </span>

                <a href="mailto:contact@agromarket.bf">
                  contact@agromarket.bf
                </a>
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* =====================================================
          BANDE CTA
      ====================================================== */}

      <div className="footer-cta">

        <div className="footer-container footer-cta-inner">

          <div>
            <span className="footer-cta-eyebrow">
              🌱 Vous êtes vendeur ?
            </span>

            <h2>
              Développez votre activité
              avec AgroMarket
            </h2>

            <p>
              Présentez vos produits et
              atteignez de nouveaux clients
              partout au Burkina Faso.
            </p>
          </div>

          <Link
            to="/publier"
            className="footer-cta-button"
          >
            Commencer à vendre

            <Icon
              name="arrow"
              size={18}
            />
          </Link>

        </div>
      </div>

      {/* =====================================================
          BAS DE PAGE
      ====================================================== */}

      <div className="footer-bottom">

        <div className="footer-container footer-bottom-inner">

          <p>
            © {currentYear} AgroMarket
            Burkina Faso. Tous droits
            réservés.
          </p>

          <div className="footer-legal-links">
            <a href="#">
              Politique de confidentialité
            </a>

            <a href="#">
              Conditions d'utilisation
            </a>
          </div>

        </div>
      </div>

    </footer>
  );
}

export default Footer;