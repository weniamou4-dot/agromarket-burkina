// src/pages/Dashboard.jsx

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
import "../styles/pages/dashboard.css";
import {
  useAuth,
} from "../context/AuthContext";

import {
  getCurrentUser,
} from "../services/api/auth";

import {
  getMesCommandes,
  getCommandesRecues,
} from "../services/api/orders";

import {
  getMyAnnonces,
} from "../services/api/products";

import {
  apiRequest,
} from "../services/api/client";


/*
 * ============================================================
 * RÔLES
 * ============================================================
 */

const ROLES = Object.freeze({
  ACHETEUR: "acheteur",
  VENDEUR: "vendeur",
  MODERATEUR: "moderateur",
  ADMIN: "admin",
  ADMINISTRATEUR: "administrateur",
});


/*
 * ============================================================
 * STATUTS COMMANDES
 * ============================================================
 */

const ORDER_STATUS = Object.freeze({
  EN_ATTENTE: "en_attente",
  CONFIRMEE: "confirmee",
  PREPAREE: "preparee",
  LIVREE: "livree",
  ANNULEE: "annulee",
});


/*
 * ============================================================
 * ICÔNES
 * ============================================================
 */

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
    "aria-hidden": true,
  };

  switch (name) {
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

    case "shopping":
      return (
        <svg {...common}>
          <path d="M6 7h12l1 13H5L6 7Z" />
          <path d="M9 7a3 3 0 0 1 6 0" />
          <path d="M9 11v2" />
          <path d="M15 11v2" />
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

    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );

    case "user":
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="8"
            r="3"
          />
          <path d="M5 21c.7-4 3-6 7-6s6.3 2 7 6" />
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

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 20 6v5c0 5-3.2 8.6-8 10-4.8-1.4-8-5-8-10V6l8-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );

    case "admin":
      return (
        <svg {...common}>
          <path d="M12 3 20 7v5c0 4.5-3 7.8-8 9-5-1.2-8-4.5-8-9V7l8-4Z" />
          <path d="M9 12h6" />
          <path d="M12 9v6" />
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
          <path d="m16 16 4 4" />
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

    case "star":
      return (
        <svg {...common}>
          <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z" />
        </svg>
      );

    default:
      return null;
  }
}


/*
 * ============================================================
 * UTILITAIRES
 * ============================================================
 */

function formatNumber(value) {
  return Number(
    value || 0
  ).toLocaleString(
    "fr-FR"
  );
}


function formatMoney(value) {
  return `${formatNumber(value)} FCFA`;
}


function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}


function getRoleLabel(role) {
  switch (role) {
    case ROLES.ACHETEUR:
      return "Acheteur";

    case ROLES.VENDEUR:
      return "Vendeur";

    case ROLES.MODERATEUR:
      return "Modérateur";

    case ROLES.ADMIN:
    case ROLES.ADMINISTRATEUR:
      return "Administrateur";

    default:
      return "Utilisateur";
  }
}


function getStatusLabel(status) {
  switch (status) {
    case ORDER_STATUS.EN_ATTENTE:
      return "En attente";

    case ORDER_STATUS.CONFIRMEE:
      return "Confirmée";

    case ORDER_STATUS.PREPAREE:
      return "Préparée";

    case ORDER_STATUS.LIVREE:
      return "Livrée";

    case ORDER_STATUS.ANNULEE:
      return "Annulée";

    default:
      return status || "Inconnu";
  }
}


function getProductName(order) {
  return (
    order?.annonce?.produit?.nom ||
    order?.produit?.nom ||
    order?.produit_nom ||
    `Commande #${order?.id || ""}`
  );
}


/*
 * ============================================================
 * CARTE KPI
 * ============================================================
 */

function KpiCard({
  icon,
  label,
  value,
  description,
}) {
  return (
    <article className="dashboard-kpi">

      <div className="dashboard-kpi-icon">
        <Icon
          name={icon}
          size={22}
        />
      </div>

      <div className="dashboard-kpi-content">

        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

        {description && (
          <small>
            {description}
          </small>
        )}

      </div>

    </article>
  );
}


/*
 * ============================================================
 * CARTE ACTION
 * ============================================================
 */

function ActionCard({
  icon,
  title,
  description,
  to,
  actionLabel,
}) {
  return (
    <Link
      to={to}
      className="dashboard-action-card"
    >

      <div className="dashboard-action-icon">
        <Icon
          name={icon}
          size={22}
        />
      </div>

      <div>

        <h3>
          {title}
        </h3>

        <p>
          {description}
        </p>

        <span>
          {actionLabel || "Accéder"}

          <Icon
            name="arrow"
            size={15}
          />
        </span>

      </div>

    </Link>
  );
}


/*
 * ============================================================
 * DASHBOARD
 * ============================================================
 */

function Dashboard() {

  const {
    user: authUser,
    refreshUser,
    isAuthenticated,
  } = useAuth();

  const navigate =
    useNavigate();


  /*
   * ==========================================================
   * DONNÉES UTILISATEUR
   * ==========================================================
   */

  const [
    user,
    setUser,
  ] = useState(
    authUser || null
  );


  /*
   * ==========================================================
   * COMMANDES
   * ==========================================================
   */

  const [
    myOrders,
    setMyOrders,
  ] = useState([]);

  const [
    receivedOrders,
    setReceivedOrders,
  ] = useState([]);


  /*
   * ==========================================================
   * ANNONCES VENDEUR
   * ==========================================================
   */

  const [
    myAnnonces,
    setMyAnnonces,
  ] = useState([]);


  /*
   * ==========================================================
   * DEMANDE VENDEUR
   * ==========================================================
   */

  const [
    sellerRequest,
    setSellerRequest,
  ] = useState(null);


  /*
   * ==========================================================
   * ÉTATS
   * ==========================================================
   */

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    requestLoading,
    setRequestLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");


  /*
   * ==========================================================
   * RÔLE
   * ==========================================================
   */

  const role =
    user?.role ||
    authUser?.role ||
    ROLES.ACHETEUR;


  const isAcheteur =
    role === ROLES.ACHETEUR;

  const isVendeur =
    role === ROLES.VENDEUR;

  const isModerateur =
    role === ROLES.MODERATEUR;

  const isAdmin =
    role === ROLES.ADMIN ||
    role === ROLES.ADMINISTRATEUR;


  /*
   * ==========================================================
   * SYNCHRONISER USER AUTH
   * ==========================================================
   */

  useEffect(() => {
    setUser(
      authUser || null
    );
  }, [
    authUser,
  ]);


  /*
   * ==========================================================
   * CHARGER LES DONNÉES
   * ==========================================================
   */

  const loadDashboard =
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
          setSuccess("");


          /*
           * Récupération de l'utilisateur réel.
           */

          const currentUser =
            await getCurrentUser();

          if (!currentUser) {
            navigate(
              "/connexion",
              {
                replace: true,
              }
            );

            return;
          }

          setUser(
            currentUser
          );


          /*
           * ----------------------------------------------------
           * ADMINISTRATEUR
           * ----------------------------------------------------
           *
           * On conserve le comportement existant :
           * l'administration possède son propre dashboard.
           */

          if (
            [
              ROLES.ADMIN,
              ROLES.ADMINISTRATEUR,
            ].includes(
              currentUser.role
            )
          ) {

            navigate(
              "/admin",
              {
                replace: true,
              }
            );

            return;
          }


          /*
           * ----------------------------------------------------
           * MODÉRATEUR
           * ----------------------------------------------------
           *
           * IMPORTANT :
           * Le modérateur reste maintenant sur /dashboard.
           *
           * Il pourra accéder à :
           *
           * /moderation/avis-plateforme
           *
           * depuis la section Administration.
           *
           * La sécurité réelle reste assurée par
           * ProtectedRoute dans routes.jsx.
           */

          if (
            currentUser.role ===
            ROLES.MODERATEUR
          ) {

            setMyOrders([]);
            setMyAnnonces([]);
            setReceivedOrders([]);
            setSellerRequest(null);

            return;
          }


          /*
           * ----------------------------------------------------
           * COMMANDES ACHETEUR
           * ----------------------------------------------------
           *
           * Un vendeur peut également être acheteur.
           */

          try {

            const orders =
              await getMesCommandes();

            setMyOrders(
              Array.isArray(orders)
                ? orders
                : orders?.commandes ||
                  []
            );

          } catch (orderError) {

            console.warn(
              "Impossible de charger les commandes acheteur :",
              orderError
            );

            setMyOrders([]);

          }


          /*
           * ----------------------------------------------------
           * VENDEUR
           * ----------------------------------------------------
           */

          if (
            currentUser.role ===
            ROLES.VENDEUR
          ) {

            try {

              const [
                annonces,
                recues,
              ] =
                await Promise.all([
                  getMyAnnonces(),
                  getCommandesRecues(),
                ]);


              setMyAnnonces(
                Array.isArray(
                  annonces
                )
                  ? annonces
                  : annonces?.annonces ||
                    []
              );


              setReceivedOrders(
                Array.isArray(
                  recues
                )
                  ? recues
                  : recues?.commandes ||
                    []
              );

            } catch (sellerError) {

              console.warn(
                "Erreur données vendeur :",
                sellerError
              );

              setMyAnnonces([]);
              setReceivedOrders([]);

            }

          } else {

            setMyAnnonces([]);
            setReceivedOrders([]);

          }


          /*
           * ----------------------------------------------------
           * ACHETEUR
           * ----------------------------------------------------
           */

          if (
            currentUser.role ===
            ROLES.ACHETEUR
          ) {

            try {

              const request =
                await apiRequest(
                  "/users/me/demande-vendeur",
                  {
                    method: "GET",
                  }
                );

              setSellerRequest(
                request || null
              );

            } catch (requestError) {

              console.warn(
                "Impossible de récupérer la demande vendeur :",
                requestError
              );

              setSellerRequest(null);

            }

          } else {

            setSellerRequest(null);

          }

        } catch (err) {

          console.error(
            "Erreur dashboard :",
            err
          );

          setError(
            err?.message ||
            "Impossible de charger votre tableau de bord."
          );

        } finally {

          setLoading(false);
          setRefreshing(false);

        }

      },
      [
        navigate,
      ]
    );


  /*
   * ==========================================================
   * INITIALISATION
   * ==========================================================
   */

  useEffect(() => {

    if (
      isAuthenticated === false
    ) {

      setLoading(false);

      return;
    }

    loadDashboard({
      initial: true,
    });

  }, [
    isAuthenticated,
    loadDashboard,
  ]);


  /*
   * ==========================================================
   * DEMANDE POUR DEVENIR VENDEUR
   * ==========================================================
   */

  async function handleSellerRequest() {

    if (!isAcheteur) {
      return;
    }

    if (
      sellerRequest?.statut ===
      "en_attente"
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        "Voulez-vous envoyer une demande pour devenir vendeur sur AgroMarket ?"
      );

    if (!confirmed) {
      return;
    }


    try {

      setRequestLoading(true);
      setError("");
      setSuccess("");


      const response =
        await apiRequest(
          "/users/me/demande-vendeur",
          {
            method: "POST",
          }
        );


      setSellerRequest(
        response
      );


      setSuccess(
        "Votre demande vendeur a été envoyée. Elle sera examinée par l'administration."
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

    } finally {

      setRequestLoading(false);

    }
  }


  /*
   * ==========================================================
   * STATISTIQUES ACHETEUR
   * ==========================================================
   */

  const buyerStats =
    useMemo(() => {

      const pending =
        myOrders.filter(
          (order) =>
            order?.statut ===
            ORDER_STATUS.EN_ATTENTE
        ).length;


      const confirmed =
        myOrders.filter(
          (order) =>
            [
              ORDER_STATUS.CONFIRMEE,
              ORDER_STATUS.PREPAREE,
            ].includes(
              order?.statut
            )
        ).length;


      const delivered =
        myOrders.filter(
          (order) =>
            order?.statut ===
            ORDER_STATUS.LIVREE
        ).length;


      const totalSpent =
        myOrders.reduce(
          (total, order) =>
            total +
            Number(
              order?.prix_total ||
              0
            ),
          0
        );


      return {
        total: myOrders.length,
        pending,
        confirmed,
        delivered,
        totalSpent,
      };

    }, [
      myOrders,
    ]);


  /*
   * ==========================================================
   * STATISTIQUES VENDEUR
   * ==========================================================
   */

  const sellerStats =
    useMemo(() => {

      const pendingOrders =
        receivedOrders.filter(
          (order) =>
            order?.statut ===
            ORDER_STATUS.EN_ATTENTE
        ).length;


      const confirmedOrders =
        receivedOrders.filter(
          (order) =>
            [
              ORDER_STATUS.CONFIRMEE,
              ORDER_STATUS.PREPAREE,
            ].includes(
              order?.statut
            )
        ).length;


      const deliveredOrders =
        receivedOrders.filter(
          (order) =>
            order?.statut ===
            ORDER_STATUS.LIVREE
        ).length;


      const sales =
        receivedOrders.reduce(
          (total, order) =>
            total +
            Number(
              order?.prix_total ||
              0
            ),
          0
        );


      return {
        annonces:
          myAnnonces.length,

        totalOrders:
          receivedOrders.length,

        pendingOrders,

        confirmedOrders,

        deliveredOrders,

        sales,
      };

    }, [
      myAnnonces,
      receivedOrders,
    ]);


  /*
   * ==========================================================
   * DERNIÈRES COMMANDES ACHETEUR
   * ==========================================================
   */

  const latestBuyerOrders =
    useMemo(
      () =>
        [...myOrders]
          .sort(
            (a, b) =>
              new Date(
                b?.date_commande ||
                0
              ) -
              new Date(
                a?.date_commande ||
                0
              )
          )
          .slice(0, 5),
      [
        myOrders,
      ]
    );


  /*
   * ==========================================================
   * DERNIÈRES COMMANDES VENDEUR
   * ==========================================================
   */

  const latestSellerOrders =
    useMemo(
      () =>
        [...receivedOrders]
          .sort(
            (a, b) =>
              new Date(
                b?.date_commande ||
                0
              ) -
              new Date(
                a?.date_commande ||
                0
              )
          )
          .slice(0, 5),
      [
        receivedOrders,
      ]
    );


  /*
   * ==========================================================
   * AUTHENTIFICATION
   * ==========================================================
   */

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


  /*
   * ==========================================================
   * CHARGEMENT
   * ==========================================================
   */

  if (loading) {

    return (
      <main className="dashboard-page">

        <div className="dashboard-loading">

          <div className="loading-spinner" />

          <h1>
            Préparation de votre espace...
          </h1>

          <p>
            Chargement de vos informations.
          </p>

        </div>

      </main>
    );
  }


  /*
   * ==========================================================
   * AFFICHAGE
   * ==========================================================
   */

  return (
    <main className="dashboard-page">

      {/* ======================================================
          HEADER
      ======================================================= */}

      <section className="dashboard-header">

        <div className="dashboard-header-content">

          <div>

            <span className="dashboard-eyebrow">
              ESPACE PERSONNEL
            </span>

            <h1>
              Bonjour{" "}
              {user?.nom ||
                "et bienvenue"}
            </h1>

            <p>
              Retrouvez ici les informations
              essentielles de votre compte AgroMarket.
            </p>

          </div>


          <div className="dashboard-role">

            <span>
              Votre rôle
            </span>

            <strong>
              {getRoleLabel(role)}
            </strong>

          </div>

        </div>

      </section>


      {/* ======================================================
          CONTENU
      ======================================================= */}

      <div className="dashboard-container">

        {/* ====================================================
            ALERTES
        ===================================================== */}

        {error && (
          <div className="dashboard-alert dashboard-alert-error">

            <strong>
              Erreur
            </strong>

            <span>
              {error}
            </span>

          </div>
        )}


        {success && (
          <div className="dashboard-alert dashboard-alert-success">

            <strong>
              Succès
            </strong>

            <span>
              {success}
            </span>

          </div>
        )}


        {/* ====================================================
            ACHETEUR
        ===================================================== */}

        {isAcheteur && (

          <>

            {/* KPI */}

            <section className="dashboard-kpi-grid">

              <KpiCard
                icon="shopping"
                label="Mes commandes"
                value={
                  buyerStats.total
                }
                description="Commandes passées"
              />

              <KpiCard
                icon="clock"
                label="En attente"
                value={
                  buyerStats.pending
                }
                description="À surveiller"
              />

              <KpiCard
                icon="check"
                label="Livrées"
                value={
                  buyerStats.delivered
                }
                description="Commandes reçues"
              />

              <KpiCard
                icon="shopping"
                label="Total dépensé"
                value={
                  formatMoney(
                    buyerStats.totalSpent
                  )
                }
                description="Sur vos commandes"
              />

            </section>


            {/* ACTIONS */}

            <section className="dashboard-section">

              <div className="dashboard-section-header">

                <div>

                  <span>
                    ACCÈS RAPIDES
                  </span>

                  <h2>
                    Que souhaitez-vous faire ?
                  </h2>

                </div>

              </div>


              <div className="dashboard-action-grid">

                <ActionCard
                  icon="search"
                  title="Rechercher des produits"
                  description="Explorez les offres agricoles disponibles."
                  to="/produits"
                  actionLabel="Voir les produits"
                />

                <ActionCard
                  icon="shopping"
                  title="Mes commandes"
                  description="Consultez et suivez vos commandes."
                  to="/commandes"
                  actionLabel="Voir mes commandes"
                />

                <ActionCard
                  icon="user"
                  title="Mon profil"
                  description="Gérez vos informations personnelles."
                  to="/profil"
                  actionLabel="Gérer mon profil"
                />

              </div>

            </section>


            {/* DEMANDE VENDEUR */}

            <section className="dashboard-section">

              <div className="dashboard-seller-upgrade">

                <div className="dashboard-seller-upgrade-icon">

                  <Icon
                    name="store"
                    size={26}
                  />

                </div>

                <div className="dashboard-seller-upgrade-content">

                  <span>
                    ÉVOLUEZ SUR AGROMARKET
                  </span>

                  <h2>
                    Vous souhaitez vendre vos produits ?
                  </h2>

                  <p>
                    Envoyez une demande à l'administration
                    pour obtenir le statut vendeur.
                  </p>


                  {sellerRequest?.statut ===
                    "en_attente" ? (

                    <div className="dashboard-request-status">

                      <Icon
                        name="clock"
                        size={17}
                      />

                      Demande en attente d'examen

                    </div>

                  ) : sellerRequest?.statut ===
                    "acceptee" ? (

                    <div className="dashboard-request-status success">

                      <Icon
                        name="check"
                        size={17}
                      />

                      Demande acceptée

                    </div>

                  ) : sellerRequest?.statut ===
                    "refusee" ? (

                    <div>

                      <div className="dashboard-request-status danger">

                        Votre demande a été refusée.

                      </div>

                      <button
                        type="button"
                        className="dashboard-primary-button"
                        onClick={
                          handleSellerRequest
                        }
                        disabled={
                          requestLoading
                        }
                      >
                        {requestLoading
                          ? "Envoi..."
                          : "Envoyer une nouvelle demande"}
                      </button>

                    </div>

                  ) : (

                    <button
                      type="button"
                      className="dashboard-primary-button"
                      onClick={
                        handleSellerRequest
                      }
                      disabled={
                        requestLoading
                      }
                    >

                      <Icon
                        name="store"
                        size={17}
                      />

                      {requestLoading
                        ? "Envoi de la demande..."
                        : "Demander le statut vendeur"}

                    </button>

                  )}

                </div>

              </div>

            </section>


            {/* COMMANDES */}

            <section className="dashboard-section">

              <div className="dashboard-section-header">

                <div>

                  <span>
                    ACTIVITÉ RÉCENTE
                  </span>

                  <h2>
                    Mes dernières commandes
                  </h2>

                </div>


                <Link
                  to="/commandes"
                  className="dashboard-section-link"
                >
                  Voir tout

                  <Icon
                    name="arrow"
                    size={15}
                  />

                </Link>

              </div>


              {latestBuyerOrders.length === 0 ? (

                <div className="dashboard-empty">

                  <Icon
                    name="shopping"
                    size={30}
                  />

                  <h3>
                    Aucune commande
                  </h3>

                  <p>
                    Vous n'avez pas encore passé
                    de commande.
                  </p>

                  <Link
                    to="/produits"
                    className="dashboard-primary-button"
                  >
                    Découvrir les produits
                  </Link>

                </div>

              ) : (

                <div className="dashboard-orders-list">

                  {latestBuyerOrders.map(
                    (order) => (

                      <Link
                        key={order.id}
                        to={`/commandes/${order.id}`}
                        className="dashboard-order-row"
                      >

                        <div className="dashboard-order-icon">

                          <Icon
                            name="shopping"
                            size={19}
                          />

                        </div>


                        <div className="dashboard-order-info">

                          <strong>
                            {
                              getProductName(
                                order
                              )
                            }
                          </strong>

                          <span>
                            Commande #
                            {order.id}

                            {" · "}

                            {
                              formatDate(
                                order.date_commande
                              )
                            }
                          </span>

                        </div>


                        <div>

                          <strong>
                            {
                              formatMoney(
                                order.prix_total
                              )
                            }
                          </strong>

                          <span className="dashboard-status">
                            {
                              getStatusLabel(
                                order.statut
                              )
                            }
                          </span>

                        </div>

                      </Link>

                    )
                  )}

                </div>

              )}

            </section>

          </>

        )}


        {/* ====================================================
            VENDEUR
        ===================================================== */}

        {isVendeur && (

          <>

            {/* KPI VENDEUR */}

            <section className="dashboard-kpi-grid">

              <KpiCard
                icon="package"
                label="Mes annonces"
                value={
                  sellerStats.annonces
                }
                description="Annonces créées"
              />

              <KpiCard
                icon="shopping"
                label="Commandes reçues"
                value={
                  sellerStats.totalOrders
                }
                description="Toutes les commandes"
              />

              <KpiCard
                icon="clock"
                label="À traiter"
                value={
                  sellerStats.pendingOrders
                }
                description="Commandes en attente"
              />

              <KpiCard
                icon="store"
                label="Ventes"
                value={
                  formatMoney(
                    sellerStats.sales
                  )
                }
                description="Montant des commandes"
              />

            </section>


            {/* ACTIONS VENDEUR */}

            <section className="dashboard-section">

              <div className="dashboard-section-header">

                <div>

                  <span>
                    ESPACE VENDEUR
                  </span>

                  <h2>
                    Gérez votre activité
                  </h2>

                </div>

              </div>


              <div className="dashboard-action-grid">

                <ActionCard
                  icon="plus"
                  title="Publier une annonce"
                  description="Mettez un nouveau produit en vente."
                  to="/publier"
                  actionLabel="Publier"
                />

                <ActionCard
                  icon="package"
                  title="Mes annonces"
                  description="Consultez vos offres et leur statut."
                  to="/mes-annonces"
                  actionLabel="Gérer mes annonces"
                />

                <ActionCard
                  icon="shopping"
                  title="Commandes reçues"
                  description="Traitez les commandes de vos acheteurs."
                  to="/commandes"
                  actionLabel="Voir les commandes"
                />

                <ActionCard
                  icon="user"
                  title="Mon profil"
                  description="Gérez les informations de votre compte."
                  to="/profil"
                  actionLabel="Mon profil"
                />

              </div>

            </section>


            {/* COMMANDES REÇUES */}

            <section className="dashboard-section">

              <div className="dashboard-section-header">

                <div>

                  <span>
                    ACTIVITÉ COMMERCIALE
                  </span>

                  <h2>
                    Dernières commandes reçues
                  </h2>

                </div>


                <Link
                  to="/commandes"
                  className="dashboard-section-link"
                >
                  Voir tout

                  <Icon
                    name="arrow"
                    size={15}
                  />

                </Link>

              </div>


              {latestSellerOrders.length === 0 ? (

                <div className="dashboard-empty">

                  <Icon
                    name="shopping"
                    size={30}
                  />

                  <h3>
                    Aucune commande reçue
                  </h3>

                  <p>
                    Les nouvelles commandes
                    apparaîtront ici.
                  </p>

                </div>

              ) : (

                <div className="dashboard-orders-list">

                  {latestSellerOrders.map(
                    (order) => (

                      <Link
                        key={order.id}
                        to={`/commandes/${order.id}`}
                        className="dashboard-order-row"
                      >

                        <div className="dashboard-order-icon">

                          <Icon
                            name="shopping"
                            size={19}
                          />

                        </div>


                        <div className="dashboard-order-info">

                          <strong>
                            {
                              getProductName(
                                order
                              )
                            }
                          </strong>

                          <span>
                            Commande #
                            {order.id}

                            {" · "}

                            {
                              formatDate(
                                order.date_commande
                              )
                            }
                          </span>

                        </div>


                        <div>

                          <strong>
                            {
                              formatMoney(
                                order.prix_total
                              )
                            }
                          </strong>

                          <span className="dashboard-status">
                            {
                              getStatusLabel(
                                order.statut
                              )
                            }
                          </span>

                        </div>

                      </Link>

                    )
                  )}

                </div>

              )}

            </section>

          </>

        )}


        {/* ====================================================
            MODÉRATEUR / ADMINISTRATION
        ===================================================== */}

        {(isModerateur || isAdmin) && (

          <section className="dashboard-section">

            <div className="dashboard-section-header">

              <div>

                <span>
                  ADMINISTRATION
                </span>

                <h2>
                  Gestion de la plateforme
                </h2>

              </div>

            </div>


            <div className="dashboard-action-grid">

              {/* MODÉRATION DES AVIS */}

              <ActionCard
                icon="star"
                title="Modérer les avis"
                description="Consultez, masquez ou réactivez les avis publiés sur AgroMarket."
                to="/moderation/avis-plateforme"
                actionLabel="Gérer les avis"
              />


              {/* MODÉRATION DES ANNONCES */}

              {isModerateur && (
                <ActionCard
                  icon="shield"
                  title="Modérer les annonces"
                  description="Consultez et gérez les annonces soumises à la modération."
                  to="/moderation"
                  actionLabel="Gérer les annonces"
                />
              )}


              {/* ADMINISTRATION */}

              {isAdmin && (
                <ActionCard
                  icon="admin"
                  title="Administration"
                  description="Accédez aux fonctionnalités d'administration de la plateforme."
                  to="/admin"
                  actionLabel="Ouvrir l'administration"
                />
              )}


              {/* HISTORIQUE */}

              {(isModerateur || isAdmin) && (
                <ActionCard
                  icon="clock"
                  title="Historique"
                  description="Consultez les opérations et événements enregistrés sur la plateforme."
                  to="/historique"
                  actionLabel="Voir l'historique"
                />
              )}

            </div>

          </section>

        )}


        {/* ====================================================
            SÉCURITÉ DE SECOURS
        ===================================================== */}

        {!isAcheteur &&
          !isVendeur &&
          !isAdmin &&
          !isModerateur && (

            <section className="dashboard-section">

              <div className="dashboard-empty">

                <Icon
                  name="shield"
                  size={30}
                />

                <h3>
                  Rôle non reconnu
                </h3>

                <p>
                  Le rôle de votre compte n'est pas
                  reconnu par l'application.
                </p>

                <button
                  type="button"
                  className="dashboard-primary-button"
                  onClick={
                    async () => {

                      try {

                        await refreshUser();

                        window.location.reload();

                      } catch {

                        navigate(
                          "/connexion"
                        );

                      }

                    }
                  }
                >
                  Actualiser mon profil
                </button>

              </div>

            </section>

          )}


        {/* ====================================================
            PIED DE PAGE DASHBOARD
        ===================================================== */}

        <footer className="dashboard-footer">

          <div>

            <strong>
              AgroMarket Burkina
            </strong>

            <span>
              Votre plateforme agricole.
            </span>

          </div>


          <div className="dashboard-footer-links">

            <Link to="/produits">
              Produits
            </Link>

            <Link to="/profil">
              Profil
            </Link>

            {isVendeur && (
              <Link to="/publier">
                Publier
              </Link>
            )}

            {isModerateur && (
              <Link to="/moderation/avis-plateforme">
                Modération
              </Link>
            )}

          </div>

        </footer>

      </div>

    </main>
  );
}


export default Dashboard;