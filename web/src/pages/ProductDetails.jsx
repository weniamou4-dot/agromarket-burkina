
// src/pages/ProductDetails.jsx

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import "../styles/pages/product-details.css";
import {
  getAnnonceById,
  getAnnonceItineraire,
} from "../services/api/products";

import {
  createCommande,
} from "../services/api/orders";

import {
  getAvisByAnnonce,
  getAvisStats,
} from "../services/api/avis";

import {
  creerOuRecupererConversation,
} from "../services/api/messagerie";

import {
  useAuth,
} from "../context/AuthContext";

import {
  getImageUrl,
} from "../utils/media";


/*
 * ============================================================
 * CONSTANTES
 * ============================================================
 */

const MIN_QUANTITY = 1;


/*
 * ============================================================
 * OUTILS
 * ============================================================
 */

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


function formatNumber(value) {
  return normalizeNumber(value).toLocaleString(
    "fr-FR"
  );
}


function getErrorMessage(
  error,
  fallback
) {
  if (
    error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}


function getSellerId(annonce) {
  return (
    annonce?.vendeur_id ??
    annonce?.vendeur?.id ??
    null
  );
}


function getSellerPhone(annonce) {
  const vendeur = annonce?.vendeur;

  const phone =
    vendeur?.telephone ??
    vendeur?.phone ??
    vendeur?.numero_telephone ??
    vendeur?.numeroTelephone ??
    annonce?.telephone_vendeur ??
    annonce?.telephone ??
    null;

  if (
    phone === null ||
    phone === undefined
  ) {
    return "";
  }

  return String(phone).trim();
}


function getDescription(annonce) {
  return (
    annonce?.description ??
    annonce?.description_produit ??
    annonce?.produit?.description ??
    ""
  );
}


function getImagePath(image) {
  if (!image) {
    return null;
  }

  return (
    image.url ??
    image.path ??
    image.image_url ??
    image.image ??
    null
  );
}


function normalizeImages(annonce) {
  if (
    !Array.isArray(
      annonce?.images
    )
  ) {
    return [];
  }

  return annonce.images
    .map((image) => ({
      ...image,
      resolvedUrl:
        getImageUrl(
          getImagePath(image)
        ),
    }))
    .filter(
      (image) =>
        Boolean(
          image.resolvedUrl
        )
    );
}


function getTypeProduitLabel(
  type
) {
  switch (type) {
    case "brut":
      return "Produit brut";

    case "transforme":
      return "Produit transformé";

    default:
      return null;
  }
}


function getStatusLabel(
  statut
) {
  switch (statut) {
    case "publiee":
      return "Disponible";

    case "en_attente":
      return "En attente de validation";

    case "refusee":
      return "Annonce refusée";

    case "vendue":
      return "Vendu";

    case "expiree":
      return "Annonce expirée";

    default:
      return (
        statut ||
        "Statut inconnu"
      );
  }
}


function getRatingValue(
  stats
) {
  return normalizeNumber(
    stats?.note_moyenne ??
      stats?.moyenne ??
      stats?.average ??
      0
  );
}


function getReviewCount(
  stats,
  avis
) {
  const fromStats =
    stats?.nombre_avis ??
    stats?.total ??
    stats?.count ??
    stats?.nombre ??
    null;

  if (
    fromStats !== null &&
    fromStats !== undefined
  ) {
    return normalizeNumber(
      fromStats
    );
  }

  return Array.isArray(avis)
    ? avis.length
    : 0;
}


/*
 * ============================================================
 * PAGE
 * ============================================================
 */

function ProductDetails() {
  const {
    id,
  } = useParams();

  const navigate =
    useNavigate();

  const {
    user,
    isAuthenticated,
  } = useAuth();


  /*
   * ----------------------------------------------------------
   * ANNONCE
   * ----------------------------------------------------------
   */

  const [
    annonce,
    setAnnonce,
  ] = useState(null);


  /*
   * ----------------------------------------------------------
   * AVIS
   * ----------------------------------------------------------
   */

  const [
    avis,
    setAvis,
  ] = useState([]);

  const [
    avisStats,
    setAvisStats,
  ] = useState(null);

  const [
    avisLoading,
    setAvisLoading,
  ] = useState(false);


  /*
   * ----------------------------------------------------------
   * GALERIE
   * ----------------------------------------------------------
   */

  const [
    imageActive,
    setImageActive,
  ] = useState(0);


  /*
   * ----------------------------------------------------------
   * COMMANDE
   * ----------------------------------------------------------
   */

  const [
    quantite,
    setQuantite,
  ] = useState(
    MIN_QUANTITY
  );

  const [
    commandeLoading,
    setCommandeLoading,
  ] = useState(false);

  const [
    commandeMessage,
    setCommandeMessage,
  ] = useState("");


  /*
   * ----------------------------------------------------------
   * ITINÉRAIRE
   * ----------------------------------------------------------
   */

  const [
    itineraireLoading,
    setItineraireLoading,
  ] = useState(false);

  const [
    itineraireMessage,
    setItineraireMessage,
  ] = useState("");


  /*
   * ----------------------------------------------------------
   * MESSAGERIE
   * ----------------------------------------------------------
   */

  const [
    messageLoading,
    setMessageLoading,
  ] = useState(false);

  const [
    messageError,
    setMessageError,
  ] = useState("");


  /*
   * ----------------------------------------------------------
   * ÉTATS GÉNÉRAUX
   * ----------------------------------------------------------
   */

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");


  /*
   * ==========================================================
   * CHARGEMENT DE L'ANNONCE
   * ==========================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadAnnonce() {
      try {
        setLoading(true);
        setError("");
        setAnnonce(null);

        const data =
          await getAnnonceById(
            id
          );

        if (!mounted) {
          return;
        }

        setAnnonce(data);
        setImageActive(0);

      } catch (err) {
        if (!mounted) {
          return;
        }

        console.error(
          "Erreur chargement détail annonce :",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Impossible de charger cette annonce."
          )
        );

      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (id) {
      loadAnnonce();
    } else {
      setLoading(false);

      setError(
        "Identifiant de l'annonce manquant."
      );
    }

    return () => {
      mounted = false;
    };
  }, [id]);


  /*
   * ==========================================================
   * CHARGEMENT DES AVIS
   * ==========================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadAvis() {
      if (!id) {
        return;
      }

      try {
        setAvisLoading(true);

        const [
          avisResponse,
          statsResponse,
        ] = await Promise.allSettled([
          getAvisByAnnonce(
            id
          ),
          getAvisStats(
            id
          ),
        ]);

        if (!mounted) {
          return;
        }


        /*
         * ----------------------------------------------------
         * AVIS
         * ----------------------------------------------------
         */

        if (
          avisResponse.status ===
          "fulfilled"
        ) {
          const value =
            avisResponse.value;

          if (
            Array.isArray(value)
          ) {
            setAvis(value);

          } else if (
            Array.isArray(
              value?.avis
            )
          ) {
            setAvis(
              value.avis
            );

          } else if (
            Array.isArray(
              value?.resultats
            )
          ) {
            setAvis(
              value.resultats
            );

          } else if (
            Array.isArray(
              value?.results
            )
          ) {
            setAvis(
              value.results
            );

          } else {
            setAvis([]);
          }

        } else {
          console.error(
            "Erreur chargement avis :",
            avisResponse.reason
          );

          setAvis([]);
        }


        /*
         * ----------------------------------------------------
         * STATISTIQUES
         * ----------------------------------------------------
         */

        if (
          statsResponse.status ===
          "fulfilled"
        ) {
          setAvisStats(
            statsResponse.value
          );

        } else {
          console.error(
            "Erreur chargement statistiques avis :",
            statsResponse.reason
          );

          setAvisStats(null);
        }

      } finally {
        if (mounted) {
          setAvisLoading(false);
        }
      }
    }

    loadAvis();

    return () => {
      mounted = false;
    };
  }, [id]);


  /*
   * ==========================================================
   * IMAGES
   * ==========================================================
   */

  const images =
    useMemo(
      () =>
        normalizeImages(
          annonce
        ),
      [annonce]
    );


  const imageCourante =
    images.length > 0
      ? images[
          Math.min(
            imageActive,
            images.length - 1
          )
        ]
      : null;


  /*
   * ==========================================================
   * DONNÉES DU PRODUIT
   * ==========================================================
   */

  const nomProduit =
    annonce?.produit?.nom ||
    annonce?.produit_nom ||
    "Produit";


  const typeProduit =
    annonce?.produit?.type_produit ||
    annonce?.type_produit ||
    "";


  const description =
    getDescription(
      annonce
    );


  const prix =
    normalizeNumber(
      annonce?.prix
    );


  const quantiteDisponible =
    normalizeNumber(
      annonce?.quantite
    );


  const unite =
    annonce?.unite ||
    "unité";


  const total =
    prix *
    normalizeNumber(
      quantite,
      0
    );


  /*
   * ==========================================================
   * VENDEUR
   * ==========================================================
   */

  const vendeur =
    annonce?.vendeur ||
    null;


  const vendeurNom =
    [
      vendeur?.prenom,
      vendeur?.nom,
    ]
      .filter(Boolean)
      .join(" ") ||
    vendeur?.nom ||
    "Vendeur AgroMarket";


  const vendeurId =
    getSellerId(
      annonce
    );


  const vendeurTelephone =
    getSellerPhone(
      annonce
    );


  const estProprietaire =
    Boolean(
      user &&
      vendeurId !== null &&
      Number(user.id) ===
        Number(vendeurId)
    );


  /*
   * ==========================================================
   * DISPONIBILITÉ
   * ==========================================================
   */

  const disponible =
    annonce?.statut ===
      "publiee" &&
    quantiteDisponible >
      0;


  /*
   * ==========================================================
   * AVIS / NOTE
   * ==========================================================
   */

  const noteMoyenne =
    getRatingValue(
      avisStats
    );


  const nombreAvis =
    getReviewCount(
      avisStats,
      avis
    );


  /*
   * ==========================================================
   * LOCALISATION PUBLIQUE
   * ==========================================================
   */

  const localisationPublique =
    [
      annonce?.commune,
      annonce?.province,
      annonce?.region,
    ]
      .filter(
        (value) =>
          Boolean(value)
      )
      .join(", ") ||
    "Burkina Faso";


  /*
   * ==========================================================
   * GALERIE
   * ==========================================================
   */

  function previousImage() {
    if (
      images.length <= 1
    ) {
      return;
    }

    setImageActive(
      (current) =>
        current === 0
          ? images.length - 1
          : current - 1
    );
  }


  function nextImage() {
    if (
      images.length <= 1
    ) {
      return;
    }

    setImageActive(
      (current) =>
        current ===
        images.length - 1
          ? 0
          : current + 1
    );
  }


  /*
   * ==========================================================
   * QUANTITÉ
   * ==========================================================
   */

  function decreaseQuantity() {
    setCommandeMessage("");

    setQuantite(
      (current) =>
        Math.max(
          MIN_QUANTITY,
          normalizeNumber(
            current,
            MIN_QUANTITY
          ) - 1
        )
    );
  }


  function increaseQuantity() {
    setCommandeMessage("");

    setQuantite(
      (current) =>
        Math.min(
          quantiteDisponible,
          normalizeNumber(
            current,
            MIN_QUANTITY
          ) + 1
        )
    );
  }


  function handleQuantityChange(
    event
  ) {
    const value =
      event.target.value;

    if (
      value === ""
    ) {
      setQuantite("");
      setCommandeMessage("");

      return;
    }

    const number =
      Number(value);

    if (
      !Number.isFinite(
        number
      )
    ) {
      return;
    }

    setQuantite(
      Math.min(
        quantiteDisponible,
        Math.max(
          MIN_QUANTITY,
          number
        )
      )
    );

    setCommandeMessage("");
  }


  /*
   * ==========================================================
   * COMMANDER
   * ==========================================================
   */

  async function handleOrder() {
    setCommandeMessage("");

    if (
      !isAuthenticated ||
      !user
    ) {
      navigate(
        `/connexion?redirect=${encodeURIComponent(
          `/produits/${id}`
        )}`
      );

      return;
    }

    if (
      estProprietaire
    ) {
      setCommandeMessage(
        "Vous ne pouvez pas commander votre propre annonce."
      );

      return;
    }

    if (!disponible) {
      setCommandeMessage(
        "Cette offre n'est plus disponible."
      );

      return;
    }

    const quantity =
      Number(
        quantite
      );

    if (
      !Number.isFinite(
        quantity
      ) ||
      quantity < MIN_QUANTITY
    ) {
      setCommandeMessage(
        "Veuillez saisir une quantité valide."
      );

      return;
    }

    if (
      quantity >
      quantiteDisponible
    ) {
      setCommandeMessage(
        `La quantité maximale disponible est de ${formatNumber(
          quantiteDisponible
        )} ${unite}.`
      );

      return;
    }

    try {
      setCommandeLoading(
        true
      );

      const result =
        await createCommande({
          annonce_id:
            annonce.id,

          quantite:
            quantity,
        });

      const totalCommande =
        result?.prix_total ??
        result?.total ??
        prix * quantity;

      setCommandeMessage(
        `Commande créée avec succès. Total : ${formatNumber(
          totalCommande
        )} FCFA.`
      );

      setQuantite(
        MIN_QUANTITY
      );

    } catch (err) {
      console.error(
        "Erreur création commande :",
        err
      );

      setCommandeMessage(
        getErrorMessage(
          err,
          "Impossible de créer la commande."
        )
      );

    } finally {
      setCommandeLoading(
        false
      );
    }
  }


  /*
   * ==========================================================
   * DONNER UN AVIS
   * ==========================================================
   */

  function handleGiveReview() {
    if (!annonce?.id) {
      return;
    }

    const reviewPath =
      `/avis?annonce_id=${encodeURIComponent(
        annonce.id
      )}`;

    if (
      !isAuthenticated ||
      !user
    ) {
      navigate(
        `/connexion?redirect=${encodeURIComponent(
          reviewPath
        )}`
      );

      return;
    }

    navigate(
      reviewPath
    );
  }


  /*
   * ==========================================================
   * APPELER LE VENDEUR
   * ==========================================================
   */

  function handleCallSeller() {
    setMessageError("");

    if (!vendeurTelephone) {
      setMessageError(
        "Le numéro de téléphone du vendeur n'est pas disponible."
      );

      return;
    }

    /*
     * Le navigateur/appareil gère l'ouverture
     * de l'application téléphonique.
     */
    window.location.href =
      `tel:${vendeurTelephone}`;
  }


  /*
   * ==========================================================
   * ENVOYER UN MESSAGE
   * ==========================================================
   */

  async function handleMessageSeller() {
    setMessageError("");

    if (
      !isAuthenticated ||
      !user
    ) {
      navigate(
        `/connexion?redirect=${encodeURIComponent(
          `/produits/${id}`
        )}`
      );

      return;
    }

    if (
      estProprietaire
    ) {
      setMessageError(
        "Vous ne pouvez pas vous envoyer un message."
      );

      return;
    }

    if (!vendeurId) {
      setMessageError(
        "Impossible d'identifier le vendeur de cette annonce."
      );

      return;
    }

    if (!annonce?.id) {
      setMessageError(
        "Impossible d'identifier cette annonce."
      );

      return;
    }

    if (
      annonce?.statut !==
      "publiee"
    ) {
      setMessageError(
        "Cette annonce n'est plus disponible pour démarrer une nouvelle conversation."
      );

      return;
    }

    try {
      setMessageLoading(
        true
      );

      const conversation =
        await creerOuRecupererConversation(
          annonce.id
        );

      const conversationId =
        conversation?.id ??
        conversation?.conversation_id ??
        null;

      if (!conversationId) {
        throw new Error(
          "La conversation a été créée, mais son identifiant est introuvable."
        );
      }

      navigate(
        `/messages/${conversationId}`
      );

    } catch (err) {
      console.error(
        "Erreur ouverture conversation vendeur :",
        err
      );

      setMessageError(
        getErrorMessage(
          err,
          "Impossible d'ouvrir la conversation avec le vendeur."
        )
      );

    } finally {
      setMessageLoading(
        false
      );
    }
  }


  /*
   * ==========================================================
   * ITINÉRAIRE
   * ==========================================================
   *
   * IMPORTANT :
   *
   * On ne construit pas un itinéraire directement à partir
   * de annonce.latitude / annonce.longitude.
   *
   * Le backend doit fournir une localisation sûre destinée
   * au public via /annonces/{id}/itineraire.
   * ==========================================================
   */

  async function handleItineraire() {
    setItineraireMessage("");

    try {
      setItineraireLoading(
        true
      );

      const data =
        await getAnnonceItineraire(
          annonce.id
        );

      const latitude =
        normalizeNumber(
          data?.latitude,
          NaN
        );

      const longitude =
        normalizeNumber(
          data?.longitude,
          NaN
        );

      if (
        !Number.isFinite(
          latitude
        ) ||
        !Number.isFinite(
          longitude
        )
      ) {
        setItineraireMessage(
          data?.message ||
            "L'itinéraire n'est pas disponible pour cette annonce."
        );

        return;
      }

      const mapsUrl =
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          `${latitude},${longitude}`
        )}`;

      window.open(
        mapsUrl,
        "_blank",
        "noopener,noreferrer"
      );

    } catch (err) {
      console.error(
        "Erreur récupération itinéraire :",
        err
      );

      setItineraireMessage(
        getErrorMessage(
          err,
          "Impossible de préparer l'itinéraire."
        )
      );

    } finally {
      setItineraireLoading(
        false
      );
    }
  }


  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (loading) {
    return (
      <main className="product-details-page">

        <div className="details-loading">

          <div className="loading-spinner"></div>

          <h2>
            Chargement du produit...
          </h2>

          <p>
            Nous récupérons les informations
            de l'offre.
          </p>

        </div>

      </main>
    );
  }


  /*
   * ==========================================================
   * ERREUR
   * ==========================================================
   */

  if (
    error ||
    !annonce
  ) {
    return (
      <main className="product-details-page">

        <div className="details-error">

          <div className="error-icon">
            ⚠️
          </div>

          <h2>
            Produit introuvable
          </h2>

          <p>
            {error ||
              "Cette annonce n'existe pas ou n'est plus disponible."}
          </p>

          <Link
            to="/produits"
            className="primary-button"
          >
            ← Retour aux produits
          </Link>

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
    <main className="product-details-page">

      {/* ======================================================
          BARRE SUPÉRIEURE
      ======================================================= */}

      <div className="details-topbar">

        <Link
          to="/produits"
          className="back-button"
        >
          ← Retour aux produits
        </Link>

        <div className="details-reference">

          <span>
            Annonce
          </span>

          <strong>
            #{annonce.id}
          </strong>

        </div>

      </div>


      {/* ======================================================
          CONTENU PRINCIPAL
      ======================================================= */}

      <section className="product-details">

        {/* ====================================================
            GALERIE
        ===================================================== */}

        <div className="product-gallery">

          <div className="main-image">

            {imageCourante ? (
              <>

                <img
                  src={
                    imageCourante.resolvedUrl
                  }
                  alt={
                    nomProduit
                  }
                  onError={(
                    event
                  ) => {
                    event.currentTarget.style.display =
                      "none";
                  }}
                />

                {images.length >
                  1 && (
                  <>

                    <button
                      type="button"
                      className="gallery-arrow gallery-arrow-left"
                      onClick={
                        previousImage
                      }
                      aria-label="Image précédente"
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      className="gallery-arrow gallery-arrow-right"
                      onClick={
                        nextImage
                      }
                      aria-label="Image suivante"
                    >
                      ›
                    </button>

                    <div className="image-counter">
                      {imageActive + 1} /{" "}
                      {images.length}
                    </div>

                  </>
                )}

              </>
            ) : (

              <div className="no-image">

                <div className="no-image-icon">
                  🌾
                </div>

                <strong>
                  Aucune image disponible
                </strong>

                <p>
                  Le vendeur n'a pas encore
                  ajouté de photo.
                </p>

              </div>

            )}

          </div>


          {/* ==================================================
              MINIATURES
          =================================================== */}

          {images.length >
            1 && (

            <div className="image-thumbnails">

              {images.map(
                (
                  image,
                  index
                ) => (

                  <button
                    key={
                      image.id ||
                      `${image.resolvedUrl}-${index}`
                    }
                    type="button"
                    className={
                      index ===
                      imageActive
                        ? "thumbnail active"
                        : "thumbnail"
                    }
                    onClick={() =>
                      setImageActive(
                        index
                      )
                    }
                    aria-label={`Afficher la photo ${
                      index + 1
                    }`}
                  >

                    <img
                      src={
                        image.resolvedUrl
                      }
                      alt={`${nomProduit} ${
                        index + 1
                      }`}
                    />

                  </button>

                )
              )}

            </div>

          )}

        </div>


        {/* ====================================================
            INFORMATIONS
        ===================================================== */}

        <div className="product-details-info">

          {/* ==================================================
              BADGES
          =================================================== */}

          <div className="details-badges">

            <span
              className={`product-status ${
                annonce.statut ===
                "publiee"
                  ? "status-available"
                  : ""
              }`}
            >

              {annonce.statut ===
              "publiee"
                ? "✓ "
                : ""}

              {
                getStatusLabel(
                  annonce.statut
                )
              }

            </span>

            {getTypeProduitLabel(
              typeProduit
            ) && (

              <span>
                {
                  getTypeProduitLabel(
                    typeProduit
                  )
                }
              </span>

            )}

          </div>


          {/* ==================================================
              NOM
          =================================================== */}

          <h1>
            {nomProduit}
          </h1>


          {/* ==================================================
              DESCRIPTION
          =================================================== */}

          {description && (

            <p className="product-description">
              {description}
            </p>

          )}


          {/* ==================================================
              PRIX
          =================================================== */}

          <div className="product-details-price">

            <strong>
              {formatNumber(
                prix
              )}
            </strong>

            <span>
              FCFA
            </span>

            {annonce.unite && (

              <small>
                / {annonce.unite}
              </small>

            )}

          </div>


          {/* ==================================================
              NOTE
          =================================================== */}

          <div className="product-rating-summary">

            <strong>
              {noteMoyenne > 0
                ? noteMoyenne.toFixed(1)
                : "—"}
            </strong>

            <span>
              ★
            </span>

            <small>
              {nombreAvis}{" "}
              {nombreAvis === 1
                ? "avis"
                : "avis"}
            </small>

          </div>


          {/* ==================================================
              ACTION AVIS
          =================================================== */}

          <div className="review-action">

            <button
              type="button"
              className="secondary-button"
              onClick={
                handleGiveReview
              }
            >
              ⭐ Donner un avis
            </button>

            {!isAuthenticated && (

              <small>
                Connectez-vous pour partager
                votre expérience.
              </small>

            )}

          </div>


          {/* ==================================================
              QUANTITÉ
          =================================================== */}

          <div className="quantity-section">

            <label
              htmlFor="product-quantity"
            >
              Quantité
            </label>

            <div className="quantity-control">

              <button
                type="button"
                onClick={
                  decreaseQuantity
                }
                disabled={
                  !disponible ||
                  quantite <=
                    MIN_QUANTITY
                }
                aria-label="Diminuer la quantité"
              >
                −
              </button>

              <input
                id="product-quantity"
                type="number"
                min={
                  MIN_QUANTITY
                }
                max={
                  quantiteDisponible
                }
                step="1"
                value={
                  quantite
                }
                onChange={
                  handleQuantityChange
                }
                disabled={
                  !disponible
                }
              />

              <button
                type="button"
                onClick={
                  increaseQuantity
                }
                disabled={
                  !disponible ||
                  Number(
                    quantite
                  ) >=
                    quantiteDisponible
                }
                aria-label="Augmenter la quantité"
              >
                +
              </button>

            </div>

            <small>
              {formatNumber(
                quantiteDisponible
              )}{" "}
              {unite} disponibles
            </small>

          </div>


          {/* ==================================================
              TOTAL
          =================================================== */}

          <div className="order-total">

            <span>
              Total estimé
            </span>

            <strong>
              {formatNumber(
                total
              )} FCFA
            </strong>

          </div>


          {/* ==================================================
              MESSAGE COMMANDE
          =================================================== */}

          {commandeMessage && (

            <div
              className="order-message"
              role="status"
            >
              {commandeMessage}
            </div>

          )}


          {/* ==================================================
              ACTION COMMANDE
          =================================================== */}

          <button
            type="button"
            className="primary-button"
            onClick={
              handleOrder
            }
            disabled={
              commandeLoading ||
              !disponible ||
              estProprietaire
            }
          >

            {commandeLoading
              ? "Création de la commande..."
              : estProprietaire
              ? "Votre propre annonce"
              : disponible
              ? "Commander"
              : "Offre indisponible"}

          </button>


          {/* ==================================================
              LOCALISATION
          =================================================== */}

          <div className="product-location">

            <h3>
              Localisation
            </h3>

            <p>
              📍{" "}
              {
                localisationPublique
              }
            </p>

            <small>
              La localisation exacte du vendeur
              n'est pas affichée publiquement.
            </small>

            {annonce.statut ===
              "publiee" && (

              <button
                type="button"
                className="secondary-button"
                onClick={
                  handleItineraire
                }
                disabled={
                  itineraireLoading
                }
              >

                {itineraireLoading
                  ? "Préparation de l'itinéraire..."
                  : "📍 Voir l'itinéraire"}

              </button>

            )}

            {itineraireMessage && (

              <div
                className="order-message"
                role="status"
              >
                {itineraireMessage}
              </div>

            )}

          </div>


          {/* ==================================================
              VENDEUR
          =================================================== */}

          <div className="product-seller">

            <h3>
              Vendeur
            </h3>

            <p>
              👤{" "}
              {vendeurNom}
            </p>


            {/* ==================================================
                ACTIONS VENDEUR
            =================================================== */}

            <div className="seller-actions">

              {/* ------------------------------------------------
                  APPEL
              ------------------------------------------------- */}

              {vendeurTelephone ? (

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    handleCallSeller
                  }
                  disabled={
                    messageLoading
                  }
                >
                  📞 Appeler le vendeur
                </button>

              ) : (

                <small>
                  Le numéro du vendeur n'est pas disponible.
                </small>

              )}


              {/* ------------------------------------------------
                  MESSAGE
              ------------------------------------------------- */}

              {!estProprietaire && (

                <button
                  type="button"
                  className="primary-button"
                  onClick={
                    handleMessageSeller
                  }
                  disabled={
                    messageLoading ||
                    annonce.statut !==
                      "publiee"
                  }
                >

                  {messageLoading
                    ? "Ouverture de la conversation..."
                    : "💬 Envoyer un message"}

                </button>

              )}

            </div>


            {/* ==================================================
                ERREUR MESSAGERIE
            =================================================== */}

            {messageError && (

              <div
                className="order-message"
                role="alert"
              >
                {messageError}
              </div>

            )}

          </div>

        </div>

      </section>


      {/* ======================================================
          AVIS DE L'ANNONCE
      ======================================================= */}

      <section className="product-reviews">

        <div className="product-reviews-header">

          <div>

            <span className="section-eyebrow">
              Avis
            </span>

            <h2>
              Avis sur cette annonce
            </h2>

          </div>


          <div className="product-reviews-rating">

            <strong>
              {noteMoyenne > 0
                ? noteMoyenne.toFixed(1)
                : "—"}
            </strong>

            <span>
              ★
            </span>

            <small>
              {nombreAvis} avis
            </small>

          </div>

        </div>


        {/* ====================================================
            BOUTON AVIS
        ===================================================== */}

        <div className="product-reviews-action">

          <button
            type="button"
            className="primary-button"
            onClick={
              handleGiveReview
            }
          >
            ⭐ Donner un avis
          </button>

          {!isAuthenticated && (

            <p>
              Vous devez être connecté pour
              donner un avis sur cette annonce.
            </p>

          )}

        </div>


        {/* ====================================================
            CHARGEMENT
        ===================================================== */}

        {avisLoading ? (

          <div className="reviews-loading">
            Chargement des avis...
          </div>

        ) : avis.length === 0 ? (

          <div className="reviews-empty">

            <strong>
              Aucun avis pour le moment.
            </strong>

            <p>
              Soyez le premier à donner votre
              avis après votre expérience d'achat.
            </p>

          </div>

        ) : (

          <div className="reviews-list">

            {avis.map(
              (
                item,
                index
              ) => {

                const note =
                  normalizeNumber(
                    item?.note
                  );


                const auteur =
                  [
                    item?.utilisateur
                      ?.prenom,
                    item?.utilisateur
                      ?.nom,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(" ") ||
                  item?.utilisateur
                    ?.nom ||
                  "Utilisateur AgroMarket";


                const roundedNote =
                  Math.max(
                    0,
                    Math.min(
                      5,
                      Math.round(
                        note
                      )
                    )
                  );


                return (

                  <article
                    key={
                      item?.id ||
                      `${auteur}-${index}`
                    }
                    className="review-item"
                  >

                    <div className="review-item-header">

                      <strong>
                        {auteur}
                      </strong>

                      <span
                        aria-label={`Note : ${note} sur 5`}
                      >
                        {"★".repeat(
                          roundedNote
                        )}
                      </span>

                    </div>


                    {item?.commentaire && (

                      <p>
                        {
                          item.commentaire
                        }
                      </p>

                    )}

                  </article>

                );
              }
            )}

          </div>

        )}

      </section>

    </main>
  );
}


export default ProductDetails;
