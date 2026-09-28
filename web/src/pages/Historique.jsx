// ============================================================
// AGROMARKET BURKINA
// PAGE — HISTORIQUE DE MODÉRATION
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/pages/historique.css";
import {
  getHistorique,
  getHistoriqueStats,
} from "../services/api/historique";

// ============================================================
// ICÔNES
// ============================================================

const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M13 3a9 9 0 1 1-8.49 6H2l3-3 3 3H5.55A7 7 0 1 0 13 5a6.95 6.95 0 0 0-4.95 2.05L7 6a8.95 8.95 0 0 1 6-3Zm-1 5h2v5l4 2-1 1.73-5-3V8Z" />
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m21 19.59-4.35-4.35A7.5 7.5 0 1 0 15.24 16L19.59 20 21 19.59ZM5.5 10A4.5 4.5 0 1 1 10 14.5 4.5 4.5 0 0 1 5.5 10Z" />
  </svg>
);

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17.65 6.35A7.95 7.95 0 0 0 12 4c-4.42 0-8 3.58-8 8s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A6.002 6.002 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35Z" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59Z" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m10 6-1.41 1.41L13.17 12l-4.58 4.59L10 18l6-6-6-6Z" />
  </svg>
);

// ============================================================
// OUTILS
// ============================================================

function getErrorMessage(error) {
  if (!error) {
    return "Une erreur est survenue.";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error?.detail) {
    return Array.isArray(error.detail)
      ? error.detail
          .map((item) => item?.msg || String(item))
          .join(", ")
      : String(error.detail);
  }

  if (error?.message) {
    return error.message;
  }

  return "Une erreur est survenue lors du chargement.";
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getActionLabel(action) {
  const labels = {
    soumise: "Soumise",
    approuvee: "Approuvée",
    refusee: "Refusée",
    remise_en_moderation: "Remise en modération",
  };

  return labels[action] || action || "—";
}

function getActionClass(action) {
  const classes = {
    soumise: "history-action history-action-pending",
    approuvee: "history-action history-action-success",
    refusee: "history-action history-action-danger",
    remise_en_moderation: "history-action history-action-warning",
  };

  return (
    classes[action] ||
    "history-action"
  );
}

function getAnnonceLabel(item) {
  if (item?.annonce?.id) {
    const nom =
      item.annonce.nom ||
      item.annonce.titre ||
      item.annonce.produit?.nom;

    return nom
      ? `#${item.annonce.id} — ${nom}`
      : `Annonce #${item.annonce.id}`;
  }

  if (item?.annonce_id) {
    return `Annonce #${item.annonce_id}`;
  }

  return "—";
}

function getActeurLabel(item) {
  if (item?.acteur) {
    const nom = [
      item.acteur.prenom,
      item.acteur.nom,
    ]
      .filter(Boolean)
      .join(" ");

    if (nom) {
      return nom;
    }

    if (item.acteur.email) {
      return item.acteur.email;
    }

    if (item.acteur.telephone) {
      return item.acteur.telephone;
    }

    if (item.acteur.id) {
      return `Utilisateur #${item.acteur.id}`;
    }
  }

  if (item?.acteur_id) {
    return `Utilisateur #${item.acteur_id}`;
  }

  return "—";
}

// ============================================================
// COMPOSANT
// ============================================================

export default function Historique() {
  // ----------------------------------------------------------
  // DONNÉES
  // ----------------------------------------------------------

  const [historiques, setHistoriques] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  const [stats, setStats] = useState({
    total_actions: 0,
    soumissions: 0,
    approbations: 0,
    refus: 0,
    remises_en_moderation: 0,
  });

  // ----------------------------------------------------------
  // FILTRES
  // ----------------------------------------------------------

  const [annonceId, setAnnonceId] = useState("");
  const [acteurId, setActeurId] = useState("");
  const [action, setAction] = useState("");

  // ----------------------------------------------------------
  // ÉTATS
  // ----------------------------------------------------------

  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState("");
  const [statsError, setStatsError] = useState("");

  // ==========================================================
  // CHARGER L'HISTORIQUE
  // ==========================================================

  const loadHistorique = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError("");

        const response = await getHistorique({
          annonce_id: annonceId
            ? Number(annonceId)
            : null,

          acteur_id: acteurId
            ? Number(acteurId)
            : null,

          action: action || null,

          page,
          limit: 20,
        });

        setHistoriques(
          Array.isArray(response?.historiques)
            ? response.historiques
            : []
        );

        setPagination({
          page:
            response?.pagination?.page ??
            page,

          limit:
            response?.pagination?.limit ??
            20,

          total:
            response?.pagination?.total ??
            0,

          pages:
            response?.pagination?.pages ??
            0,
        });
      } catch (err) {
        console.error(
          "Erreur historique :",
          err
        );

        setHistoriques([]);

        setError(
          getErrorMessage(err)
        );
      } finally {
        setLoading(false);
      }
    },
    [annonceId, acteurId, action]
  );

  // ==========================================================
  // CHARGER LES STATISTIQUES
  // ==========================================================

  const loadStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      setStatsError("");

      const response =
        await getHistoriqueStats({
          annonce_id: annonceId
            ? Number(annonceId)
            : null,

          acteur_id: acteurId
            ? Number(acteurId)
            : null,
        });

      setStats({
        total_actions:
          response?.total_actions ?? 0,

        soumissions:
          response?.soumissions ?? 0,

        approbations:
          response?.approbations ?? 0,

        refus:
          response?.refus ?? 0,

        remises_en_moderation:
          response?.remises_en_moderation ??
          0,
      });
    } catch (err) {
      console.error(
        "Erreur statistiques historique :",
        err
      );

      setStatsError(
        getErrorMessage(err)
      );
    } finally {
      setLoadingStats(false);
    }
  }, [annonceId, acteurId]);

  // ==========================================================
  // CHARGEMENT INITIAL
  // ==========================================================

  useEffect(() => {
    loadHistorique(1);
    loadStats();
  }, [loadHistorique, loadStats]);

  // ==========================================================
  // RECHERCHER
  // ==========================================================

  const handleSearch = async (event) => {
    event.preventDefault();

    await Promise.all([
      loadHistorique(1),
      loadStats(),
    ]);
  };

  // ==========================================================
  // RÉINITIALISER
  // ==========================================================

  const handleReset = async () => {
    setAnnonceId("");
    setActeurId("");
    setAction("");

    try {
      setLoading(true);
      setLoadingStats(true);
      setError("");
      setStatsError("");

      const [historyResponse, statsResponse] =
        await Promise.all([
          getHistorique({
            page: 1,
            limit: 20,
          }),

          getHistoriqueStats(),
        ]);

      setHistoriques(
        Array.isArray(
          historyResponse?.historiques
        )
          ? historyResponse.historiques
          : []
      );

      setPagination({
        page:
          historyResponse?.pagination?.page ??
          1,

        limit:
          historyResponse?.pagination?.limit ??
          20,

        total:
          historyResponse?.pagination?.total ??
          0,

        pages:
          historyResponse?.pagination?.pages ??
          0,
      });

      setStats({
        total_actions:
          statsResponse?.total_actions ?? 0,

        soumissions:
          statsResponse?.soumissions ?? 0,

        approbations:
          statsResponse?.approbations ?? 0,

        refus:
          statsResponse?.refus ?? 0,

        remises_en_moderation:
          statsResponse?.remises_en_moderation ??
          0,
      });
    } catch (err) {
      console.error(
        "Erreur réinitialisation historique :",
        err
      );

      setError(
        getErrorMessage(err)
      );
    } finally {
      setLoading(false);
      setLoadingStats(false);
    }
  };

  // ==========================================================
  // PAGINATION
  // ==========================================================

  const handlePreviousPage = () => {
    if (pagination.page <= 1) {
      return;
    }

    loadHistorique(
      pagination.page - 1
    );
  };

  const handleNextPage = () => {
    if (
      pagination.pages &&
      pagination.page >= pagination.pages
    ) {
      return;
    }

    loadHistorique(
      pagination.page + 1
    );
  };

  // ==========================================================
  // AFFICHAGE
  // ==========================================================

  return (
    <main className="page history-page">

      {/* =====================================================
          EN-TÊTE
      ===================================================== */}

      <section className="history-header">
        <div className="history-title-area">

          <div className="history-title-icon">
            <HistoryIcon />
          </div>

          <div>
            <h1>
              Historique de modération
            </h1>

            <p>
              Consultez les actions effectuées
              sur les annonces et suivez leur
              évolution.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="history-refresh-button"
          onClick={() => {
            loadHistorique(
              pagination.page
            );
            loadStats();
          }}
          disabled={loading}
        >
          <RefreshIcon />

          {loading
            ? "Actualisation..."
            : "Actualiser"}
        </button>
      </section>

      {/* =====================================================
          STATISTIQUES
      ===================================================== */}

      <section className="history-stats">

        <div className="history-stat-card">
          <span>
            Total des actions
          </span>

          <strong>
            {loadingStats
              ? "..."
              : stats.total_actions}
          </strong>
        </div>

        <div className="history-stat-card">
          <span>
            Soumissions
          </span>

          <strong>
            {loadingStats
              ? "..."
              : stats.soumissions}
          </strong>
        </div>

        <div className="history-stat-card">
          <span>
            Approbations
          </span>

          <strong>
            {loadingStats
              ? "..."
              : stats.approbations}
          </strong>
        </div>

        <div className="history-stat-card">
          <span>
            Refus
          </span>

          <strong>
            {loadingStats
              ? "..."
              : stats.refus}
          </strong>
        </div>

        <div className="history-stat-card">
          <span>
            Remises en modération
          </span>

          <strong>
            {loadingStats
              ? "..."
              : stats.remises_en_moderation}
          </strong>
        </div>

      </section>

      {statsError && (
        <div className="alert alert-danger">
          {statsError}
        </div>
      )}

      {/* =====================================================
          FILTRES
      ===================================================== */}

      <section className="history-filters-section">

        <form
          className="history-filters"
          onSubmit={handleSearch}
        >

          <div className="form-group">
            <label
              htmlFor="historique-annonce"
              className="form-label"
            >
              ID de l'annonce
            </label>

            <input
              id="historique-annonce"
              type="number"
              min="1"
              className="form-input"
              placeholder="Ex. 12"
              value={annonceId}
              onChange={(event) =>
                setAnnonceId(
                  event.target.value
                )
              }
            />
          </div>

          <div className="form-group">
            <label
              htmlFor="historique-acteur"
              className="form-label"
            >
              ID de l'acteur
            </label>

            <input
              id="historique-acteur"
              type="number"
              min="1"
              className="form-input"
              placeholder="Ex. 2"
              value={acteurId}
              onChange={(event) =>
                setActeurId(
                  event.target.value
                )
              }
            />
          </div>

          <div className="form-group">
            <label
              htmlFor="historique-action"
              className="form-label"
            >
              Action
            </label>

            <select
              id="historique-action"
              className="form-input"
              value={action}
              onChange={(event) =>
                setAction(
                  event.target.value
                )
              }
            >
              <option value="">
                Toutes les actions
              </option>

              <option value="soumise">
                Soumise
              </option>

              <option value="approuvee">
                Approuvée
              </option>

              <option value="refusee">
                Refusée
              </option>

              <option value="remise_en_moderation">
                Remise en modération
              </option>
            </select>
          </div>

          <div className="history-filter-actions">

            <button
              type="submit"
              className="history-search-button"
              disabled={loading}
            >
              <SearchIcon />

              Rechercher
            </button>

            <button
              type="button"
              className="history-reset-button"
              onClick={handleReset}
              disabled={loading}
            >
              Réinitialiser
            </button>

          </div>

        </form>
      </section>

      {/* =====================================================
          ERREUR
      ===================================================== */}

      {error && (
        <div
          className="alert alert-danger"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* =====================================================
          TABLEAU
      ===================================================== */}

      <section className="history-table-section">

        <div className="history-table-header">
          <div>
            <h2>
              Actions enregistrées
            </h2>

            <p>
              {pagination.total} action
              {pagination.total > 1
                ? "s"
                : ""}{" "}
              au total
            </p>
          </div>
        </div>

        {loading ? (
          <div className="history-loading">
            Chargement de l'historique...
          </div>
        ) : historiques.length === 0 ? (
          <div className="history-empty">
            <HistoryIcon />

            <h3>
              Aucun historique trouvé
            </h3>

            <p>
              Aucune action ne correspond
              aux critères sélectionnés.
            </p>
          </div>
        ) : (
          <div className="history-table-wrapper">

            <table className="history-table">

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Annonce</th>
                  <th>Acteur</th>
                  <th>Action</th>
                  <th>Ancien statut</th>
                  <th>Nouveau statut</th>
                  <th>Motif</th>
                </tr>
              </thead>

              <tbody>

                {historiques.map(
                  (item) => (
                    <tr
                      key={
                        item.id
                      }
                    >

                      <td>
                        #{item.id}
                      </td>

                      <td>
                        {formatDate(
                          item.date_action
                        )}
                      </td>

                      <td>
                        {getAnnonceLabel(
                          item
                        )}
                      </td>

                      <td>
                        {getActeurLabel(
                          item
                        )}
                      </td>

                      <td>
                        <span
                          className={getActionClass(
                            item.action
                          )}
                        >
                          {getActionLabel(
                            item.action
                          )}
                        </span>
                      </td>

                      <td>
                        {item.ancien_statut ||
                          "—"}
                      </td>

                      <td>
                        {item.nouveau_statut ||
                          "—"}
                      </td>

                      <td>
                        {item.motif ||
                          "—"}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </section>

      {/* =====================================================
          PAGINATION
      ===================================================== */}

      {pagination.pages > 0 && (
        <section className="history-pagination">

          <button
            type="button"
            className="history-page-button"
            onClick={
              handlePreviousPage
            }
            disabled={
              loading ||
              pagination.page <= 1
            }
          >
            <ChevronLeftIcon />

            Précédent
          </button>

          <span>
            Page{" "}
            <strong>
              {pagination.page}
            </strong>{" "}
            sur{" "}
            <strong>
              {pagination.pages}
            </strong>
          </span>

          <button
            type="button"
            className="history-page-button"
            onClick={
              handleNextPage
            }
            disabled={
              loading ||
              pagination.page >=
                pagination.pages
            }
          >
            Suivant

            <ChevronRightIcon />
          </button>

        </section>
      )}

      {/* =====================================================
          RETOUR
      ===================================================== */}

      <div className="history-back">
        <Link to="/admin">
          Retour au tableau de bord
        </Link>
      </div>

    </main>
  );
}