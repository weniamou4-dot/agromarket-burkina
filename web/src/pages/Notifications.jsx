// ============================================================
// AGROMARKET BURKINA
// PAGE NOTIFICATIONS
// Version professionnelle
// ============================================================

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";
import "../styles/pages/notifications.css"
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/api/notifications";


// ============================================================
// CONFIGURATION
// ============================================================

const NOTIFICATION_TYPES = {
  annonce_soumise: {
    label: "Annonce soumise",
    category: "annonce",
    icon: "package",
    tone: "primary",
  },

  annonce_approuvee: {
    label: "Annonce approuvée",
    category: "annonce",
    icon: "package-check",
    tone: "success",
  },

  annonce_refusee: {
    label: "Annonce refusée",
    category: "annonce",
    icon: "package-x",
    tone: "danger",
  },

  annonce_remise_en_moderation: {
    label: "Annonce remise en modération",
    category: "moderation",
    icon: "shield",
    tone: "warning",
  },

  demande_vendeur: {
    label: "Demande vendeur",
    category: "vendeur",
    icon: "store",
    tone: "info",
  },

  demande_vendeur_acceptee: {
    label: "Demande vendeur acceptée",
    category: "vendeur",
    icon: "check",
    tone: "success",
  },

  demande_vendeur_refusee: {
    label: "Demande vendeur refusée",
    category: "vendeur",
    icon: "x",
    tone: "danger",
  },

  commande_nouvelle: {
    label: "Nouvelle commande",
    category: "commande",
    icon: "shopping",
    tone: "primary",
  },

  commande_confirmee: {
    label: "Commande confirmée",
    category: "commande",
    icon: "check",
    tone: "success",
  },

  commande_preparee: {
    label: "Commande préparée",
    category: "commande",
    icon: "package",
    tone: "info",
  },

  commande_livree: {
    label: "Commande livrée",
    category: "commande",
    icon: "truck",
    tone: "success",
  },

  commande_annulee: {
    label: "Commande annulée",
    category: "commande",
    icon: "x",
    tone: "danger",
  },

  compte_bloque: {
    label: "Compte bloqué",
    category: "compte",
    icon: "shield",
    tone: "danger",
  },

  compte_suspendu: {
    label: "Compte suspendu",
    category: "compte",
    icon: "shield",
    tone: "danger",
  },

  compte_reactive: {
    label: "Compte réactivé",
    category: "compte",
    icon: "check",
    tone: "success",
  },

  systeme: {
    label: "Information système",
    category: "systeme",
    icon: "bell",
    tone: "info",
  },
};


// ============================================================
// FILTRES
// ============================================================

const FILTERS = {
  ALL: "all",
  UNREAD: "unread",
  READ: "read",
};


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

    case "bell":
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "check-double":
      return (
        <svg {...common}>
          <path d="m3 12 4 4 7-7" />
          <path d="m10 16 2 2 9-9" />
        </svg>
      );

    case "x":
      return (
        <svg {...common}>
          <path d="M6 6l12 12" />
          <path d="M18 6 6 18" />
        </svg>
      );

    case "clock":
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="12"
            r="8"
          />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "package":
      return (
        <svg {...common}>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
          <path d="m4 7.5 8 4.5 8-4.5" />
          <path d="M12 12v9" />
        </svg>
      );

    case "package-check":
      return (
        <svg {...common}>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
          <path d="m4 7.5 8 4.5 8-4.5" />
          <path d="m9 14 2 2 4-4" />
        </svg>
      );

    case "package-x":
      return (
        <svg {...common}>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
          <path d="m4 7.5 8 4.5 8-4.5" />
          <path d="m9.5 13.5 5 5" />
          <path d="m14.5 13.5-5 5" />
        </svg>
      );

    case "shopping":
      return (
        <svg {...common}>
          <path d="M5 8h14l-1 11H6L5 8Z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
      );

    case "store":
      return (
        <svg {...common}>
          <path d="M4 10h16" />
          <path d="M5 10v9h14v-9" />
          <path d="M3 10 5 4h14l2 6" />
          <path d="M8 19v-5h8v5" />
        </svg>
      );

    case "truck":
      return (
        <svg {...common}>
          <path d="M3 6h11v10H3z" />
          <path d="M14 10h4l3 3v3h-7z" />
          <circle
            cx="7"
            cy="18"
            r="2"
          />
          <circle
            cx="18"
            cy="18"
            r="2"
          />
        </svg>
      );

    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 19 6v5c0 4.6-2.8 7.8-7 10-4.2-2.2-7-5.4-7-10V6l7-3Z" />
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
          <path d="M5 20c.8-3.3 3.1-5 7-5s6.2 1.7 7 5" />
        </svg>
      );

    case "search":
      return (
        <svg {...common}>
          <circle
            cx="11"
            cy="11"
            r="6"
          />
          <path d="m16 16 5 5" />
        </svg>
      );

    case "filter":
      return (
        <svg {...common}>
          <path d="M4 6h16" />
          <path d="M7 12h10" />
          <path d="M10 18h4" />
        </svg>
      );

    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 11a8 8 0 0 0-14.7-4L4 9" />
          <path d="M4 4v5h5" />
          <path d="M4 13a8 8 0 0 0 14.7 4L20 15" />
          <path d="M20 20v-5h-5" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h13" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

    case "arrow-left":
      return (
        <svg {...common}>
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
      );

    case "info":
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="12"
            r="8"
          />
          <path d="M12 11v5" />
          <path d="M12 8h.01" />
        </svg>
      );

    default:
      return null;
  }
}


// ============================================================
// UTILITAIRES
// ============================================================

function formatDate(
  value
) {
  if (!value) {
    return "Date inconnue";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}


function formatRelativeDate(
  value
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const now = new Date();

  const difference =
    Math.max(
      0,
      now.getTime()
      -
      date.getTime()
    );


  const minutes = Math.floor(
    difference / 60000
  );


  if (minutes < 1) {
    return "À l'instant";
  }


  if (minutes < 60) {
    return `Il y a ${minutes} min`;
  }


  const hours = Math.floor(
    minutes / 60
  );


  if (hours < 24) {
    return `Il y a ${hours} h`;
  }


  const days = Math.floor(
    hours / 24
  );


  if (days < 7) {
    return `Il y a ${days} j`;
  }


  return formatDate(value);
}


function getNotificationMeta(
  notification
) {
  const type =
    notification?.type ||
    "systeme";

  return (
    NOTIFICATION_TYPES[type] ||
    NOTIFICATION_TYPES.systeme
  );
}


function getNotificationLabel(
  notification
) {
  const meta =
    getNotificationMeta(
      notification
    );

  return meta.label;
}


function normalizeNotifications(
  response
) {

  if (
    Array.isArray(response)
  ) {
    return response;
  }


  if (
    Array.isArray(
      response?.notifications
    )
  ) {
    return response.notifications;
  }


  if (
    Array.isArray(
      response?.resultats
    )
  ) {
    return response.resultats;
  }


  if (
    Array.isArray(
      response?.data
    )
  ) {
    return response.data;
  }


  return [];
}


function getNotificationDate(
  notification
) {
  return (
    notification?.date_creation ||
    notification?.date ||
    null
  );
}


function isInternalLink(
  value
) {

  if (!value) {
    return false;
  }

  return (
    value.startsWith("/") &&
    !value.startsWith("//")
  );
}


// ============================================================
// COMPOSANT
// ============================================================

function Notifications() {

  const navigate =
    useNavigate();


  // ==========================================================
  // ÉTATS
  // ==========================================================

  const [
    notifications,
    setNotifications,
  ] = useState([]);


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
    search,
    setSearch,
  ] = useState("");


  const [
    activeFilter,
    setActiveFilter,
  ] = useState(
    FILTERS.ALL
  );


  const [
    activeType,
    setActiveType,
  ] = useState("all");


  const [
    sortOrder,
    setSortOrder,
  ] = useState("recent");


  const [
    processingIds,
    setProcessingIds,
  ] = useState([]);


  const [
    markingAll,
    setMarkingAll,
  ] = useState(false);


  // ==========================================================
  // CHARGEMENT
  // ==========================================================

  const loadNotifications =
    useCallback(
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


          const response =
            await getNotifications();


          const normalized =
            normalizeNotifications(
              response
            );


          setNotifications(
            normalized
          );

        } catch (err) {

          console.error(
            "Erreur chargement notifications :",
            err
          );


          setError(
            err?.message ||
            "Impossible de charger vos notifications."
          );

        } finally {

          setLoading(false);
          setRefreshing(false);

        }
      },
      []
    );


  // ==========================================================
  // INITIALISATION
  // ==========================================================

  useEffect(() => {

    loadNotifications({
      initial: true,
    });

  }, [
    loadNotifications,
  ]);


  // ==========================================================
  // COMPTEURS
  // ==========================================================

  const totalCount =
    notifications.length;


  const unreadCount =
    useMemo(
      () =>
        notifications.filter(
          (
            notification
          ) =>
            notification?.est_lue === false
        ).length,
      [
        notifications,
      ]
    );


  const readCount =
    totalCount -
    unreadCount;


  // ==========================================================
  // TYPES DISPONIBLES
  // ==========================================================

  const availableTypes =
    useMemo(() => {

      const types =
        new Set(
          notifications
            .map(
              (
                notification
              ) =>
                notification?.type
            )
            .filter(Boolean)
        );


      return Array.from(types);

    }, [
      notifications,
    ]);


  // ==========================================================
  // FILTRAGE + RECHERCHE + TRI
  // ==========================================================

  const filteredNotifications =
    useMemo(() => {

      const searchValue =
        search
          .trim()
          .toLowerCase();


      const result =
        notifications.filter(
          (
            notification
          ) => {

            // ----------------------------------------------
            // FILTRE LECTURE
            // ----------------------------------------------

            if (
              activeFilter ===
              FILTERS.UNREAD &&
              notification?.est_lue !== false
            ) {
              return false;
            }


            if (
              activeFilter ===
              FILTERS.READ &&
              notification?.est_lue !== true
            ) {
              return false;
            }


            // ----------------------------------------------
            // FILTRE TYPE
            // ----------------------------------------------

            if (
              activeType !== "all" &&
              notification?.type !== activeType
            ) {
              return false;
            }


            // ----------------------------------------------
            // RECHERCHE
            // ----------------------------------------------

            if (
              searchValue
            ) {

              const title =
                String(
                  notification?.titre ||
                  ""
                ).toLowerCase();


              const message =
                String(
                  notification?.message ||
                  ""
                ).toLowerCase();


              const typeLabel =
                getNotificationLabel(
                  notification
                ).toLowerCase();


              const matches =
                title.includes(
                  searchValue
                ) ||
                message.includes(
                  searchValue
                ) ||
                typeLabel.includes(
                  searchValue
                );


              if (!matches) {
                return false;
              }
            }


            return true;
          }
        );


      // ----------------------------------------------
      // TRI
      // ----------------------------------------------

      result.sort(
        (
          first,
          second
        ) => {

          const firstDate =
            new Date(
              getNotificationDate(
                first
              ) || 0
            ).getTime();


          const secondDate =
            new Date(
              getNotificationDate(
                second
              ) || 0
            ).getTime();


          if (
            sortOrder ===
            "old"
          ) {

            return (
              firstDate -
              secondDate
            );

          }


          return (
            secondDate -
            firstDate
          );
        }
      );


      return result;

    }, [
      notifications,
      activeFilter,
      activeType,
      search,
      sortOrder,
    ]);


  // ==========================================================
  // MARQUER UNE NOTIFICATION LUE
  // ==========================================================

  async function handleMarkAsRead(
    notification
  ) {

    if (
      !notification?.id ||
      notification.est_lue === true
    ) {
      return;
    }


    const id =
      notification.id;


    if (
      processingIds.includes(id)
    ) {
      return;
    }


    setProcessingIds(
      (
        current
      ) => [
        ...current,
        id,
      ]
    );


    try {

      await markNotificationAsRead(
        id
      );


      const now =
        new Date().toISOString();


      setNotifications(
        (
          current
        ) =>
          current.map(
            (
              item
            ) =>
              item.id === id
                ? {
                    ...item,
                    est_lue: true,
                    date_lecture:
                      item.date_lecture ||
                      now,
                  }
                : item
          )
      );

    } catch (err) {

      console.error(
        "Erreur marquage notification :",
        err
      );


      setError(
        err?.message ||
        "Impossible de marquer cette notification comme lue."
      );

    } finally {

      setProcessingIds(
        (
          current
        ) =>
          current.filter(
            (
              currentId
            ) =>
              currentId !== id
          )
      );

    }
  }


  // ==========================================================
  // MARQUER TOUT COMME LU
  // ==========================================================

  async function handleMarkAllAsRead() {

    if (
      unreadCount === 0 ||
      markingAll
    ) {
      return;
    }


    try {

      setMarkingAll(true);

      setError("");


      await markAllNotificationsAsRead();


      const now =
        new Date().toISOString();


      setNotifications(
        (
          current
        ) =>
          current.map(
            (
              notification
            ) => ({
              ...notification,
              est_lue: true,
              date_lecture:
                notification.date_lecture ||
                now,
            })
          )
      );

    } catch (err) {

      console.error(
        "Erreur marquage global :",
        err
      );


      setError(
        err?.message ||
        "Impossible de marquer toutes les notifications comme lues."
      );

    } finally {

      setMarkingAll(false);

    }
  }


  // ==========================================================
  // CLIQUER SUR UNE NOTIFICATION
  // ==========================================================

  async function handleOpenNotification(
    notification
  ) {

    await handleMarkAsRead(
      notification
    );


    const lien =
      notification?.lien;


    if (!lien) {
      return;
    }


    if (
      isInternalLink(
        lien
      )
    ) {

      navigate(
        lien
      );

      return;
    }


    window.open(
      lien,
      "_blank",
      "noopener,noreferrer"
    );
  }


  // ==========================================================
  // EFFACER FILTRES
  // ==========================================================

  function clearFilters() {

    setSearch("");

    setActiveFilter(
      FILTERS.ALL
    );

    setActiveType(
      "all"
    );

    setSortOrder(
      "recent"
    );

  }


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

    return (
      <main className="page notifications-page">

        <div className="container">

          <div className="loading-state">

            <div className="spinner spinner-lg" />

            <h2>
              Chargement des notifications...
            </h2>

            <p>
              Nous récupérons vos dernières
              informations.
            </p>

          </div>

        </div>

      </main>
    );
  }


  // ==========================================================
  // AFFICHAGE
  // ==========================================================

  return (
    <main className="page notifications-page">

      {/* ====================================================
          HEADER
      ===================================================== */}

      <section className="notifications-header">

        <div className="container">

          <Link
            to="/dashboard"
            className="btn btn-ghost"
          >

            <Icon
              name="arrow-left"
              size={17}
            />

            Retour au tableau de bord

          </Link>


          <div className="notifications-header-main">

            <div>

              <span className="section-eyebrow">
                CENTRE DE NOTIFICATIONS
              </span>

              <h1>
                Vos notifications
              </h1>

              <p>
                Retrouvez ici les informations
                importantes liées à votre activité
                sur AgroMarket Burkina.
              </p>

            </div>


            <div className="notifications-header-icon">

              <Icon
                name="bell"
                size={30}
              />


              {unreadCount > 0 && (
                <span>
                  {unreadCount}
                </span>
              )}

            </div>

          </div>

        </div>

      </section>


      {/* ====================================================
          CONTENU
      ===================================================== */}

      <section className="notifications-content page-section-sm">

        <div className="container">

          {/* ==================================================
              ERREUR
          =================================================== */}

          {error && (

            <div
              className="alert alert-warning"
              role="alert"
            >

              <div>

                <strong>
                  Impossible de charger les notifications
                </strong>

                <p>
                  {error}
                </p>

              </div>


              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() =>
                  loadNotifications()
                }
              >
                Réessayer
              </button>

            </div>

          )}


          {/* ==================================================
              RÉSUMÉ
          =================================================== */}

          <div className="notifications-summary">

            <div className="notification-summary-card">

              <span>
                Total
              </span>

              <strong>
                {totalCount}
              </strong>

            </div>


            <div className="notification-summary-card">

              <span>
                Non lues
              </span>

              <strong>
                {unreadCount}
              </strong>

            </div>


            <div className="notification-summary-card">

              <span>
                Lues
              </span>

              <strong>
                {readCount}
              </strong>

            </div>

          </div>


          {/* ==================================================
              OUTILS
          =================================================== */}

          <div className="notifications-toolbar">

            <div className="notifications-search">

              <Icon
                name="search"
                size={18}
              />

              <input
                type="search"
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Rechercher une notification..."
                aria-label="Rechercher une notification"
              />

            </div>


            <div className="notifications-toolbar-actions">

              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() =>
                  loadNotifications()
                }
                disabled={
                  refreshing
                }
              >

                <Icon
                  name="refresh"
                  size={16}
                />

                {refreshing
                  ? "Actualisation..."
                  : "Actualiser"}

              </button>


              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={
                  handleMarkAllAsRead
                }
                disabled={
                  unreadCount === 0 ||
                  markingAll
                }
              >

                <Icon
                  name="check-double"
                  size={16}
                />

                {markingAll
                  ? "Traitement..."
                  : "Tout marquer comme lu"}

              </button>

            </div>

          </div>


          {/* ==================================================
              FILTRES
          =================================================== */}

          <div className="notifications-filter-panel">

            <div className="notifications-filter-group">

              <span>
                <Icon
                  name="filter"
                  size={15}
                />
                État
              </span>


              <button
                type="button"
                className={
                  activeFilter ===
                  FILTERS.ALL
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveFilter(
                    FILTERS.ALL
                  )
                }
              >
                Toutes
                <small>
                  {totalCount}
                </small>
              </button>


              <button
                type="button"
                className={
                  activeFilter ===
                  FILTERS.UNREAD
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveFilter(
                    FILTERS.UNREAD
                  )
                }
              >
                Non lues
                <small>
                  {unreadCount}
                </small>
              </button>


              <button
                type="button"
                className={
                  activeFilter ===
                  FILTERS.READ
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveFilter(
                    FILTERS.READ
                  )
                }
              >
                Lues
                <small>
                  {readCount}
                </small>
              </button>

            </div>


            <div className="notifications-filter-group">

              <span>
                Type
              </span>


              <select
                value={
                  activeType
                }
                onChange={(
                  event
                ) =>
                  setActiveType(
                    event.target.value
                  )
                }
              >

                <option value="all">
                  Tous les types
                </option>


                {availableTypes.map(
                  (
                    type
                  ) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {
                        NOTIFICATION_TYPES[
                          type
                        ]?.label ||
                        type
                      }
                    </option>
                  )
                )}

              </select>

            </div>


            <div className="notifications-filter-group">

              <span>
                Tri
              </span>


              <select
                value={
                  sortOrder
                }
                onChange={(
                  event
                ) =>
                  setSortOrder(
                    event.target.value
                  )
                }
              >

                <option value="recent">
                  Plus récentes
                </option>

                <option value="old">
                  Plus anciennes
                </option>

              </select>

            </div>


            {(search ||
              activeFilter !== FILTERS.ALL ||
              activeType !== "all") && (

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={
                  clearFilters
                }
              >
                Réinitialiser les filtres
              </button>

            )}

          </div>


          {/* ==================================================
              RÉSULTAT
          =================================================== */}

          <div className="notifications-results-header">

            <span>
              {filteredNotifications.length} notification
              {filteredNotifications.length !== 1
                ? "s"
                : ""}{" "}
              affichée
              {filteredNotifications.length !== 1
                ? "s"
                : ""}
            </span>

          </div>


          {/* ==================================================
              AUCUN RÉSULTAT
          =================================================== */}

          {filteredNotifications.length === 0 ? (

            <div className="empty-state">

              <div className="empty-state-icon">

                <Icon
                  name={
                    search ||
                    activeFilter !== FILTERS.ALL ||
                    activeType !== "all"
                      ? "search"
                      : "bell"
                  }
                  size={26}
                />

              </div>


              <h2 className="empty-state-title">

                {search ||
                activeFilter !== FILTERS.ALL ||
                activeType !== "all"
                  ? "Aucune notification trouvée"
                  : "Aucune notification"}

              </h2>


              <p className="empty-state-description">

                {search ||
                activeFilter !== FILTERS.ALL ||
                activeType !== "all"
                  ? "Aucune notification ne correspond aux critères sélectionnés."
                  : "Vous n'avez encore reçu aucune notification."}

              </p>


              {(search ||
                activeFilter !== FILTERS.ALL ||
                activeType !== "all") && (

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={
                    clearFilters
                  }
                >
                  Afficher toutes les notifications
                </button>

              )}

            </div>

          ) : (

            /* =================================================
               LISTE
            ================================================== */

            <div className="notifications-list">

              {filteredNotifications.map(
                (
                  notification
                ) => {

                  const meta =
                    getNotificationMeta(
                      notification
                    );


                  const isProcessing =
                    processingIds.includes(
                      notification?.id
                    );


                  const notificationDate =
                    getNotificationDate(
                      notification
                    );


                  return (
                    <article
                      key={
                        notification.id
                      }
                      className={`card notification-card ${
                        notification.est_lue
                          ? "read"
                          : "unread"
                      }`}
                    >

                      {/* --------------------------------------
                          ICÔNE
                      --------------------------------------- */}

                      <div
                        className={`notification-icon notification-icon-${meta.tone}`}
                      >

                        <Icon
                          name={
                            meta.icon
                          }
                          size={21}
                        />

                      </div>


                      {/* --------------------------------------
                          CONTENU
                      --------------------------------------- */}

                      <div className="notification-content">

                        <div className="notification-top">

                          <div>

                            <div className="notification-label-row">

                              <span
                                className={`notification-type notification-type-${meta.tone}`}
                              >
                                {meta.label}
                              </span>


                              {!notification.est_lue && (

                                <span className="notification-new-badge">
                                  Nouveau
                                </span>

                              )}

                            </div>


                            <h2>
                              {
                                notification.titre ||
                                meta.label ||
                                "Notification AgroMarket"
                              }
                            </h2>

                          </div>


                          <time
                            dateTime={
                              notificationDate ||
                              undefined
                            }
                            title={
                              formatDate(
                                notificationDate
                              )
                            }
                          >
                            {
                              formatRelativeDate(
                                notificationDate
                              )
                            }
                          </time>

                        </div>


                        <p className="notification-message">

                          {
                            notification.message ||
                            "Vous avez reçu une nouvelle notification."
                          }

                        </p>


                        <div className="notification-bottom">

                          <div className="notification-meta">

                            <span>
                              {
                                formatDate(
                                  notificationDate
                                )
                              }
                            </span>


                            {notification.est_lue && (

                              <span className="notification-read-status">

                                <Icon
                                  name="check"
                                  size={14}
                                />

                                Lue

                              </span>

                            )}

                          </div>


                          <div className="notification-actions">

                            {notification.lien && (

                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() =>
                                  handleOpenNotification(
                                    notification
                                  )
                                }
                              >

                                Voir

                                <Icon
                                  name="arrow"
                                  size={15}
                                />

                              </button>

                            )}


                            {!notification.est_lue && (

                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() =>
                                  handleMarkAsRead(
                                    notification
                                  )
                                }
                                disabled={
                                  isProcessing
                                }
                              >

                                {isProcessing ? (

                                  <>
                                    <span className="spinner spinner-sm" />
                                    Traitement...
                                  </>

                                ) : (

                                  <>
                                    <Icon
                                      name="check"
                                      size={15}
                                    />

                                    Marquer comme lue
                                  </>

                                )}

                              </button>

                            )}

                          </div>

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

            </div>

          )}

        </div>

      </section>

    </main>
  );
}


export default Notifications;