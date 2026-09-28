import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import "../styles/pages/orders-details.css"
import {
  getCommandeById,
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
    case "arrow-left":
      return (
        <svg {...common}>
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h13" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

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

    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
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

    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 19 6v5c0 4.6-2.8 7.8-7 10-4.2-2.2-7-5.4-7-10V6l7-3Z" />
          <path d="m9.5 12 1.7 1.7 3.6-3.6" />
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
      dateStyle: "long",
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


function getPersonName(person, fallback) {
  if (!person) {
    return fallback;
  }

  return (
    [
      person.prenom,
      person.nom,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    person.telephone ||
    person.email ||
    fallback
  );
}


/*
 * ============================================================
 * ÉTAPES DU SUIVI
 * ============================================================
 */

const ORDER_STEPS = [
  {
    status: "en_attente",
    title: "Commande reçue",
    description:
      "Votre commande a été enregistrée.",
  },
  {
    status: "acceptee",
    title: "Commande acceptée",
    description:
      "Le vendeur a accepté la commande.",
  },
  {
    status: "en_cours",
    title: "Commande en cours",
    description:
      "La commande est en cours de traitement.",
  },
  {
    status: "livree",
    title: "Commande livrée",
    description:
      "La commande est terminée.",
  },
];


/*
 * ============================================================
 * PAGE
 * ============================================================
 */

function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] =
    useState(null);

  const [currentUser, setCurrentUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");


  /*
   * ==========================================================
   * CHARGEMENT
   * ==========================================================
   */

  const loadOrder = useCallback(
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
          orderData,
          userData,
        ] = await Promise.all([
          getCommandeById(id),
          getCurrentUser(),
        ]);

        setOrder(orderData);
        setCurrentUser(userData);

      } catch (err) {
        console.error(
          "Erreur chargement commande :",
          err
        );

        setError(
          err.message ||
            "Impossible de charger cette commande."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );


  useEffect(() => {
    if (id) {
      loadOrder({
        initial: true,
      });
    }
  }, [id, loadOrder]);


  /*
   * ==========================================================
   * INFORMATIONS
   * ==========================================================
   */

  const productName = useMemo(
    () =>
      getProductName(order),
    [order]
  );

  const isSeller =
    currentUser?.role ===
    "vendeur";

  const sellerName =
    getPersonName(
      order?.vendeur,
      "Vendeur AgroMarket"
    );

  const buyerName =
    getPersonName(
      order?.acheteur,
      "Acheteur AgroMarket"
    );


  /*
   * ==========================================================
   * POSITION DANS LE SUIVI
   * ==========================================================
   */

  const currentStepIndex =
    useMemo(() => {
      const status =
        order?.statut;

      if (
        status === "annulee" ||
        status === "refusee"
      ) {
        return -1;
      }

      const index =
        ORDER_STEPS.findIndex(
          (step) =>
            step.status ===
            status
        );

      return index;
    }, [order?.statut]);


  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (loading) {
    return (
      <main className="page order-details-page">

        <div className="container">

          <div className="loading-state">

            <div className="spinner spinner-lg"></div>

            <h2>
              Chargement de la commande...
            </h2>

            <p>
              Nous récupérons les détails
              de votre commande.
            </p>

          </div>

        </div>

      </main>
    );
  }


  /*
   * ==========================================================
   * ERREUR
   * ==========================================================
   */

  if (error || !order) {
    return (
      <main className="page order-details-page">

        <div className="container">

          <div className="empty-state">

            <div className="empty-state-icon">
              !
            </div>

            <h2 className="empty-state-title">
              Commande introuvable
            </h2>

            <p className="empty-state-description">
              {error ||
                "Cette commande n'existe pas ou n'est plus accessible."}
            </p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                navigate(
                  "/commandes"
                )
              }
            >
              Retour aux commandes
            </button>

          </div>

        </div>

      </main>
    );
  }


  return (
    <main className="page order-details-page">

      {/* ======================================================
          EN-TÊTE
      ======================================================= */}

      <section className="order-details-header">

        <div className="container">

          <Link
            to="/commandes"
            className="btn btn-ghost"
          >
            <Icon
              name="arrow-left"
              size={17}
            />

            Retour aux commandes
          </Link>

          <div className="order-details-heading">

            <div>

              <span className="section-eyebrow">
                Suivi de commande
              </span>

              <h1>
                Commande #{order.id}
              </h1>

              <p>
                Passée le{" "}
                {formatDate(
                  order.date_commande
                )}
              </p>

            </div>

            <div className="order-details-heading-actions">

              <span
                className={`badge badge-${getStatusClass(
                  order.statut
                )}`}
              >
                {getStatusLabel(
                  order.statut
                )}
              </span>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() =>
                  loadOrder()
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

          </div>

        </div>

      </section>


      {/* ======================================================
          CONTENU
      ======================================================= */}

      <section className="order-details-content page-section-sm">

        <div className="container">

          {/* =================================================
              STATUT EXCEPTIONNEL
          ================================================== */}

          {(order.statut ===
            "refusee" ||
            order.statut ===
              "annulee") && (
            <div className="alert alert-danger">

              <Icon
                name="close"
                size={19}
              />

              <div>

                <strong>
                  {order.statut ===
                  "refusee"
                    ? "Commande refusée"
                    : "Commande annulée"}
                </strong>

                <span>
                  Cette commande ne peut plus
                  être traitée normalement.
                </span>

                {order.motif && (
                  <span>
                    Motif : {order.motif}
                  </span>
                )}

              </div>

            </div>
          )}


          {/* =================================================
              SUIVI
          ================================================== */}

          {order.statut !==
            "refusee" &&
            order.statut !==
              "annulee" && (
            <section className="card order-tracking-card">

              <div className="card-header">

                <span className="section-eyebrow">
                  Progression
                </span>

                <h2>
                  Suivi de votre commande
                </h2>

              </div>

              <div className="card-body">

                <div className="order-tracking">

                  {ORDER_STEPS.map(
                    (
                      step,
                      index
                    ) => {

                      const completed =
                        currentStepIndex >=
                        index;

                      const current =
                        currentStepIndex ===
                        index;

                      return (
                        <div
                          key={
                            step.status
                          }
                          className={`order-tracking-step ${
                            completed
                              ? "completed"
                              : ""
                          } ${
                            current
                              ? "current"
                              : ""
                          }`}
                        >

                          <div className="order-tracking-marker">

                            {completed ? (
                              <Icon
                                name="check"
                                size={17}
                              />
                            ) : (
                              index + 1
                            )}

                          </div>

                          <div className="order-tracking-content">

                            <strong>
                              {
                                step.title
                              }
                            </strong>

                            <span>
                              {
                                step.description
                              }
                            </span>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              </div>

            </section>
          )}


          {/* =================================================
              GRILLE PRINCIPALE
          ================================================== */}

          <div className="order-details-grid">

            {/* ===============================================
                PRODUIT
            ================================================ */}

            <section className="card">

              <div className="card-header">

                <span className="section-eyebrow">
                  Produit
                </span>

                <h2>
                  Détails de la commande
                </h2>

              </div>

              <div className="card-body">

                <div className="order-product-summary">

                  <div className="order-product-icon">
                    <Icon
                      name="package"
                      size={27}
                    />
                  </div>

                  <div>

                    <span>
                      Produit
                    </span>

                    <strong>
                      {productName}
                    </strong>

                  </div>

                </div>

                <div className="order-summary-grid">

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
                      Commande
                    </span>

                    <strong>
                      #{order.id}
                    </strong>
                  </div>

                </div>

              </div>

            </section>


            {/* ===============================================
                PERSONNES
            ================================================ */}

            <section className="card">

              <div className="card-header">

                <span className="section-eyebrow">
                  Intervenants
                </span>

                <h2>
                  Acheteur et vendeur
                </h2>

              </div>

              <div className="card-body">

                <div className="order-person">

                  <div className="order-person-icon">
                    <Icon
                      name="user"
                      size={20}
                    />
                  </div>

                  <div>

                    <span>
                      Acheteur
                    </span>

                    <strong>
                      {buyerName}
                    </strong>

                    {order.acheteur
                      ?.telephone && (
                      <a
                        href={`tel:${order.acheteur.telephone}`}
                      >
                        <Icon
                          name="phone"
                          size={14}
                        />

                        {
                          order.acheteur
                            .telephone
                        }
                      </a>
                    )}

                  </div>

                </div>


                <div className="order-person">

                  <div className="order-person-icon">
                    <Icon
                      name="shield"
                      size={20}
                    />
                  </div>

                  <div>

                    <span>
                      Vendeur
                    </span>

                    <strong>
                      {sellerName}
                    </strong>

                    {order.vendeur
                      ?.telephone && (
                      <a
                        href={`tel:${order.vendeur.telephone}`}
                      >
                        <Icon
                          name="phone"
                          size={14}
                        />

                        {
                          order.vendeur
                            .telephone
                        }
                      </a>
                    )}

                  </div>

                </div>

              </div>

            </section>

          </div>


          {/* =================================================
              RÉCAPITULATIF FINANCIER
          ================================================== */}

          <section className="card order-financial-summary">

            <div className="card-header">

              <span className="section-eyebrow">
                Récapitulatif
              </span>

              <h2>
                Montant de la commande
              </h2>

            </div>

            <div className="card-body">

              <div className="order-financial-line">
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

              <div className="order-financial-line">
                <span>
                  Quantité
                </span>

                <strong>
                  {order.quantite}
                </strong>
              </div>

              <div className="order-financial-divider"></div>

              <div className="order-financial-total">
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

            </div>

          </section>


          {/* =================================================
              ACTIONS
          ================================================== */}

          <div className="order-details-actions">

            <Link
              to="/commandes"
              className="btn btn-outline"
            >
              <Icon
                name="arrow-left"
                size={17}
              />

              Toutes mes commandes
            </Link>

            {order.annonce_id && (
              <Link
                to={`/produits/${order.annonce_id}`}
                className="btn btn-primary"
              >
                Voir le produit

                <Icon
                  name="arrow"
                  size={17}
                />
              </Link>
            )}

          </div>


          {/* =================================================
              INFORMATION VENDEUR
          ================================================== */}

          {isSeller &&
            order.statut ===
              "en_attente" && (
            <div className="alert alert-info">

              <Icon
                name="clock"
                size={19}
              />

              <div>
                <strong>
                  Action vendeur requise
                </strong>

                <span>
                  Cette commande est en attente
                  de traitement.
                </span>

                <Link to="/commandes">
                  Accéder à mes commandes
                  <Icon
                    name="arrow"
                    size={15}
                  />
                </Link>
              </div>

            </div>
          )}

        </div>

      </section>

    </main>
  );
}

export default OrderDetails;