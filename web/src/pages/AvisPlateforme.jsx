// ============================================================
// AGROMARKET BURKINA
// PAGE PUBLIQUE - AVIS DE LA PLATEFORME
// ============================================================

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";

import {
  creerAvisPlateforme,
  getAvisPlateforme,
  getMonAvisPlateforme,
  getStatistiquesAvisPlateforme,
  modifierAvisPlateforme,
  supprimerAvisPlateforme,
} from "../services/api/avis_plateforme";

import { getCurrentUser } from "../services/api/auth";

import "../styles/pages/avis-plateforme.css";

// ============================================================
// CONSTANTES
// ============================================================

const PAGE_SIZE = 6;

const EMPTY_STATS = {
  nombre_total: 0,
  nombre_visibles: 0,
  nombre_invisibles: 0,
  note_moyenne: 0,
  cinq_etoiles: 0,
  quatre_etoiles: 0,
  trois_etoiles: 0,
  deux_etoiles: 0,
  une_etoile: 0,
};

// ============================================================
// UTILITAIRES
// ============================================================

function formatDate(date) {
  if (!date) {
    return "";
  }

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  return value.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getRelativeDate(date) {
  if (!date) {
    return "";
  }

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  const now = new Date();

  const difference =
    now.getTime() - value.getTime();

  if (difference < 0) {
    return formatDate(date);
  }

  const minutes = Math.floor(
    difference / 60000
  );

  if (minutes < 1) {
    return "À l'instant";
  }

  if (minutes < 60) {
    return `Il y a ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `Il y a ${hours} h`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `Il y a ${days} j`;
  }

  return formatDate(date);
}

function getErrorMessage(error) {
  if (!error) {
    return "Une erreur est survenue. Veuillez réessayer.";
  }

  if (
    typeof error?.response?.data?.detail === "string"
  ) {
    return error.response.data.detail;
  }

  if (
    typeof error?.detail === "string"
  ) {
    return error.detail;
  }

  if (
    typeof error?.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return "Une erreur est survenue. Veuillez réessayer.";
}

function extractList(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.avis)) {
    return response.avis;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response?.resultats)) {
    return response.resultats;
  }

  if (Array.isArray(response?.results)) {
    return response.results;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
}

// ============================================================
// ÉTOILES
// ============================================================

function StarRating({
  value = 0,
  interactive = false,
  onChange,
  size = "normal",
}) {
  const numericValue = Number(value) || 0;

  return (
    <div
      className={`amp-stars amp-stars-${size}`}
      aria-label={`Note : ${numericValue} sur 5`}
      role={interactive ? "group" : undefined}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= numericValue;

        if (interactive) {
          return (
            <button
              key={star}
              type="button"
              className={
                active
                  ? "amp-star amp-star-active"
                  : "amp-star"
              }
              onClick={() => onChange?.(star)}
              aria-label={`Donner ${star} étoile${
                star > 1 ? "s" : ""
              }`}
              aria-pressed={active}
            >
              ★
            </button>
          );
        }

        return (
          <span
            key={star}
            className={
              active
                ? "amp-star amp-star-active"
                : "amp-star"
            }
            aria-hidden="true"
          >
            ★
          </span>
        );
      })}
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function AvisPlateforme() {
  // ==========================================================
  // AUTHENTIFICATION
  // ==========================================================

  const [utilisateurConnecte, setUtilisateurConnecte] =
    useState(false);

  const [loadingUtilisateur, setLoadingUtilisateur] =
    useState(true);

  // ==========================================================
  // AVIS PUBLICS
  // ==========================================================

  const [avisPublics, setAvisPublics] = useState([]);

  const [loadingAvis, setLoadingAvis] = useState(true);

  const [errorAvis, setErrorAvis] = useState("");

  const [page, setPage] = useState(1);

  const [hasNextPage, setHasNextPage] = useState(false);

  // ==========================================================
  // STATISTIQUES
  // ==========================================================

  const [statistiques, setStatistiques] =
    useState(EMPTY_STATS);

  const [loadingStats, setLoadingStats] = useState(true);

  // ==========================================================
  // MON AVIS
  // ==========================================================

  const [monAvis, setMonAvis] = useState(null);

  const [loadingMonAvis, setLoadingMonAvis] =
    useState(false);

  // ==========================================================
  // FORMULAIRE
  // ==========================================================

  const [formVisible, setFormVisible] = useState(false);

  const [modeEdition, setModeEdition] = useState(false);

  const [note, setNote] = useState(0);

  const [commentaire, setCommentaire] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [formError, setFormError] = useState("");

  const [formSuccess, setFormSuccess] = useState("");

  // ==========================================================
  // SUPPRESSION
  // ==========================================================

  const [deleting, setDeleting] = useState(false);

  // ==========================================================
  // CHARGER UTILISATEUR CONNECTÉ
  // ==========================================================

  const chargerUtilisateur = useCallback(
    async () => {
      setLoadingUtilisateur(true);

      try {
        const utilisateur =
          await getCurrentUser();

        setUtilisateurConnecte(
          Boolean(utilisateur)
        );
      } catch {
        setUtilisateurConnecte(false);
      } finally {
        setLoadingUtilisateur(false);
      }
    },
    []
  );

  // ==========================================================
  // CHARGER AVIS PUBLICS
  // ==========================================================

  const chargerAvis = useCallback(async () => {
    setLoadingAvis(true);
    setErrorAvis("");

    try {
      const response =
        await getAvisPlateforme({
          page,
          limit: PAGE_SIZE,
        });

      const liste = extractList(response);

      setAvisPublics(liste);

      setHasNextPage(
        liste.length >= PAGE_SIZE
      );
    } catch (error) {
      setAvisPublics([]);

      setErrorAvis(
        getErrorMessage(error)
      );

      setHasNextPage(false);
    } finally {
      setLoadingAvis(false);
    }
  }, [page]);

  // ==========================================================
  // CHARGER STATISTIQUES
  // ==========================================================

  const chargerStatistiques = useCallback(
    async () => {
      setLoadingStats(true);

      try {
        const response =
          await getStatistiquesAvisPlateforme();

        setStatistiques({
          ...EMPTY_STATS,
          ...(response || {}),
        });
      } catch {
        setStatistiques(EMPTY_STATS);
      } finally {
        setLoadingStats(false);
      }
    },
    []
  );

  // ==========================================================
  // CHARGER MON AVIS
  // ==========================================================

  const chargerMonAvis = useCallback(async () => {
    if (!utilisateurConnecte) {
      setMonAvis(null);
      setLoadingMonAvis(false);
      return;
    }

    setLoadingMonAvis(true);

    try {
      const response =
        await getMonAvisPlateforme();

      setMonAvis(response || null);
    } catch {
      setMonAvis(null);
    } finally {
      setLoadingMonAvis(false);
    }
  }, [utilisateurConnecte]);

  // ==========================================================
  // CHARGEMENT INITIAL
  // ==========================================================

  useEffect(() => {
    chargerUtilisateur();
  }, [chargerUtilisateur]);

  useEffect(() => {
    chargerAvis();
  }, [chargerAvis]);

  useEffect(() => {
    chargerStatistiques();
  }, [chargerStatistiques]);

  useEffect(() => {
    chargerMonAvis();
  }, [chargerMonAvis]);

  // ==========================================================
  // OUVRIR CRÉATION
  // ==========================================================

  function ouvrirCreation() {
    if (!utilisateurConnecte) {
      return;
    }

    setModeEdition(false);
    setFormError("");
    setFormSuccess("");
    setNote(0);
    setCommentaire("");
    setFormVisible(true);
  }

  // ==========================================================
  // OUVRIR MODIFICATION
  // ==========================================================

  function ouvrirEdition() {
    if (!monAvis) {
      return;
    }

    setModeEdition(true);
    setFormError("");
    setFormSuccess("");

    setNote(
      Number(monAvis.note || 0)
    );

    setCommentaire(
      monAvis.commentaire || ""
    );

    setFormVisible(true);
  }

  // ==========================================================
  // FERMER FORMULAIRE
  // ==========================================================

  function fermerFormulaire() {
    if (submitting) {
      return;
    }

    setFormVisible(false);
    setFormError("");
    setFormSuccess("");
  }

  // ==========================================================
  // ENVOYER AVIS
  // ==========================================================

  async function handleSubmit(event) {
    event.preventDefault();

    setFormError("");
    setFormSuccess("");

    if (!utilisateurConnecte) {
      setFormError(
        "Vous devez être connecté pour publier un avis."
      );

      return;
    }

    if (
      !Number.isInteger(note) ||
      note < 1 ||
      note > 5
    ) {
      setFormError(
        "Veuillez sélectionner une note entre 1 et 5."
      );

      return;
    }

    const commentaireNettoye =
      commentaire.trim();

    if (
      commentaireNettoye.length > 1000
    ) {
      setFormError(
        "Votre commentaire ne peut pas dépasser 1000 caractères."
      );

      return;
    }

    setSubmitting(true);

    try {
      if (
        modeEdition &&
        monAvis?.id
      ) {
        const response =
          await modifierAvisPlateforme(
            monAvis.id,
            {
              note,
              commentaire:
                commentaireNettoye,
            }
          );

        setMonAvis(
          response?.avis ||
            response ||
            null
        );

        setFormSuccess(
          "Votre avis a été modifié avec succès."
        );
      } else {
        const response =
          await creerAvisPlateforme({
            note,
            commentaire:
              commentaireNettoye,
          });

        setMonAvis(
          response?.avis ||
            response ||
            null
        );

        setFormSuccess(
          "Merci ! Votre avis a été publié avec succès."
        );
      }

      await Promise.all([
        chargerStatistiques(),
        chargerAvis(),
      ]);

      window.setTimeout(() => {
        setFormVisible(false);
        setFormSuccess("");
      }, 1000);
    } catch (error) {
      setFormError(
        getErrorMessage(error)
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ==========================================================
  // SUPPRIMER MON AVIS
  // ==========================================================

  async function handleDelete() {
    if (!monAvis?.id) {
      return;
    }

    const confirmation =
      window.confirm(
        "Voulez-vous vraiment supprimer votre avis ? Cette action est définitive."
      );

    if (!confirmation) {
      return;
    }

    setDeleting(true);
    setFormError("");

    try {
      await supprimerAvisPlateforme(
        monAvis.id
      );

      setMonAvis(null);
      setFormVisible(false);
      setModeEdition(false);
      setNote(0);
      setCommentaire("");

      await Promise.all([
        chargerStatistiques(),
        chargerAvis(),
      ]);
    } catch (error) {
      setFormError(
        getErrorMessage(error)
      );
    } finally {
      setDeleting(false);
    }
  }

  // ==========================================================
  // RÉPARTITION DES NOTES
  // ==========================================================

  const repartition = useMemo(() => {
    const total =
      Number(
        statistiques.nombre_visibles
      ) || 0;

    const getPercent = (value) => {
      if (!total) {
        return 0;
      }

      return Math.round(
        (Number(value) / total) * 100
      );
    };

    return [
      {
        label: 5,
        count:
          statistiques.cinq_etoiles,
        percent: getPercent(
          statistiques.cinq_etoiles
        ),
      },
      {
        label: 4,
        count:
          statistiques.quatre_etoiles,
        percent: getPercent(
          statistiques.quatre_etoiles
        ),
      },
      {
        label: 3,
        count:
          statistiques.trois_etoiles,
        percent: getPercent(
          statistiques.trois_etoiles
        ),
      },
      {
        label: 2,
        count:
          statistiques.deux_etoiles,
        percent: getPercent(
          statistiques.deux_etoiles
        ),
      },
      {
        label: 1,
        count:
          statistiques.une_etoile,
        percent: getPercent(
          statistiques.une_etoile
        ),
      },
    ];
  }, [statistiques]);

  const noteMoyenne =
    Number(
      statistiques.note_moyenne
    ) || 0;

  // ==========================================================
  // RENDU
  // ==========================================================

  return (
    <main className="amp-page">

      {/* ======================================================
          HERO
      ====================================================== */}

      <section className="amp-hero">
        <div className="amp-container">
          <div className="amp-hero-content">

            <span className="amp-eyebrow">
              AGROMARKET BURKINA
            </span>

            <h1>
              Découvrez ce que pensent
              nos utilisateurs
            </h1>

            <p>
              Des expériences partagées par
              notre communauté pour vous aider
              à découvrir AgroMarket Burkina
              et à mieux connaître notre
              plateforme.
            </p>

            <div className="amp-hero-actions">

              {loadingUtilisateur ? (
                <div className="amp-button-placeholder" />
              ) : utilisateurConnecte ? (
                !monAvis ? (
                  <button
                    type="button"
                    className="amp-primary-button"
                    onClick={ouvrirCreation}
                    disabled={loadingMonAvis}
                  >
                    <span>★</span>
                    Donner mon avis
                  </button>
                ) : (
                  <button
                    type="button"
                    className="amp-primary-button"
                    onClick={ouvrirEdition}
                  >
                    <span>✎</span>
                    Modifier mon avis
                  </button>
                )
              ) : (
                <>
                  <Link
                    to="/inscription"
                    className="amp-primary-button"
                  >
                    Créer mon compte
                  </Link>

                  <Link
                    to="/connexion"
                    className="amp-secondary-hero-button"
                  >
                    Se connecter
                  </Link>
                </>
              )}

            </div>

          </div>

          <div className="amp-hero-rating">

            <span className="amp-rating-number">
              {loadingStats
                ? "—"
                : noteMoyenne.toFixed(1)}
            </span>

            <StarRating
              value={Math.round(
                noteMoyenne
              )}
              size="large"
            />

            <span>
              {Number(
                statistiques.nombre_visibles
              ) || 0}{" "}
              avis publics
            </span>

          </div>
        </div>
      </section>

      {/* ======================================================
          CONTENU PRINCIPAL
      ====================================================== */}

      <div className="amp-container amp-main">

        {/* ====================================================
            MESSAGE VISITEUR
        ==================================================== */}

        {!loadingUtilisateur &&
          !utilisateurConnecte && (
            <section className="amp-visitor-card">

              <div className="amp-visitor-icon">
                ★
              </div>

              <div className="amp-visitor-content">
                <span className="amp-section-kicker">
                  REJOIGNEZ LA COMMUNAUTÉ
                </span>

                <h2>
                  Vous utilisez AgroMarket Burkina ?
                </h2>

                <p>
                  Créez gratuitement votre compte
                  pour découvrir la plateforme et
                  partager à votre tour votre
                  expérience avec notre communauté.
                </p>
              </div>

              <div className="amp-visitor-actions">
                <Link
                  to="/inscription"
                  className="amp-primary-button"
                >
                  Créer un compte
                </Link>

                <Link
                  to="/connexion"
                  className="amp-link-button"
                >
                  Déjà membre ? Se connecter
                </Link>
              </div>

            </section>
          )}

        {/* ====================================================
            STATISTIQUES
        ==================================================== */}

        <section className="amp-stats-card">

          <div className="amp-section-heading">

            <div>
              <span className="amp-section-kicker">
                ÉVALUATION
              </span>

              <h2>
                Ce que pensent nos utilisateurs
              </h2>
            </div>

            <div className="amp-total-badge">
              {Number(
                statistiques.nombre_total
              ) || 0}{" "}
              avis
            </div>

          </div>

          <div className="amp-statistics-grid">

            <div className="amp-average">

              <strong>
                {loadingStats
                  ? "—"
                  : noteMoyenne.toFixed(1)}
              </strong>

              <StarRating
                value={Math.round(
                  noteMoyenne
                )}
                size="large"
              />

              <span>
                Note moyenne
              </span>

            </div>

            <div className="amp-distribution">

              {repartition.map((item) => (
                <div
                  className="amp-distribution-row"
                  key={item.label}
                >

                  <span>
                    {item.label} ★
                  </span>

                  <div className="amp-progress">
                    <div
                      className="amp-progress-fill"
                      style={{
                        width: `${item.percent}%`,
                      }}
                    />
                  </div>

                  <strong>
                    {item.count}
                  </strong>

                </div>
              ))}

            </div>

          </div>
        </section>

        {/* ====================================================
            MON AVIS
        ==================================================== */}

        {!loadingUtilisateur &&
          utilisateurConnecte &&
          !loadingMonAvis &&
          monAvis && (
            <section className="amp-my-review">

              <div className="amp-my-review-header">

                <div>
                  <span className="amp-section-kicker">
                    MON AVIS
                  </span>

                  <h2>
                    Merci pour votre confiance
                  </h2>
                </div>

                <div className="amp-my-review-actions">

                  <button
                    type="button"
                    className="amp-secondary-button"
                    onClick={ouvrirEdition}
                  >
                    Modifier
                  </button>

                  <button
                    type="button"
                    className="amp-danger-button"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting
                      ? "Suppression..."
                      : "Supprimer"}
                  </button>

                </div>
              </div>

              <div className="amp-my-review-body">

                <StarRating
                  value={Number(
                    monAvis.note || 0
                  )}
                  size="large"
                />

                {monAvis.commentaire ? (
                  <p>
                    “
                    {monAvis.commentaire}
                    ”
                  </p>
                ) : (
                  <p className="amp-empty-comment">
                    Vous n'avez pas ajouté
                    de commentaire.
                  </p>
                )}

                <span className="amp-review-date">
                  Publié le{" "}
                  {formatDate(
                    monAvis.date_creation
                  )}
                </span>

              </div>
            </section>
          )}

        {/* ====================================================
            FORMULAIRE
        ==================================================== */}

        {formVisible && (
          <section className="amp-form-card">

            <div className="amp-section-heading">

              <div>
                <span className="amp-section-kicker">
                  {modeEdition
                    ? "MODIFICATION"
                    : "VOTRE EXPÉRIENCE"}
                </span>

                <h2>
                  {modeEdition
                    ? "Modifier votre avis"
                    : "Comment évaluez-vous AgroMarket ?"}
                </h2>
              </div>

              <button
                type="button"
                className="amp-close-button"
                onClick={fermerFormulaire}
                disabled={submitting}
                aria-label="Fermer"
              >
                ×
              </button>

            </div>

            <form onSubmit={handleSubmit}>

              <div className="amp-form-rating">

                <span>
                  Votre note
                </span>

                <StarRating
                  value={note}
                  interactive
                  onChange={setNote}
                  size="large"
                />

                <strong>
                  {note > 0
                    ? `${note}/5`
                    : "Sélectionnez une note"}
                </strong>

              </div>

              <div className="amp-form-group">

                <label htmlFor="avis-commentaire">
                  Votre commentaire
                </label>

                <textarea
                  id="avis-commentaire"
                  value={commentaire}
                  onChange={(event) =>
                    setCommentaire(
                      event.target.value
                    )
                  }
                  maxLength={1000}
                  rows={5}
                  placeholder="Partagez votre expérience avec AgroMarket Burkina..."
                />

                <div className="amp-character-count">
                  {commentaire.length} / 1000
                </div>

              </div>

              {formError && (
                <div className="amp-alert amp-alert-error">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="amp-alert amp-alert-success">
                  {formSuccess}
                </div>
              )}

              <div className="amp-form-actions">

                <button
                  type="button"
                  className="amp-secondary-button"
                  onClick={fermerFormulaire}
                  disabled={submitting}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="amp-primary-button"
                  disabled={submitting}
                >
                  {submitting
                    ? "Enregistrement..."
                    : modeEdition
                    ? "Enregistrer les modifications"
                    : "Publier mon avis"}
                </button>

              </div>

            </form>
          </section>
        )}

        {/* ====================================================
            AVIS PUBLICS
        ==================================================== */}

        <section className="amp-public-reviews">

          <div className="amp-section-heading">

            <div>
              <span className="amp-section-kicker">
                COMMUNAUTÉ
              </span>

              <h2>
                Les avis de nos utilisateurs
              </h2>

              <p className="amp-section-description">
                Découvrez les expériences
                partagées par les membres
                d'AgroMarket Burkina.
              </p>
            </div>

          </div>

          {loadingAvis ? (
            <div className="amp-loading-grid">

              {[1, 2, 3, 4].map((item) => (
                <div
                  className="amp-review-skeleton"
                  key={item}
                >
                  <div className="amp-skeleton-line amp-skeleton-small" />
                  <div className="amp-skeleton-line" />
                  <div className="amp-skeleton-line amp-skeleton-large" />
                </div>
              ))}

            </div>
          ) : errorAvis ? (

            <div className="amp-state amp-state-error">

              <div className="amp-state-icon">
                !
              </div>

              <h3>
                Impossible de charger les avis
              </h3>

              <p>
                {errorAvis}
              </p>

              <button
                type="button"
                className="amp-primary-button"
                onClick={chargerAvis}
              >
                Réessayer
              </button>

            </div>

          ) : avisPublics.length === 0 ? (

            <div className="amp-state">

              <div className="amp-state-icon">
                ★
              </div>

              <h3>
                Aucun avis pour le moment
              </h3>

              <p>
                Soyez le premier à partager
                votre expérience avec
                AgroMarket Burkina.
              </p>

              {!loadingUtilisateur &&
                utilisateurConnecte &&
                !monAvis && (
                  <button
                    type="button"
                    className="amp-primary-button"
                    onClick={ouvrirCreation}
                  >
                    Donner mon avis
                  </button>
                )}

              {!loadingUtilisateur &&
                !utilisateurConnecte && (
                  <Link
                    to="/inscription"
                    className="amp-primary-button"
                  >
                    Rejoindre AgroMarket
                  </Link>
                )}

            </div>

          ) : (

            <>
              <div className="amp-reviews-grid">

                {avisPublics.map((avis) => (
                  <article
                    className="amp-review-card"
                    key={avis.id}
                  >

                    <div className="amp-review-top">

                      <div className="amp-avatar">
                        A
                      </div>

                      <div>
                        <strong>
                          Utilisateur AgroMarket
                        </strong>

                        <span>
                          {getRelativeDate(
                            avis.date_creation
                          )}
                        </span>
                      </div>

                    </div>

                    <StarRating
                      value={Number(
                        avis.note || 0
                      )}
                    />

                    {avis.commentaire ? (
                      <p className="amp-review-comment">
                        {avis.commentaire}
                      </p>
                    ) : (
                      <p className="amp-review-comment amp-muted">
                        Aucun commentaire.
                      </p>
                    )}

                    <div className="amp-review-footer">

                      <span>
                        Avis vérifié
                      </span>

                      {avis.date_modification && (
                        <small>
                          Modifié le{" "}
                          {formatDate(
                            avis.date_modification
                          )}
                        </small>
                      )}

                    </div>

                  </article>
                ))}

              </div>

              {/* ==============================================
                  PAGINATION
              ============================================== */}

              <div className="amp-pagination">

                <button
                  type="button"
                  disabled={
                    page <= 1 ||
                    loadingAvis
                  }
                  onClick={() =>
                    setPage((value) =>
                      Math.max(
                        1,
                        value - 1
                      )
                    )
                  }
                >
                  ← Précédent
                </button>

                <span>
                  Page{" "}
                  <strong>
                    {page}
                  </strong>
                </span>

                <button
                  type="button"
                  disabled={
                    !hasNextPage ||
                    loadingAvis
                  }
                  onClick={() =>
                    setPage((value) =>
                      value + 1
                    )
                  }
                >
                  Suivant →
                </button>

              </div>
            </>
          )}

        </section>

        {/* ====================================================
            APPEL À L'ACTION FINAL
        ==================================================== */}

        <section className="amp-final-cta">

          <div>
            <span className="amp-section-kicker">
              AGROMARKET BURKINA
            </span>

            <h2>
              Découvrez la plateforme
            </h2>

            <p>
              Rejoignez AgroMarket Burkina
              et découvrez une plateforme
              dédiée au commerce des produits
              agricoles et d'élevage.
            </p>
          </div>

          <div className="amp-final-actions">

            <Link
              to="/produits"
              className="amp-primary-button"
            >
              Découvrir les produits
            </Link>

            {!utilisateurConnecte && (
              <Link
                to="/inscription"
                className="amp-secondary-hero-button"
              >
                Créer mon compte
              </Link>
            )}

          </div>

        </section>

      </div>
    </main>
  );
}