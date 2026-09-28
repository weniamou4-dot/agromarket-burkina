
/**
 * ============================================================
 * AGROMARKET BURKINA
 * COMMANDES REÇUES — ESPACE VENDEUR
 * ============================================================
 *
 * Fichier :
 *   web/src/pages/CommandesRecues.jsx
 *
 * Responsabilités :
 * - afficher les commandes reçues par le vendeur ;
 * - filtrer les commandes par statut ;
 * - afficher les statistiques ;
 * - confirmer une commande ;
 * - annuler/refuser une commande ;
 * - consulter le détail d'une commande ;
 * - actualiser les commandes.
 *
 * Backend utilisé :
 *
 * GET   /commandes/vendeur
 * PATCH /commandes/{commande_id}/statut
 *
 * Statuts backend :
 *
 * en_attente
 * confirmee
 * preparee
 * livree
 * annulee
 *
 * ============================================================
 */

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
import "../styles/pages/commandes-recues.css"
import {
  getCurrentUser,
} from "../services/api/auth";

import {
  getCommandesRecues,
  changerStatutCommande,
  ORDER_STATUS,
} from "../services/api/orders";


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

    case "shopping":
      return (
        <svg {...common}>
          <path d="M5 8h14l-1 11H6L5 8Z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
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

    case "close":
      return (
        <svg {...common}>
          <path d="m6 6 12 12" />
          <path d="m18 6-12 12" />
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

    default:
      return null;
  }
}


/*
 * ============================================================
 * OUTILS
 * ============================================================
 */

function formatPrice(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return `${number.toLocaleString("fr-FR")} FCFA`;
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


/*
 * ============================================================
 * STATUTS
 * ============================================================
 */

function getStatusInfo(statut) {
  switch (statut) {
    case ORDER_STATUS.EN_ATTENTE:
      return {
        label: "En attente",
        icon: "clock",
        className: "status-pending",
      };

    case ORDER_STATUS.CONFIRMEE:
      return {
        label: "Confirmée",
        icon: "check",
        className: "status-success",
      };

    case ORDER_STATUS.PREPAREE:
      return {
        label: "Préparée",
        icon: "package",
        className: "status-warning",
      };

    case ORDER_STATUS.LIVREE:
      return {
        label: "Livrée",
        icon: "check",
        className: "status-success",
      };

    case ORDER_STATUS.ANNULEE:
      return {
        label: "Annulée",
        icon: "close",
        className: "status-danger",
      };

    default:
      return {
        label: statut || "Inconnu",
        icon: null,
        className: "status-neutral",
      };
  }
}


/*
 * ============================================================
 * BADGE STATUT
 * ============================================================
 */

function BadgeStatut({
  statut,
}) {
  const info =
    getStatusInfo(statut);

  return (
    <span
      className={`status-badge ${info.className}`}
    >
      {info.icon && (
        <Icon
          name={info.icon}
          size={14}
        />
      )}

      {info.label}
    </span>
  );
}


/*
 * ============================================================
 * PAGE COMMANDES REÇUES
 * ============================================================
 */

export default function CommandesRecues() {
  const navigate =
    useNavigate();

  /*
   * ----------------------------------------------------------
   * ÉTATS
   * ----------------------------------------------------------
   */

  const [user, setUser] =
    useState(null);

  const [commandes, setCommandes] =
    useState([]);

  const [pagination, setPagination] =
    useState(null);

  const [activeStatus, setActiveStatus] =
    useState("all");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(null);

  const [error, setError] =
    useState("");


  /*
   * ==========================================================
   * CHARGEMENT DES COMMANDES
   * ==========================================================
   */

  const chargerCommandes =
    useCallback(
      async (initial = false) => {
        try {
          if (initial) {
            setLoading(true);
          } else {
            setRefreshing(true);
          }

          setError("");

          /*
           * --------------------------------------------------
           * UTILISATEUR CONNECTÉ
           * --------------------------------------------------
           */

          const utilisateur =
            await getCurrentUser();

          if (!utilisateur) {
            navigate("/connexion");
            return;
          }

          /*
           * --------------------------------------------------
           * VÉRIFICATION RÔLE
           * --------------------------------------------------
           */

          if (
            utilisateur.role !==
            "vendeur"
          ) {
            setError(
              "Cette page est réservée aux vendeurs."
            );

            setCommandes([]);
            setPagination(null);

            return;
          }

          setUser(utilisateur);

          /*
           * --------------------------------------------------
           * COMMANDES VENDEUR
           * --------------------------------------------------
           *
           * IMPORTANT :
           *
           * getCommandesRecues() retourne :
           *
           * {
           *   commandes: [],
           *   pagination: {},
           *   raw: {}
           * }
           */

          const response =
            await getCommandesRecues({
              page: 1,
              limit: 100,
            });

          setCommandes(
            Array.isArray(
              response?.commandes
            )
              ? response.commandes
              : []
          );

          setPagination(
            response?.pagination ??
            null
          );
        } catch (err) {
          console.error(
            "Erreur commandes reçues :",
            err
          );

          if (
            err?.status === 401 ||
            err?.status === 403
          ) {
            navigate("/connexion");
            return;
          }

          setError(
            err?.message ||
              "Impossible de récupérer les commandes reçues."
          );

          setCommandes([]);
          setPagination(null);
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [navigate]
    );


  /*
   * ==========================================================
   * CHARGEMENT INITIAL
   * ==========================================================
   */

  useEffect(() => {
    chargerCommandes(true);
  }, [
    chargerCommandes,
  ]);


  /*
   * ==========================================================
   * FILTRAGE
   * ==========================================================
   */

  const commandesAffichees =
    useMemo(() => {
      if (
        activeStatus ===
        "all"
      ) {
        return commandes;
      }

      return commandes.filter(
        (commande) =>
          commande?.statut ===
          activeStatus
      );
    }, [
      commandes,
      activeStatus,
    ]);


  /*
   * ==========================================================
   * STATISTIQUES
   * ==========================================================
   */

  const statistiques =
    useMemo(() => {
      return {
        total:
          commandes.length,

        attente:
          commandes.filter(
            (commande) =>
              commande?.statut ===
              ORDER_STATUS.EN_ATTENTE
          ).length,

        confirmees:
          commandes.filter(
            (commande) =>
              commande?.statut ===
              ORDER_STATUS.CONFIRMEE
          ).length,

        preparees:
          commandes.filter(
            (commande) =>
              commande?.statut ===
              ORDER_STATUS.PREPAREE
          ).length,

        livrees:
          commandes.filter(
            (commande) =>
              commande?.statut ===
              ORDER_STATUS.LIVREE
          ).length,

        annulees:
          commandes.filter(
            (commande) =>
              commande?.statut ===
              ORDER_STATUS.ANNULEE
          ).length,
      };
    }, [
      commandes,
    ]);


  /*
   * ==========================================================
   * TRAITEMENT COMMANDE
   * ==========================================================
   */

  const traiterCommande =
    useCallback(
      async (
        commandeId,
        nouveauStatut
      ) => {
        if (!commandeId) {
          return;
        }

        if (
          !user ||
          user.role !==
            "vendeur"
        ) {
          setError(
            "Seul un vendeur peut traiter les commandes."
          );

          return;
        }

        /*
         * ----------------------------------------------------
         * SÉCURITÉ STATUT
         * ----------------------------------------------------
         */

        if (
          nouveauStatut !==
            ORDER_STATUS.CONFIRMEE &&
          nouveauStatut !==
            ORDER_STATUS.ANNULEE
        ) {
          setError(
            "Statut de commande non autorisé."
          );

          return;
        }

        /*
         * ----------------------------------------------------
         * CONFIRMATION POUR REFUS
         * ----------------------------------------------------
         */

        if (
          nouveauStatut ===
          ORDER_STATUS.ANNULEE
        ) {
          const confirmation =
            window.confirm(
              `Voulez-vous vraiment refuser la commande #${commandeId} ?`
            );

          if (!confirmation) {
            return;
          }
        }

        try {
          setActionLoading(
            commandeId
          );

          setError("");

          /*
           * --------------------------------------------------
           * APPEL API
           * --------------------------------------------------
           *
           * changerStatutCommande()
           * utilise :
           *
           * PATCH
           * /commandes/{id}/statut
           *
           * {
           *   "statut": "confirmee"
           * }
           *
           * ou :
           *
           * {
           *   "statut": "annulee"
           * }
           */

          const commandeMiseAJour =
            await changerStatutCommande(
              commandeId,
              nouveauStatut
            );

          /*
           * --------------------------------------------------
           * MISE À JOUR LOCALE
           * --------------------------------------------------
           */

          setCommandes(
            (anciennes) =>
              anciennes.map(
                (commande) =>
                  Number(
                    commande.id
                  ) ===
                  Number(
                    commandeId
                  )
                    ? commandeMiseAJour
                    : commande
              )
          );
        } catch (err) {
          console.error(
            "Erreur traitement commande :",
            err
          );

          if (
            err?.status === 401 ||
            err?.status === 403
          ) {
            navigate(
              "/connexion"
            );
            return;
          }

          setError(
            err?.message ||
              "Impossible de traiter la commande."
          );
        } finally {
          setActionLoading(
            null
          );
        }
      },
      [
        navigate,
        user,
      ]
    );


  /*
   * ==========================================================
   * RENDU
   * ==========================================================
   */

  return (
    <main className="orders-page">

      {/* ======================================================
          HERO
      ======================================================= */}

      <section className="orders-hero">

        <div className="container">

          <div className="orders-hero-content">

            <div>

              <Link
                to="/dashboard"
                className="outline-button"
              >
                <Icon
                  name="arrow-left"
                  size={16}
                />

                Retour au tableau de bord
              </Link>

              <span className="section-label">
                ESPACE VENDEUR
              </span>

              <h1>
                Commandes reçues
              </h1>

              <p>
                Consultez et gérez les
                commandes passées sur
                vos annonces.
              </p>

              {user && (
                <p>
                  Vendeur :{" "}
                  <strong>
                    {user.nom}
                  </strong>
                </p>
              )}

            </div>

            <div className="orders-header-icon">

              <Icon
                name="shopping"
                size={32}
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

          {/* ==================================================
              ERREUR
          ================================================== */}

          {error && (
            <div
              className="alert alert-danger"
              role="alert"
            >
              {error}
            </div>
          )}


          {/* ==================================================
              ACTIONS
          ================================================== */}

          <div className="admin-list-actions">

            <Link
              to="/mes-annonces"
              className="outline-button"
            >
              <Icon
                name="package"
                size={16}
              />

              Mes annonces
            </Link>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() =>
                chargerCommandes(false)
              }
              disabled={
                refreshing ||
                loading
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

          </div>


          {/* ==================================================
              STATISTIQUES
          ================================================== */}

          <div className="grid-4 orders-stats">

            {/* TOTAL */}

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
                  {statistiques.total}
                </strong>

              </div>

            </div>


            {/* EN ATTENTE */}

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
                  {statistiques.attente}
                </strong>

              </div>

            </div>


            {/* CONFIRMÉES */}

            <div className="card orders-stat-card">

              <div className="orders-stat-icon">
                <Icon
                  name="check"
                  size={21}
                />
              </div>

              <div>

                <span>
                  Confirmées
                </span>

                <strong>
                  {statistiques.confirmees}
                </strong>

              </div>

            </div>


            {/* LIVRÉES */}

            <div className="card orders-stat-card">

              <div className="orders-stat-icon">
                <Icon
                  name="package"
                  size={21}
                />
              </div>

              <div>

                <span>
                  Livrées
                </span>

                <strong>
                  {statistiques.livrees}
                </strong>

              </div>

            </div>

          </div>


          {/* ==================================================
              INFORMATIONS PAGINATION
          ================================================== */}

          {pagination && (
            <div className="item-meta">
              <span>
                {pagination.total} commande
                {pagination.total > 1
                  ? "s"
                  : ""}{" "}
                au total
              </span>
            </div>
          )}


          {/* ==================================================
              FILTRES
          ================================================== */}

          <div className="orders-toolbar">

            <div className="orders-filter-label">

              <span>
                Filtrer par statut
              </span>

            </div>

            <div className="orders-status-filters">

              {[
                [
                  "all",
                  "Toutes",
                ],

                [
                  ORDER_STATUS.EN_ATTENTE,
                  "En attente",
                ],

                [
                  ORDER_STATUS.CONFIRMEE,
                  "Confirmées",
                ],

                [
                  ORDER_STATUS.PREPAREE,
                  "Préparées",
                ],

                [
                  ORDER_STATUS.LIVREE,
                  "Livrées",
                ],

                [
                  ORDER_STATUS.ANNULEE,
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

          </div>


          {/* ==================================================
              CHARGEMENT
          ================================================== */}

          {loading && (
            <div className="loading-box">

              <div className="loading-spinner"></div>

              <span>
                Chargement des commandes
                reçues...
              </span>

            </div>
          )}


          {/* ==================================================
              AUCUNE COMMANDE
          ================================================== */}

          {!loading &&
            !error &&
            commandesAffichees.length ===
              0 && (
              <div className="empty-state">

                <div className="empty-icon">

                  <Icon
                    name="shopping"
                    size={28}
                  />

                </div>

                <h2>
                  {activeStatus !==
                  "all"
                    ? "Aucune commande avec ce statut"
                    : "Aucune commande reçue"}
                </h2>

                <p>
                  {activeStatus !==
                  "all"
                    ? "Essayez de sélectionner un autre statut."
                    : "Les commandes passées sur vos annonces apparaîtront ici."}
                </p>

                {activeStatus !==
                  "all" && (
                  <button
                    type="button"
                    className="dashboard-primary-button"
                    onClick={() =>
                      setActiveStatus(
                        "all"
                      )
                    }
                  >
                    Voir toutes les
                    commandes
                  </button>
                )}

              </div>
            )}


          {/* ==================================================
              LISTE DES COMMANDES
          ================================================== */}

          {!loading &&
            !error &&
            commandesAffichees.length >
              0 && (
              <div className="orders-grid">

                {commandesAffichees.map(
                  (commande) => {

                    const isActionLoading =
                      actionLoading ===
                      commande.id;

                    const canProcess =
                      commande.statut ===
                      ORDER_STATUS.EN_ATTENTE;

                    return (
                      <article
                        key={
                          commande.id
                        }
                        className="order-card"
                      >

                        {/* ==================================
                            HEADER
                        ================================== */}

                        <div className="order-header">

                          <div>

                            <span className="item-reference">
                              COMMANDE
                            </span>

                            <h3>
                              #
                              {
                                commande.id
                              }
                            </h3>

                          </div>

                          <BadgeStatut
                            statut={
                              commande.statut
                            }
                          />

                        </div>


                        {/* ==================================
                            INFORMATIONS
                        ================================== */}

                        <div className="order-info">

                          <div>

                            <span>
                              👤 Acheteur
                            </span>

                            <strong>
                              
                              {commande.acheteur_nom ||
                                `Acheteur #${commande.acheteur_id}`}
                            </strong>

                          </div>


                          <div>

                            <span>
                              📢 Produit
                            </span>

                            <strong>
                              
                              {commande.annonce?.produit_nom ||
                                `Annonce #${commande.annonce_id}`}
                            </strong>

                          </div>


                          <div>

                            <span>
                              📦 Quantité
                            </span>

                            <strong>
                              {
                                commande.quantite
                              }
                            </strong>

                          </div>


                          <div>

                            <span>
                              💰 Prix unitaire
                            </span>

                            <strong>
                              {formatPrice(
                                commande.prix_unitaire
                              )}
                            </strong>

                          </div>

                        </div>


                        {/* ==================================
                            PRODUIT
                        ================================== */}

                        {commande.annonce && (
                          <div className="item-meta">

                            <span>
                              Produit :{" "}
                              <strong>
                                {
                                  commande
                                    .annonce
                                    .produit_nom ??
                                  "—"
                                }
                              </strong>
                            </span>

                          </div>
                        )}


                        {/* ==================================
                            TOTAL
                        ================================== */}

                        <div className="order-total">

                          <span>
                            Montant total
                          </span>

                          <strong>
                            {formatPrice(
                              commande.prix_total
                            )}
                          </strong>

                        </div>


                        {/* ==================================
                            DATE
                        ================================== */}

                        {commande.date_commande && (
                          <div className="item-meta">

                            <span>
                              📅{" "}
                              {formatDate(
                                commande.date_commande
                              )}
                            </span>

                          </div>
                        )}


                        {/* ==================================
                            ACTIONS
                        ================================== */}

                        <div className="order-actions">

                          {canProcess && (
                            <>

                              {/* ACCEPTER */}

                              <button
                                type="button"
                                className="accept-button"
                                onClick={() =>
                                  traiterCommande(
                                    commande.id,
                                    ORDER_STATUS.CONFIRMEE
                                  )
                                }
                                disabled={
                                  isActionLoading
                                }
                              >
                                {isActionLoading
                                  ? "Traitement..."
                                  : "✓ Accepter"}
                              </button>


                              {/* REFUSER */}

                              <button
                                type="button"
                                className="reject-button"
                                onClick={() =>
                                  traiterCommande(
                                    commande.id,
                                    ORDER_STATUS.ANNULEE
                                  )
                                }
                                disabled={
                                  isActionLoading
                                }
                              >
                                {isActionLoading
                                  ? "Traitement..."
                                  : "✕ Refuser"}
                              </button>

                            </>
                          )}


                          <Link
                            to={`/commandes/${commande.id}`}
                            className="outline-button"
                          >
                            Voir le détail
                          </Link>

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
