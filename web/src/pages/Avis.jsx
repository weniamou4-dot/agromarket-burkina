
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import "../styles/pages/avis.css"
import { useAuth } from "../context/AuthContext";

import {
  creerAvis,
  getAvisByAnnonce,
  getAvisStats,
  modifierAvis,
  supprimerAvis,
} from "../services/api/avis";


// ============================================================
// CONSTANTES
// ============================================================

const PAGE_LIMIT = 20;

const NOTES = [5, 4, 3, 2, 1];


// ============================================================
// OUTILS
// ============================================================

function formaterDate(date) {
  if (!date) {
    return "Date inconnue";
  }

  const valeur = new Date(date);

  if (Number.isNaN(valeur.getTime())) {
    return "Date inconnue";
  }

  return valeur.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}


function afficherEtoiles(note) {
  const valeur = Math.max(
    0,
    Math.min(5, Number(note) || 0),
  );

  return (
    <span
      className="avis-stars"
      aria-label={`${valeur} sur 5`}
      title={`${valeur} sur 5`}
    >
      {[1, 2, 3, 4, 5].map((etoile) => (
        <span key={etoile}>
          {etoile <= valeur ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}


function normaliserAvisResponse(response) {
  if (Array.isArray(response)) {
    return {
      avis: response,
      pagination: {
        page: 1,
        limit: PAGE_LIMIT,
        total: response.length,
        pages: 1,
      },
    };
  }

  return {
    avis: Array.isArray(response?.avis)
      ? response.avis
      : Array.isArray(response?.resultats)
        ? response.resultats
        : Array.isArray(response?.results)
          ? response.results
          : [],
    pagination: {
      page:
        Number(response?.pagination?.page) || 1,
      limit:
        Number(response?.pagination?.limit) ||
        PAGE_LIMIT,
      total:
        Number(response?.pagination?.total) || 0,
      pages:
        Number(response?.pagination?.pages) || 1,
    },
  };
}


function normaliserStats(response) {
  return {
    total_avis:
      Number(response?.total_avis) || 0,

    moyenne:
      Number(response?.moyenne) || 0,

    note_1:
      Number(response?.note_1) || 0,

    note_2:
      Number(response?.note_2) || 0,

    note_3:
      Number(response?.note_3) || 0,

    note_4:
      Number(response?.note_4) || 0,

    note_5:
      Number(response?.note_5) || 0,
  };
}


// ============================================================
// COMPOSANT
// ============================================================

export default function Avis() {
  const { user, isAuthenticated } = useAuth();

  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const annonceId = Number(
    searchParams.get("annonce_id") ||
      searchParams.get("annonceId") ||
      0,
  );


  // ==========================================================
  // ÉTATS — AVIS
  // ==========================================================

  const [avis, setAvis] = useState([]);

  const [stats, setStats] = useState({
    total_avis: 0,
    moyenne: 0,
    note_1: 0,
    note_2: 0,
    note_3: 0,
    note_4: 0,
    note_5: 0,
  });

  const [loading, setLoading] =
    useState(true);

  const [loadingStats, setLoadingStats] =
    useState(true);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [filtreNote, setFiltreNote] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: PAGE_LIMIT,
      total: 0,
      pages: 1,
    });


  // ==========================================================
  // ÉTAT — CRÉATION
  // ==========================================================

  const [noteForm, setNoteForm] =
    useState(5);

  const [commentaireForm, setCommentaireForm] =
    useState("");

  const [commandeIdForm, setCommandeIdForm] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);


  // ==========================================================
  // ÉTAT — MODIFICATION
  // ==========================================================

  const [
    avisEnModification,
    setAvisEnModification,
  ] = useState(null);

  const [
    noteModification,
    setNoteModification,
  ] = useState(5);

  const [
    commentaireModification,
    setCommentaireModification,
  ] = useState("");

  const [
    modificationLoading,
    setModificationLoading,
  ] = useState(false);


  // ==========================================================
  // AVIS DE L'UTILISATEUR
  // ==========================================================

  const monAvis = useMemo(() => {
    if (!user?.id) {
      return null;
    }

    return (
      avis.find(
        (item) =>
          Number(item?.utilisateur_id) ===
          Number(user.id),
      ) || null
    );
  }, [avis, user?.id]);


  // ==========================================================
  // CHARGER LES AVIS
  // ==========================================================

  const chargerAvis =
    useCallback(async () => {
      if (!annonceId) {
        setAvis([]);
        setPagination({
          page: 1,
          limit: PAGE_LIMIT,
          total: 0,
          pages: 1,
        });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const resultat =
          await getAvisByAnnonce(
            annonceId,
            {
              page,
              limit: PAGE_LIMIT,
            },
          );

        const normalise =
          normaliserAvisResponse(
            resultat,
          );

        setAvis(normalise.avis);

        setPagination(
          normalise.pagination,
        );
      } catch (err) {
        console.error(
          "Erreur chargement avis :",
          err,
        );

        setError(
          err?.message ||
            "Impossible de charger les avis de cette annonce.",
        );
      } finally {
        setLoading(false);
      }
    }, [annonceId, page]);


  // ==========================================================
  // CHARGER LES STATISTIQUES
  // ==========================================================

  const chargerStats =
    useCallback(async () => {
      if (!annonceId) {
        setLoadingStats(false);
        return;
      }

      try {
        setLoadingStats(true);

        const resultat =
          await getAvisStats(
            annonceId,
          );

        setStats(
          normaliserStats(
            resultat,
          ),
        );
      } catch (err) {
        console.error(
          "Erreur statistiques avis :",
          err,
        );
      } finally {
        setLoadingStats(false);
      }
    }, [annonceId]);


  // ==========================================================
  // CHARGEMENT INITIAL
  // ==========================================================

  useEffect(() => {
    chargerAvis();
  }, [chargerAvis]);


  useEffect(() => {
    chargerStats();
  }, [chargerStats]);


  // ==========================================================
  // FILTRE
  // ==========================================================

  const avisFiltres =
    useMemo(() => {
      if (!filtreNote) {
        return avis;
      }

      return avis.filter(
        (item) =>
          Number(item?.note) ===
          Number(filtreNote),
      );
    }, [avis, filtreNote]);


  // ==========================================================
  // PUBLIER UN AVIS
  // ==========================================================

  async function handleSubmitAvis(
    event,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!annonceId) {
      setError(
        "Impossible de publier un avis : l'annonce est inconnue.",
      );
      return;
    }

    if (!isAuthenticated || !user) {
      navigate(
        `/connexion?redirect=${encodeURIComponent(
          `/avis?annonce_id=${annonceId}`,
        )}`,
      );
      return;
    }

    /*
     * Le backend empêche normalement un utilisateur
     * de créer plusieurs avis pour la même annonce.
     */
    if (monAvis) {
      setError(
        "Vous avez déjà laissé un avis pour cette annonce. Vous pouvez modifier votre avis existant.",
      );

      commencerModification(
        monAvis,
      );

      return;
    }

    try {
      setSubmitting(true);

      await creerAvis({
        annonce_id: annonceId,
        note: Number(noteForm),
        commentaire:
          commentaireForm.trim() || null,
        commande_id:
          commandeIdForm
            ? Number(commandeIdForm)
            : null,
      });

      setNoteForm(5);
      setCommentaireForm("");
      setCommandeIdForm("");

      setSuccess(
        "Votre avis a été publié avec succès.",
      );

      setPage(1);

      /*
       * On recharge directement les données.
       */
      await Promise.all([
        chargerAvis(),
        chargerStats(),
      ]);
    } catch (err) {
      console.error(
        "Erreur publication avis :",
        err,
      );

      setError(
        err?.message ||
          "Impossible de publier votre avis.",
      );
    } finally {
      setSubmitting(false);
    }
  }


  // ==========================================================
  // COMMENCER UNE MODIFICATION
  // ==========================================================

  function commencerModification(
    item,
  ) {
    if (!item) {
      return;
    }

    setAvisEnModification(item);

    setNoteModification(
      Number(item?.note) || 5,
    );

    setCommentaireModification(
      item?.commentaire || "",
    );

    setError("");
    setSuccess("");

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  }


  // ==========================================================
  // ANNULER LA MODIFICATION
  // ==========================================================

  function annulerModification() {
    setAvisEnModification(null);
    setNoteModification(5);
    setCommentaireModification("");
  }


  // ==========================================================
  // ENREGISTRER LA MODIFICATION
  // ==========================================================

  async function enregistrerModification(
    event,
  ) {
    event.preventDefault();

    if (!avisEnModification?.id) {
      return;
    }

    try {
      setModificationLoading(true);
      setError("");
      setSuccess("");

      await modifierAvis(
        avisEnModification.id,
        {
          note:
            Number(noteModification),
          commentaire:
            commentaireModification.trim() ||
            null,
        },
      );

      setSuccess(
        "Votre avis a été modifié avec succès.",
      );

      annulerModification();

      await Promise.all([
        chargerAvis(),
        chargerStats(),
      ]);
    } catch (err) {
      console.error(
        "Erreur modification avis :",
        err,
      );

      setError(
        err?.message ||
          "Impossible de modifier votre avis.",
      );
    } finally {
      setModificationLoading(false);
    }
  }


  // ==========================================================
  // SUPPRIMER UN AVIS
  // ==========================================================

  async function handleSupprimerAvis(
    item,
  ) {
    if (!item?.id) {
      return;
    }

    const confirmation =
      window.confirm(
        "Voulez-vous vraiment supprimer votre avis ?",
      );

    if (!confirmation) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await supprimerAvis(
        item.id,
      );

      setSuccess(
        "Votre avis a été supprimé avec succès.",
      );

      if (
        avisEnModification?.id ===
        item.id
      ) {
        annulerModification();
      }

      await Promise.all([
        chargerAvis(),
        chargerStats(),
      ]);
    } catch (err) {
      console.error(
        "Erreur suppression avis :",
        err,
      );

      setError(
        err?.message ||
          "Impossible de supprimer votre avis.",
      );
    }
  }


  // ==========================================================
  // ABSENCE D'ANNONCE
  // ==========================================================

  if (!annonceId) {
    return (
      <main className="avis-page">
        <section className="avis-container">
          <header className="avis-header">
            <div>
              <h1>Avis</h1>

              <p>
                Cette page doit être ouverte
                depuis une annonce.
              </p>
            </div>
          </header>

          <Link
            to="/produits"
            className="avis-back-link"
          >
            Voir les annonces
          </Link>
        </section>
      </main>
    );
  }


  // ==========================================================
  // RENDU
  // ==========================================================

  return (
    <main className="avis-page">
      <section className="avis-container">

        {/* ================================================== */}
        {/* EN-TÊTE */}
        {/* ================================================== */}

        <header className="avis-header">
          <div>
            <h1>
              Avis de l'annonce
            </h1>

            <p>
              Consultez les avis laissés
              par les utilisateurs.
            </p>
          </div>

          <Link
            to="/produits"
            className="avis-back-link"
          >
            Retour aux annonces
          </Link>
        </header>


        {/* ================================================== */}
        {/* MESSAGES */}
        {/* ================================================== */}

        {error && (
          <div
            className="avis-message avis-message-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="avis-message avis-message-success"
            role="status"
          >
            {success}
          </div>
        )}


        {/* ================================================== */}
        {/* STATISTIQUES */}
        {/* ================================================== */}

        <section className="avis-stats">

          <div className="avis-stat-main">

            <strong>
              {loadingStats
                ? "..."
                : stats.moyenne.toFixed(
                    2,
                  )}
            </strong>

            <div>
              {afficherEtoiles(
                Math.round(
                  stats.moyenne,
                ),
              )}
            </div>

            <span>
              {stats.total_avis} avis
            </span>

          </div>


          <div className="avis-distribution">

            {NOTES.map(
              (nombre) => {
                const total =
                  stats.total_avis;

                const quantite =
                  stats[
                    `note_${nombre}`
                  ] || 0;

                const pourcentage =
                  total > 0
                    ? Math.round(
                        (quantite /
                          total) *
                          100,
                      )
                    : 0;

                return (
                  <div
                    key={nombre}
                    className="avis-distribution-row"
                  >
                    <span>
                      {nombre} ★
                    </span>

                    <progress
                      value={quantite}
                      max={total || 1}
                    />

                    <span>
                      {quantite} (
                      {pourcentage}
                      %)
                    </span>
                  </div>
                );
              },
            )}

          </div>

        </section>


        {/* ================================================== */}
        {/* FORMULAIRE */}
        {/* ================================================== */}

        {isAuthenticated ? (
          <section className="avis-form-section">

            <h2>
              {monAvis
                ? "Mon avis"
                : "Donner votre avis"}
            </h2>

            {monAvis ? (
              <div className="avis-existing">

                <div>
                  {afficherEtoiles(
                    monAvis.note,
                  )}
                </div>

                {monAvis.commentaire && (
                  <p>
                    {monAvis.commentaire}
                  </p>
                )}

                <div className="avis-actions">

                  <button
                    type="button"
                    onClick={() =>
                      commencerModification(
                        monAvis,
                      )
                    }
                  >
                    Modifier mon avis
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSupprimerAvis(
                        monAvis,
                      )
                    }
                  >
                    Supprimer mon avis
                  </button>

                </div>

              </div>
            ) : (
              <form
                onSubmit={
                  handleSubmitAvis
                }
                className="avis-form"
              >

                {/* NOTE */}

                <label>
                  Note

                  <select
                    value={noteForm}
                    onChange={(
                      event,
                    ) =>
                      setNoteForm(
                        Number(
                          event.target.value,
                        ),
                      )
                    }
                    disabled={
                      submitting
                    }
                  >
                    {NOTES.map(
                      (note) => (
                        <option
                          key={note}
                          value={note}
                        >
                          {note}{" "}
                          {note === 1
                            ? "étoile"
                            : "étoiles"}
                        </option>
                      ),
                    )}
                  </select>
                </label>


                {/* COMMANDE */}

                <label>
                  ID de la commande
                  <span>
                    {" "}
                    (optionnel)
                  </span>

                  <input
                    type="number"
                    min="1"
                    value={
                      commandeIdForm
                    }
                    onChange={(
                      event,
                    ) =>
                      setCommandeIdForm(
                        event.target.value,
                      )
                    }
                    placeholder="Ex. 12"
                    disabled={
                      submitting
                    }
                  />
                </label>


                {/* COMMENTAIRE */}

                <label>
                  Commentaire
                  <span>
                    {" "}
                    (optionnel)
                  </span>

                  <textarea
                    value={
                      commentaireForm
                    }
                    onChange={(
                      event,
                    ) =>
                      setCommentaireForm(
                        event.target.value,
                      )
                    }
                    maxLength={1000}
                    rows={5}
                    placeholder="Partagez votre expérience avec cette annonce..."
                    disabled={
                      submitting
                    }
                  />
                </label>


                {/* BOUTON */}

                <button
                  type="submit"
                  disabled={
                    submitting
                  }
                >
                  {submitting
                    ? "Publication..."
                    : "Publier mon avis"}
                </button>

              </form>
            )}

          </section>
        ) : (
          <section className="avis-form-section">

            <h2>
              Vous souhaitez donner
              votre avis ?
            </h2>

            <p>
              Connectez-vous pour
              noter cette annonce et
              partager votre expérience.
            </p>

            <Link
              to={`/connexion?redirect=${encodeURIComponent(
                `/avis?annonce_id=${annonceId}`,
              )}`}
              className="avis-back-link"
            >
              Se connecter
            </Link>

          </section>
        )}


        {/* ================================================== */}
        {/* FILTRE */}
        {/* ================================================== */}

        <section className="avis-filter-section">

          <label>
            Filtrer par note :

            <select
              value={filtreNote}
              onChange={(
                event,
              ) => {
                setFiltreNote(
                  event.target.value,
                );

                setPage(1);
              }}
            >
              <option value="">
                Toutes les notes
              </option>

              {NOTES.map(
                (note) => (
                  <option
                    key={note}
                    value={note}
                  >
                    {note}{" "}
                    {note === 1
                      ? "étoile"
                      : "étoiles"}
                  </option>
                ),
              )}
            </select>
          </label>

        </section>


        {/* ================================================== */}
        {/* LISTE DES AVIS */}
        {/* ================================================== */}

        <section className="avis-list-section">

          <h2>
            Avis des utilisateurs
          </h2>

          {loading ? (
            <p>
              Chargement des avis...
            </p>
          ) : avisFiltres.length === 0 ? (
            <p>
              Aucun avis disponible
              pour cette annonce.
            </p>
          ) : (
            <div className="avis-list">

              {avisFiltres.map(
                (item) => {
                  const estMonAvis =
                    Number(
                      item?.utilisateur_id,
                    ) ===
                    Number(
                      user?.id,
                    );

                  return (
                    <article
                      key={item.id}
                      className="avis-card"
                    >

                      <div className="avis-card-header">

                        <div>
                          <strong>
                            {estMonAvis
                              ? "Mon avis"
                              : `Utilisateur #${item.utilisateur_id}`}
                          </strong>

                          <div>
                            {afficherEtoiles(
                              item.note,
                            )}
                          </div>
                        </div>

                        <time>
                          {formaterDate(
                            item.date_creation,
                          )}
                        </time>

                      </div>


                      {item.commentaire && (
                        <p>
                          {item.commentaire}
                        </p>
                      )}


                      {estMonAvis && (
                        <div className="avis-actions">

                          <button
                            type="button"
                            onClick={() =>
                              commencerModification(
                                item,
                              )
                            }
                          >
                            Modifier
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleSupprimerAvis(
                                item,
                              )
                            }
                          >
                            Supprimer
                          </button>

                        </div>
                      )}


                      {item.visible ===
                        false && (
                        <small>
                          Cet avis est
                          masqué.
                        </small>
                      )}

                    </article>
                  );
                },
              )}

            </div>
          )}


          {/* ================================================= */}
          {/* PAGINATION */}
          {/* ================================================= */}

          {pagination.pages > 1 && (
            <div className="avis-pagination">

              <button
                type="button"
                disabled={
                  page <= 1 ||
                  loading
                }
                onClick={() =>
                  setPage(
                    (
                      anciennePage,
                    ) =>
                      Math.max(
                        1,
                        anciennePage -
                          1,
                      ),
                  )
                }
              >
                Précédent
              </button>


              <span>
                Page {page} sur{" "}
                {pagination.pages}
              </span>


              <button
                type="button"
                disabled={
                  page >=
                    pagination.pages ||
                  loading
                }
                onClick={() =>
                  setPage(
                    (
                      anciennePage,
                    ) =>
                      Math.min(
                        pagination.pages,
                        anciennePage +
                          1,
                      ),
                  )
                }
              >
                Suivant
              </button>

            </div>
          )}

        </section>


        {/* ================================================== */}
        {/* MODIFICATION */}
        {/* ================================================== */}

        {avisEnModification && (
          <section className="avis-edit-section">

            <h2>
              Modifier mon avis
            </h2>

            <form
              onSubmit={
                enregistrerModification
              }
              className="avis-form"
            >

              <label>
                Note

                <select
                  value={
                    noteModification
                  }
                  onChange={(
                    event,
                  ) =>
                    setNoteModification(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                  disabled={
                    modificationLoading
                  }
                >
                  {NOTES.map(
                    (note) => (
                      <option
                        key={note}
                        value={note}
                      >
                        {note}{" "}
                        {note === 1
                          ? "étoile"
                          : "étoiles"}
                      </option>
                    ),
                  )}
                </select>
              </label>


              <label>
                Commentaire

                <textarea
                  value={
                    commentaireModification
                  }
                  onChange={(
                    event,
                  ) =>
                    setCommentaireModification(
                      event.target.value,
                    )
                  }
                  maxLength={1000}
                  rows={5}
                  disabled={
                    modificationLoading
                  }
                  placeholder="Modifiez votre expérience..."
                />
              </label>


              <div className="avis-actions">

                <button
                  type="submit"
                  disabled={
                    modificationLoading
                  }
                >
                  {modificationLoading
                    ? "Enregistrement..."
                    : "Enregistrer"}
                </button>


                <button
                  type="button"
                  onClick={
                    annulerModification
                  }
                  disabled={
                    modificationLoading
                  }
                >
                  Annuler
                </button>

              </div>

            </form>

          </section>
        )}

      </section>
    </main>
  );
}
