import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";
import "../styles/pages/moderation-dashboard.css";
import {
  getAnnoncesEnAttente,
  approuverAnnonce,
  refuserAnnonce,
} from "../services/api/products";

import {
  getCurrentUser,
} from "../services/api/auth";


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
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 19 6v5c0 4.6-2.8 7.8-7 10-4.2-2.2-7-5.4-7-10V6l7-3Z" />
          <path d="m9.5 12 1.7 1.7 3.6-3.6" />
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

    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v5l3 2" />
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

    case "eye":
      return (
        <svg {...common}>
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );

    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.2 4.2" />
        </svg>
      );

    default:
      return null;
  }
}


/* ============================================================
   UTILITAIRES
   ============================================================ */

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


function getProductName(annonce) {
  return (
    annonce?.produit?.nom ||
    annonce?.produit_nom ||
    annonce?.nom_produit ||
    `Annonce #${annonce?.id || ""}`
  );
}


function getSellerName(annonce) {
  const vendeur =
    annonce?.vendeur;

  if (!vendeur) {
    return (
      annonce?.vendeur_nom ||
      `Vendeur #${
        annonce?.vendeur_id || ""
      }`
    );
  }

  return (
    [
      vendeur.prenom,
      vendeur.nom,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    vendeur.telephone ||
    vendeur.email ||
    "Vendeur"
  );
}


function getProductImage(annonce) {
  if (
    Array.isArray(
      annonce?.images
    ) &&
    annonce.images.length > 0
  ) {
    return annonce.images[0]?.url || null;
  }

  return null;
}


/* ============================================================
   PAGE
   ============================================================ */

function ModerationDashboard() {
  const [moderator, setModerator] =
    useState(null);

  const [annonces, setAnnonces] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [processingId, setProcessingId] =
    useState(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [selectedAnnonce, setSelectedAnnonce] =
    useState(null);

  const [decisionMotif, setDecisionMotif] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("all");


  /* ==========================================================
     CHARGEMENT
     ========================================================== */

  const loadModeration = useCallback(
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
          moderatorResult,
          annoncesResult,
        ] = await Promise.all([
          getCurrentUser(),
          getAnnoncesEnAttente(),
        ]);

        setModerator(
          moderatorResult
        );

        setAnnonces(
          Array.isArray(
            annoncesResult
          )
            ? annoncesResult
            : []
        );
      } catch (err) {
        console.error(
          "Erreur chargement modération :",
          err
        );

        setError(
          err.message ||
            "Impossible de charger les annonces à modérer."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );


  useEffect(() => {
    loadModeration({
      initial: true,
    });
  }, [loadModeration]);


  /* ==========================================================
     ANNONCES FILTRÉES
     ========================================================== */

  const filteredAnnonces =
    useMemo(() => {
      let result = [...annonces];

      const normalizedSearch =
        search.trim().toLowerCase();

      if (normalizedSearch) {
        result = result.filter(
          (annonce) => {
            const productName =
              getProductName(
                annonce
              ).toLowerCase();

            const sellerName =
              getSellerName(
                annonce
              ).toLowerCase();

            const location = [
              annonce?.commune,
              annonce?.province,
              annonce?.region,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            return (
              productName.includes(
                normalizedSearch
              ) ||
              sellerName.includes(
                normalizedSearch
              ) ||
              location.includes(
                normalizedSearch
              )
            );
          }
        );
      }

      if (filter === "with-image") {
        result = result.filter(
          (annonce) =>
            Array.isArray(
              annonce?.images
            ) &&
            annonce.images.length > 0
        );
      }

      if (filter === "without-image") {
        result = result.filter(
          (annonce) =>
            !Array.isArray(
              annonce?.images
            ) ||
            annonce.images.length === 0
        );
      }

      return result;
    }, [
      annonces,
      search,
      filter,
    ]);


  /* ==========================================================
     APPROBATION
     ========================================================== */

  async function handleApprove(
    annonce
  ) {
    if (!annonce?.id) {
      return;
    }

    const confirmed =
      window.confirm(
        `Voulez-vous réellement approuver l'annonce « ${getProductName(
          annonce
        )} » ?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(
        annonce.id
      );

      setError("");
      setSuccess("");

      await approuverAnnonce(
        annonce.id
      );

      setAnnonces(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              annonce.id
          )
      );

      setSuccess(
        `L'annonce « ${getProductName(
          annonce
        )} » a été approuvée.`
      );

      setSelectedAnnonce(
        null
      );

      setDecisionMotif("");
    } catch (err) {
      console.error(
        "Erreur approbation annonce :",
        err
      );

      setError(
        err.message ||
          "Impossible d'approuver cette annonce."
      );
    } finally {
      setProcessingId(null);
    }
  }


  /* ==========================================================
     REFUS
     ========================================================== */

  async function handleReject(
    annonce
  ) {
    if (!annonce?.id) {
      return;
    }

    const motif =
      decisionMotif.trim();

    if (!motif) {
      setError(
        "Le motif du refus est obligatoire."
      );

      return;
    }

    try {
      setProcessingId(
        annonce.id
      );

      setError("");
      setSuccess("");

      await refuserAnnonce(
        annonce.id,
        motif
      );

      setAnnonces(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              annonce.id
          )
      );

      setSuccess(
        `L'annonce « ${getProductName(
          annonce
        )} » a été refusée.`
      );

      setSelectedAnnonce(
        null
      );

      setDecisionMotif("");
    } catch (err) {
      console.error(
        "Erreur refus annonce :",
        err
      );

      setError(
        err.message ||
          "Impossible de refuser cette annonce."
      );
    } finally {
      setProcessingId(null);
    }
  }


  /* ==========================================================
     OUVRIR DÉTAILS
     ========================================================== */

  function openAnnonce(
    annonce
  ) {
    setSelectedAnnonce(
      annonce
    );

    setDecisionMotif("");
    setError("");
    setSuccess("");
  }


  /* ==========================================================
     FERMER MODAL
     ========================================================== */

  function closeModal() {
    if (
      processingId !== null
    ) {
      return;
    }

    setSelectedAnnonce(
      null
    );

    setDecisionMotif("");
  }


  /* ==========================================================
     STATISTIQUES
     ========================================================== */

  const statistics =
    useMemo(() => {
      const withImages =
        annonces.filter(
          (annonce) =>
            Array.isArray(
              annonce?.images
            ) &&
            annonce.images.length > 0
        ).length;

      const withoutImages =
        annonces.length -
        withImages;

      const regions =
        new Set(
          annonces
            .map(
              (annonce) =>
                annonce?.region
            )
            .filter(Boolean)
        ).size;

      return {
        total: annonces.length,
        withImages,
        withoutImages,
        regions,
      };
    }, [annonces]);


  /* ==========================================================
     LOADING
     ========================================================== */

  if (loading) {
    return (
      <main className="page moderation-page">

        <div className="container">

          <div className="loading-state">

            <div className="spinner spinner-lg"></div>

            <h2>
              Chargement de la modération...
            </h2>

            <p>
              Récupération des annonces
              en attente de validation.
            </p>

          </div>

        </div>

      </main>
    );
  }


  return (
    <main className="page moderation-page">

      {/* ======================================================
          HEADER
      ======================================================= */}

      <section className="moderation-header">

        <div className="container">

          <div className="moderation-header-inner">

            <div className="moderation-identity">

              <div className="moderation-icon">
                <Icon
                  name="shield"
                  size={28}
                />
              </div>

              <div>

                <span className="section-eyebrow">
                  Espace modération
                </span>

                <h1>
                  Contrôle des annonces
                </h1>

                <p>
                  Vérifiez les annonces avant
                  leur publication sur AgroMarket.
                </p>

              </div>

            </div>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() =>
                loadModeration()
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
                    size={17}
                  />

                  Actualiser
                </>
              )}
            </button>

          </div>

        </div>

      </section>


      {/* ======================================================
          CONTENU
      ======================================================= */}

      <section className="moderation-content page-section-sm">

        <div className="container">

          {error && (
            <div
              className="alert alert-danger"
              role="alert"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="alert alert-success"
              role="status"
            >
              {success}
            </div>
          )}


          {/* =================================================
              STATISTIQUES
          ================================================== */}

          <div className="grid-4 moderation-stats">

            <div className="card moderation-stat-card">

              <div className="moderation-stat-icon">
                <Icon
                  name="clock"
                  size={22}
                />
              </div>

              <div>

                <span>
                  À modérer
                </span>

                <strong>
                  {statistics.total}
                </strong>

                <small>
                  annonces en attente
                </small>

              </div>

            </div>


            <div className="card moderation-stat-card">

              <div className="moderation-stat-icon">
                <Icon
                  name="package"
                  size={22}
                />
              </div>

              <div>

                <span>
                  Avec photo
                </span>

                <strong>
                  {statistics.withImages}
                </strong>

                <small>
                  annonces illustrées
                </small>

              </div>

            </div>


            <div className="card moderation-stat-card">

              <div className="moderation-stat-icon">
                <Icon
                  name="eye"
                  size={22}
                />
              </div>

              <div>

                <span>
                  Sans photo
                </span>

                <strong>
                  {statistics.withoutImages}
                </strong>

                <small>
                  annonces à vérifier
                </small>

              </div>

            </div>


            <div className="card moderation-stat-card">

              <div className="moderation-stat-icon">
                <Icon
                  name="location"
                  size={22}
                />
              </div>

              <div>

                <span>
                  Régions
                </span>

                <strong>
                  {statistics.regions}
                </strong>

                <small>
                  représentées
                </small>

              </div>

            </div>

          </div>


          {/* =================================================
              OUTILS
          ================================================== */}

          <div className="moderation-toolbar card">

            <div className="moderation-search">

              <Icon
                name="search"
                size={18}
              />

              <input
                type="search"
                placeholder="Rechercher une annonce, un vendeur ou une région..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />

            </div>


            <div className="moderation-filters">

              <button
                type="button"
                className={
                  filter ===
                  "all"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setFilter(
                    "all"
                  )
                }
              >
                Toutes
              </button>

              <button
                type="button"
                className={
                  filter ===
                  "with-image"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setFilter(
                    "with-image"
                  )
                }
              >
                Avec photo
              </button>

              <button
                type="button"
                className={
                  filter ===
                  "without-image"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setFilter(
                    "without-image"
                  )
                }
              >
                Sans photo
              </button>

            </div>

          </div>


          {/* =================================================
              LISTE
          ================================================== */}

          <section className="moderation-list-section">

            <div className="moderation-list-header">

              <div>

                <span className="section-eyebrow">
                  File de modération
                </span>

                <h2>
                  Annonces à examiner
                </h2>

                <p>
                  {filteredAnnonces.length} résultat
                  {filteredAnnonces.length >
                  1
                    ? "s"
                    : ""}
                </p>

              </div>

            </div>


            {filteredAnnonces.length ===
            0 ? (
              <div className="empty-state">

                <div className="empty-state-icon">
                  <Icon
                    name="check"
                    size={25}
                  />
                </div>

                <h3 className="empty-state-title">
                  Aucune annonce à examiner
                </h3>

                <p className="empty-state-description">
                  Toutes les annonces actuellement
                  soumises ont été traitées ou aucun
                  résultat ne correspond à votre recherche.
                </p>

                {(search ||
                  filter !==
                    "all") && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setSearch("");
                      setFilter(
                        "all"
                      );
                    }}
                  >
                    Réinitialiser les filtres
                  </button>
                )}

              </div>
            ) : (
              <div className="moderation-list">

                {filteredAnnonces.map(
                  (annonce) => {

                    const image =
                      getProductImage(
                        annonce
                      );

                    const isProcessing =
                      processingId ===
                      annonce.id;

                    return (
                      <article
                        key={
                          annonce.id
                        }
                        className="card moderation-item"
                      >

                        <div className="moderation-item-image">

                          {image ? (
                            <img
                              src={
                                image
                              }
                              alt={getProductName(
                                annonce
                              )}
                              loading="lazy"
                            />
                          ) : (
                            <div className="moderation-no-image">
                              <Icon
                                name="package"
                                size={28}
                              />

                              <span>
                                Sans photo
                              </span>
                            </div>
                          )}

                        </div>


                        <div className="moderation-item-content">

                          <div className="moderation-item-heading">

                            <div>

                              <span className="badge badge-warning">
                                En attente
                              </span>

                              <h3>
                                {getProductName(
                                  annonce
                                )}
                              </h3>

                            </div>

                            <span className="moderation-annonce-id">
                              #
                              {
                                annonce.id
                              }
                            </span>

                          </div>


                          <div className="moderation-item-information">

                            <div>
                              <span>
                                Vendeur
                              </span>

                              <strong>
                                {getSellerName(
                                  annonce
                                )}
                              </strong>
                            </div>

                            <div>
                              <span>
                                Prix
                              </span>

                              <strong>
                                {formatPrice(
                                  annonce.prix
                                )}{" "}
                                FCFA
                              </strong>
                            </div>

                            <div>
                              <span>
                                Quantité
                              </span>

                              <strong>
                                {
                                  annonce.quantite
                                }{" "}
                                {
                                  annonce.unite
                                }
                              </strong>
                            </div>

                            <div>
                              <span>
                                Localisation
                              </span>

                              <strong>
                                {[
                                  annonce.commune,
                                  annonce.province,
                                  annonce.region,
                                ]
                                  .filter(
                                    Boolean
                                  )
                                  .join(
                                    ", "
                                  ) ||
                                  "Non renseignée"}
                              </strong>
                            </div>

                          </div>


                          {annonce.description && (
                            <p className="moderation-item-description">
                              {
                                annonce.description
                              }
                            </p>
                          )}


                          <div className="moderation-item-footer">

                            <small>
                              Soumise le{" "}
                              {formatDate(
                                annonce.date_publication
                              )}
                            </small>

                            <div className="moderation-item-actions">

                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() =>
                                  openAnnonce(
                                    annonce
                                  )
                                }
                                disabled={
                                  isProcessing
                                }
                              >
                                <Icon
                                  name="eye"
                                  size={16}
                                />

                                Examiner
                              </button>

                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() =>
                                  handleApprove(
                                    annonce
                                  )
                                }
                                disabled={
                                  isProcessing
                                }
                              >
                                {isProcessing ? (
                                  <>
                                    <span className="spinner spinner-sm"></span>
                                    Traitement...
                                  </>
                                ) : (
                                  <>
                                    <Icon
                                      name="check"
                                      size={16}
                                    />

                                    Approuver
                                  </>
                                )}
                              </button>

                            </div>

                          </div>

                        </div>

                      </article>
                    );
                  }
                )}

              </div>
            )}

          </section>

        </div>
      </section>


      {/* ======================================================
          MODAL DÉTAIL / DÉCISION
      ======================================================= */}

      {selectedAnnonce && (
        <div
          className="moderation-modal-overlay"
          role="presentation"
        >

          <div
            className="moderation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="moderation-modal-title"
          >

            <div className="moderation-modal-header">

              <div>

                <span className="section-eyebrow">
                  Examen de l'annonce
                </span>

                <h2 id="moderation-modal-title">
                  {getProductName(
                    selectedAnnonce
                  )}
                </h2>

              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={
                  closeModal
                }
                disabled={
                  processingId !==
                  null
                }
                aria-label="Fermer"
              >
                <Icon
                  name="close"
                  size={20}
                />
              </button>

            </div>


            <div className="moderation-modal-body">

              {/* ==========================================
                  INFORMATIONS PRODUIT
              =========================================== */}

              <div className="moderation-detail-grid">

                <div>

                  <span>
                    Vendeur
                  </span>

                  <strong>
                    {getSellerName(
                      selectedAnnonce
                    )}
                  </strong>

                </div>

                <div>

                  <span>
                    Prix
                  </span>

                  <strong>
                    {formatPrice(
                      selectedAnnonce.prix
                    )}{" "}
                    FCFA
                  </strong>

                </div>

                <div>

                  <span>
                    Quantité
                  </span>

                  <strong>
                    {
                      selectedAnnonce.quantite
                    }{" "}
                    {
                      selectedAnnonce.unite
                    }
                  </strong>

                </div>

                <div>

                  <span>
                    Région
                  </span>

                  <strong>
                    {
                      selectedAnnonce.region ||
                      "Non renseignée"
                    }
                  </strong>

                </div>

              </div>


              {/* ==========================================
                  DESCRIPTION
              =========================================== */}

              {selectedAnnonce.description && (
                <div className="moderation-description">

                  <span>
                    Description
                  </span>

                  <p>
                    {
                      selectedAnnonce.description
                    }
                  </p>

                </div>
              )}


              {/* ==========================================
                  PHOTOS
              =========================================== */}

              {Array.isArray(
                selectedAnnonce.images
              ) &&
                selectedAnnonce.images.length >
                  0 && (
                <div className="moderation-images">

                  <span>
                    Photos
                  </span>

                  <div>

                    {selectedAnnonce.images.map(
                      (
                        image,
                        index
                      ) => (
                        <img
                          key={
                            image.id ||
                            `${image.url}-${index}`
                          }
                          src={
                            image.url
                          }
                          alt={`${getProductName(
                            selectedAnnonce
                          )} - photo ${
                            index + 1
                          }`}
                        />
                      )
                    )}

                  </div>

                </div>
              )}


              {/* ==========================================
                  MOTIF
              =========================================== */}

              <div className="form-group">

                <label
                  htmlFor="decisionMotif"
                  className="form-label"
                >
                  Motif / commentaire de modération
                </label>

                <textarea
                  id="decisionMotif"
                  className="form-textarea"
                  value={
                    decisionMotif
                  }
                  onChange={(event) =>
                    setDecisionMotif(
                      event.target.value
                    )
                  }
                  placeholder="Indiquez la raison de votre décision..."
                  maxLength={1000}
                  disabled={
                    processingId !==
                    null
                  }
                />

                <small className="form-help">
                  {
                    decisionMotif.length
                  }{" "}
                  / 1000 caractères
                </small>

              </div>


              <div className="alert alert-warning">

                <Icon
                  name="shield"
                  size={18}
                />

                <span>
                  Vérifiez les informations avant
                  de prendre votre décision. Une
                  approbation rend l'annonce disponible
                  publiquement selon les règles de la
                  plateforme.
                </span>

              </div>

            </div>


            <div className="moderation-modal-footer">

              <button
                type="button"
                className="btn btn-outline"
                onClick={
                  closeModal
                }
                disabled={
                  processingId !==
                  null
                }
              >
                Annuler
              </button>

              <button
                type="button"
                className="btn btn-danger"
                onClick={() =>
                  handleReject(
                    selectedAnnonce
                  )
                }
                disabled={
                  processingId !==
                    null ||
                  !decisionMotif.trim()
                }
              >
                {processingId ===
                selectedAnnonce.id ? (
                  <>
                    <span className="spinner spinner-sm"></span>
                    Traitement...
                  </>
                ) : (
                  <>
                    <Icon
                      name="close"
                      size={17}
                    />

                    Refuser
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  handleApprove(
                    selectedAnnonce
                  )
                }
                disabled={
                  processingId !==
                  null
                }
              >
                {processingId ===
                selectedAnnonce.id ? (
                  <>
                    <span className="spinner spinner-sm"></span>
                    Traitement...
                  </>
                ) : (
                  <>
                    <Icon
                      name="check"
                      size={17}
                    />

                    Approuver
                  </>
                )}
              </button>

            </div>

          </div>
        </div>
      )}

    </main>
  );
}

export default ModerationDashboard;