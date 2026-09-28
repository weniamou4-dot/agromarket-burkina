import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";
import "../styles/pages/orders.css"
import {
  getMesCommandes,
  getCommandesRecues,
} from "../services/api/orders";

import {
  getCurrentUser,
} from "../services/api/auth";


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
    case "shopping":
      return (
        <svg {...common}>
          <path d="M5 8h14l-1 11H6L5 8Z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
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

    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "close":
      return (
        <svg {...common}>
          <path d="m6 6 12 12" />
          <path d="m18 6-12 12" />
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

    case "filter":
      return (
        <svg {...common}>
          <path d="M4 6h16" />
          <path d="M7 12h10" />
          <path d="M10 18h4" />
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

function formatPrice(value) {
  return Number(value || 0).toLocaleString(
    "fr-FR"
  );
}


function formatDate(value) {
  if (!value) {
    return "Date inconnue";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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


function getStatusLabel(status) {
  switch (status) {
    case "en_attente":
      return "En attente";

    case "acceptee":
      return "Acceptée";

    case "en_cours":
      return "En cours";

    case "livree":
      return "Livrée";

    case "refusee":
      return "Refusée";

    case "annulee":
      return "Annulée";

    default:
      return status || "Inconnu";
  }
}


function getStatusClass(status) {
  switch (status) {
    case "livree":
    case "acceptee":
      return "success";

    case "en_attente":
    case "en_cours":
      return "warning";

    case "refusee":
    case "annulee":
      return "danger";

    default:
      return "neutral";
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
 * PAGE COMMANDES
 * ============================================================
 */

function Orders() {
  const [
    currentUser,
    setCurrentUser,
  ] = useState(null);

  const [
    myOrders,
    setMyOrders,
  ] = useState([]);

  const [
    receivedOrders,
    setReceivedOrders,
  ] = useState([]);

  const [activeTab, setActiveTab] =
    useState("mine");

  const [
    activeStatus,
    setActiveStatus,
  ] = useState("all");

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [error, setError] =
    useState("");


  /*
   * ==========================================================
   * CHARGEMENT
   * ==========================================================
   */

  const loadOrders = useCallback(
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

        const [
          userResult,
          myOrdersResult,
        ] = await Promise.all([
          getCurrentUser(),
          getMesCommandes(),
        ]);

        setCurrentUser(
          userResult
        );

        setMyOrders(
          Array.isArray(
            myOrdersResult
          )
            ? myOrdersResult
            : []
        );

        /*
         * Les commandes reçues sont uniquement
         * pertinentes pour un vendeur.
         */

        if (
          userResult?.role ===
          "vendeur"
        ) {
          try {
            const received =
              await getCommandesRecues();

            setReceivedOrders(
              Array.isArray(received)
                ? received
                : []
            );
          } catch (receivedError) {
            console.warn(
              "Erreur commandes reçues :",
              receivedError
            );

            setReceivedOrders([]);
          }
        } else {
          setReceivedOrders([]);
        }

      } catch (err) {
        console.error(
          "Erreur chargement commandes :",
          err
        );

        setError(
          err.message ||
            "Impossible de charger vos commandes."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );


  useEffect(() => {
    loadOrders({
      initial: true,
    });
  }, [loadOrders]);


  /*
   * ==========================================================
   * COMMANDES AFFICHÉES
   * ==========================================================
   */

  const displayedOrders =
    useMemo(() => {
      const source =
        activeTab === "received"
          ? receivedOrders
          : myOrders;

      if (
        activeStatus === "all"
      ) {
        return source;
      }

      return source.filter(
        (order) =>
          order?.statut ===
          activeStatus
      );
    }, [
      activeTab,
      myOrders,
      receivedOrders,
      activeStatus,
    ]);


  /*
   * ==========================================================
   * COMPTEURS
   * ==========================================================
   */

  const stats = useMemo(() => {

    const countStatus = (
      orders,
      status
    ) =>
      orders.filter(
        (order) =>
          order?.statut === status
      ).length;

    return {
      myTotal: myOrders.length,

      myPending:
        countStatus(
          myOrders,
          "en_attente"
        ),

      myActive:
        myOrders.filter(
          (order) =>
            [
              "acceptee",
              "en_cours",
            ].includes(
              order?.statut
            )
        ).length,

      myDelivered:
        countStatus(
          myOrders,
          "livree"
        ),

      receivedTotal:
        receivedOrders.length,

      receivedPending:
        countStatus(
          receivedOrders,
          "en_attente"
        ),
    };
  }, [
    myOrders,
    receivedOrders,
  ]);


  /*
   * ==========================================================
   * RESET FILTRE
   * ==========================================================
   */

  function handleTabChange(tab) {
    setActiveTab(tab);
    setActiveStatus("all");
  }


  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (loading) {
    return (
      <main className="page orders-page">

        <div className="container">

          <div className="loading-state">

            <div className="spinner spinner-lg"></div>

            <h2>
              Chargement des commandes...
            </h2>

            <p>
              Nous récupérons votre historique
              de commandes.
            </p>

          </div>

        </div>

      </main>
    );
  }


  return (
    <main className="page orders-page">

      {/* ======================================================
          HEADER
      ======================================================= */}

      <section className="orders-header">

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

          <div className="orders-header-main">

            <div>

              <span className="section-eyebrow">
                Activité
              </span>

              <h1>
                Mes commandes
              </h1>

              <p>
                Consultez et suivez vos
                commandes AgroMarket.
              </p>

            </div>

            <div className="orders-header-icon">
              <Icon
                name="shopping"
                size={30}
              />
            </div>

          </div>

        </div>

      </section>


      {/* ======================================================
          CONTENU
      ======================================================= */}

      <section className="orders-content page-section-sm">

        <div className="container">

          {error && (
            <div
              className="alert alert-danger"
              role="alert"
            >
              {error}
            </div>
          )}


          {/* =================================================
              STATISTIQUES
          ================================================== */}

          <div className="grid-4 orders-stats">

            <div className="card orders-stat-card">

              <div className="orders-stat-icon">
                <Icon
                  name="shopping"
                  size={21}
                />
              </div>

              <div>
                <span>
                  Total commandes
                </span>

                <strong>
                  {stats.myTotal}
                </strong>
              </div>

            </div>

            <div className="card orders-stat-card">

              <div className="orders-stat-icon">
                <Icon
                  name="clock"
                  size={21}
                />
              </div>

              <div>
                <span>
                  En attente
                </span>

                <strong>
                  {stats.myPending}
                </strong>
              </div>

            </div>

            <div className="card orders-stat-card">

              <div className="orders-stat-icon">
                <Icon
                  name="package"
                  size={21}
                />
              </div>

              <div>
                <span>
                  En cours
                </span>

                <strong>
                  {stats.myActive}
                </strong>
              </div>

            </div>

            <div className="card orders-stat-card">

              <div className="orders-stat-icon">
                <Icon
                  name="check"
                  size={21}
                />
              </div>

              <div>
                <span>
                  Livrées
                </span>

                <strong>
                  {stats.myDelivered}
                </strong>
              </div>

            </div>

          </div>


          {/* =================================================
              ONGLETS
          ================================================== */}

          <div className="orders-tabs">

            <button
              type="button"
              className={
                activeTab === "mine"
                  ? "active"
                  : ""
              }
              onClick={() =>
                handleTabChange(
                  "mine"
                )
              }
            >
              <Icon
                name="shopping"
                size={17}
              />

              Mes achats

              <span>
                {stats.myTotal}
              </span>
            </button>

            {currentUser?.role ===
              "vendeur" && (
              <button
                type="button"
                className={
                  activeTab ===
                  "received"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  handleTabChange(
                    "received"
                  )
                }
              >
                <Icon
                  name="package"
                  size={17}
                />

                Commandes reçues

                <span>
                  {stats.receivedTotal}
                </span>
              </button>
            )}

          </div>


          {/* =================================================
              FILTRES
          ================================================== */}

          <div className="orders-toolbar">

            <div className="orders-filter-label">
              <Icon
                name="filter"
                size={17}
              />

              <span>
                Filtrer par statut
              </span>
            </div>

            <div className="orders-status-filters">

              {[
                ["all", "Toutes"],
                [
                  "en_attente",
                  "En attente",
                ],
                [
                  "acceptee",
                  "Acceptées",
                ],
                [
                  "en_cours",
                  "En cours",
                ],
                [
                  "livree",
                  "Livrées",
                ],
                [
                  "refusee",
                  "Refusées",
                ],
                [
                  "annulee",
                  "Annulées",
                ],
              ].map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      activeStatus ===
                      value
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setActiveStatus(
                        value
                      )
                    }
                  >
                    {label}
                  </button>
                )
              )}

            </div>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() =>
                loadOrders()
              }
              disabled={
                refreshing
              }
            >
              {refreshing ? (
                <>
                  <span className="spinner spinner-sm"></span>
                  Actualisation...
                </>
              ) : (
                <>
                  <Icon
                    name="refresh"
                    size={16}
                  />

                  Actualiser
                </>
              )}
            </button>

          </div>


          {/* =================================================
              LISTE
          ================================================== */}

          {displayedOrders.length ===
          0 ? (
            <div className="empty-state">

              <div className="empty-state-icon">
                <Icon
                  name="shopping"
                  size={25}
                />
              </div>

              <h2 className="empty-state-title">

                {activeStatus !== "all"
                  ? "Aucune commande avec ce statut"
                  : activeTab ===
                    "received"
                  ? "Aucune commande reçue"
                  : "Aucune commande"}

              </h2>

              <p className="empty-state-description">

                {activeStatus !== "all"
                  ? "Essayez de sélectionner un autre statut."
                  : activeTab ===
                    "received"
                  ? "Les commandes passées sur vos annonces apparaîtront ici."
                  : "Vos achats apparaîtront ici lorsque vous passerez une commande."}

              </p>

              {activeTab ===
                "mine" && (
                <Link
                  to="/produits"
                  className="btn btn-primary"
                >
                  Explorer les produits
                </Link>
              )}

            </div>
          ) : (
            <div className="orders-list">

              {displayedOrders.map(
                (order) => (

                  <article
                    key={order.id}
                    className="card order-card"
                  >

                    <div className="order-card-icon">
                      <Icon
                        name={
                          activeTab ===
                          "received"
                            ? "package"
                            : "shopping"
                        }
                        size={23}
                      />
                    </div>

                    <div className="order-card-main">

                      <div className="order-card-heading">

                        <div>

                          <span>
                            Commande #
                            {order.id}
                          </span>

                          <h2>
                            {getProductName(
                              order
                            )}
                          </h2>

                        </div>

                        <span
                          className={`badge badge-${getStatusClass(
                            order.statut
                          )}`}
                        >
                          {getStatusLabel(
                            order.statut
                          )}
                        </span>

                      </div>

                      <div className="order-card-details">

                        <div>
                          <span>
                            Quantité
                          </span>

                          <strong>
                            {order.quantite}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Prix unitaire
                          </span>

                          <strong>
                            {formatPrice(
                              order.prix_unitaire
                            )}{" "}
                            FCFA
                          </strong>
                        </div>

                        <div>
                          <span>
                            Total
                          </span>

                          <strong>
                            {formatPrice(
                              order.prix_total
                            )}{" "}
                            FCFA
                          </strong>
                        </div>

                        <div>
                          <span>
                            Date
                          </span>

                          <strong>
                            {formatDate(
                              order.date_commande
                            )}
                          </strong>
                        </div>

                      </div>

                      {activeTab ===
                        "received" &&
                        order.acheteur && (
                        <div className="order-buyer">

                          <span>
                            Acheteur
                          </span>

                          <strong>
                            {
                              [
                                order.acheteur
                                  .prenom,
                                order.acheteur
                                  .nom,
                              ]
                                .filter(
                                  Boolean
                                )
                                .join(
                                  " "
                                ) ||
                              order.acheteur
                                .telephone ||
                              "Acheteur"
                            }
                          </strong>

                        </div>
                      )}

                      <div className="order-card-footer">

                        <small>
                          {order.statut ===
                          "livree"
                            ? "Commande terminée"
                            : order.statut ===
                              "annulee"
                            ? "Commande annulée"
                            : "Suivi de commande disponible"}
                        </small>

                        <Link
                          to={`/commandes/${order.id}`}
                          className="btn btn-outline btn-sm"
                        >
                          Voir le détail

                          <Icon
                            name="arrow"
                            size={15}
                          />
                        </Link>

                      </div>

                    </div>

                  </article>
                )
              )}

            </div>
          )}

        </div>
      </section>

    </main>
  );
}

export default Orders;