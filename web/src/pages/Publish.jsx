import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Link } from "react-router-dom";

import "../styles/pages/publish.css";

import {
  publishAnnonce,
  getPublicationCatalog,
} from "../services/api/publish";

import { useAuth } from "../context/AuthContext";
import { useGeolocation } from "../hooks/useGeolocation";


/* ============================================================
   CONSTANTES
============================================================ */

const STEPS = [
  {
    id: 1,
    title: "Catalogue",
    shortTitle: "Produit",
    description: "Choisissez le produit et sa catégorie.",
  },
  {
    id: 2,
    title: "Offre",
    shortTitle: "Offre",
    description: "Définissez le prix et la quantité.",
  },
  {
    id: 3,
    title: "Localisation",
    shortTitle: "Lieu",
    description: "Indiquez où se trouve votre offre.",
  },
  {
    id: 4,
    title: "Photos",
    shortTitle: "Photos",
    description: "Ajoutez des photos de votre produit.",
  },
];

const MAX_IMAGES = 4;

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const UNITS = [
  "Kg",
  "Sac",
  "Tonne",
  "Litre",
  "Unité",
  "Carton",
  "Bidon",
  "Autre",
];

const PRODUCT_TYPES = [
  {
    value: "brut",
    label: "Brut",
    description: "Produit vendu dans son état naturel.",
  },
  {
    value: "transforme",
    label: "Transformé",
    description: "Produit ayant subi une transformation.",
  },
];


/* ============================================================
   OUTILS
============================================================ */

function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}


function normalizeId(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const id = Number(value);

  return Number.isFinite(id) ? id : null;
}


function getFamilyId(famille) {
  return normalizeId(famille?.id);
}


function getCategoryId(categorie) {
  return normalizeId(categorie?.id);
}


function getFamilyName(famille) {
  return String(famille?.nom || "").trim();
}


function getCategoryName(categorie) {
  return String(categorie?.nom || "").trim();
}


/* ============================================================
   SECTEUR MÉTIER
============================================================ */

function getSecteurFromFamily(famille) {
  const familyName = normalizeText(famille?.nom);

  const mapping = {
    "produit agricole": "agricole",
    "produits agricoles": "agricole",
    agriculture: "agricole",

    elevage: "elevage",

    "materiel agricole": "materiel_agricole",

    engrais: "engrais",

    phytosanitaire: "phytosanitaire",

    "produit phytosanitaire": "phytosanitaire",

    "produits phytosanitaires": "phytosanitaire",
  };

  return mapping[familyName] || "";
}


/* ============================================================
   TYPE DE PRODUIT
============================================================ */

function isSectorWithProductType(famille) {
  const secteur = getSecteurFromFamily(famille);

  return (
    secteur === "agricole" ||
    secteur === "elevage"
  );
}


/* ============================================================
   RECHERCHE FAMILLE
============================================================ */

function findFamilyById(familles, id) {
  const normalizedId = normalizeId(id);

  if (!normalizedId) {
    return null;
  }

  return (
    familles.find(
      (famille) =>
        getFamilyId(famille) === normalizedId
    ) || null
  );
}


/* ============================================================
   RECHERCHE CATÉGORIE
============================================================ */

function findCategoryById(categories, id) {
  const normalizedId = normalizeId(id);

  if (!normalizedId) {
    return null;
  }

  return (
    categories.find(
      (categorie) =>
        getCategoryId(categorie) === normalizedId
    ) || null
  );
}


/* ============================================================
   CATÉGORIES D'UNE FAMILLE
============================================================ */

function getCategoriesForFamily(
  categories,
  familleId
) {
  const normalizedFamilyId = normalizeId(
    familleId
  );

  if (!normalizedFamilyId) {
    return [];
  }

  return categories.filter((categorie) => {
    const categoryFamilyId = normalizeId(
      categorie?.famille_id ??
        categorie?.familleId ??
        categorie?.family_id ??
        categorie?.familyId
    );

    return (
      categoryFamilyId === normalizedFamilyId
    );
  });
}


/* ============================================================
   VALIDATION DES ÉTAPES
============================================================ */

function validateStep(
  currentStep,
  form,
  selectedFamily
) {
  const errors = {};

  /* ----------------------------------------------------------
     ÉTAPE 1
  ---------------------------------------------------------- */

  if (currentStep === 1) {
    if (!form.famille_id) {
      errors.famille_id =
        "Veuillez sélectionner une famille.";
    }

    if (!form.categorie_id) {
      errors.categorie_id =
        "Veuillez sélectionner une catégorie.";
    }

    if (
      isSectorWithProductType(
        selectedFamily
      ) &&
      !form.type_produit
    ) {
      errors.type_produit =
        "Veuillez sélectionner le type de produit.";
    }

    if (
      !String(
        form.produit_nom || ""
      ).trim()
    ) {
      errors.produit_nom =
        "Veuillez saisir le nom du produit.";
    }
  }


  /* ----------------------------------------------------------
     ÉTAPE 2
  ---------------------------------------------------------- */

  if (currentStep === 2) {
    if (
      !form.prix ||
      Number(form.prix) <= 0
    ) {
      errors.prix =
        "Veuillez saisir un prix supérieur à 0.";
    }

    if (
      !form.quantite ||
      Number(form.quantite) <= 0
    ) {
      errors.quantite =
        "Veuillez saisir une quantité supérieure à 0.";
    }

    if (
      !String(
        form.unite || ""
      ).trim()
    ) {
      errors.unite =
        "Veuillez sélectionner une unité.";
    }
  }


  /* ----------------------------------------------------------
     ÉTAPE 3
  ---------------------------------------------------------- */

  if (currentStep === 3) {
    if (
      !String(
        form.region || ""
      ).trim()
    ) {
      errors.region =
        "Veuillez saisir la région.";
    }

    if (
      !String(
        form.province || ""
      ).trim()
    ) {
      errors.province =
        "Veuillez saisir la province.";
    }

    if (
      !String(
        form.commune || ""
      ).trim()
    ) {
      errors.commune =
        "Veuillez saisir la commune.";
    }
  }

  return errors;
}


/* ============================================================
   COMPOSANT PRINCIPAL
============================================================ */

export default function Publish() {
  const {
    user,
    isAuthenticated,
    loading: authLoading,
  } = useAuth();


  const {
    latitude,
    longitude,
    loading: geoLoading,
    error: geoError,
    supported: geoSupported,
    getCurrentPosition,
    reset: resetGeolocation,
  } = useGeolocation();


  /* ==========================================================
     ÉTATS
  ========================================================== */

  const [step, setStep] = useState(1);

  const [
    catalogLoading,
    setCatalogLoading,
  ] = useState(true);

  const [
    catalogError,
    setCatalogError,
  ] = useState("");

  const [
    familles,
    setFamilles,
  ] = useState([]);

  const [
    categories,
    setCategories,
  ] = useState([]);


  const [
    form,
    setForm,
  ] = useState({
    famille_id: "",
    categorie_id: "",
    produit_nom: "",
    description_produit: "",
    type_produit: "",
    prix: "",
    quantite: "",
    unite: "Kg",
    region: "",
    province: "",
    commune: "",
  });


  const [
    images,
    setImages,
  ] = useState([]);

  const [
    previews,
    setPreviews,
  ] = useState([]);

  const [
    errors,
    setErrors,
  ] = useState({});

  const [
    submitError,
    setSubmitError,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    locationMessage,
    setLocationMessage,
  ] = useState("");


  const fileInputRef = useRef(null);


  /* ==========================================================
     CHARGEMENT DU CATALOGUE
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadCatalog() {
      setCatalogLoading(true);
      setCatalogError("");

      try {
        const catalog =
          await getPublicationCatalog();

        if (!mounted) {
          return;
        }

        setFamilles(
          Array.isArray(
            catalog?.familles
          )
            ? catalog.familles
            : []
        );

        setCategories(
          Array.isArray(
            catalog?.categories
          )
            ? catalog.categories
            : []
        );
      } catch (error) {
        if (!mounted) {
          return;
        }

        setCatalogError(
          error?.message ||
            "Impossible de charger le catalogue."
        );
      } finally {
        if (mounted) {
          setCatalogLoading(false);
        }
      }
    }

    loadCatalog();

    return () => {
      mounted = false;
    };
  }, []);


  /* ==========================================================
     FAMILLE SÉLECTIONNÉE
  ========================================================== */

  const selectedFamily = useMemo(
    () =>
      findFamilyById(
        familles,
        form.famille_id
      ),
    [
      familles,
      form.famille_id,
    ]
  );


  /* ==========================================================
     SECTEUR
  ========================================================== */

  const publicationSecteur = useMemo(
    () =>
      getSecteurFromFamily(
        selectedFamily
      ),
    [selectedFamily]
  );


  /* ==========================================================
     CATÉGORIES DISPONIBLES
  ========================================================== */

  const availableCategories = useMemo(
    () =>
      getCategoriesForFamily(
        categories,
        form.famille_id
      ),
    [
      categories,
      form.famille_id,
    ]
  );


  /* ==========================================================
     TYPE PRODUIT
  ========================================================== */

  const typeProduitApplicable =
    isSectorWithProductType(
      selectedFamily
    );


  /* ==========================================================
     NETTOYAGE DU TYPE
  ========================================================== */

  useEffect(() => {
    if (
      selectedFamily &&
      !isSectorWithProductType(
        selectedFamily
      ) &&
      form.type_produit
    ) {
      setForm((previous) => ({
        ...previous,
        type_produit: "",
      }));

      setErrors((previous) => {
        const next = {
          ...previous,
        };

        delete next.type_produit;

        return next;
      });
    }
  }, [
    selectedFamily,
    form.type_produit,
  ]);


  /* ==========================================================
     CHANGEMENT FAMILLE
  ========================================================== */

  function handleFamilyChange(event) {
    const familleId =
      event.target.value;

    const family =
      findFamilyById(
        familles,
        familleId
      );

    const familyHasType =
      isSectorWithProductType(
        family
      );

    setForm((previous) => ({
      ...previous,

      famille_id:
        familleId,

      categorie_id:
        "",

      type_produit:
        familyHasType
          ? previous.type_produit || ""
          : "",
    }));

    setErrors((previous) => {
      const next = {
        ...previous,
      };

      delete next.famille_id;
      delete next.categorie_id;
      delete next.type_produit;

      return next;
    });

    setSubmitError("");
  }


  /* ==========================================================
     CHANGEMENT CATÉGORIE
  ========================================================== */

  function handleCategoryChange(event) {
    setForm((previous) => ({
      ...previous,
      categorie_id:
        event.target.value,
    }));

    setErrors((previous) => {
      const next = {
        ...previous,
      };

      delete next.categorie_id;

      return next;
    });

    setSubmitError("");
  }


  /* ==========================================================
     CHANGEMENT CHAMP
  ========================================================== */

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => {
      if (!previous[name]) {
        return previous;
      }

      const next = {
        ...previous,
      };

      delete next[name];

      return next;
    });

    setSubmitError("");
  }


  /* ==========================================================
     GÉOLOCALISATION
  ========================================================== */

  async function handleGetLocation() {
    setLocationMessage("");

    if (!geoSupported) {
      setLocationMessage(
        "La géolocalisation n'est pas disponible sur cet appareil."
      );

      return;
    }

    try {
      await getCurrentPosition();

      setLocationMessage(
        "Votre position GPS a été récupérée."
      );
    } catch (error) {
      setLocationMessage(
        error?.message ||
          "Impossible de récupérer votre position GPS."
      );
    }
  }


  function handleResetLocation() {
    resetGeolocation();

    setLocationMessage(
      "La position GPS a été réinitialisée."
    );
  }


  /* ==========================================================
     VALIDATION FICHIERS
  ========================================================== */

  function validateFiles(fileList) {
    const selectedFiles =
      Array.from(fileList || []);

    if (
      selectedFiles.length === 0
    ) {
      return {
        files: [],
        error: "",
      };
    }

    if (
      selectedFiles.length >
      MAX_IMAGES
    ) {
      return {
        files: [],
        error:
          `Vous pouvez ajouter au maximum ${MAX_IMAGES} photos.`,
      };
    }

    for (const file of selectedFiles) {
      if (
        !ALLOWED_IMAGE_TYPES.includes(
          file.type
        )
      ) {
        return {
          files: [],
          error:
            "Format d'image non autorisé. Utilisez JPG, PNG ou WEBP.",
        };
      }

      if (
        file.size >
        MAX_IMAGE_SIZE
      ) {
        return {
          files: [],
          error:
            "Chaque image doit avoir une taille maximale de 5 Mo.",
        };
      }
    }

    return {
      files: selectedFiles,
      error: "",
    };
  }


  /* ==========================================================
     AJOUT DES PHOTOS
  ========================================================== */

  function handleFiles(event) {
    const result =
      validateFiles(
        event.target.files
      );

    if (result.error) {
      setErrors((previous) => ({
        ...previous,
        images: result.error,
      }));

      return;
    }

    setErrors((previous) => {
      const next = {
        ...previous,
      };

      delete next.images;

      return next;
    });

    const nextPreviews =
      result.files.map(
        (file) =>
          URL.createObjectURL(file)
      );

    setImages(result.files);
    setPreviews(nextPreviews);
  }


  /* ==========================================================
     SUPPRESSION PHOTO
  ========================================================== */

  function removeImage(index) {
    const removedPreview =
      previews[index];

    if (removedPreview) {
      URL.revokeObjectURL(
        removedPreview
      );
    }

    const nextImages =
      images.filter(
        (_, imageIndex) =>
          imageIndex !== index
      );

    const nextPreviews =
      previews.filter(
        (_, previewIndex) =>
          previewIndex !== index
      );

    setImages(nextImages);
    setPreviews(nextPreviews);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }


  /* ==========================================================
     NETTOYAGE DES URL
  ========================================================== */

  useEffect(() => {
    return () => {
      previews.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);


  /* ==========================================================
     VALIDATION ÉTAPE
  ========================================================== */

  function validateCurrentStep() {
    const stepErrors =
      validateStep(
        step,
        form,
        selectedFamily
      );

    setErrors(stepErrors);

    return (
      Object.keys(stepErrors)
        .length === 0
    );
  }


  /* ==========================================================
     SUIVANT
  ========================================================== */

  function handleNext() {
    setSubmitError("");

    if (!validateCurrentStep()) {
      setSubmitError(
        "Veuillez corriger les champs indiqués avant de continuer."
      );

      return;
    }

    setStep((previous) =>
      Math.min(
        previous + 1,
        STEPS.length
      )
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }


  /* ==========================================================
     PRÉCÉDENT
  ========================================================== */

  function handlePrevious() {
    setSubmitError("");

    setStep((previous) =>
      Math.max(
        previous - 1,
        1
      )
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }


  /* ==========================================================
     VALIDATION GLOBALE
  ========================================================== */

  function validateAllSteps() {
    const allErrors = {};

    for (
      let currentStep = 1;
      currentStep <= STEPS.length;
      currentStep += 1
    ) {
      const stepErrors =
        validateStep(
          currentStep,
          form,
          selectedFamily
        );

      Object.assign(
        allErrors,
        stepErrors
      );
    }

    if (
      images.length >
      MAX_IMAGES
    ) {
      allErrors.images =
        `Vous pouvez ajouter au maximum ${MAX_IMAGES} photos.`;
    }

    setErrors(allErrors);

    return {
      valid:
        Object.keys(allErrors)
          .length === 0,

      errors: allErrors,
    };
  }


  /* ==========================================================
     PUBLICATION
  ========================================================== */

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitError("");
    setSuccessMessage("");

    if (
      !isAuthenticated ||
      !user
    ) {
      setSubmitError(
        "Vous devez être connecté pour publier une annonce."
      );

      return;
    }

    const validation =
      validateAllSteps();

    if (!validation.valid) {
      setSubmitError(
        "Veuillez corriger les champs indiqués avant de publier."
      );

      let firstErrorStep = 1;

      for (
        let currentStep = 1;
        currentStep <= STEPS.length;
        currentStep += 1
      ) {
        const stepErrors =
          validateStep(
            currentStep,
            form,
            selectedFamily
          );

        if (
          Object.keys(stepErrors)
            .length > 0
        ) {
          firstErrorStep =
            currentStep;

          break;
        }
      }

      if (
        validation.errors.images
      ) {
        firstErrorStep = 4;
      }

      setStep(firstErrorStep);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }


    if (!publicationSecteur) {
      setSubmitError(
        "Impossible de déterminer le secteur du produit à partir de la famille sélectionnée."
      );

      setStep(1);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }


    setSubmitting(true);

    try {
      const geolocation =
        latitude !== null &&
        longitude !== null
          ? {
              latitude,
              longitude,

              localisation_source:
                "gps",

              type_localisation:
                "domicile",

              visibilite_localisation:
                "privee",
            }
          : {};


      const publicationForm = {
        ...form,

        secteur:
          publicationSecteur,
      };


      await publishAnnonce({
        form:
          publicationForm,

        files:
          images,

        geolocation,
      });


      setSuccessMessage(
        "Votre annonce a été envoyée avec succès. Elle est maintenant en attente de modération."
      );


      setForm({
        famille_id: "",
        categorie_id: "",
        produit_nom: "",
        description_produit: "",
        type_produit: "",
        prix: "",
        quantite: "",
        unite: "Kg",
        region: "",
        province: "",
        commune: "",
      });


      previews.forEach((url) => {
        URL.revokeObjectURL(url);
      });

      setImages([]);
      setPreviews([]);


      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }


      resetGeolocation();

      setErrors({});
      setSubmitError("");
      setLocationMessage("");
      setStep(1);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

    } catch (error) {
      console.error(
        "Erreur publication annonce :",
        error
      );

      setSubmitError(
        error?.message ||
          "Une erreur est survenue lors de la publication de l'annonce."
      );
    } finally {
      setSubmitting(false);
    }
  }


  /* ==========================================================
     CHARGEMENT AUTH
  ========================================================== */

  if (authLoading) {
    return (
      <main className="page page-publish">
        <section className="publish-state-card">
          <div className="publish-loading-spinner" />

          <h1>
            Chargement de votre espace
          </h1>

          <p>
            Préparation de la page de publication...
          </p>
        </section>
      </main>
    );
  }


  /* ==========================================================
     NON CONNECTÉ
  ========================================================== */

  if (
    !isAuthenticated ||
    !user
  ) {
    return (
      <main className="page page-publish">
        <section className="publish-state-card publish-auth-card">

          <div className="publish-state-icon">
            🔐
          </div>

          <span className="publish-eyebrow">
            AgroMarket Burkina
          </span>

          <h1>
            Publier une annonce
          </h1>

          <p>
            Connectez-vous à votre compte
            pour présenter vos produits
            aux acheteurs.
          </p>

          <Link
            to="/connexion?redirect=/publier"
            className="publish-button publish-button-primary"
          >
            Se connecter
          </Link>

          <Link
            to="/"
            className="publish-back-link"
          >
            Retour à l'accueil
          </Link>

        </section>
      </main>
    );
  }


  /* ==========================================================
     RENDU PRINCIPAL
  ========================================================== */

  const selectedCategory =
    findCategoryById(
      categories,
      form.categorie_id
    );


  return (
    <main className="page page-publish">

      <div className="publish-container">

        {/* ====================================================
            EN-TÊTE
        ==================================================== */}

        <header className="publish-header">

          <div className="publish-heading">

            <span className="publish-eyebrow">
              Espace vendeur
            </span>

            <h1>
              Publier une annonce
            </h1>

            <p>
              Présentez votre produit,
              définissez votre offre et
              indiquez sa localisation.
            </p>

          </div>


          <Link
            to="/tableau-de-bord"
            className="publish-button publish-button-secondary"
          >
            ← Tableau de bord
          </Link>

        </header>


        {/* ====================================================
            STEPPER
        ==================================================== */}

        <nav
          className="publish-steps"
          aria-label="Étapes de publication"
        >

          <div className="publish-progress-line">
            <span
              style={{
                width: `${
                  ((step - 1) /
                    (STEPS.length - 1)) *
                  100
                }%`,
              }}
            />
          </div>


          {STEPS.map((item) => {
            const isActive =
              item.id === step;

            const isCompleted =
              item.id < step;

            return (
              <button
                type="button"
                key={item.id}
                className={[
                  "publish-step",
                  isActive
                    ? "active"
                    : "",
                  isCompleted
                    ? "completed"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  if (
                    item.id < step
                  ) {
                    setStep(item.id);
                  }
                }}
                disabled={
                  submitting ||
                  item.id >= step
                }
              >

                <span className="publish-step-number">
                  {isCompleted
                    ? "✓"
                    : item.id}
                </span>

                <span className="publish-step-text">

                  <strong>
                    {item.title}
                  </strong>

                  <small>
                    {item.description}
                  </small>

                </span>

              </button>
            );
          })}

        </nav>


        {/* ====================================================
            ALERTES
        ==================================================== */}

        {catalogError && (
          <div
            className="publish-alert publish-alert-error"
            role="alert"
          >
            <strong>
              Catalogue indisponible
            </strong>

            <span>
              {catalogError}
            </span>
          </div>
        )}


        {submitError && (
          <div
            className="publish-alert publish-alert-error"
            role="alert"
          >
            <strong>
              Vérification nécessaire
            </strong>

            <span>
              {submitError}
            </span>
          </div>
        )}


        {successMessage && (
          <div
            className="publish-alert publish-alert-success"
            role="status"
          >
            <strong>
              Publication envoyée
            </strong>

            <span>
              {successMessage}
            </span>
          </div>
        )}


        {/* ====================================================
            FORMULAIRE
        ==================================================== */}

        <form
          onSubmit={handleSubmit}
          className="publish-form"
        >

          {/* ==================================================
              ÉTAPE 1
          ================================================== */}

          {step === 1 && (
            <section className="publish-section">

              <div className="publish-section-header">

                <div className="publish-section-number">
                  01
                </div>

                <div>
                  <span>
                    Catalogue
                  </span>

                  <h2>
                    Choisir le produit
                  </h2>

                  <p>
                    Sélectionnez une famille,
                    une catégorie et renseignez
                    les informations de votre
                    produit.
                  </p>
                </div>

              </div>


              {catalogLoading ? (
                <div className="publish-loading-box">

                  <div className="publish-loading-spinner" />

                  <strong>
                    Chargement du catalogue...
                  </strong>

                  <span>
                    Nous préparons les familles
                    et catégories disponibles.
                  </span>

                </div>
              ) : (
                <div className="publish-form-grid">

                  {/* FAMILLE */}

                  <div className="publish-field">

                    <label htmlFor="famille_id">
                      Famille
                      <span>*</span>
                    </label>

                    <select
                      id="famille_id"
                      name="famille_id"
                      value={
                        form.famille_id
                      }
                      onChange={
                        handleFamilyChange
                      }
                      disabled={
                        catalogLoading ||
                        submitting
                      }
                      className={
                        errors.famille_id
                          ? "has-error"
                          : ""
                      }
                    >

                      <option value="">
                        Sélectionner une famille
                      </option>

                      {familles.map(
                        (famille) => (
                          <option
                            key={
                              getFamilyId(
                                famille
                              )
                            }
                            value={
                              getFamilyId(
                                famille
                              )
                            }
                          >
                            {getFamilyName(
                              famille
                            )}
                          </option>
                        )
                      )}

                    </select>

                    {errors.famille_id && (
                      <small className="publish-field-error">
                        {errors.famille_id}
                      </small>
                    )}

                  </div>


                  {/* CATÉGORIE */}

                  <div className="publish-field">

                    <label htmlFor="categorie_id">
                      Catégorie
                      <span>*</span>
                    </label>

                    <select
                      id="categorie_id"
                      name="categorie_id"
                      value={
                        form.categorie_id
                      }
                      onChange={
                        handleCategoryChange
                      }
                      disabled={
                        !form.famille_id ||
                        submitting
                      }
                      className={
                        errors.categorie_id
                          ? "has-error"
                          : ""
                      }
                    >

                      <option value="">
                        {!form.famille_id
                          ? "Sélectionnez d'abord une famille"
                          : availableCategories.length === 0
                          ? "Aucune catégorie disponible"
                          : "Sélectionner une catégorie"}
                      </option>

                      {availableCategories.map(
                        (categorie) => (
                          <option
                            key={
                              getCategoryId(
                                categorie
                              )
                            }
                            value={
                              getCategoryId(
                                categorie
                              )
                            }
                          >
                            {getCategoryName(
                              categorie
                            )}
                          </option>
                        )
                      )}

                    </select>

                    {errors.categorie_id && (
                      <small className="publish-field-error">
                        {errors.categorie_id}
                      </small>
                    )}

                  </div>


                  {/* NOM */}

                  <div className="publish-field publish-field-full">

                    <label htmlFor="produit_nom">
                      Nom du produit
                      <span>*</span>
                    </label>

                    <input
                      id="produit_nom"
                      name="produit_nom"
                      type="text"
                      value={
                        form.produit_nom
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Ex. Maïs grain, riz local, poulet..."
                      maxLength={150}
                      disabled={
                        submitting
                      }
                      className={
                        errors.produit_nom
                          ? "has-error"
                          : ""
                      }
                    />

                    <div className="publish-input-meta">
                      <span>
                        Donnez un nom clair et
                        facilement identifiable.
                      </span>

                      <span>
                        {form.produit_nom.length}
                        /150
                      </span>
                    </div>

                    {errors.produit_nom && (
                      <small className="publish-field-error">
                        {errors.produit_nom}
                      </small>
                    )}

                  </div>


                  {/* DESCRIPTION */}

                  <div className="publish-field publish-field-full">

                    <label htmlFor="description_produit">
                      Description
                    </label>

                    <textarea
                      id="description_produit"
                      name="description_produit"
                      value={
                        form.description_produit
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Décrivez votre produit : qualité, variété, état, caractéristiques..."
                      rows={5}
                      maxLength={2000}
                      disabled={
                        submitting
                      }
                    />

                    <div className="publish-input-meta">
                      <span>
                        Une bonne description
                        facilite la compréhension
                        de votre offre.
                      </span>

                      <span>
                        {
                          form
                            .description_produit
                            .length
                        }
                        /2000
                      </span>
                    </div>

                  </div>


                  {/* TYPE */}

                  {typeProduitApplicable && (
                    <div className="publish-field publish-field-full">

                      <fieldset>

                        <legend>
                          Type de produit
                          <span>*</span>
                        </legend>

                        <div className="product-type-options">

                          {PRODUCT_TYPES.map(
                            (type) => (
                              <label
                                key={
                                  type.value
                                }
                                className={
                                  form.type_produit ===
                                  type.value
                                    ? "product-type-option selected"
                                    : "product-type-option"
                                }
                              >

                                <input
                                  type="radio"
                                  name="type_produit"
                                  value={
                                    type.value
                                  }
                                  checked={
                                    form.type_produit ===
                                    type.value
                                  }
                                  onChange={
                                    handleChange
                                  }
                                  disabled={
                                    submitting
                                  }
                                />

                                <span className="product-type-radio" />

                                <span className="product-type-content">

                                  <strong>
                                    {type.label}
                                  </strong>

                                  <small>
                                    {
                                      type.description
                                    }
                                  </small>

                                </span>

                              </label>
                            )
                          )}

                        </div>

                      </fieldset>

                      {errors.type_produit && (
                        <small className="publish-field-error">
                          {
                            errors.type_produit
                          }
                        </small>
                      )}

                    </div>
                  )}


                  {/* INFORMATION */}

                  {selectedFamily && (
                    <div className="publish-field publish-field-full">

                      <div className="catalog-information">

                        <div className="catalog-information-main">

                          <span>
                            Famille sélectionnée
                          </span>

                          <strong>
                            {getFamilyName(
                              selectedFamily
                            )}
                          </strong>

                        </div>

                        <div className="catalog-information-item">

                          <span>
                            Secteur
                          </span>

                          <strong>
                            {
                              publicationSecteur ||
                              "Non déterminé"
                            }
                          </strong>

                        </div>

                        <div className="catalog-information-item">

                          <span>
                            Catégorie
                          </span>

                          <strong>
                            {
                              getCategoryName(
                                selectedCategory
                              ) ||
                              "À sélectionner"
                            }
                          </strong>

                        </div>

                      </div>

                    </div>
                  )}

                </div>
              )}

            </section>
          )}


          {/* ==================================================
              ÉTAPE 2
          ================================================== */}

          {step === 2 && (
            <section className="publish-section">

              <div className="publish-section-header">

                <div className="publish-section-number">
                  02
                </div>

                <div>
                  <span>
                    Votre offre
                  </span>

                  <h2>
                    Définir le prix et la quantité
                  </h2>

                  <p>
                    Indiquez les conditions
                    commerciales de votre annonce.
                  </p>
                </div>

              </div>


              <div className="publish-form-grid">

                {/* PRIX */}

                <div className="publish-field">

                  <label htmlFor="prix">
                    Prix
                    <span>*</span>
                  </label>

                  <div className="publish-input-with-suffix">

                    <input
                      id="prix"
                      name="prix"
                      type="number"
                      min="1"
                      step="1"
                      value={
                        form.prix
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="250"
                      disabled={
                        submitting
                      }
                      className={
                        errors.prix
                          ? "has-error"
                          : ""
                      }
                    />

                    <span>
                      FCFA
                    </span>

                  </div>

                  <small className="publish-help">
                    Prix unitaire de votre
                    produit.
                  </small>

                  {errors.prix && (
                    <small className="publish-field-error">
                      {errors.prix}
                    </small>
                  )}

                </div>


                {/* QUANTITÉ */}

                <div className="publish-field">

                  <label htmlFor="quantite">
                    Quantité
                    <span>*</span>
                  </label>

                  <input
                    id="quantite"
                    name="quantite"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={
                      form.quantite
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="150"
                    disabled={
                      submitting
                    }
                    className={
                      errors.quantite
                        ? "has-error"
                        : ""
                    }
                  />

                  {errors.quantite && (
                    <small className="publish-field-error">
                      {errors.quantite}
                    </small>
                  )}

                </div>


                {/* UNITÉ */}

                <div className="publish-field">

                  <label htmlFor="unite">
                    Unité
                    <span>*</span>
                  </label>

                  <select
                    id="unite"
                    name="unite"
                    value={
                      form.unite
                    }
                    onChange={
                      handleChange
                    }
                    disabled={
                      submitting
                    }
                  >

                    {UNITS.map(
                      (unit) => (
                        <option
                          key={unit}
                          value={unit}
                        >
                          {unit}
                        </option>
                      )
                    )}

                  </select>

                  {errors.unite && (
                    <small className="publish-field-error">
                      {errors.unite}
                    </small>
                  )}

                </div>


                {/* RÉSUMÉ */}

                <div className="publish-field publish-field-full">

                  <div className="offer-summary">

                    <div className="summary-heading">

                      <div>
                        <span>
                          Aperçu
                        </span>

                        <h3>
                          Résumé de votre offre
                        </h3>
                      </div>

                      <div className="summary-product-badge">
                        {form.unite || "Unité"}
                      </div>

                    </div>


                    <div className="summary-product-name">
                      {form.produit_nom || "Votre produit"}
                    </div>


                    <div className="summary-price">

                      {form.prix
                        ? Number(
                            form.prix
                          ).toLocaleString(
                            "fr-FR"
                          )
                        : "0"}

                      <span>
                        FCFA
                      </span>

                    </div>


                    <div className="summary-quantity">

                      Quantité disponible :

                      <strong>
                        {form.quantite
                          ? `${form.quantite} ${form.unite}`
                          : "—"}
                      </strong>

                    </div>

                  </div>

                </div>

              </div>

            </section>
          )}


          {/* ==================================================
              ÉTAPE 3
          ================================================== */}

          {step === 3 && (
            <section className="publish-section">

              <div className="publish-section-header">

                <div className="publish-section-number">
                  03
                </div>

                <div>
                  <span>
                    Localisation
                  </span>

                  <h2>
                    Où se trouve votre offre ?
                  </h2>

                  <p>
                    Indiquez la région, la province
                    et la commune de votre produit.
                  </p>
                </div>

              </div>


              <div className="publish-form-grid">

                <div className="publish-field">

                  <label htmlFor="region">
                    Région
                    <span>*</span>
                  </label>

                  <input
                    id="region"
                    name="region"
                    type="text"
                    value={
                      form.region
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Ex. Centre"
                    disabled={
                      submitting
                    }
                    className={
                      errors.region
                        ? "has-error"
                        : ""
                    }
                  />

                  {errors.region && (
                    <small className="publish-field-error">
                      {errors.region}
                    </small>
                  )}

                </div>


                <div className="publish-field">

                  <label htmlFor="province">
                    Province
                    <span>*</span>
                  </label>

                  <input
                    id="province"
                    name="province"
                    type="text"
                    value={
                      form.province
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Ex. Kadiogo"
                    disabled={
                      submitting
                    }
                    className={
                      errors.province
                        ? "has-error"
                        : ""
                    }
                  />

                  {errors.province && (
                    <small className="publish-field-error">
                      {errors.province}
                    </small>
                  )}

                </div>


                <div className="publish-field">

                  <label htmlFor="commune">
                    Commune
                    <span>*</span>
                  </label>

                  <input
                    id="commune"
                    name="commune"
                    type="text"
                    value={
                      form.commune
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Ex. Saaba"
                    disabled={
                      submitting
                    }
                    className={
                      errors.commune
                        ? "has-error"
                        : ""
                    }
                  />

                  {errors.commune && (
                    <small className="publish-field-error">
                      {errors.commune}
                    </small>
                  )}

                </div>


                {/* GPS */}

                <div className="publish-field publish-field-full">

                  <div className="location-card">

                    <div className="location-card-icon">
                      ◎
                    </div>

                    <div className="location-card-content">

                      <span className="location-eyebrow">
                        Optionnel
                      </span>

                      <h3>
                        Localisation GPS
                      </h3>

                      <p>
                        Enregistrez votre position
                        GPS pour faciliter la
                        localisation de votre offre.
                      </p>

                      <div className="location-privacy">
                        <span>
                          🔒
                        </span>

                        <span>
                          Les coordonnées exactes
                          restent privées et ne
                          sont pas affichées
                          publiquement.
                        </span>
                      </div>

                    </div>


                    <div className="location-actions">

                      <button
                        type="button"
                        className="publish-button publish-button-secondary"
                        onClick={
                          handleGetLocation
                        }
                        disabled={
                          submitting ||
                          geoLoading ||
                          !geoSupported
                        }
                      >
                        {geoLoading
                          ? "Récupération..."
                          : "Utiliser ma position"}
                      </button>


                      {latitude !== null &&
                        longitude !== null && (
                          <button
                            type="button"
                            className="publish-button publish-button-danger-light"
                            onClick={
                              handleResetLocation
                            }
                            disabled={
                              submitting
                            }
                          >
                            Réinitialiser
                          </button>
                        )}

                    </div>


                    {geoLoading && (
                      <div className="location-message">
                        Récupération de votre
                        position en cours...
                      </div>
                    )}


                    {geoError && (
                      <div className="location-error">
                        {geoError}
                      </div>
                    )}


                    {locationMessage && (
                      <div className="location-success">
                        ✓ {locationMessage}
                      </div>
                    )}


                    {latitude !== null &&
                      longitude !== null && (
                        <div className="location-status">

                          <strong>
                            Position GPS enregistrée
                          </strong>

                          <span>
                            Votre position exacte
                            sera conservée de manière
                            privée.
                          </span>

                        </div>
                      )}

                  </div>

                </div>

              </div>

            </section>
          )}


          {/* ==================================================
              ÉTAPE 4
          ================================================== */}

          {step === 4 && (
            <section className="publish-section">

              <div className="publish-section-header">

                <div className="publish-section-number">
                  04
                </div>

                <div>
                  <span>
                    Photos
                  </span>

                  <h2>
                    Présenter votre produit
                  </h2>

                  <p>
                    Ajoutez jusqu'à {MAX_IMAGES}
                    photos pour présenter votre
                    offre aux acheteurs.
                  </p>
                </div>

              </div>


              {/* UPLOAD */}

              <div className="publish-upload-zone">

                <input
                  ref={fileInputRef}
                  id="images"
                  type="file"
                  accept={ALLOWED_IMAGE_TYPES.join(",")}
                  multiple
                  onChange={
                    handleFiles
                  }
                  disabled={
                    submitting
                  }
                />

                <label htmlFor="images">

                  <div className="upload-icon">
                    ↑
                  </div>

                  <strong>
                    Ajouter des photos
                  </strong>

                  <span>
                    Cliquez pour sélectionner
                    vos images
                  </span>

                  <small>
                    JPG, PNG ou WEBP ·
                    5 Mo maximum par image ·
                    {MAX_IMAGES} images maximum
                  </small>

                </label>

              </div>


              {errors.images && (
                <div className="publish-field-error upload-error">
                  {errors.images}
                </div>
              )}


              {/* APERÇUS */}

              {previews.length > 0 && (
                <div className="image-preview-section">

                  <div className="image-preview-header">

                    <div>
                      <span>
                        Vos photos
                      </span>

                      <strong>
                        {images.length} / {MAX_IMAGES}
                      </strong>
                    </div>

                    <small>
                      Vous pouvez supprimer une
                      photo avant publication.
                    </small>

                  </div>


                  <div className="image-preview-grid">

                    {previews.map(
                      (
                        preview,
                        index
                      ) => (
                        <div
                          key={preview}
                          className="image-preview"
                        >

                          <img
                            src={preview}
                            alt={`Aperçu ${
                              index + 1
                            }`}
                          />

                          <div className="image-preview-number">
                            {index + 1}
                          </div>

                          <button
                            type="button"
                            className="image-remove"
                            onClick={() =>
                              removeImage(
                                index
                              )
                            }
                            disabled={
                              submitting
                            }
                            aria-label={`Supprimer la photo ${
                              index + 1
                            }`}
                          >
                            ×
                          </button>

                        </div>
                      )
                    )}

                  </div>

                </div>
              )}


              {/* RÉSUMÉ FINAL */}

              <div className="publication-summary">

                <div className="summary-heading">

                  <div>
                    <span>
                      Dernière vérification
                    </span>

                    <h3>
                      Vérifiez votre annonce
                    </h3>
                  </div>

                  <div className="summary-ready">
                    Prêt à publier
                  </div>

                </div>


                <div className="publication-summary-grid">

                  <div className="summary-row">
                    <span>
                      Famille
                    </span>

                    <strong>
                      {
                        getFamilyName(
                          selectedFamily
                        ) || "—"
                      }
                    </strong>
                  </div>


                  <div className="summary-row">
                    <span>
                      Secteur
                    </span>

                    <strong>
                      {
                        publicationSecteur ||
                        "—"
                      }
                    </strong>
                  </div>


                  <div className="summary-row">
                    <span>
                      Catégorie
                    </span>

                    <strong>
                      {
                        getCategoryName(
                          selectedCategory
                        ) || "—"
                      }
                    </strong>
                  </div>


                  <div className="summary-row">
                    <span>
                      Produit
                    </span>

                    <strong>
                      {
                        form.produit_nom ||
                        "—"
                      }
                    </strong>
                  </div>


                  {typeProduitApplicable &&
                    form.type_produit && (
                      <div className="summary-row">

                        <span>
                          Type
                        </span>

                        <strong>
                          {form.type_produit ===
                          "brut"
                            ? "Brut"
                            : "Transformé"}
                        </strong>

                      </div>
                    )}


                  <div className="summary-row">
                    <span>
                      Prix
                    </span>

                    <strong>
                      {form.prix
                        ? `${Number(
                            form.prix
                          ).toLocaleString(
                            "fr-FR"
                          )} FCFA`
                        : "—"}
                    </strong>
                  </div>


                  <div className="summary-row">
                    <span>
                      Quantité
                    </span>

                    <strong>
                      {form.quantite
                        ? `${form.quantite} ${form.unite}`
                        : "—"}
                    </strong>
                  </div>


                  <div className="summary-row">
                    <span>
                      Localisation
                    </span>

                    <strong>
                      {[
                        form.commune,
                        form.province,
                        form.region,
                      ]
                        .filter(Boolean)
                        .join(", ") ||
                        "—"}
                    </strong>
                  </div>


                  <div className="summary-row">
                    <span>
                      GPS
                    </span>

                    <strong
                      className={
                        latitude !== null &&
                        longitude !== null
                          ? "summary-status-success"
                          : ""
                      }
                    >
                      {latitude !== null &&
                      longitude !== null
                        ? "Enregistré"
                        : "Non enregistré"}
                    </strong>
                  </div>


                  <div className="summary-row">
                    <span>
                      Photos
                    </span>

                    <strong>
                      {images.length} /{" "}
                      {MAX_IMAGES}
                    </strong>
                  </div>

                </div>

              </div>


              <div className="publication-note">

                <span>
                  ✓
                </span>

                <p>
                  Après publication, votre annonce
                  sera envoyée en attente de
                  modération avant sa mise en ligne.
                </p>

              </div>

            </section>
          )}


          {/* ==================================================
              NAVIGATION
          ================================================== */}

          <div className="publish-navigation">

            {step > 1 ? (
              <button
                type="button"
                className="publish-button publish-button-secondary"
                onClick={
                  handlePrevious
                }
                disabled={
                  submitting
                }
              >
                ← Précédent
              </button>
            ) : (
              <Link
                to="/tableau-de-bord"
                className="publish-navigation-cancel"
              >
                Annuler
              </Link>
            )}


            {step < STEPS.length ? (
              <button
                type="button"
                className="publish-button publish-button-primary"
                onClick={
                  handleNext
                }
                disabled={
                  submitting ||
                  catalogLoading
                }
              >
                Continuer →
              </button>
            ) : (
              <button
                type="submit"
                className="publish-button publish-button-primary publish-submit-button"
                disabled={
                  submitting
                }
              >
                {submitting ? (
                  <>
                    <span className="button-spinner" />
                    Publication...
                  </>
                ) : (
                  <>
                    Publier l'annonce
                    <span>→</span>
                  </>
                )}
              </button>
            )}

          </div>

        </form>

      </div>

    </main>
  );
}