// src/services/api/publish.js

import {
  getFamilles,
} from "./familles";

import {
  getCategories,
} from "./categories";

import {
  createAnnonce,
  uploadAnnonceImage,
} from "./products";


/*
 * ============================================================
 * PUBLICATION D'UNE ANNONCE
 * ============================================================
 *
 * Responsabilités :
 *
 * - charger le catalogue nécessaire à la publication ;
 * - récupérer les familles ;
 * - récupérer les catégories ;
 * - déterminer le secteur métier ;
 * - préparer les données de l'annonce ;
 * - intégrer la géolocalisation ;
 * - créer l'annonce ;
 * - envoyer les images ;
 * - retourner un résultat uniforme au composant.
 *
 * Hiérarchie métier :
 *
 * Famille
 *    ↓
 * Secteur
 *    ↓
 * Catégorie
 *    ↓
 * Produit
 *    ↓
 * Annonce
 *
 * ============================================================
 */


/*
 * ============================================================
 * CONSTANTES
 * ============================================================
 */

const MAX_IMAGES = 4;

const MAX_IMAGE_SIZE =
  5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];


/*
 * ============================================================
 * SECTEURS MÉTIER
 * ============================================================
 *
 * IMPORTANT :
 *
 * Ces valeurs doivent correspondre exactement à l'Enum
 * SecteurProduit du backend FastAPI.
 *
 * Backend :
 *
 * - agricole
 * - elevage
 * - materiel_agricole
 * - engrais
 * - phytosanitaire
 *
 * ============================================================
 */

const SECTEURS_VALIDES = [
  "agricole",
  "elevage",
  "materiel_agricole",
  "engrais",
  "phytosanitaire",
];


/*
 * ============================================================
 * SECTEURS AVEC TYPE DE PRODUIT
 * ============================================================
 *
 * Pour :
 *
 * - agricole
 * - elevage
 *
 * type_produit est obligatoire :
 *
 * - brut
 * - transforme
 *
 * ============================================================
 */

const SECTEURS_AVEC_TYPE = [
  "agricole",
  "elevage",
];


/*
 * ============================================================
 * SECTEURS SANS TYPE DE PRODUIT
 * ============================================================
 */

const SECTEURS_SANS_TYPE = [
  "materiel_agricole",
  "engrais",
  "phytosanitaire",
];


/*
 * ============================================================
 * TYPES DE PRODUIT VALIDES
 * ============================================================
 */

const TYPES_PRODUIT_VALIDES = [
  "brut",
  "transforme",
];


/*
 * ============================================================
 * NORMALISATION D'UN TABLEAU
 * ============================================================
 */

function normalizeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}


/*
 * ============================================================
 * NORMALISER UNE VALEUR MÉTIER
 * ============================================================
 *
 * Exemple :
 *
 * "Agriculture"
 *       ↓
 * "agriculture"
 *
 * "Élevage"
 *       ↓
 * "elevage"
 *
 * "Matériel agricole"
 *       ↓
 * "materiel_agricole"
 *
 * ============================================================
 */

function normalizeBusinessValue(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      "_"
    )
    .replace(
      /^_+|_+$/g,
      ""
    );
}


/*
 * ============================================================
 * NORMALISER LE SECTEUR
 * ============================================================
 *
 * Cette fonction est importante car le frontend peut recevoir
 * plusieurs appellations provenant du catalogue.
 *
 * Exemple :
 *
 * Agriculture
 * Produits agricoles
 * Produit agricole
 *
 * deviennent tous :
 *
 * agricole
 *
 * ============================================================
 */

function normalizeSecteur(value) {
  const normalized =
    normalizeBusinessValue(
      value
    );

  const mapping = {
    /*
     * Agriculture
     */
    agriculture:
      "agricole",

    agricole:
      "agricole",

    produit_agricole:
      "agricole",

    produits_agricoles:
      "agricole",

    /*
     * Élevage
     */
    elevage:
      "elevage",

    /*
     * Matériel agricole
     */
    materiel_agricole:
      "materiel_agricole",

    /*
     * Engrais
     */
    engrais:
      "engrais",

    /*
     * Produits phytosanitaires
     */
    phytosanitaire:
      "phytosanitaire",

    produit_phytosanitaire:
      "phytosanitaire",

    produits_phytosanitaires:
      "phytosanitaire",
  };

  return (
    mapping[normalized] ||
    ""
  );
}


/*
 * ============================================================
 * DÉTERMINER LE SECTEUR DU FORMULAIRE
 * ============================================================
 *
 * Le composant React peut fournir le secteur directement.
 *
 * On conserve également plusieurs propriétés possibles afin
 * de rester compatible avec différentes structures éventuelles.
 *
 * ============================================================
 */

function getFormSecteur(form) {
  if (
    !form ||
    typeof form !== "object"
  ) {
    return "";
  }

  const secteur =
    form.secteur ??
    form.secteur_produit ??
    form.famille_secteur ??
    form.familleSecteur ??
    form.famille?.secteur ??
    "";

  return normalizeSecteur(
    secteur
  );
}


/*
 * ============================================================
 * RÈGLE DU TYPE DE PRODUIT
 * ============================================================
 *
 * Retourne :
 *
 * "required"
 *     → brut / transforme obligatoire
 *
 * "forbidden"
 *     → aucun type_produit autorisé
 *
 * "optional"
 *     → secteur non déterminé.
 *
 * ============================================================
 */

function getTypeProduitRule(
  secteur
) {
  const normalizedSecteur =
    normalizeSecteur(
      secteur
    );

  if (
    SECTEURS_AVEC_TYPE.includes(
      normalizedSecteur
    )
  ) {
    return "required";
  }

  if (
    SECTEURS_SANS_TYPE.includes(
      normalizedSecteur
    )
  ) {
    return "forbidden";
  }

  return "optional";
}


/*
 * ============================================================
 * VALIDER LE TYPE DE PRODUIT
 * ============================================================
 */

function validateTypeProduit(
  secteur,
  typeProduit
) {
  const rule =
    getTypeProduitRule(
      secteur
    );

  /*
   * ----------------------------------------------------------
   * AGRICOLE / ÉLEVAGE
   * ----------------------------------------------------------
   */

  if (rule === "required") {
    if (
      !TYPES_PRODUIT_VALIDES.includes(
        typeProduit
      )
    ) {
      return (
        "Pour les produits agricoles et d'élevage, " +
        "le type doit être « brut » ou « transforme »."
      );
    }

    return null;
  }


  /*
   * ----------------------------------------------------------
   * MATÉRIEL / ENGRAIS / PHYTOSANITAIRE
   * ----------------------------------------------------------
   */

  if (rule === "forbidden") {
    if (typeProduit) {
      return (
        "Cette famille ne doit pas avoir de type « brut » " +
        "ou « transforme »."
      );
    }

    return null;
  }


  /*
   * ----------------------------------------------------------
   * SECTEUR INCONNU
   * ----------------------------------------------------------
   *
   * Le secteur est normalement contrôlé avant cette étape.
   * On conserve néanmoins ce comportement pour éviter une
   * régression avec d'anciennes structures de formulaire.
   * ----------------------------------------------------------
   */

  return null;
}


/*
 * ============================================================
 * CHARGER LE CATALOGUE DE PUBLICATION
 * ============================================================
 */

export async function getPublicationCatalog() {
  const [
    famillesResponse,
    categoriesResponse,
  ] = await Promise.all([
    getFamilles(),
    getCategories(),
  ]);

  const familles =
    Array.isArray(
      famillesResponse
    )
      ? famillesResponse
      : normalizeArray(
          famillesResponse?.familles
        );

  const categories =
    Array.isArray(
      categoriesResponse
    )
      ? categoriesResponse
      : normalizeArray(
          categoriesResponse?.categories
        );

  return {
    familles,
    categories,
  };
}


/*
 * ============================================================
 * CATÉGORIES D'UNE FAMILLE
 * ============================================================
 */

export function getCategoriesByFamille(
  categories,
  familleId
) {
  if (
    !familleId ||
    !Array.isArray(categories)
  ) {
    return [];
  }

  return categories.filter(
    (categorie) =>
      String(
        categorie.famille_id
      ) ===
      String(
        familleId
      )
  );
}


/*
 * ============================================================
 * RECHERCHER UNE FAMILLE
 * ============================================================
 */

export function findFamille(
  familles,
  familleId
) {
  if (
    !Array.isArray(familles) ||
    !familleId
  ) {
    return null;
  }

  return (
    familles.find(
      (famille) =>
        String(famille.id) ===
        String(familleId)
    ) || null
  );
}


/*
 * ============================================================
 * RECHERCHER UNE CATÉGORIE
 * ============================================================
 */

export function findCategorie(
  categories,
  categorieId
) {
  if (
    !Array.isArray(categories) ||
    !categorieId
  ) {
    return null;
  }

  return (
    categories.find(
      (categorie) =>
        String(categorie.id) ===
        String(categorieId)
    ) || null
  );
}


/*
 * ============================================================
 * VALIDER UNE IMAGE
 * ============================================================
 */

export function validatePublicationImage(
  file
) {
  if (!(file instanceof File)) {
    return "Fichier image invalide.";
  }

  if (
    !ALLOWED_IMAGE_TYPES.includes(
      file.type
    )
  ) {
    return (
      `Le fichier "${file.name}" possède un format non autorisé. ` +
      "Utilisez JPG, PNG ou WEBP."
    );
  }

  if (
    file.size >
    MAX_IMAGE_SIZE
  ) {
    return (
      `Le fichier "${file.name}" dépasse la taille maximale de 5 Mo.`
    );
  }

  return null;
}


/*
 * ============================================================
 * VALIDER LES IMAGES
 * ============================================================
 */

export function validatePublicationImages(
  files
) {
  if (!Array.isArray(files)) {
    return "Les images fournies sont invalides.";
  }

  if (
    files.length >
    MAX_IMAGES
  ) {
    return (
      `Une annonce ne peut pas contenir plus de ${MAX_IMAGES} images.`
    );
  }

  for (const file of files) {
    const error =
      validatePublicationImage(
        file
      );

    if (error) {
      return error;
    }
  }

  return null;
}


/*
 * ============================================================
 * NORMALISER LA GÉOLOCALISATION
 * ============================================================
 */

function normalizeGeolocation(
  geolocation = {}
) {
  if (
    !geolocation ||
    typeof geolocation !== "object"
  ) {
    return {
      latitude: null,
      longitude: null,
      localisation_source: null,
      type_localisation: null,
      visibilite_localisation: null,
    };
  }

  const latitude =
    Number(
      geolocation.latitude
    );

  const longitude =
    Number(
      geolocation.longitude
    );

  return {
    latitude:
      Number.isFinite(
        latitude
      )
        ? latitude
        : null,

    longitude:
      Number.isFinite(
        longitude
      )
        ? longitude
        : null,

    localisation_source:
      String(
        geolocation.localisation_source ||
        geolocation.source ||
        ""
      ).trim() || null,

    type_localisation:
      String(
        geolocation.type_localisation ||
        ""
      ).trim() || null,

    visibilite_localisation:
      String(
        geolocation.visibilite_localisation ||
        ""
      ).trim() || null,
  };
}


/*
 * ============================================================
 * VALIDER LA GÉOLOCALISATION
 * ============================================================
 */

export function validatePublicationGeolocation(
  geolocation = {}
) {
  const normalized =
    normalizeGeolocation(
      geolocation
    );

  /*
   * Pas de GPS :
   * la géolocalisation est facultative.
   */

  if (
    normalized.latitude === null &&
    normalized.longitude === null
  ) {
    return null;
  }

  /*
   * Une seule coordonnée :
   * impossible.
   */

  if (
    normalized.latitude === null ||
    normalized.longitude === null
  ) {
    return (
      "Les coordonnées GPS sont incomplètes."
    );
  }

  /*
   * Latitude.
   */

  if (
    normalized.latitude < -90 ||
    normalized.latitude > 90
  ) {
    return (
      "La latitude GPS est invalide."
    );
  }

  /*
   * Longitude.
   */

  if (
    normalized.longitude < -180 ||
    normalized.longitude > 180
  ) {
    return (
      "La longitude GPS est invalide."
    );
  }

  return null;
}


/*
 * ============================================================
 * CONSTRUIRE LE PAYLOAD
 * ============================================================
 */

export function buildPublicationPayload(
  form,
  geolocation = {}
) {
  if (
    !form ||
    typeof form !== "object" ||
    Array.isArray(form)
  ) {
    throw new Error(
      "Les données de publication sont obligatoires."
    );
  }


  /*
   * ----------------------------------------------------------
   * DONNÉES DU FORMULAIRE
   * ----------------------------------------------------------
   */

  const produitNom =
    String(
      form.produit_nom || ""
    ).trim();

  const description =
    String(
      form.description_produit || ""
    ).trim();

  const categorieId =
    Number(
      form.categorie_id
    );

  const prix =
    Number(
      form.prix
    );

  const quantite =
    Number(
      form.quantite
    );

  const typeProduit =
    String(
      form.type_produit || ""
    )
      .trim()
      .toLowerCase();

  const unite =
    String(
      form.unite || ""
    ).trim();

  const region =
    String(
      form.region || ""
    ).trim();

  const province =
    String(
      form.province || ""
    ).trim();

  const commune =
    String(
      form.commune || ""
    ).trim();


  /*
   * ----------------------------------------------------------
   * SECTEUR
   * ----------------------------------------------------------
   *
   * Le secteur est maintenant explicitement récupéré.
   *
   * Exemple :
   *
   * agriculture
   *      ↓
   * agricole
   *
   * ----------------------------------------------------------
   */

  const secteur =
    getFormSecteur(
      form
    );


  /*
   * ----------------------------------------------------------
   * GÉOLOCALISATION
   * ----------------------------------------------------------
   */

  const normalizedGeolocation =
    normalizeGeolocation(
      geolocation
    );


  /*
   * ----------------------------------------------------------
   * VALIDATION DU NOM
   * ----------------------------------------------------------
   */

  if (!produitNom) {
    throw new Error(
      "Le nom du produit est obligatoire."
    );
  }


  /*
   * ----------------------------------------------------------
   * VALIDATION DU SECTEUR
   * ----------------------------------------------------------
   *
   * Le backend possède un secteur par défaut, mais dans notre
   * formulaire le secteur dépend directement de la famille
   * choisie par l'utilisateur.
   *
   * Il est donc préférable de l'envoyer explicitement.
   * ----------------------------------------------------------
   */

  if (!secteur) {
    throw new Error(
      "Le secteur du produit est obligatoire. " +
      "Veuillez sélectionner une famille valide."
    );
  }


  if (
    !SECTEURS_VALIDES.includes(
      secteur
    )
  ) {
    throw new Error(
      "Le secteur du produit est invalide."
    );
  }


  /*
   * ----------------------------------------------------------
   * VALIDATION DU TYPE DE PRODUIT
   * ----------------------------------------------------------
   */

  const typeProduitError =
    validateTypeProduit(
      secteur,
      typeProduit
    );

  if (typeProduitError) {
    throw new Error(
      typeProduitError
    );
  }


  /*
   * ----------------------------------------------------------
   * VALIDATION CATÉGORIE
   * ----------------------------------------------------------
   */

  if (
    !Number.isInteger(
      categorieId
    ) ||
    categorieId <= 0
  ) {
    throw new Error(
      "La catégorie sélectionnée est invalide."
    );
  }


  /*
   * ----------------------------------------------------------
   * DESCRIPTION
   * ----------------------------------------------------------
   *
   * Le backend autorise une description vide.
   *
   * Nous conservons ici une chaîne vide lorsque l'utilisateur
   * ne fournit pas de description.
   *
   * ----------------------------------------------------------
   */


  /*
   * ----------------------------------------------------------
   * VALIDATION PRIX
   * ----------------------------------------------------------
   */

  if (
    !Number.isFinite(
      prix
    ) ||
    prix <= 0
  ) {
    throw new Error(
      "Le prix doit être supérieur à zéro."
    );
  }


  /*
   * ----------------------------------------------------------
   * VALIDATION QUANTITÉ
   * ----------------------------------------------------------
   */

  if (
    !Number.isFinite(
      quantite
    ) ||
    quantite <= 0
  ) {
    throw new Error(
      "La quantité doit être supérieure à zéro."
    );
  }


  /*
   * ----------------------------------------------------------
   * VALIDATION UNITÉ
   * ----------------------------------------------------------
   */

  if (!unite) {
    throw new Error(
      "L'unité est obligatoire."
    );
  }


  /*
   * ----------------------------------------------------------
   * VALIDATION RÉGION
   * ----------------------------------------------------------
   */

  if (!region) {
    throw new Error(
      "La région est obligatoire."
    );
  }


  /*
   * ----------------------------------------------------------
   * VALIDATION PROVINCE
   * ----------------------------------------------------------
   */

  if (!province) {
    throw new Error(
      "La province est obligatoire."
    );
  }


  /*
   * ----------------------------------------------------------
   * VALIDATION COMMUNE
   * ----------------------------------------------------------
   */

  if (!commune) {
    throw new Error(
      "La commune est obligatoire."
    );
  }


  /*
   * ----------------------------------------------------------
   * VALIDATION GPS
   * ----------------------------------------------------------
   */

  const geolocationError =
    validatePublicationGeolocation(
      normalizedGeolocation
    );

  if (geolocationError) {
    throw new Error(
      geolocationError
    );
  }


  /*
   * ==========================================================
   * PAYLOAD API
   * ==========================================================
   *
   * IMPORTANT :
   *
   * Le champ secteur est maintenant envoyé explicitement.
   *
   * Exemple :
   *
   * {
   *   produit_nom: "Maïs",
   *   categorie_id: 1,
   *   secteur: "agricole",
   *   prix: 250,
   *   ...
   * }
   *
   * ==========================================================
   */

  const payload = {
    produit_nom:
      produitNom,

    description_produit:
      description || null,

    categorie_id:
      categorieId,

    secteur:
      secteur,

    prix,

    quantite,

    unite,

    region,

    province,

    commune,
  };


  /*
   * ----------------------------------------------------------
   * TYPE DE PRODUIT
   * ----------------------------------------------------------
   *
   * On l'envoie uniquement pour :
   *
   * - agricole
   * - elevage
   *
   * et uniquement lorsqu'il possède une valeur valide.
   * ----------------------------------------------------------
   */

  if (
    SECTEURS_AVEC_TYPE.includes(
      secteur
    )
  ) {
    payload.type_produit =
      typeProduit;
  }


  /*
   * ----------------------------------------------------------
   * GÉOLOCALISATION
   * ----------------------------------------------------------
   */

  if (
    normalizedGeolocation.latitude !== null &&
    normalizedGeolocation.longitude !== null
  ) {
    payload.latitude =
      normalizedGeolocation.latitude;

    payload.longitude =
      normalizedGeolocation.longitude;
  }


  /*
   * ----------------------------------------------------------
   * SOURCE DE LOCALISATION
   * ----------------------------------------------------------
   */

  if (
    normalizedGeolocation.localisation_source
  ) {
    payload.localisation_source =
      normalizedGeolocation.localisation_source;
  }


  /*
   * ----------------------------------------------------------
   * TYPE DE LOCALISATION
   * ----------------------------------------------------------
   */

  if (
    normalizedGeolocation.type_localisation
  ) {
    payload.type_localisation =
      normalizedGeolocation.type_localisation;
  }


  /*
   * ----------------------------------------------------------
   * VISIBILITÉ DE LOCALISATION
   * ----------------------------------------------------------
   */

  if (
    normalizedGeolocation.visibilite_localisation
  ) {
    payload.visibilite_localisation =
      normalizedGeolocation.visibilite_localisation;
  }


  /*
   * ----------------------------------------------------------
   * RETOUR
   * ----------------------------------------------------------
   */

  return payload;
}


/*
 * ============================================================
 * PUBLIER L'ANNONCE
 * ============================================================
 */

export async function publishAnnonce({
  form,
  files = [],
  geolocation = {},
} = {}) {

  /*
   * ----------------------------------------------------------
   * VALIDATION DES IMAGES
   * ----------------------------------------------------------
   */

  const imageError =
    validatePublicationImages(
      files
    );

  if (imageError) {
    throw new Error(
      imageError
    );
  }


  /*
   * ----------------------------------------------------------
   * CONSTRUCTION DU PAYLOAD
   * ----------------------------------------------------------
   */

  const payload =
    buildPublicationPayload(
      form,
      geolocation
    );


  /*
   * ----------------------------------------------------------
   * CRÉATION DE L'ANNONCE
   * ----------------------------------------------------------
   */

  const annonce =
    await createAnnonce(
      payload
    );

  const annonceId =
    annonce?.id;

  if (!annonceId) {
    throw new Error(
      "L'API n'a pas retourné l'identifiant de l'annonce créée."
    );
  }


  /*
   * ----------------------------------------------------------
   * UPLOAD DES IMAGES
   * ----------------------------------------------------------
   */

  const uploadedImages = [];

  const imageErrors = [];

  for (
    const file of files
  ) {
    try {
      const image =
        await uploadAnnonceImage(
          annonceId,
          file
        );

      uploadedImages.push(
        image
      );

    } catch (error) {
      console.error(
        `Erreur upload image "${file.name}" :`,
        error
      );

      imageErrors.push({
        filename:
          file.name,

        message:
          error?.message ||
          "Échec de l'envoi de l'image.",
      });
    }
  }


  /*
   * ----------------------------------------------------------
   * RÉSULTAT
   * ----------------------------------------------------------
   */

  return {
    annonce,

    annonceId,

    uploadedImages,

    imageErrors,

    imagesTotal:
      files.length,

    imagesUploaded:
      uploadedImages.length,

    imagesFailed:
      imageErrors.length,

    success:
      imageErrors.length === 0,

    geolocation: {
      enabled:
        Number.isFinite(
          Number(
            geolocation?.latitude
          )
        ) &&
        Number.isFinite(
          Number(
            geolocation?.longitude
          )
        ),
    },
  };
}


/*
 * ============================================================
 * EXPORTS
 * ============================================================
 */

export {
  MAX_IMAGES,
  MAX_IMAGE_SIZE,
  ALLOWED_IMAGE_TYPES,
};