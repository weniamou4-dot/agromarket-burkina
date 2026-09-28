// ============================================================
// AGROMARKET BURKINA
// MODERATION DES AVIS DE LA PLATEFORME
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  afficherAvisPlateforme,
  getAvisPlateformeModeration,
  getStatistiquesAvisPlateforme,
  masquerAvisPlateforme,
} from "../services/api/avis_plateforme";

import "../styles/pages/moderation-avis-plateforme.css";

// ============================================================
// CONSTANTES
// ============================================================

const PAGE_SIZE = 10;

const FILTRES = {
  TOUS: "tous",
  VISIBLES: "visibles",
  MASQUES: "masques",
};

// ============================================================
// ICÔNES
// ============================================================

function Icon({ name, size = 20, strokeWidth = 2 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  switch (name) {
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3l7 3v5c0 4.8-2.9 8.7-7 10-4.1-1.3-7-5.2-7-10V6l7-3z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );

    case "star":
      return (
        <svg {...common}>
          <path d="M12 3.8l2.5 5.1 5.6.8-4 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-4 5.6-.8L12 3.8z" />
        </svg>
      );

    case "stars":
      return (
        <svg {...common}>
          <path d="M12 3.5l1.7 3.5 3.8.6-2.8 2.7.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.7 3.8-.6L12 3.5z" />
          <path d="M19 14l.8 1.6 1.7.3-1.2 1.2.3 1.7-1.6-.9-1.5.9.3-1.7-1.2-1.2 1.7-.3L19 14z" />
        </svg>
      );

    case "eye":
      return (
        <svg {...common}>
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );

    case "eye-off":
      return (
        <svg {...common}>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 002.8 2.8" />
          <path d="M9.9 5.2A9.8 9.8 0 0112 5c6 0 9.5 7 9.5 7a17.5 17.5 0 01-3.1 3.7" />
          <path d="M6.1 6.1C3.7 7.7 2.5 12 2.5 12a17.5 17.5 0 003.7 4.2A9.8 9.8 0 0012 19c1.3 0 2.5-.3 3.5-.7" />
        </svg>
      );

    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 00-3-3.87" />
          <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      );

    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
      );

    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 11a8 8 0 00-14.9-4" />
          <path d="M4 4v5h5" />
          <path d="M4 13a8 8 0 0014.9 4" />
          <path d="M20 20v-5h-5" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      );

    case "close":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );

    case "arrow-left":
      return (
        <svg {...common}>
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
      );

    case "arrow-right":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="M12 5l7 7-7 7" />
        </svg>
      );

    case "chevron-down":
      return (
        <svg {...common}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      );

    case "alert":
      return (
        <svg {...common}>
          <path d="M10.3 3.6L2.2 18a2 2 0 001.7 3h16.2a2 2 0 001.7-3L13.7 3.6a2 2 0 00-3.4 0z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );

    case "filter":
      return (
        <svg {...common}>
          <path d="M4 5h16" />
          <path d="M7 12h10" />
          <path d="M10 19h4" />
        </svg>
      );

    default:
      return null;
  }
}

// ============================================================
// OUTILS
// ============================================================

function getErrorMessage(error, fallback = "Une erreur est survenue.") {
  if (!error) {
    return fallback;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error?.response?.data?.detail) {
    return String(error.response.data.detail);
  }

  if (error?.detail) {
    return String(error.detail);
  }

  if (error?.message) {
    return String(error.message);
  }

  return fallback;
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
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat("fr-FR").format(number);
}

function getNoteMoyenne(stats) {
  const value = Number(
    stats?.note_moyenne ??
      stats?.moyenne ??
      stats?.average ??
      0
  );

  return Number.isFinite(value) ? value : 0;
}

function getAvisId(avis) {
  return avis?.id ?? avis?.avis_id ?? null;
}

function getUtilisateurId(avis) {
  return (
    avis?.utilisateur_id ??
    avis?.user_id ??
    avis?.utilisateurId ??
    null
  );
}

function getCommentaire(avis) {
  const value = avis?.commentaire;

  if (value === null || value === undefined) {
    return "Aucun commentaire.";
  }

  const text = String(value).trim();

  return text || "Aucun commentaire.";
}

function isVisible(avis) {
  return Boolean(
    avis?.est_visible ??
      avis?.visible ??
      avis?.is_visible ??
      false
  );
}

// ============================================================
// ÉTOILES
// ============================================================

function Stars({ value = 0, size = 17 }) {
  const numericValue = Number(value) || 0;

  return (
    <div
      className="map-stars"
      aria-label={`${numericValue} sur 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={
            star <= numericValue
              ? "map-star map-star-active"
              : "map-star"
          }
        >
          <Icon name="star" size={size} />
        </span>
      ))}
    </div>
  );
}

// ============================================================
// CARTE STATISTIQUE
// ============================================================

function StatCard({
  icon,
  label,
  value,
  description,
  variant = "green",
}) {
  return (
    <article className={`map-stat-card map-stat-${variant}`}>
      <div className="map-stat-icon">
        <Icon name={icon} size={23} />
      </div>

      <div className="map-stat-content">
        <span>{label}</span>

        <strong>{value}</strong>

        {description ? <small>{description}</small> : null}
      </div>
    </article>
  );
}

// ============================================================
// RÉPARTITION DES ÉTOILES
// ============================================================

function StarDistribution({ stats }) {
  const rows = [
    {
      stars: 5,
      value: Number(stats?.cinq_etoiles ?? 0),
    },
    {
      stars: 4,
      value: Number(stats?.quatre_etoiles ?? 0),
    },
    {
      stars: 3,
      value: Number(stats?.trois_etoiles ?? 0),
    },
    {
      stars: 2,
      value: Number(stats?.deux_etoiles ?? 0),
    },
    {
      stars: 1,
      value: Number(stats?.une_etoile ?? 0),
    },
  ];

  const total = rows.reduce(
    (sum, item) => sum + (Number.isFinite(item.value) ? item.value : 0),
    0
  );

  return (
    <div className="map-distribution">
      <div className="map-distribution-header">
        <div>
          <span className="map-section-eyebrow">
            Évaluation
          </span>

          <h2>Répartition des notes</h2>
        </div>

        <div className="map-distribution-total">
          {formatNumber(total)} avis
        </div>
      </div>

      <div className="map-distribution-list">
        {rows.map((item) => {
          const safeValue = Number.isFinite(item.value)
            ? item.value
            : 0;

          const percentage =
            total > 0 ? (safeValue / total) * 100 : 0;

          return (
            <div
              className="map-distribution-row"
              key={item.stars}
            >
              <div className="map-distribution-label">
                <strong>{item.stars}</strong>
                <span>
                  <Icon name="star" size={14} />
                </span>
              </div>

              <div className="map-distribution-bar">
                <span
                  style={{
                    width: `${Math.min(percentage, 100)}%`,
                  }}
                />
              </div>

              <strong className="map-distribution-count">
                {formatNumber(safeValue)}
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// SKELETON
// ============================================================

function LoadingSkeleton() {
  return (
    <div className="map-loading-list">
      {[1, 2, 3].map((item) => (
        <div className="map-review-skeleton" key={item}>
          <div className="map-skeleton-avatar" />

          <div className="map-skeleton-body">
            <div className="map-skeleton-line map-skeleton-short" />
            <div className="map-skeleton-line map-skeleton-medium" />
            <div className="map-skeleton-line" />
            <div className="map-skeleton-line map-skeleton-small" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function ModerationAvisPlateforme() {
  const [avis, setAvis] = useState([]);
  const [stats, setStats] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(FILTRES.TOUS);

  const [page, setPage] = useState(1);

  // ==========================================================
  // CHARGEMENT DES STATISTIQUES
  // ==========================================================

  const loadStats = useCallback(async () => {
    setLoadingStats(true);

    try {
      const response =
        await getStatistiquesAvisPlateforme();

      setStats(response ?? null);
    } catch (err) {
      setStats(null);

      setActionError(
        getErrorMessage(
          err,
          "Impossible de charger les statistiques des avis."
        )
      );
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // ==========================================================
  // CHARGEMENT DES AVIS
  // ==========================================================

  const loadAvis = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
      }

      setError("");

      try {
        const response =
          await getAvisPlateformeModeration({
            page: 1,
            limit: 100,
          });

        let data = [];

        if (Array.isArray(response)) {
          data = response;
        } else if (Array.isArray(response?.items)) {
          data = response.items;
        } else if (Array.isArray(response?.data)) {
          data = response.data;
        } else if (Array.isArray(response?.avis)) {
          data = response.avis;
        } else if (
          Array.isArray(response?.results)
        ) {
          data = response.results;
        }

        setAvis(data);
      } catch (err) {
        setAvis([]);

        setError(
          getErrorMessage(
            err,
            "Impossible de charger les avis de la plateforme."
          )
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ==========================================================
  // CHARGEMENT INITIAL
  // ==========================================================

  useEffect(() => {
    loadAvis();
    loadStats();
  }, [loadAvis, loadStats]);

  // ==========================================================
  // ACTUALISATION
  // ==========================================================

  const handleRefresh = async () => {
    setRefreshing(true);
    setActionError("");
    setSuccessMessage("");

    try {
      await Promise.all([
        loadAvis({ silent: true }),
        loadStats(),
      ]);

      setSuccessMessage(
        "Les données de modération ont été actualisées."
      );
    } catch {
      // Les fonctions internes gèrent déjà leurs erreurs.
    } finally {
      setRefreshing(false);
    }
  };

  // ==========================================================
  // ACTION MODÉRATION
  // ==========================================================

  const handleVisibilityChange = async (
    avisId,
    shouldShow
  ) => {
    if (!avisId) {
      return;
    }

    setActionId(avisId);
    setActionError("");
    setSuccessMessage("");

    try {
      if (shouldShow) {
        await afficherAvisPlateforme(avisId);

        setSuccessMessage(
          "L'avis a été rendu visible."
        );
      } else {
        await masquerAvisPlateforme(avisId);

        setSuccessMessage(
          "L'avis a été masqué."
        );
      }

      setAvis((current) =>
        current.map((item) => {
          if (getAvisId(item) !== avisId) {
            return item;
          }

          return {
            ...item,
            est_visible: shouldShow,
          };
        })
      );

      await loadStats();
    } catch (err) {
      setActionError(
        getErrorMessage(
          err,
          "Impossible de modifier la visibilité de cet avis."
        )
      );
    } finally {
      setActionId(null);
    }
  };

  // ==========================================================
  // FILTRAGE
  // ==========================================================

  const filteredAvis = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    return avis.filter((item) => {
      const visible = isVisible(item);

      if (
        filter === FILTRES.VISIBLES &&
        !visible
      ) {
        return false;
      }

      if (
        filter === FILTRES.MASQUES &&
        visible
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const utilisateurId =
        getUtilisateurId(item);

      const id = getAvisId(item);

      const commentaire =
        getCommentaire(item);

      const searchable = [
        id,
        utilisateurId,
        item?.note,
        commentaire,
        item?.date_creation,
      ]
        .filter(
          (value) =>
            value !== null &&
            value !== undefined
        )
        .join(" ")
        .toLowerCase();

      return searchable.includes(
        normalizedSearch
      );
    });
  }, [avis, filter, search]);

  // ==========================================================
  // PAGINATION
  // ==========================================================

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredAvis.length / PAGE_SIZE
    )
  );

  const safePage = Math.min(
    page,
    totalPages
  );

  const paginatedAvis = useMemo(() => {
    const start =
      (safePage - 1) * PAGE_SIZE;

    return filteredAvis.slice(
      start,
      start + PAGE_SIZE
    );
  }, [filteredAvis, safePage]);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  // ==========================================================
  // VALEURS STATISTIQUES
  // ==========================================================

  const totalAvis = Number(
    stats?.nombre_total ?? avis.length
  );

  const avisVisibles = Number(
    stats?.nombre_visibles ??
      avis.filter(isVisible).length
  );

  const avisMasques = Number(
    stats?.nombre_invisibles ??
      avis.filter((item) => !isVisible(item))
        .length
  );

  const noteMoyenne =
    getNoteMoyenne(stats);

  // ==========================================================
  // RENDU
  // ==========================================================

  return (
    <main className="map-page">
      {/* ====================================================
          HEADER
          ==================================================== */}

      <header className="map-header">
        <div className="map-container">
          <div className="map-header-inner">
            <div className="map-identity">
              <div className="map-header-icon">
                <Icon
                  name="shield"
                  size={30}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <span className="map-eyebrow">
                  Administration
                </span>

                <h1>
                  Modération des avis
                </h1>

                <p>
                  Contrôlez la visibilité des
                  avis publiés sur AgroMarket
                  Burkina.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="map-btn map-btn-header"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <Icon
                name="refresh"
                size={17}
                className={
                  refreshing
                    ? "map-refresh-icon"
                    : ""
                }
              />

              {refreshing
                ? "Actualisation..."
                : "Actualiser"}
            </button>
          </div>
        </div>
      </header>

      {/* ====================================================
          CONTENU
          ==================================================== */}

      <section className="map-content">
        <div className="map-container">
          {/* ALERTES */}

          {error ? (
            <div className="map-alert map-alert-danger">
              <Icon name="alert" size={19} />

              <div>
                <strong>
                  Erreur de chargement
                </strong>

                <p>{error}</p>
              </div>
            </div>
          ) : null}

          {actionError ? (
            <div className="map-alert map-alert-danger">
              <Icon name="alert" size={19} />

              <div>
                <strong>
                  Opération impossible
                </strong>

                <p>{actionError}</p>
              </div>
            </div>
          ) : null}

          {successMessage ? (
            <div className="map-alert map-alert-success">
              <Icon name="check" size={19} />

              <div>
                <strong>
                  Opération réussie
                </strong>

                <p>{successMessage}</p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSuccessMessage("")
                }
                aria-label="Fermer"
              >
                <Icon name="close" size={17} />
              </button>
            </div>
          ) : null}

          {/* ==================================================
              STATISTIQUES
              ================================================== */}

          <section className="map-stats-section">
            <div className="map-stats-grid">
              <StatCard
                icon="users"
                label="Total des avis"
                value={
                  loadingStats
                    ? "—"
                    : formatNumber(totalAvis)
                }
                description="Tous les avis enregistrés"
                variant="green"
              />

              <StatCard
                icon="eye"
                label="Avis visibles"
                value={
                  loadingStats
                    ? "—"
                    : formatNumber(avisVisibles)
                }
                description="Avis actuellement publics"
                variant="blue"
              />

              <StatCard
                icon="eye-off"
                label="Avis masqués"
                value={
                  loadingStats
                    ? "—"
                    : formatNumber(avisMasques)
                }
                description="Avis non visibles"
                variant="orange"
              />

              <StatCard
                icon="stars"
                label="Note moyenne"
                value={
                  loadingStats
                    ? "—"
                    : `${noteMoyenne.toFixed(1)}/5`
                }
                description="Basée sur les avis visibles"
                variant="yellow"
              />
            </div>
          </section>

          {/* ==================================================
              ANALYSE DES NOTES
              ================================================== */}

          <section className="map-analysis-grid">
            <StarDistribution stats={stats} />

            <article className="map-average-card">
              <div className="map-average-top">
                <span className="map-section-eyebrow">
                  Satisfaction
                </span>

                <div className="map-average-icon">
                  <Icon
                    name="star"
                    size={22}
                  />
                </div>
              </div>

              <div className="map-average-value">
                {loadingStats
                  ? "—"
                  : noteMoyenne.toFixed(1)}
                <span>/5</span>
              </div>

              <Stars
                value={Math.round(
                  noteMoyenne
                )}
                size={20}
              />

              <p>
                Note moyenne des avis
                actuellement visibles sur
                la plateforme.
              </p>
            </article>
          </section>

          {/* ==================================================
              TOOLBAR
              ================================================== */}

          <section className="map-toolbar">
            <div className="map-search">
              <Icon
                name="search"
                size={18}
              />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Rechercher par commentaire, utilisateur ou identifiant..."
                aria-label="Rechercher un avis"
              />

              {search ? (
                <button
                  type="button"
                  className="map-search-clear"
                  onClick={() => setSearch("")}
                  aria-label="Effacer la recherche"
                >
                  <Icon
                    name="close"
                    size={16}
                  />
                </button>
              ) : null}
            </div>

            <div className="map-filter-wrapper">
              <div className="map-filter-label">
                <Icon
                  name="filter"
                  size={15}
                />

                <span>Filtrer</span>
              </div>

              <div className="map-filters">
                <button
                  type="button"
                  className={
                    filter === FILTRES.TOUS
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setFilter(FILTRES.TOUS)
                  }
                >
                  Tous
                  <span>
                    {formatNumber(
                      totalAvis
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  className={
                    filter === FILTRES.VISIBLES
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setFilter(
                      FILTRES.VISIBLES
                    )
                  }
                >
                  Visibles
                  <span>
                    {formatNumber(
                      avisVisibles
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  className={
                    filter === FILTRES.MASQUES
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setFilter(
                      FILTRES.MASQUES
                    )
                  }
                >
                  Masqués
                  <span>
                    {formatNumber(
                      avisMasques
                    )}
                  </span>
                </button>
              </div>
            </div>
          </section>

          {/* ==================================================
              LISTE
              ================================================== */}

          <section className="map-list-section">
            <div className="map-list-header">
              <div>
                <span className="map-section-eyebrow">
                  Gestion
                </span>

                <h2>
                  Avis de la plateforme
                </h2>

                <p>
                  {formatNumber(
                    filteredAvis.length
                  )}{" "}
                  avis correspondent aux
                  critères actuels.
                </p>
              </div>

              <div className="map-list-page-info">
                Page {safePage} sur{" "}
                {totalPages}
              </div>
            </div>

            {loading ? (
              <LoadingSkeleton />
            ) : paginatedAvis.length === 0 ? (
              <div className="map-empty">
                <div className="map-empty-icon">
                  <Icon
                    name="search"
                    size={26}
                  />
                </div>

                <h3>
                  Aucun avis trouvé
                </h3>

                <p>
                  Aucun avis ne correspond
                  aux critères de recherche
                  ou de filtrage sélectionnés.
                </p>

                {(search ||
                  filter !==
                    FILTRES.TOUS) && (
                  <button
                    type="button"
                    className="map-btn map-btn-outline"
                    onClick={() => {
                      setSearch("");
                      setFilter(
                        FILTRES.TOUS
                      );
                    }}
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            ) : (
              <div className="map-review-list">
                {paginatedAvis.map((item) => {
                  const id =
                    getAvisId(item);

                  const utilisateurId =
                    getUtilisateurId(
                      item
                    );

                  const visible =
                    isVisible(item);

                  const note =
                    Number(
                      item?.note ?? 0
                    );

                  const commentaire =
                    getCommentaire(item);

                  const isProcessing =
                    actionId === id;

                  return (
                    <article
                      className={`map-review-card ${
                        visible
                          ? "map-review-visible"
                          : "map-review-hidden"
                      }`}
                      key={id}
                    >
                      <div className="map-review-main">
                        <div className="map-review-avatar">
                          {utilisateurId
                            ? String(
                                utilisateurId
                              ).slice(0, 2)
                            : "AG"}
                        </div>

                        <div className="map-review-content">
                          <div className="map-review-heading">
                            <div>
                              <h3>
                                Utilisateur{" "}
                                {utilisateurId
                                  ? `#${utilisateurId}`
                                  : "AgroMarket"}
                              </h3>

                              <div className="map-review-meta">
                                <Stars
                                  value={note}
                                  size={15}
                                />

                                <span>
                                  {note}/5
                                </span>

                                <span className="map-meta-dot">
                                  •
                                </span>

                                <time>
                                  {formatDate(
                                    item?.date_creation
                                  )}
                                </time>
                              </div>
                            </div>

                            <span
                              className={`map-status ${
                                visible
                                  ? "map-status-visible"
                                  : "map-status-hidden"
                              }`}
                            >
                              <span />

                              {visible
                                ? "Visible"
                                : "Masqué"}
                            </span>
                          </div>

                          <p className="map-review-comment">
                            {commentaire}
                          </p>

                          <div className="map-review-footer">
                            <span className="map-review-id">
                              Avis #
                              {id ?? "—"}
                            </span>

                            {item?.date_modification ? (
                              <span>
                                Modifié le{" "}
                                {formatDate(
                                  item.date_modification
                                )}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="map-review-actions">
                        {visible ? (
                          <button
                            type="button"
                            className="map-btn map-btn-danger-outline"
                            onClick={() =>
                              handleVisibilityChange(
                                id,
                                false
                              )
                            }
                            disabled={
                              isProcessing
                            }
                          >
                            {isProcessing ? (
                              <span className="map-spinner map-spinner-sm" />
                            ) : (
                              <Icon
                                name="eye-off"
                                size={16}
                              />
                            )}

                            Masquer
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="map-btn map-btn-primary"
                            onClick={() =>
                              handleVisibilityChange(
                                id,
                                true
                              )
                            }
                            disabled={
                              isProcessing
                            }
                          >
                            {isProcessing ? (
                              <span className="map-spinner map-spinner-sm" />
                            ) : (
                              <Icon
                                name="eye"
                                size={16}
                              />
                            )}

                            Afficher
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* ==================================================
                PAGINATION
                ================================================== */}

            {!loading &&
            filteredAvis.length > 0 ? (
              <div className="map-pagination">
                <button
                  type="button"
                  className="map-pagination-button"
                  onClick={() =>
                    setPage((current) =>
                      Math.max(
                        1,
                        current - 1
                      )
                    )
                  }
                  disabled={safePage <= 1}
                >
                  <Icon
                    name="arrow-left"
                    size={16}
                  />

                  Précédent
                </button>

                <div className="map-pagination-pages">
                  {Array.from(
                    {
                      length: Math.min(
                        totalPages,
                        7
                      ),
                    },
                    (_, index) => {
                      let pageNumber =
                        index + 1;

                      if (
                        totalPages > 7 &&
                        safePage > 4
                      ) {
                        pageNumber =
                          safePage -
                          3 +
                          index;
                      }

                      if (
                        pageNumber >
                        totalPages
                      ) {
                        return null;
                      }

                      return (
                        <button
                          key={pageNumber}
                          type="button"
                          className={
                            pageNumber ===
                            safePage
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            setPage(
                              pageNumber
                            )
                          }
                        >
                          {pageNumber}
                        </button>
                      );
                    }
                  )}
                </div>

                <button
                  type="button"
                  className="map-pagination-button"
                  onClick={() =>
                    setPage((current) =>
                      Math.min(
                        totalPages,
                        current + 1
                      )
                    )
                  }
                  disabled={
                    safePage >= totalPages
                  }
                >
                  Suivant

                  <Icon
                    name="arrow-right"
                    size={16}
                  />
                </button>
              </div>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}