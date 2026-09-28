
// src/components/Navbar.jsx

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import {
  compterMessagesNonLus,
} from "../services/api/messagerie";

import { getImageUrl } from "../utils/media";


/* ============================================================
   ICÔNES
============================================================ */

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

    case "search":
      return (
        <svg {...common}>
          <circle
            cx="11"
            cy="11"
            r="6.5"
          />
          <path d="m16 16 4.2 4.2" />
        </svg>
      );


    case "bell":
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );


    case "message":
      return (
        <svg {...common}>
          <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H8l-4 2v-5.2A7.5 7.5 0 1 1 20 11.5Z" />
          <path d="M8 11h.01" />
          <path d="M12 11h.01" />
          <path d="M16 11h.01" />
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
          <path d="M5 20c.8-3.3 3.1-5 7-5s6.2 1.7 7 5" />
        </svg>
      );


    case "menu":
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      );


    case "close":
      return (
        <svg {...common}>
          <path d="m6 6 12 12" />
          <path d="m18 6-12 12" />
        </svg>
      );


    case "chevron":
      return (
        <svg {...common}>
          <path d="m7 9 5 5 5-5" />
        </svg>
      );


    case "store":
      return (
        <svg {...common}>
          <path d="M4 10v9h16v-9" />
          <path d="M3 10 5 4h14l2 6" />

          <path d="M3 10c.7 1.2 1.8 1.8 3 1.8s2.3-.6 3-1.8c.7 1.2 1.8 1.8 3 1.8s2.3-.6 3-1.8c.7 1.2 1.8 1.8 3 1.8s2.3-.6 3-1.8" />

          <path d="M9 19v-4h6v4" />
        </svg>
      );


    case "dashboard":
      return (
        <svg {...common}>
          <rect
            x="4"
            y="4"
            width="6"
            height="6"
            rx="1"
          />

          <rect
            x="14"
            y="4"
            width="6"
            height="6"
            rx="1"
          />

          <rect
            x="4"
            y="14"
            width="6"
            height="6"
            rx="1"
          />

          <rect
            x="14"
            y="14"
            width="6"
            height="6"
            rx="1"
          />
        </svg>
      );


    case "logout":
      return (
        <svg {...common}>
          <path d="M10 5H5v14h5" />
          <path d="M14 8l4 4-4 4" />
          <path d="M18 12H9" />
        </svg>
      );


    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 19 6v5c0 4.6-2.8 7.8-7 10-4.2-2.2-7-5.4-7-10V6l7-3Z" />
          <path d="m9.5 12 1.7 1.7 3.6-3.6" />
        </svg>
      );


    case "history":
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
          <path d="M12 7v5l3 2" />
        </svg>
      );


    case "star":
      return (
        <svg {...common}>
          <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
        </svg>
      );


    case "ai":
      return (
        <svg {...common}>
          <path d="M12 3v3" />
          <path d="M12 18v3" />
          <path d="M3 12h3" />
          <path d="M18 12h3" />

          <path d="m5.6 5.6 2.1 2.1" />
          <path d="m16.3 16.3 2.1 2.1" />

          <path d="m18.4 5.6-2.1 2.1" />
          <path d="M7.7 16.3 5.6 18.4" />

          <circle
            cx="12"
            cy="12"
            r="4"
          />
        </svg>
      );


    default:
      return null;
  }
}


/* ============================================================
   UTILITAIRES UTILISATEUR
============================================================ */

function normalizeRole(role) {
  return String(
    role || ""
  )
    .trim()
    .toLowerCase();
}


function getInitials(user) {

  if (!user) {
    return "?";
  }

  const first =
    user.prenom
      ?.trim()
      ?.charAt(0) ||
    user.nom
      ?.trim()
      ?.charAt(0) ||
    user.telephone
      ?.trim()
      ?.charAt(0) ||
    "U";

  const second =
    user.nom
      ?.trim()
      ?.charAt(0) ||
    "";

  return `${first}${second}`.toUpperCase();
}


/* ============================================================
   NOM D'AFFICHAGE
============================================================ */

function getDisplayName(user) {

  if (!user) {
    return "Mon compte";
  }

  const fullName = [
    user.prenom,
    user.nom,
  ]
    .filter(
      (value) =>
        typeof value === "string" &&
        value.trim()
    )
    .join(" ")
    .trim();

  return (
    fullName ||
    user.telephone ||
    user.email ||
    "Mon compte"
  );
}


/* ============================================================
   LIBELLÉ DU RÔLE
============================================================ */

function getRoleLabel(role) {

  const normalizedRole =
    normalizeRole(role);

  switch (
    normalizedRole
  ) {

    case "vendeur":
      return "Vendeur";

    case "moderateur":
      return "Modérateur";

    case "administrateur":
    case "admin":
      return "Administrateur";

    case "acheteur":
      return "Acheteur";

    default:
      return "Utilisateur";
  }
}


/* ============================================================
   NAVBAR
============================================================ */

function Navbar() {

  const {
    user,
    isAuthenticated,
    isVendeur,
    isModerateur,
    isAdmin,
    logout,
  } = useAuth();

  const navigate =
    useNavigate();

  const location =
    useLocation();


  /* ----------------------------------------------------------
     ÉTATS
  ---------------------------------------------------------- */

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  const [
    profileOpen,
    setProfileOpen,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    unreadMessages,
    setUnreadMessages,
  ] = useState(0);


  const profileRef =
    useRef(null);

  const searchInputRef =
    useRef(null);


  /* ----------------------------------------------------------
     DROITS UTILISATEUR
  ---------------------------------------------------------- */

  /*
   * Historique :
   * modérateur + admin
   */
  const canViewHistory =
    Boolean(
      isModerateur ||
      isAdmin
    );


  /*
   * Modération des annonces :
   * modérateur + admin
   */
  const canViewModeration =
    Boolean(
      isModerateur ||
      isAdmin
    );


  /*
   * Modération des avis plateforme :
   * modérateur + admin
   */
  const canViewPlatformReviewModeration =
    Boolean(
      isModerateur ||
      isAdmin
    );


  /*
   * Administration :
   * admin uniquement
   */
  const canViewAdministration =
    Boolean(
      isAdmin
    );


  /* ----------------------------------------------------------
     CHARGER LE NOMBRE DE MESSAGES NON LUS
  ---------------------------------------------------------- */

  useEffect(() => {

    let cancelled = false;

    async function loadUnreadMessages() {

      if (!isAuthenticated) {

        if (!cancelled) {
          setUnreadMessages(0);
        }

        return;
      }

      try {

        const count =
          await compterMessagesNonLus();

        if (!cancelled) {

          const normalizedCount =
            Number(count);

          setUnreadMessages(
            Number.isFinite(
              normalizedCount
            )
              ? Math.max(
                  0,
                  Math.floor(
                    normalizedCount
                  )
                )
              : 0
          );
        }

      } catch (error) {

        if (!cancelled) {
          setUnreadMessages(0);
        }

        console.warn(
          "Impossible de récupérer le nombre de messages non lus :",
          error
        );
      }
    }


    loadUnreadMessages();


    const interval =
      window.setInterval(
        loadUnreadMessages,
        10000
      );


    return () => {

      cancelled = true;

      window.clearInterval(
        interval
      );

    };

  }, [
    isAuthenticated,
    location.pathname,
  ]);


  /* ----------------------------------------------------------
     SYNCHRONISER LE COMPTEUR APRÈS OUVERTURE
  ---------------------------------------------------------- */

  useEffect(() => {

    if (
      location.pathname.startsWith(
        "/messages"
      )
    ) {
      setUnreadMessages(0);
    }

  }, [
    location.pathname,
  ]);


  /* ----------------------------------------------------------
     SYNCHRONISER LA RECHERCHE AVEC L'URL
  ---------------------------------------------------------- */

  useEffect(() => {

    const params =
      new URLSearchParams(
        location.search
      );

    const urlSearch =
      params.get("search") ||
      params.get("recherche") ||
      "";

    setSearch(
      urlSearch
    );

  }, [
    location.search,
  ]);


  /* ----------------------------------------------------------
     FERMER LE MENU PROFIL À L'EXTÉRIEUR
  ---------------------------------------------------------- */

  useEffect(() => {

    function handleClickOutside(
      event
    ) {

      if (
        profileRef.current &&
        !profileRef.current.contains(
          event.target
        )
      ) {
        setProfileOpen(
          false
        );
      }
    }


    document.addEventListener(
      "mousedown",
      handleClickOutside
    );


    return () => {

      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );

    };

  }, []);


  /* ----------------------------------------------------------
     FERMER LES MENUS APRÈS NAVIGATION
  ---------------------------------------------------------- */

  useEffect(() => {

    setMobileOpen(
      false
    );

    setProfileOpen(
      false
    );

  }, [
    location.pathname,
  ]);


  /* ----------------------------------------------------------
     EMPÊCHER LE SCROLL BODY SUR MOBILE
  ---------------------------------------------------------- */

  useEffect(() => {

    if (
      mobileOpen
    ) {
      document.body.style.overflow =
        "hidden";
    } else {
      document.body.style.overflow =
        "";
    }


    return () => {

      document.body.style.overflow =
        "";

    };

  }, [
    mobileOpen,
  ]);


  /* ----------------------------------------------------------
     RACCOURCI CLAVIER POUR LA RECHERCHE
  ---------------------------------------------------------- */

  useEffect(() => {

    function handleKeyDown(
      event
    ) {

      if (
        (event.ctrlKey ||
          event.metaKey) &&
        event.key.toLowerCase() ===
          "k"
      ) {

        event.preventDefault();

        searchInputRef.current?.focus();
      }
    }


    document.addEventListener(
      "keydown",
      handleKeyDown
    );


    return () => {

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

    };

  }, []);


  /* ----------------------------------------------------------
     RECHERCHE
  ---------------------------------------------------------- */

  function handleSearchSubmit(
    event
  ) {

    event.preventDefault();

    const value =
      search.trim();


    if (!value) {

      navigate(
        "/produits"
      );

      setMobileOpen(
        false
      );

      return;
    }


    navigate(
      `/produits?search=${encodeURIComponent(
        value
      )}`
    );


    setMobileOpen(
      false
    );

    setProfileOpen(
      false
    );
  }


  /* ----------------------------------------------------------
     DÉCONNEXION
  ---------------------------------------------------------- */

  async function handleLogout() {

    try {

      await logout();

    } catch (error) {

      console.error(
        "Erreur lors de la déconnexion :",
        error
      );

    } finally {

      setProfileOpen(
        false
      );

      setMobileOpen(
        false
      );


      if (
        location.pathname !==
        "/"
      ) {
        navigate(
          "/",
          {
            replace: true,
          }
        );
      }

    }
  }


  /* ----------------------------------------------------------
     NAVIGATION PUBLIQUE
  ---------------------------------------------------------- */

  const publicLinks = [
    {
      to: "/",
      label: "Accueil",
      end: true,
    },
    {
      to: "/produits",
      label: "Produits",
    },
  ];


  /* ----------------------------------------------------------
     CLASSES
  ---------------------------------------------------------- */

  function getUserLinkClass(
    isActive
  ) {

    return `navbar-dropdown-item ${
      isActive
        ? "active"
        : ""
    }`;
  }


  function getMobileLinkClass(
    isActive
  ) {

    return `navbar-mobile-link ${
      isActive
        ? "active"
        : ""
    }`;
  }


  /* ----------------------------------------------------------
     PHOTO DE PROFIL
  ---------------------------------------------------------- */

  const profileImage =
    getImageUrl(
      user?.photo_profil
    );


  /* ----------------------------------------------------------
     COMPTEUR MESSAGES
  ---------------------------------------------------------- */

  const hasUnreadMessages =
    unreadMessages > 0;


  /* ==========================================================
     RENDU
  ========================================================== */

  return (
    <>
      {/* ======================================================
          HEADER
      ======================================================= */}

      <header
        className="navbar"
      >

        <div
          className="navbar-container"
        >

          {/* ==================================================
              LOGO
          =================================================== */}

          <Link
            to="/"
            className="navbar-brand"
            aria-label="AgroMarket Burkina - Accueil"
          >

            <div
              className="navbar-logo"
            >

              <img
                src="/logo-agromarket.png"
                alt="AgroMarket"
              />

            </div>


            <div
              className="navbar-brand-text"
            >

              <strong>
                AgroMarket
              </strong>

              <span>
                Burkina Faso
              </span>

            </div>

          </Link>


          {/* ==================================================
              NAVIGATION DESKTOP
          =================================================== */}

          <nav
            className="navbar-nav"
            aria-label="Navigation principale"
          >

            {publicLinks.map(
              (link) => (

                <NavLink
                  key={
                    link.to
                  }
                  to={
                    link.to
                  }
                  end={
                    link.end
                  }
                  className={({ isActive }) =>
                    `navbar-link ${
                      isActive
                        ? "active"
                        : ""
                    }`
                  }
                >
                  {
                    link.label
                  }
                </NavLink>

              )
            )}


            <NavLink
              to="/produits"
              className={() =>
                `navbar-link ${
                  location.pathname.startsWith(
                    "/produits"
                  ) ||
                  location.pathname.startsWith(
                    "/categories"
                  )
                    ? "active"
                    : ""
                }`
              }
            >
              Catégories
            </NavLink>


            {/* ==================================================
                AVIS PLATEFORME — PUBLIC
            =================================================== */}

            <NavLink
              to="/avis-plateforme"
              className={({ isActive }) =>
                `navbar-link ${
                  isActive
                    ? "active"
                    : ""
                }`
              }
              aria-label="Avis plateforme"
            >
              Avis plateforme
            </NavLink>

          </nav>


          {/* ==================================================
              RECHERCHE DESKTOP
          =================================================== */}

          <form
            className="navbar-search"
            onSubmit={
              handleSearchSubmit
            }
          >

            <Icon
              name="search"
              size={18}
            />


            <input
              ref={
                searchInputRef
              }
              type="search"
              placeholder="Rechercher..."
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              aria-label="Rechercher un produit"
              autoComplete="off"
            />

          </form>


          {/* ==================================================
              ACTIONS
          =================================================== */}

          <div
            className="navbar-actions"
          >

            {/* ------------------------------------------
                PUBLICATION VENDEUR
            ------------------------------------------ */}

            {isAuthenticated &&
              isVendeur && (

                <Link
                  to="/publier"
                  className="navbar-sell-button"
                >

                  <Icon
                    name="store"
                    size={18}
                  />

                  <span>
                    Publier
                  </span>

                </Link>

              )}


            {isAuthenticated ? (

              <>

                {/* --------------------------------------
                    MESSAGES
                --------------------------------------- */}

                <Link
                  to="/messages"
                  className="navbar-icon-button navbar-message-button"
                  aria-label={
                    hasUnreadMessages
                      ? `Messages, ${unreadMessages} non lu${
                          unreadMessages > 1
                            ? "s"
                            : ""
                        }`
                      : "Messages"
                  }
                  title={
                    hasUnreadMessages
                      ? `${unreadMessages} message${
                          unreadMessages > 1
                            ? "s"
                            : ""
                        } non lu${
                          unreadMessages > 1
                            ? "s"
                            : ""
                        }`
                      : "Messages"
                  }
                >

                  <Icon
                    name="message"
                    size={20}
                  />

                  {hasUnreadMessages && (

                    <span
                      className="navbar-notification-badge"
                      aria-hidden="true"
                    >
                      {
                        unreadMessages > 99
                          ? "99+"
                          : unreadMessages
                      }
                    </span>

                  )}

                </Link>


                {/* --------------------------------------
                    NOTIFICATIONS
                --------------------------------------- */}

                <Link
                  to="/notifications"
                  className="navbar-icon-button"
                  aria-label="Notifications"
                  title="Notifications"
                >

                  <Icon
                    name="bell"
                    size={20}
                  />

                </Link>


                {/* --------------------------------------
                    PROFIL
                --------------------------------------- */}

                <div
                  className="navbar-profile"
                  ref={
                    profileRef
                  }
                >

                  <button
                    type="button"
                    className="navbar-profile-button"
                    onClick={() =>
                      setProfileOpen(
                        (
                          current
                        ) =>
                          !current
                      )
                    }
                    aria-expanded={
                      profileOpen
                    }
                    aria-haspopup="menu"
                    aria-label={`Ouvrir le menu de ${getDisplayName(
                      user
                    )}`}
                  >

                    <span
                      className="navbar-avatar"
                    >

                      {profileImage ? (

                        <img
                          src={
                            profileImage
                          }
                          alt=""
                        />

                      ) : (

                        getInitials(
                          user
                        )

                      )}

                    </span>


                    <span
                      className="navbar-profile-name"
                    >
                      {
                        getDisplayName(
                          user
                        )
                      }
                    </span>


                    <Icon
                      name="chevron"
                      size={16}
                    />

                  </button>


                  {profileOpen && (

                    <div
                      className="navbar-dropdown"
                      role="menu"
                    >

                      {/* --------------------------------
                          INFORMATIONS UTILISATEUR
                      --------------------------------- */}

                      <div
                        className="navbar-dropdown-user"
                      >

                        <div
                          className="navbar-avatar navbar-avatar-large"
                        >

                          {profileImage ? (

                            <img
                              src={
                                profileImage
                              }
                              alt=""
                            />

                          ) : (

                            getInitials(
                              user
                            )

                          )}

                        </div>


                        <div>

                          <strong>
                            {
                              getDisplayName(
                                user
                              )
                            }
                          </strong>

                          <span>
                            {
                              getRoleLabel(
                                user?.role
                              )
                            }
                          </span>

                        </div>

                      </div>


                      <div
                        className="navbar-dropdown-divider"
                      />


                      {/* --------------------------------
                          TABLEAU DE BORD
                      --------------------------------- */}

                      <NavLink
                        to="/dashboard"
                        className={({ isActive }) =>
                          getUserLinkClass(
                            isActive
                          )
                        }
                        role="menuitem"
                      >

                        <Icon
                          name="dashboard"
                          size={18}
                        />

                        <span>
                          Tableau de bord
                        </span>

                      </NavLink>


                      {/* --------------------------------
                          MON PROFIL
                      --------------------------------- */}

                      <NavLink
                        to="/profil"
                        className={({ isActive }) =>
                          getUserLinkClass(
                            isActive
                          )
                        }
                        role="menuitem"
                      >

                        <Icon
                          name="user"
                          size={18}
                        />

                        <span>
                          Mon profil
                        </span>

                      </NavLink>


                      {/* --------------------------------
                          MESSAGES
                      --------------------------------- */}

                      <NavLink
                        to="/messages"
                        className={({ isActive }) =>
                          getUserLinkClass(
                            isActive
                          )
                        }
                        role="menuitem"
                      >

                        <Icon
                          name="message"
                          size={18}
                        />

                        <span>
                          Messages
                        </span>

                        {hasUnreadMessages && (

                          <span
                            className="navbar-dropdown-badge"
                            aria-label={`${unreadMessages} message${
                              unreadMessages > 1
                                ? "s"
                                : ""
                            } non lu${
                              unreadMessages > 1
                                ? "s"
                                : ""
                            }`}
                          >
                            {
                              unreadMessages > 99
                                ? "99+"
                                : unreadMessages
                            }
                          </span>

                        )}

                      </NavLink>


                      {/* --------------------------------
                          NOTIFICATIONS
                      --------------------------------- */}

                      <NavLink
                        to="/notifications"
                        className={({ isActive }) =>
                          getUserLinkClass(
                            isActive
                          )
                        }
                        role="menuitem"
                      >

                        <Icon
                          name="bell"
                          size={18}
                        />

                        <span>
                          Notifications
                        </span>

                      </NavLink>


                      {/* --------------------------------
                          MES AVIS
                      --------------------------------- */}

                      <NavLink
                        to="/avis"
                        className={({ isActive }) =>
                          getUserLinkClass(
                            isActive
                          )
                        }
                        role="menuitem"
                      >

                        <Icon
                          name="star"
                          size={18}
                        />

                        <span>
                          Mes avis
                        </span>

                      </NavLink>


                      {/* --------------------------------
                          AVIS PLATEFORME
                      --------------------------------- */}

                      <NavLink
                        to="/avis-plateforme"
                        className={({ isActive }) =>
                          getUserLinkClass(
                            isActive
                          )
                        }
                        role="menuitem"
                      >

                        <Icon
                          name="star"
                          size={18}
                        />

                        <span>
                          Avis plateforme
                        </span>

                      </NavLink>


                      {/* --------------------------------
                          ASSISTANT AI
                      --------------------------------- */}

                      <NavLink
                        to="/ai"
                        className={({ isActive }) =>
                          getUserLinkClass(
                            isActive
                          )
                        }
                        role="menuitem"
                      >

                        <Icon
                          name="ai"
                          size={18}
                        />

                        <span>
                          Assistant AI
                        </span>

                      </NavLink>


                      {/* --------------------------------
                          HISTORIQUE
                      --------------------------------- */}

                      {canViewHistory && (

                        <NavLink
                          to="/historique"
                          className={({ isActive }) =>
                            getUserLinkClass(
                              isActive
                            )
                          }
                          role="menuitem"
                        >

                          <Icon
                            name="history"
                            size={18}
                          />

                          <span>
                            Historique
                          </span>

                        </NavLink>

                      )}


                      {/* --------------------------------
                          MODÉRATION DES ANNONCES
                      --------------------------------- */}

                      {canViewModeration && (

                        <NavLink
                          to="/moderation"
                          className={({ isActive }) =>
                            getUserLinkClass(
                              isActive
                            )
                          }
                          role="menuitem"
                        >

                          <Icon
                            name="shield"
                            size={18}
                          />

                          <span>
                            Modération des annonces
                          </span>

                        </NavLink>

                      )}


                      {/* --------------------------------
                          MODÉRATION DES AVIS PLATEFORME
                      --------------------------------- */}

                      {canViewPlatformReviewModeration && (

                        <NavLink
                          to="/moderation/avis-plateforme"
                          className={({ isActive }) =>
                            getUserLinkClass(
                              isActive
                            )
                          }
                          role="menuitem"
                        >

                          <Icon
                            name="star"
                            size={18}
                          />

                          <span>
                            Modérer les avis
                          </span>

                        </NavLink>

                      )}


                      {/* --------------------------------
                          ADMINISTRATION
                      --------------------------------- */}

                      {canViewAdministration && (

                        <NavLink
                          to="/admin"
                          className={({ isActive }) =>
                            getUserLinkClass(
                              isActive
                            )
                          }
                          role="menuitem"
                        >

                          <Icon
                            name="shield"
                            size={18}
                          />

                          <span>
                            Administration
                          </span>

                        </NavLink>

                      )}


                      <div
                        className="navbar-dropdown-divider"
                      />


                      {/* --------------------------------
                          DÉCONNEXION
                      --------------------------------- */}

                      <button
                        type="button"
                        className="navbar-dropdown-item navbar-dropdown-danger"
                        onClick={
                          handleLogout
                        }
                        role="menuitem"
                      >

                        <Icon
                          name="logout"
                          size={18}
                        />

                        <span>
                          Se déconnecter
                        </span>

                      </button>

                    </div>

                  )}

                </div>

              </>

            ) : (

              <div
                className="navbar-auth-actions"
              >

                <Link
                  to="/connexion"
                  className="navbar-login-button"
                >
                  Connexion
                </Link>


                <Link
                  to="/inscription"
                  className="navbar-register-button"
                >
                  Créer un compte
                </Link>

              </div>

            )}


            {/* =================================================
                BOUTON MOBILE
            ================================================= */}

            <button
              type="button"
              className="navbar-mobile-toggle"
              onClick={() =>
                setMobileOpen(
                  (
                    current
                  ) =>
                    !current
                )
              }
              aria-label={
                mobileOpen
                  ? "Fermer le menu"
                  : "Ouvrir le menu"
              }
              aria-expanded={
                mobileOpen
              }
              aria-controls="agromarket-mobile-menu"
            >

              <Icon
                name={
                  mobileOpen
                    ? "close"
                    : "menu"
                }
                size={23}
              />

            </button>

          </div>

        </div>

      </header>


      {/* ======================================================
          OVERLAY MOBILE
      ======================================================= */}

      {mobileOpen && (

        <div
          className="navbar-mobile-overlay open"
          onClick={() =>
            setMobileOpen(
              false
            )
          }
          role="presentation"
        />

      )}


      {/* ======================================================
          PANNEAU MOBILE
      ======================================================= */}

      <aside
        id="agromarket-mobile-menu"
        className={`navbar-mobile-panel ${
          mobileOpen
            ? "open"
            : ""
        }`}
        aria-label="Menu mobile"
        aria-hidden={
          !mobileOpen
        }
      >

        {/* ------------------------------------------
            HEADER MOBILE
        ------------------------------------------- */}

        <div
          className="navbar-mobile-header"
        >

          <Link
            to="/"
            className="navbar-brand"
            aria-label="AgroMarket Burkina - Accueil"
          >

            <div
              className="navbar-logo"
            >

              <img
                src="/logo-agromarket.png"
                alt="AgroMarket"
              />

            </div>


            <div
              className="navbar-brand-text"
            >

              <strong>
                AgroMarket
              </strong>

              <span>
                Burkina Faso
              </span>

            </div>

          </Link>


          <button
            type="button"
            className="navbar-icon-button"
            onClick={() =>
              setMobileOpen(
                false
              )
            }
            aria-label="Fermer le menu"
          >

            <Icon
              name="close"
              size={22}
            />

          </button>

        </div>


        {/* ------------------------------------------
            CORPS MOBILE
        ------------------------------------------- */}

        <div
          className="navbar-mobile-body"
        >

          {/* ------------------------------------------
              RECHERCHE MOBILE
          ------------------------------------------- */}

          <form
            className="navbar-mobile-search"
            onSubmit={
              handleSearchSubmit
            }
          >

            <Icon
              name="search"
              size={18}
            />


            <input
              type="search"
              placeholder="Rechercher un produit..."
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              aria-label="Rechercher un produit"
              autoComplete="off"
            />

          </form>


          {/* ------------------------------------------
              NAVIGATION MOBILE
          ------------------------------------------- */}

          <nav
            className="navbar-mobile-nav"
            aria-label="Navigation mobile"
          >

            {publicLinks.map(
              (link) => (

                <NavLink
                  key={
                    link.to
                  }
                  to={
                    link.to
                  }
                  end={
                    link.end
                  }
                  className={({ isActive }) =>
                    getMobileLinkClass(
                      isActive
                    )
                  }
                >
                  {
                    link.label
                  }
                </NavLink>

              )
            )}


            {/* --------------------------------------
                CATÉGORIES
            --------------------------------------- */}

            <NavLink
              to="/produits"
              className={({ isActive }) =>
                getMobileLinkClass(
                  isActive ||
                    location.pathname.startsWith(
                      "/categories"
                    )
                )
              }
            >
              Catégories
            </NavLink>


            {/* --------------------------------------
                AVIS PLATEFORME — PUBLIC
            --------------------------------------- */}

            <NavLink
              to="/avis-plateforme"
              className={({ isActive }) =>
                getMobileLinkClass(
                  isActive
                )
              }
            >
              ⭐ Avis plateforme
            </NavLink>


            {isAuthenticated && (

              <>

                {/* ----------------------------------
                    MESSAGES
                ----------------------------------- */}

                <NavLink
                  to="/messages"
                  className={({ isActive }) =>
                    getMobileLinkClass(
                      isActive
                    )
                  }
                >

                  <span>
                    Messages
                  </span>

                  {hasUnreadMessages && (

                    <span
                      className="navbar-mobile-badge"
                      aria-label={`${unreadMessages} message${
                        unreadMessages > 1
                          ? "s"
                          : ""
                      } non lu${
                        unreadMessages > 1
                          ? "s"
                          : ""
                      }`}
                    >
                      {
                        unreadMessages > 99
                          ? "99+"
                          : unreadMessages
                      }
                    </span>

                  )}

                </NavLink>


                {/* ----------------------------------
                    NOTIFICATIONS
                ----------------------------------- */}

                <NavLink
                  to="/notifications"
                  className={({ isActive }) =>
                    getMobileLinkClass(
                      isActive
                    )
                  }
                >
                  Notifications
                </NavLink>


                {/* ----------------------------------
                    TABLEAU DE BORD
                ----------------------------------- */}

                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    getMobileLinkClass(
                      isActive
                    )
                  }
                >
                  Tableau de bord
                </NavLink>


                {/* ----------------------------------
                    MON PROFIL
                ----------------------------------- */}

                <NavLink
                  to="/profil"
                  className={({ isActive }) =>
                    getMobileLinkClass(
                      isActive
                    )
                  }
                >
                  Mon profil
                </NavLink>


                {/* ----------------------------------
                    MES AVIS
                ----------------------------------- */}

                <NavLink
                  to="/avis"
                  className={({ isActive }) =>
                    getMobileLinkClass(
                      isActive
                    )
                  }
                >
                  Mes avis
                </NavLink>


                {/* ----------------------------------
                    AVIS PLATEFORME
                ----------------------------------- */}

                <NavLink
                  to="/avis-plateforme"
                  className={({ isActive }) =>
                    getMobileLinkClass(
                      isActive
                    )
                  }
                >
                  Avis plateforme
                </NavLink>


                {/* ----------------------------------
                    ASSISTANT AI
                ----------------------------------- */}

                <NavLink
                  to="/ai"
                  className={({ isActive }) =>
                    getMobileLinkClass(
                      isActive
                    )
                  }
                >
                  Assistant AI
                </NavLink>


                {/* ----------------------------------
                    HISTORIQUE
                ----------------------------------- */}

                {canViewHistory && (

                  <NavLink
                    to="/historique"
                    className={({ isActive }) =>
                      getMobileLinkClass(
                        isActive
                      )
                    }
                  >
                    Historique
                  </NavLink>

                )}


                {/* ----------------------------------
                    VENDEUR
                ----------------------------------- */}

                {isVendeur && (

                  <NavLink
                    to="/publier"
                    className="navbar-mobile-link navbar-mobile-link-highlight"
                  >
                    Publier une annonce
                  </NavLink>

                )}


                {/* ----------------------------------
                    MODÉRATION DES ANNONCES
                ----------------------------------- */}

                {canViewModeration && (

                  <NavLink
                    to="/moderation"
                    className={({ isActive }) =>
                      getMobileLinkClass(
                        isActive
                      )
                    }
                  >
                    Modération des annonces
                  </NavLink>

                )}


                {/* ----------------------------------
                    MODÉRATION DES AVIS PLATEFORME
                ----------------------------------- */}

                {canViewPlatformReviewModeration && (

                  <NavLink
                    to="/moderation/avis-plateforme"
                    className={({ isActive }) =>
                      getMobileLinkClass(
                        isActive
                      )
                    }
                  >
                    ⭐ Modérer les avis
                  </NavLink>

                )}


                {/* ----------------------------------
                    ADMINISTRATION
                ----------------------------------- */}

                {canViewAdministration && (

                  <NavLink
                    to="/admin"
                    className={({ isActive }) =>
                      getMobileLinkClass(
                        isActive
                      )
                    }
                  >
                    Administration
                  </NavLink>

                )}


                {/* ----------------------------------
                    DÉCONNEXION
                ----------------------------------- */}

                <button
                  type="button"
                  className="navbar-mobile-logout"
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

              </>

            )}


            {/* ------------------------------------------
                UTILISATEUR NON CONNECTÉ
            ------------------------------------------- */}

            {!isAuthenticated && (

              <div
                className="navbar-mobile-auth"
              >

                <Link
                  to="/connexion"
                  className="btn btn-outline"
                >
                  Connexion
                </Link>


                <Link
                  to="/inscription"
                  className="btn btn-primary"
                >
                  Créer un compte
                </Link>

              </div>

            )}

          </nav>

        </div>

      </aside>
    </>
  );
}


export default Navbar;
