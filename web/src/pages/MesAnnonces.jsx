
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
import "../styles/pages/mes-annonces.css";
import { getCurrentUser } from "../services/api/auth";
import { apiRequest } from "../services/api/client";

/* ============================================================
   ICÔNES
============================================================ */

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

    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 11a8 8 0 0 0-14.7-4L4 9" />
          <path d="M4 4v5h5" />
          <path d="M4 13a8 8 0 0 0 14.7 4L20 15" />
          <path d="M20 20v-5h-5" />
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

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v5l3 2" />
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

/* ============================================================
   OUTILS
============================================================ */

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

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusInfo(statut) {
  switch (statut) {
    case "publiee":
      return {
        label: "Publiée",
        icon: "check",
        className: "status-success",
      };

    case "en_attente":
      return {
        label: "En attente",
        icon: "clock",
        className: "status-pending",
      };

    case "refusee":
      return {
        label: "Refusée",
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

/* ============================================================
   BADGE STATUT
============================================================ */

function BadgeStatut({ statut }) {
  const info = getStatusInfo(statut);

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

/* ============================================================
   PAGE MES ANNONCES
============================================================ */

export default function MesAnnonces() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [annonces, setAnnonces] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /*
   * ----------------------------------------------------------
   * PAGINATION
   * ----------------------------------------------------------
   */

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  const limit = 20;

  /*
   * ----------------------------------------------------------
   * CHARGEMENT
   * ----------------------------------------------------------
   */

  const chargerAnnonces = useCallback(
    async (
      targetPage = 1,
      initial = false
    ) => {
      try {
        if (initial) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setError("");

        const utilisateur =
          await getCurrentUser();

        if (!utilisateur) {
          navigate("/connexion");
          return;
        }

        if (
          utilisateur.role !== "vendeur"
        ) {
          setError(
            "Cette page est réservée aux vendeurs."
          );
          return;
        }

        setUser(utilisateur);

        const data =
          await apiRequest(
            `/users/me/annonces?page=${targetPage}&limit=${limit}`,
            {
              method: "GET",
            }
          );

        /*
         * ----------------------------------------------------
         * FORMAT ATTENDU PAR LE BACKEND
         *
         * {
         *   annonces: [...],
         *   pagination: {
         *     page,
         *     limit,
         *     total,
         *     pages
         *   }
         * }
         * ----------------------------------------------------
         */

        const nouvellesAnnonces =
          Array.isArray(data?.annonces)
            ? data.annonces
            : [];

        const nouvellesPagination =
          data?.pagination || {
            page: targetPage,
            limit,
            total: 0,
            pages: 0,
          };

        setAnnonces(
          nouvellesAnnonces
        );

        setPagination(
          nouvellesPagination
        );

        setPage(
          Number(
            nouvellesPagination.page ||
              targetPage
          )
        );
      } catch (err) {
        console.error(
          "Erreur chargement mes annonces :",
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
            "Impossible de récupérer vos annonces."
        );

        setAnnonces([]);

        setPagination({
          page: targetPage,
          limit,
          total: 0,
          pages: 0,
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate]
  );

  /*
   * ----------------------------------------------------------
   * CHARGEMENT INITIAL
   * ----------------------------------------------------------
   */

  useEffect(() => {
    chargerAnnonces(1, true);
  }, [chargerAnnonces]);

  /*
   * ----------------------------------------------------------
   * CHANGEMENT DE PAGE
   * ----------------------------------------------------------
   */

  const changerPage = useCallback(
    (nouvellePage) => {
      const totalPages =
        Number(pagination.pages) || 0;

      if (
        nouvellePage < 1 ||
        (totalPages > 0 &&
          nouvellePage > totalPages)
      ) {
        return;
      }

      chargerAnnonces(
        nouvellePage,
        false
      );
    },
    [
      chargerAnnonces,
      pagination.pages,
    ]
  );

  /*
   * ----------------------------------------------------------
   * STATISTIQUES
   *
   * Important :
   * "total" doit venir de pagination.total,
   * pas de annonces.length, car annonces.length
   * représente uniquement la page actuelle.
   * ----------------------------------------------------------
   */

  const statistiques = useMemo(() => {
    return {
      total:
        Number(pagination.total) || 0,

      publiees: annonces.filter(
        (annonce) =>
          annonce?.statut === "publiee"
      ).length,

      attente: annonces.filter(
        (annonce) =>
          annonce?.statut === "en_attente"
      ).length,

      refusees: annonces.filter(
        (annonce) =>
          annonce?.statut === "refusee"
      ).length,
    };
  }, [
    annonces,
    pagination.total,
  ]);

  /*
   * ----------------------------------------------------------
   * INFORMATIONS PAGINATION
   * ----------------------------------------------------------
   */

  const totalPages =
    Number(pagination.pages) || 0;

  const hasPreviousPage =
    page > 1;

  const hasNextPage =
    totalPages > 0 &&
    page < totalPages;

  /*
   * ----------------------------------------------------------
   * RENDU
   * ----------------------------------------------------------
   */

  return (
    <main className="orders-page">

      {/* ======================================================
          EN-TÊTE
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
                Mes annonces
              </h1>

              <p>
                Gérez les annonces que vous avez
                publiées sur AgroMarket Burkina.
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
                name="package"
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
              ACTIONS
          ================================================== */}

          <div className="admin-list-actions">

            <Link
              to="/publier"
              className="dashboard-primary-button"
            >
              <Icon
                name="plus"
                size={17}
              />

              Nouvelle annonce
            </Link>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() =>
                chargerAnnonces(
                  page,
                  false
                )
              }
              disabled={refreshing}
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
              STATISTIQUES
          ================================================== */}

          <div className="grid-4 orders-stats">

            <div className="card orders-stat-card">
              <div className="orders-stat-icon">
                <Icon
                  name="package"
                  size={21}
                />
              </div>

              <div>
                <span>
                  Total annonces
                </span>

                <strong>
                  {statistiques.total}
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
                  Publiées
                </span>

                <strong>
                  {statistiques.publiees}
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
                  {statistiques.attente}
                </strong>
              </div>
            </div>

            <div className="card orders-stat-card">
              <div className="orders-stat-icon">
                <Icon
                  name="close"
                  size={21}
                />
              </div>

              <div>
                <span>
                  Refusées
                </span>

                <strong>
                  {statistiques.refusees}
                </strong>
              </div>
            </div>

          </div>

          {/* ==================================================
              CHARGEMENT
          ================================================== */}

          {loading && (
            <div className="loading-box">
              <div className="loading-spinner"></div>

              <span>
                Chargement de vos annonces...
              </span>
            </div>
          )}

          {/* ==================================================
              AUCUNE ANNONCE
          ================================================== */}

          {!loading &&
            !error &&
            annonces.length === 0 && (
              <div className="empty-state">

                <div className="empty-icon">
                  <Icon
                    name="package"
                    size={28}
                  />
                </div>

                <h2>
                  Aucune annonce
                </h2>

                <p>
                  Vous n'avez pas encore publié
                  d'annonce sur AgroMarket Burkina.
                </p>

                <Link
                  to="/publier"
                  className="dashboard-primary-button"
                >
                  <Icon
                    name="plus"
                    size={17}
                  />

                  Publier ma première annonce
                </Link>

              </div>
            )}

          {/* ==================================================
              LISTE DES ANNONCES
          ================================================== */}

          {!loading &&
            !error &&
            annonces.length > 0 && (
              <>

                <div className="dashboard-list">

                  {annonces.map(
                    (annonce) => {
                      const status =
                        getStatusInfo(
                          annonce?.statut
                        );

                      return (
                        <article
                          key={annonce.id}
                          className="dashboard-item"
                        >

                          <div className="item-main">

                            <div className="item-icon">
                              🌾
                            </div>

                            <div>

                              <span className="item-reference">
                                ANNONCE #
                                {annonce.id}
                              </span>

                              <h3>
                                Produit #
                                {annonce.produit_id}
                              </h3>

                              <div className="item-meta">

                                <span>
                                  💰{" "}
                                  {formatPrice(
                                    annonce.prix
                                  )}
                                </span>

                                <span>
                                  📦{" "}
                                  {annonce.quantite}{" "}
                                  {annonce.unite}
                                </span>

                                {annonce.region && (
                                  <span>
                                    📍{" "}
                                    {annonce.region}
                                  </span>
                                )}

                                {annonce.province && (
                                  <span>
                                    {annonce.province}
                                  </span>
                                )}

                                {annonce.commune && (
                                  <span>
                                    {annonce.commune}
                                  </span>
                                )}

                              </div>

                              {annonce.date_publication && (
                                <small>
                                  Publiée le{" "}
                                  {formatDate(
                                    annonce.date_publication
                                  )}
                                </small>
                              )}

                            </div>

                          </div>

                          <div className="item-actions">

                            <BadgeStatut
                              statut={
                                annonce?.statut
                              }
                            />

                            <Link
                              to="/produits"
                              className="outline-button"
                            >
                              Voir les produits
                            </Link>

                          </div>

                        </article>
                      );
                    }
                  )}

                </div>

                {/* ==================================================
                    PAGINATION
                ================================================== */}

                {totalPages > 1 && (
                  <nav
                    className="pagination"
                    aria-label="Pagination des annonces"
                  >

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() =>
                        changerPage(
                          page - 1
                        )
                      }
                      disabled={
                        !hasPreviousPage ||
                        loading ||
                        refreshing
                      }
                    >
                      ← Précédent
                    </button>

                    <span
                      className="pagination-info"
                      aria-live="polite"
                    >
                      Page{" "}
                      <strong>
                        {page}
                      </strong>{" "}
                      sur{" "}
                      <strong>
                        {totalPages}
                      </strong>
                    </span>

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() =>
                        changerPage(
                          page + 1
                        )
                      }
                      disabled={
                        !hasNextPage ||
                        loading ||
                        refreshing
                      }
                    >
                      Suivant →
                    </button>

                  </nav>
                )}

              </>
            )}

        </div>

      </section>

    </main>
  );
}
