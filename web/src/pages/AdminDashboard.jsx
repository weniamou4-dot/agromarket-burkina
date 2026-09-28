
// src/pages/AdminDashboard.jsx

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";
import "../styles/pages/admin-ation-dashboard.css";
import {
  getCurrentUser,
} from "../services/api/auth";

import {
  getAdminStatistiques,

  getDemandesVendeur,
  extractDemandesVendeur,
  accepterDemandeVendeur,
  refuserDemandeVendeur,

  getFamillesAdmin,
  createFamille,
  updateFamille,
  deleteFamille,

  getCategoriesAdmin,
  createCategorie,
  updateCategorie,
  deleteCategorie,

  getModerateurs,
  createModerateur,
  updateModerateurStatus,
  deleteModerateur,

  getAnnoncesEnAttente,
  approuverAnnonce,
  refuserAnnonce,
} from "../services/api/admin";


/*
 * ============================================================
 * CONSTANTES
 * ============================================================
 */

const ADMIN_ROLES = new Set([
  "admin",
  "administrateur",
]);

const SECTIONS = {
  OVERVIEW: "overview",
  REQUESTS: "requests",
  CATALOG: "catalog",
  MODERATORS: "moderators",
  MODERATION: "moderation",
};

const REQUEST_FILTERS = {
  ALL: "toutes",
  PENDING: "en_attente",
  ACCEPTED: "acceptees",
  REFUSED: "refusees",
};


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
    case "dashboard":
      return (
        <svg {...common}>
          <rect
            x="4"
            y="4"
            width="6"
            height="6"
            rx="1"
          />
          <rect
            x="14"
            y="4"
            width="6"
            height="6"
            rx="1"
          />
          <rect
            x="4"
            y="14"
            width="6"
            height="6"
            rx="1"
          />
          <rect
            x="14"
            y="14"
            width="6"
            height="6"
            rx="1"
          />
        </svg>
      );

    case "users":
      return (
        <svg {...common}>
          <circle
            cx="9"
            cy="8"
            r="3"
          />
          <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          <path d="M16 5.5a3 3 0 0 1 0 5" />
          <path d="M18 14c1.8.7 3 2.5 3 5" />
        </svg>
      );

    case "catalog":
      return (
        <svg {...common}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5v-12Z" />
          <path d="M4 7h16" />
          <path d="M8 11h8" />
          <path d="M8 15h6" />
        </svg>
      );

    case "folder":
      return (
        <svg {...common}>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
        </svg>
      );

    case "requests":
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="8"
            r="3"
          />
          <path d="M5 21c.7-4 3-6 7-6s6.3 2 7 6" />
          <path d="M19 4v5" />
          <path d="M16.5 6.5h5" />
        </svg>
      );

    case "moderator":
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="8"
            r="3"
          />
          <path d="M5 21c.7-4 3-6 7-6s6.3 2 7 6" />
          <path d="M18 3h3" />
          <path d="M19.5 1.5v3" />
        </svg>
      );

    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 20 6v5c0 5-3.2 8.6-8 10-4.8-1.4-8-5-8-10V6l8-3Z" />
          <path d="m9 12 2 2 4-4" />
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

    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );

    case "edit":
      return (
        <svg {...common}>
          <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
          <path d="m13.5 6.5 4 4" />
        </svg>
      );

    case "trash":
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M6 7l1 13h10l1-13" />
          <path d="M9 7V4h6v3" />
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

    case "history":
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "ai":
      return (
        <svg {...common}>
          <path d="M12 3 13.5 8.5 19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" />
          <path d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
          <path d="M5 15l.5 1.5L7 17l-1.5.5L5 19l-.5-1.5L3 17l1.5-.5L5 15Z" />
        </svg>
      );

    case "star":
      return (
        <svg {...common}>
          <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

    default:
      return null;
  }
}


/*
 * ============================================================
 * UTILITAIRES
 * ============================================================
 */

function numberValue(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}


function formatNumber(value) {
  return numberValue(value).toLocaleString(
    "fr-FR"
  );
}


function formatMoney(value) {
  return `${formatNumber(value)} FCFA`;
}


function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}


function getUserName(user) {
  return (
    user?.nom ||
    user?.nom_complet ||
    user?.email ||
    user?.telephone ||
    "Utilisateur"
  );
}


function normalizeRole(role) {
  return String(
    role || ""
  )
    .trim()
    .toLowerCase();
}


function normalizeStatus(status) {
  return String(
    status || ""
  )
    .trim()
    .toLowerCase();
}


function normalizeArray(
  value,
  keys = []
) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  for (const key of keys) {
    if (Array.isArray(value[key])) {
      return value[key];
    }
  }

  return [];
}


function getErrorMessage(
  error,
  fallback
) {
  if (
    error?.message &&
    String(error.message).trim()
  ) {
    return String(error.message);
  }

  return fallback;
}


function isValidText(
  value
) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}


/*
 * ============================================================
 * COMPOSANT STATISTIQUE
 * ============================================================
 */

function StatCard({
  icon,
  label,
  value,
  description,
}) {
  return (
    <article className="admin-kpi-card">

      <div className="admin-kpi-icon">
        <Icon
          name={icon}
          size={22}
        />
      </div>

      <div>
        <span>
          {label}
        </span>

        <strong>
          {formatNumber(value)}
        </strong>

        {description && (
          <small>
            {description}
          </small>
        )}
      </div>

    </article>
  );
}


/*
 * ============================================================
 * PAGE
 * ============================================================
 */

function AdminDashboard() {

  const navigate = useNavigate();


  /*
   * ==========================================================
   * NAVIGATION
   * ==========================================================
   */

  const [
    section,
    setSection,
  ] = useState(
    SECTIONS.OVERVIEW
  );


  /*
   * ==========================================================
   * DONNÉES
   * ==========================================================
   */

  const [
    admin,
    setAdmin,
  ] = useState(null);

  const [
    stats,
    setStats,
  ] = useState(null);

  const [
    demandes,
    setDemandes,
  ] = useState([]);

  const [
    familles,
    setFamilles,
  ] = useState([]);

  const [
    categories,
    setCategories,
  ] = useState([]);

  const [
    moderateurs,
    setModerateurs,
  ] = useState([]);

  const [
    annonces,
    setAnnonces,
  ] = useState([]);


  /*
   * ==========================================================
   * ÉTATS
   * ==========================================================
   */

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");


  /*
   * ==========================================================
   * FORMULAIRE FAMILLE
   * ==========================================================
   */

  const [
    familleForm,
    setFamilleForm,
  ] = useState({
    nom: "",
    description: "",
  });


  const [
    editingFamille,
    setEditingFamille,
  ] = useState(null);


  /*
   * ==========================================================
   * FORMULAIRE CATÉGORIE
   * ==========================================================
   */

  const [
    categorieForm,
    setCategorieForm,
  ] = useState({
    nom: "",
    description: "",
    famille_id: "",
  });


  const [
    editingCategorie,
    setEditingCategorie,
  ] = useState(null);


  /*
   * ==========================================================
   * FORMULAIRE MODÉRATEUR
   * ==========================================================
   */

  const [
    moderatorForm,
    setModeratorForm,
  ] = useState({
    nom: "",
    telephone: "",
    email: "",
    mot_de_passe: "",
  });


  /*
   * ==========================================================
   * FILTRE DEMANDES
   * ==========================================================
   */

  const [
    requestFilter,
    setRequestFilter,
  ] = useState(
    REQUEST_FILTERS.ALL
  );


  /*
   * ==========================================================
   * CHARGEMENT ADMINISTRATION
   * ==========================================================
   */

  const loadAdmin = useCallback(
    async ({
      initial = false,
    } = {}) => {

      if (initial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      try {

        /*
         * ----------------------------------------------------
         * Vérification du compte administrateur
         * ----------------------------------------------------
         */

        const currentUser =
          await getCurrentUser();

        const normalizedRole =
          normalizeRole(
            currentUser?.role
          );

        if (
          !ADMIN_ROLES.has(
            normalizedRole
          )
        ) {
          navigate(
            "/403",
            {
              replace: true,
            }
          );

          return;
        }

        setAdmin(
          currentUser
        );


        /*
         * ----------------------------------------------------
         * Chargement parallèle
         * ----------------------------------------------------
         */

        const results =
          await Promise.allSettled([
            getAdminStatistiques(),
            getDemandesVendeur(),
            getFamillesAdmin(),
            getCategoriesAdmin(),
            getModerateurs(),
            getAnnoncesEnAttente(),
          ]);


        /*
         * ----------------------------------------------------
         * Statistiques
         * ----------------------------------------------------
         */

        if (
          results[0].status ===
          "fulfilled"
        ) {
          setStats(
            results[0].value || null
          );
        }


        /*
         * ----------------------------------------------------
         * Demandes vendeur
         * ----------------------------------------------------
         */

        if (
          results[1].status ===
          "fulfilled"
        ) {
          setDemandes(
            extractDemandesVendeur(
              results[1].value
            )
          );
        }


        /*
         * ----------------------------------------------------
         * Familles
         * ----------------------------------------------------
         */

        if (
          results[2].status ===
          "fulfilled"
        ) {
          setFamilles(
            normalizeArray(
              results[2].value,
              [
                "familles",
                "resultats",
                "results",
              ]
            )
          );
        }


        /*
         * ----------------------------------------------------
         * Catégories
         * ----------------------------------------------------
         */

        if (
          results[3].status ===
          "fulfilled"
        ) {
          setCategories(
            normalizeArray(
              results[3].value,
              [
                "categories",
                "resultats",
                "results",
              ]
            )
          );
        }


        /*
         * ----------------------------------------------------
         * Modérateurs
         * ----------------------------------------------------
         */

        if (
          results[4].status ===
          "fulfilled"
        ) {
          setModerateurs(
            normalizeArray(
              results[4].value,
              [
                "moderateurs",
                "resultats",
                "results",
              ]
            )
          );
        }


        /*
         * ----------------------------------------------------
         * Annonces
         * ----------------------------------------------------
         */

        if (
          results[5].status ===
          "fulfilled"
        ) {
          setAnnonces(
            normalizeArray(
              results[5].value,
              [
                "annonces",
                "resultats",
                "results",
              ]
            )
          );
        }


        /*
         * ----------------------------------------------------
         * Détection des erreurs partielles
         * ----------------------------------------------------
         */

        const failedRequests =
          results.filter(
            (result) =>
              result.status ===
              "rejected"
          );

        if (
          failedRequests.length > 0
        ) {
          console.warn(
            `${failedRequests.length} requête(s) administratives ont échoué.`,
            failedRequests.map(
              (result) =>
                result.reason
            )
          );

          if (
            failedRequests.length ===
            results.length
          ) {
            throw failedRequests[0].reason;
          }
        }

      } catch (err) {

        console.error(
          "Erreur administration :",
          err
        );

        setError(
          getErrorMessage(
            err,
            "Impossible de charger l'espace administrateur."
          )
        );

      } finally {

        setLoading(false);
        setRefreshing(false);

      }
    },
    [
      navigate,
    ]
  );


  /*
   * ==========================================================
   * CHARGEMENT INITIAL
   * ==========================================================
   */

  useEffect(() => {

    loadAdmin({
      initial: true,
    });

  }, [
    loadAdmin,
  ]);


  /*
   * ==========================================================
   * DEMANDES EN ATTENTE
   * ==========================================================
   */

  const pendingRequests =
    useMemo(
      () =>
        demandes.filter(
          (demande) =>
            normalizeStatus(
              demande?.statut
            ) ===
            "en_attente"
        ),
      [
        demandes,
      ]
    );


  const displayedRequests =
    useMemo(() => {

      switch (
        requestFilter
      ) {

        case REQUEST_FILTERS.PENDING:
          return pendingRequests;

        case REQUEST_FILTERS.ACCEPTED:
          return demandes.filter(
            (demande) =>
              normalizeStatus(
                demande?.statut
              ) ===
              "acceptee"
          );

        case REQUEST_FILTERS.REFUSED:
          return demandes.filter(
            (demande) =>
              normalizeStatus(
                demande?.statut
              ) ===
              "refusee"
          );

        case REQUEST_FILTERS.ALL:
        default:
          return demandes;
      }

    }, [
      demandes,
      pendingRequests,
      requestFilter,
    ]);


  /*
   * ==========================================================
   * FAMILLE → NOM
   * ==========================================================
   */

  function getFamilleName(
    familleId
  ) {
    return (
      familles.find(
        (famille) =>
          Number(
            famille?.id
          ) ===
          Number(
            familleId
          )
      )?.nom ||
      "Famille inconnue"
    );
  }


  /*
   * ==========================================================
   * CRÉER / MODIFIER FAMILLE
   * ==========================================================
   */

  async function submitFamille(
    event
  ) {

    event.preventDefault();

    const nom =
      String(
        familleForm.nom || ""
      ).trim();

    const description =
      String(
        familleForm.description || ""
      ).trim();

    if (!nom) {
      setError(
        "Le nom de la famille est obligatoire."
      );

      return;
    }

    try {

      setSubmitting(true);
      setError("");
      setSuccess("");

      const payload = {
        nom,
        description,
      };


      if (editingFamille) {

        const updated =
          await updateFamille(
            editingFamille.id,
            payload
          );

        setFamilles(
          (current) =>
            current.map(
              (item) =>
                Number(item.id) ===
                Number(
                  editingFamille.id
                )
                  ? updated
                  : item
            )
        );

        setSuccess(
          "Famille modifiée avec succès."
        );

        setEditingFamille(
          null
        );

      } else {

        const created =
          await createFamille(
            payload
          );

        setFamilles(
          (current) => [
            ...current,
            created,
          ]
        );

        setSuccess(
          "Famille créée avec succès."
        );
      }

      setFamilleForm({
        nom: "",
        description: "",
      });

    } catch (err) {

      console.error(
        "Erreur famille :",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Impossible d'enregistrer la famille."
        )
      );

    } finally {

      setSubmitting(false);

    }
  }


  /*
   * ==========================================================
   * MODIFIER FAMILLE
   * ==========================================================
   */

  function startEditFamille(
    famille
  ) {

    if (!famille) {
      return;
    }

    setEditingFamille(
      famille
    );

    setFamilleForm({
      nom:
        famille.nom ||
        "",
      description:
        famille.description ||
        "",
    });

    setSection(
      SECTIONS.CATALOG
    );
  }


  /*
   * ==========================================================
   * ANNULER MODIFICATION FAMILLE
   * ==========================================================
   */

  function cancelEditFamille() {

    setEditingFamille(
      null
    );

    setFamilleForm({
      nom: "",
      description: "",
    });
  }


  /*
   * ==========================================================
   * SUPPRIMER FAMILLE
   * ==========================================================
   */

  async function handleDeleteFamille(
    famille
  ) {

    if (!famille?.id) {
      return;
    }

    const confirmed =
      window.confirm(
        `Supprimer la famille "${famille.nom}" ?`
      );

    if (!confirmed) {
      return;
    }

    try {

      setActionLoading(
        `famille-${famille.id}`
      );

      setError("");
      setSuccess("");

      await deleteFamille(
        famille.id
      );

      setFamilles(
        (current) =>
          current.filter(
            (item) =>
              Number(item.id) !==
              Number(
                famille.id
              )
          )
      );

      /*
       * Une catégorie liée à une famille supprimée
       * ne doit plus rester affichée localement.
       */

      setCategories(
        (current) =>
          current.filter(
            (category) =>
              Number(
                category?.famille_id
              ) !==
              Number(
                famille.id
              )
          )
      );

      if (
        editingFamille &&
        Number(
          editingFamille.id
        ) ===
        Number(
          famille.id
        )
      ) {
        cancelEditFamille();
      }

      setSuccess(
        "Famille supprimée avec succès."
      );

    } catch (err) {

      console.error(
        "Erreur suppression famille :",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Impossible de supprimer la famille."
        )
      );

    } finally {

      setActionLoading(
        null
      );

    }
  }


  /*
   * ==========================================================
   * CRÉER / MODIFIER CATÉGORIE
   * ==========================================================
   */

  async function submitCategorie(
    event
  ) {

    event.preventDefault();

    const nom =
      String(
        categorieForm.nom || ""
      ).trim();

    const description =
      String(
        categorieForm.description || ""
      ).trim();

    const familleId =
      Number(
        categorieForm.famille_id
      );

    if (!nom) {
      setError(
        "Le nom de la catégorie est obligatoire."
      );

      return;
    }

    if (
      !Number.isInteger(
        familleId
      ) ||
      familleId <= 0
    ) {
      setError(
        "Veuillez sélectionner une famille valide."
      );

      return;
    }

    try {

      setSubmitting(true);
      setError("");
      setSuccess("");

      const payload = {
        nom,
        description,
        famille_id:
          familleId,
      };


      if (editingCategorie) {

        const updated =
          await updateCategorie(
            editingCategorie.id,
            payload
          );

        setCategories(
          (current) =>
            current.map(
              (item) =>
                Number(item.id) ===
                Number(
                  editingCategorie.id
                )
                  ? updated
                  : item
            )
        );

        setEditingCategorie(
          null
        );

        setSuccess(
          "Catégorie modifiée avec succès."
        );

      } else {

        const created =
          await createCategorie(
            payload
          );

        setCategories(
          (current) => [
            ...current,
            created,
          ]
        );

        setSuccess(
          "Catégorie créée avec succès."
        );
      }

      setCategorieForm({
        nom: "",
        description: "",
        famille_id: "",
      });

    } catch (err) {

      console.error(
        "Erreur catégorie :",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Impossible d'enregistrer la catégorie."
        )
      );

    } finally {

      setSubmitting(false);

    }
  }


  /*
   * ==========================================================
   * MODIFIER CATÉGORIE
   * ==========================================================
   */

  function startEditCategorie(
    categorie
  ) {

    if (!categorie) {
      return;
    }

    setEditingCategorie(
      categorie
    );

    setCategorieForm({
      nom:
        categorie.nom ||
        "",
      description:
        categorie.description ||
        "",
      famille_id:
        String(
          categorie.famille_id ??
          ""
        ),
    });

    setSection(
      SECTIONS.CATALOG
    );
  }


  /*
   * ==========================================================
   * ANNULER MODIFICATION CATÉGORIE
   * ==========================================================
   */

  function cancelEditCategorie() {

    setEditingCategorie(
      null
    );

    setCategorieForm({
      nom: "",
      description: "",
      famille_id: "",
    });
  }


  /*
   * ==========================================================
   * SUPPRIMER CATÉGORIE
   * ==========================================================
   */

  async function handleDeleteCategorie(
    categorie
  ) {

    if (!categorie?.id) {
      return;
    }

    const confirmed =
      window.confirm(
        `Supprimer la catégorie "${categorie.nom}" ?`
      );

    if (!confirmed) {
      return;
    }

    try {

      setActionLoading(
        `categorie-${categorie.id}`
      );

      setError("");
      setSuccess("");

      await deleteCategorie(
        categorie.id
      );

      setCategories(
        (current) =>
          current.filter(
            (item) =>
              Number(item.id) !==
              Number(
                categorie.id
              )
          )
      );

      if (
        editingCategorie &&
        Number(
          editingCategorie.id
        ) ===
        Number(
          categorie.id
        )
      ) {
        cancelEditCategorie();
      }

      setSuccess(
        "Catégorie supprimée avec succès."
      );

    } catch (err) {

      console.error(
        "Erreur suppression catégorie :",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Impossible de supprimer la catégorie."
        )
      );

    } finally {

      setActionLoading(
        null
      );

    }
  }


  /*
   * ==========================================================
   * CRÉER MODÉRATEUR
   * ==========================================================
   */

  async function submitModerator(
    event
  ) {

    event.preventDefault();

    const nom =
      String(
        moderatorForm.nom || ""
      ).trim();

    const telephone =
      String(
        moderatorForm.telephone || ""
      ).trim();

    const email =
      String(
        moderatorForm.email || ""
      ).trim();

    const motDePasse =
      String(
        moderatorForm.mot_de_passe || ""
      );

    if (!nom) {
      setError(
        "Le nom du modérateur est obligatoire."
      );

      return;
    }

    if (
      telephone.length < 8
    ) {
      setError(
        "Le numéro de téléphone du modérateur est invalide."
      );

      return;
    }

    if (
      motDePasse.length < 8
    ) {
      setError(
        "Le mot de passe doit contenir au moins 8 caractères."
      );

      return;
    }

    try {

      setSubmitting(true);
      setError("");
      setSuccess("");

      const payload = {
        nom,
        telephone,
        email: email || null,
        mot_de_passe:
          motDePasse,
      };

      const created =
        await createModerateur(
          payload
        );

      setModerateurs(
        (current) => [
          ...current,
          created,
        ]
      );

      setModeratorForm({
        nom: "",
        telephone: "",
        email: "",
        mot_de_passe: "",
      });

      setSuccess(
        "Compte modérateur créé avec succès."
      );

    } catch (err) {

      console.error(
        "Erreur création modérateur :",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Impossible de créer le modérateur."
        )
      );

    } finally {

      setSubmitting(false);

    }
  }


  /*
   * ==========================================================
   * STATUT MODÉRATEUR
   * ==========================================================
   */

  async function changeModeratorStatus(
    moderator,
    status
  ) {

    if (!moderator?.id) {
      return;
    }

    const normalizedStatus =
      normalizeStatus(
        status
      );

    if (
      ![
        "actif",
        "suspendu",
      ].includes(
        normalizedStatus
      )
    ) {
      return;
    }

    try {

      setActionLoading(
        `moderator-${moderator.id}`
      );

      setError("");
      setSuccess("");

      const updated =
        await updateModerateurStatus(
          moderator.id,
          normalizedStatus
        );

      setModerateurs(
        (current) =>
          current.map(
            (item) =>
              Number(item.id) ===
              Number(
                moderator.id
              )
                ? {
                    ...item,
                    ...updated,
                    statut_compte:
                      updated?.statut_compte ||
                      normalizedStatus,
                  }
                : item
          )
      );

      setSuccess(
        `Le statut de ${moderator.nom || "ce modérateur"} a été modifié.`
      );

    } catch (err) {

      console.error(
        "Erreur statut modérateur :",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Impossible de modifier le statut."
        )
      );

    } finally {

      setActionLoading(
        null
      );

    }
  }


  /*
   * ==========================================================
   * SUPPRIMER MODÉRATEUR
   * ==========================================================
   */

  async function handleDeleteModerator(
    moderator
  ) {

    if (!moderator?.id) {
      return;
    }

    const confirmed =
      window.confirm(
        `Supprimer le modérateur "${moderator.nom || "Utilisateur"}" ?`
      );

    if (!confirmed) {
      return;
    }

    try {

      setActionLoading(
        `delete-moderator-${moderator.id}`
      );

      setError("");
      setSuccess("");

      await deleteModerateur(
        moderator.id
      );

      setModerateurs(
        (current) =>
          current.filter(
            (item) =>
              Number(item.id) !==
              Number(
                moderator.id
              )
          )
      );

      setSuccess(
        "Modérateur supprimé avec succès."
      );

    } catch (err) {

      console.error(
        "Erreur suppression modérateur :",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Impossible de supprimer le modérateur."
        )
      );

    } finally {

      setActionLoading(
        null
      );

    }
  }


  /*
   * ==========================================================
   * TRAITER DEMANDE VENDEUR
   * ==========================================================
   */

  async function handleSellerRequest(
    demande,
    action
  ) {

    if (!demande?.id) {
      return;
    }

    if (
      normalizeStatus(
        demande.statut
      ) !==
      "en_attente"
    ) {
      return;
    }

    let motif = "";

    if (
      action ===
      "refuser"
    ) {

      motif =
        window.prompt(
          "Motif du refus :"
        ) ||
        "";

      motif =
        motif.trim();

      if (!motif) {
        return;
      }
    }

    const confirmed =
      window.confirm(
        action ===
        "accepter"
          ? "Confirmer l'acceptation de cette demande ?"
          : "Confirmer le refus de cette demande ?"
      );

    if (!confirmed) {
      return;
    }

    try {

      setActionLoading(
        `request-${demande.id}`
      );

      setError("");
      setSuccess("");

      const response =
        action ===
        "accepter"
          ? await accepterDemandeVendeur(
              demande.id,
              motif
            )
          : await refuserDemandeVendeur(
              demande.id,
              motif
            );

      const nextStatus =
        action ===
        "accepter"
          ? "acceptee"
          : "refusee";

      setDemandes(
        (current) =>
          current.map(
            (item) =>
              Number(item.id) ===
              Number(
                demande.id
              )
                ? {
                    ...item,
                    ...(response || {}),
                    statut:
                      response?.statut ||
                      nextStatus,
                  }
                : item
          )
      );

      setSuccess(
        action ===
        "accepter"
          ? "Demande vendeur acceptée."
          : "Demande vendeur refusée."
      );

      /*
       * Actualisation des statistiques uniquement.
       */

      try {

        const refreshedStats =
          await getAdminStatistiques();

        setStats(
          refreshedStats
        );

      } catch (statsError) {

        console.warn(
          "Impossible d'actualiser les statistiques :",
          statsError
        );

      }

    } catch (err) {

      console.error(
        "Erreur traitement demande vendeur :",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Impossible de traiter la demande."
        )
      );

    } finally {

      setActionLoading(
        null
      );

    }
  }


  /*
   * ==========================================================
   * TRAITER ANNONCE
   * ==========================================================
   */

  async function handleAnnonceAction(
    annonce,
    action
  ) {

    if (!annonce?.id) {
      return;
    }

    let motif = "";

    if (
      action ===
      "refuser"
    ) {

      motif =
        window.prompt(
          "Motif du refus de l'annonce :"
        ) ||
        "";

      motif =
        motif.trim();

      if (!motif) {
        return;
      }
    }

    const confirmed =
      window.confirm(
        action ===
        "approuver"
          ? "Approuver cette annonce ?"
          : "Refuser cette annonce ?"
      );

    if (!confirmed) {
      return;
    }

    try {

      setActionLoading(
        `annonce-${annonce.id}`
      );

      setError("");
      setSuccess("");

      if (
        action ===
        "approuver"
      ) {

        await approuverAnnonce(
          annonce.id
        );

      } else {

        await refuserAnnonce(
          annonce.id,
          motif
        );
      }

      setAnnonces(
        (current) =>
          current.filter(
            (item) =>
              Number(item.id) !==
              Number(
                annonce.id
              )
          )
      );

      try {

        const refreshedStats =
          await getAdminStatistiques();

        setStats(
          refreshedStats
        );

      } catch (statsError) {

        console.warn(
          "Impossible d'actualiser les statistiques :",
          statsError
        );

      }

      setSuccess(
        action ===
        "approuver"
          ? "Annonce approuvée avec succès."
          : "Annonce refusée avec succès."
      );

    } catch (err) {

      console.error(
        "Erreur traitement annonce :",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Impossible de traiter l'annonce."
        )
      );

    } finally {

      setActionLoading(
        null
      );

    }
  }


  /*
   * ==========================================================
   * CHARGEMENT
   * ==========================================================
   */

  if (loading) {

    return (
      <main className="admin-page">

        <div className="admin-loading">

          <div className="loading-spinner" />

          <h1>
            AgroMarket
          </h1>

          <p>
            Chargement de l'administration...
          </p>

        </div>

      </main>
    );
  }


  /*
   * ==========================================================
   * INTERFACE
   * ==========================================================
   */

  return (
    <main className="admin-page">

      {/* ======================================================
          SIDEBAR
      ======================================================= */}

      <aside className="admin-sidebar">

        <div className="admin-logo">

          <strong>
            AgroMarket
          </strong>

          <span>
            Administration
          </span>

        </div>


        <div className="admin-profile">

          <div className="admin-profile-avatar">

            {getUserName(
              admin
            )
              .charAt(0)
              .toUpperCase()}

          </div>

          <div>

            <strong>
              {
                getUserName(
                  admin
                )
              }
            </strong>

            <span>
              Administrateur
            </span>

          </div>

        </div>


        {/* ====================================================
            NAVIGATION ADMIN
        ===================================================== */}

        <nav className="admin-nav">

          <button
            type="button"
            className={
              section ===
              SECTIONS.OVERVIEW
                ? "active"
                : ""
            }
            onClick={() =>
              setSection(
                SECTIONS.OVERVIEW
              )
            }
          >
            <Icon
              name="dashboard"
              size={18}
            />

            Vue générale
          </button>


          <button
            type="button"
            className={
              section ===
              SECTIONS.REQUESTS
                ? "active"
                : ""
            }
            onClick={() =>
              setSection(
                SECTIONS.REQUESTS
              )
            }
          >
            <Icon
              name="requests"
              size={18}
            />

            Demandes vendeur

            {pendingRequests.length >
              0 && (
              <span className="admin-nav-counter">
                {
                  pendingRequests.length
                }
              </span>
            )}

          </button>


          <button
            type="button"
            className={
              section ===
              SECTIONS.CATALOG
                ? "active"
                : ""
            }
            onClick={() =>
              setSection(
                SECTIONS.CATALOG
              )
            }
          >
            <Icon
              name="catalog"
              size={18}
            />

            Catalogue
          </button>


          <button
            type="button"
            className={
              section ===
              SECTIONS.MODERATORS
                ? "active"
                : ""
            }
            onClick={() =>
              setSection(
                SECTIONS.MODERATORS
              )
            }
          >
            <Icon
              name="moderator"
              size={18}
            />

            Modérateurs
          </button>


          <button
            type="button"
            className={
              section ===
              SECTIONS.MODERATION
                ? "active"
                : ""
            }
            onClick={() =>
              setSection(
                SECTIONS.MODERATION
              )
            }
          >
            <Icon
              name="shield"
              size={18}
            />

            Modération

            {annonces.length >
              0 && (
              <span className="admin-nav-counter">
                {
                  annonces.length
                }
              </span>
            )}

          </button>


          <button
            type="button"
            onClick={() =>
              navigate(
                "/historique"
              )
            }
          >
            <Icon
              name="history"
              size={18}
            />

            Historique
          </button>


          <button
            type="button"
            onClick={() =>
              navigate(
                "/ai"
              )
            }
          >
            <Icon
              name="ai"
              size={18}
            />

            AI
          </button>


          <button
            type="button"
            onClick={() =>
              navigate(
                "/avis"
              )
            }
          >
            <Icon
              name="star"
              size={18}
            />

            Avis
          </button>

        </nav>


        {/* ====================================================
            BAS SIDEBAR
        ===================================================== */}

        <div className="admin-sidebar-bottom">

          <button
            type="button"
            onClick={() =>
              navigate(
                "/dashboard"
              )
            }
          >
            ← Retour au dashboard
          </button>

        </div>

      </aside>


      {/* ======================================================
          CONTENU
      ======================================================= */}

      <section className="admin-content">

        {/* ====================================================
            HEADER
        ===================================================== */}

        <header className="admin-header">

          <div>

            <span>
              CENTRE DE CONTRÔLE
            </span>

            <h1>
              Administration AgroMarket
            </h1>

            <p>
              Gérez la plateforme, son catalogue,
              ses vendeurs et son équipe de modération.
            </p>

          </div>


          <button
            type="button"
            className="admin-refresh-button"
            onClick={() =>
              loadAdmin()
            }
            disabled={
              refreshing
            }
          >

            <Icon
              name="refresh"
              size={17}
            />

            {refreshing
              ? "Actualisation..."
              : "Actualiser"}

          </button>

        </header>


        {/* ====================================================
            ALERTES
        ===================================================== */}

        {error && (
          <div className="admin-alert admin-alert-error">

            <strong>
              Erreur
            </strong>

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              aria-label="Fermer l'alerte"
            >
              ×
            </button>

          </div>
        )}


        {success && (
          <div className="admin-alert admin-alert-success">

            <strong>
              Succès
            </strong>

            <span>
              {success}
            </span>

            <button
              type="button"
              onClick={() =>
                setSuccess("")
              }
              aria-label="Fermer l'alerte"
            >
              ×
            </button>

          </div>
        )}


        {/* ====================================================
            VUE GÉNÉRALE
        ===================================================== */}

        {section ===
          SECTIONS.OVERVIEW && (

          <section className="admin-section">

            <div className="admin-section-heading">

              <div>

                <span>
                  TABLEAU DE BORD
                </span>

                <h2>
                  Vue générale
                </h2>

              </div>

            </div>


            <div className="admin-kpi-grid">

              <StatCard
                icon="users"
                label="Utilisateurs"
                value={
                  stats
                    ?.utilisateurs
                    ?.total
                }
                description="Total des comptes"
              />

              <StatCard
                icon="users"
                label="Acheteurs"
                value={
                  stats
                    ?.utilisateurs
                    ?.acheteurs
                }
                description="Comptes acheteurs"
              />

              <StatCard
                icon="catalog"
                label="Vendeurs"
                value={
                  stats
                    ?.utilisateurs
                    ?.vendeurs
                }
                description="Comptes vendeurs"
              />

              <StatCard
                icon="moderator"
                label="Modérateurs"
                value={
                  stats
                    ?.utilisateurs
                    ?.moderateurs
                }
                description="Équipe de contrôle"
              />

            </div>


            <div className="admin-dashboard-grid">

              {/* CATALOGUE */}

              <article className="admin-panel">

                <div className="admin-panel-header">

                  <div>

                    <span>
                      CATALOGUE
                    </span>

                    <h3>
                      Structure commerciale
                    </h3>

                  </div>

                  <Icon
                    name="catalog"
                    size={20}
                  />

                </div>


                <div className="admin-metrics-grid">

                  <div>
                    <span>
                      Familles
                    </span>

                    <strong>
                      {
                        formatNumber(
                          stats
                            ?.catalogue
                            ?.familles
                        )
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Catégories
                    </span>

                    <strong>
                      {
                        formatNumber(
                          stats
                            ?.catalogue
                            ?.categories
                        )
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Produits
                    </span>

                    <strong>
                      {
                        formatNumber(
                          stats
                            ?.catalogue
                            ?.produits
                        )
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Transformés
                    </span>

                    <strong>
                      {
                        formatNumber(
                          stats
                            ?.catalogue
                            ?.produits_transformes
                        )
                      }
                    </strong>
                  </div>

                </div>

              </article>


              {/* ANNONCES */}

              <article className="admin-panel">

                <div className="admin-panel-header">

                  <div>

                    <span>
                      ANNONCES
                    </span>

                    <h3>
                      État de la marketplace
                    </h3>

                  </div>

                  <Icon
                    name="package"
                    size={20}
                  />

                </div>


                <div className="admin-metrics-grid">

                  <div>
                    <span>
                      Total
                    </span>

                    <strong>
                      {
                        formatNumber(
                          stats
                            ?.annonces
                            ?.total
                        )
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Publiées
                    </span>

                    <strong>
                      {
                        formatNumber(
                          stats
                            ?.annonces
                            ?.publiees
                        )
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      En attente
                    </span>

                    <strong>
                      {
                        formatNumber(
                          stats
                            ?.annonces
                            ?.en_attente
                        )
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Refusées
                    </span>

                    <strong>
                      {
                        formatNumber(
                          stats
                            ?.annonces
                            ?.refusees
                        )
                      }
                    </strong>
                  </div>

                </div>

              </article>


              {/* COMMANDES */}

              <article className="admin-panel">

                <div className="admin-panel-header">

                  <div>

                    <span>
                      COMMANDES
                    </span>

                    <h3>
                      Activité commerciale
                    </h3>

                  </div>

                </div>


                <div className="admin-financial-total">

                  <span>
                    Chiffre total
                  </span>

                  <strong>
                    {
                      formatMoney(
                        stats
                          ?.commandes
                          ?.chiffre_total
                      )
                    }
                  </strong>

                </div>


                <div className="admin-metrics-grid">

                  <div>
                    <span>
                      Total
                    </span>

                    <strong>
                      {
                        formatNumber(
                          stats
                            ?.commandes
                            ?.total
                        )
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      En attente
                    </span>

                    <strong>
                      {
                        formatNumber(
                          stats
                            ?.commandes
                            ?.en_attente
                        )
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Confirmées
                    </span>

                    <strong>
                      {
                        formatNumber(
                          stats
                            ?.commandes
                            ?.confirmees
                        )
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Livrées
                    </span>

                    <strong>
                      {
                        formatNumber(
                          stats
                            ?.commandes
                            ?.livrees
                        )
                      }
                    </strong>
                  </div>

                </div>

              </article>


              {/* MODÉRATION */}

              <article className="admin-panel">

                <div className="admin-panel-header">

                  <div>

                    <span>
                      MODÉRATION
                    </span>

                    <h3>
                      Activité de contrôle
                    </h3>

                  </div>

                  <Icon
                    name="shield"
                    size={20}
                  />

                </div>


                <div className="admin-metrics-grid">

                  <div>
                    <span>
                      Actions
                    </span>

                    <strong>
                      {
                        formatNumber(
                          stats
                            ?.moderation
                            ?.total_actions
                        )
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Soumissions
                    </span>

                    <strong>
                      {
                        formatNumber(
                          stats
                            ?.moderation
                            ?.soumissions
                        )
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Approbations
                    </span>

                    <strong>
                      {
                        formatNumber(
                          stats
                            ?.moderation
                            ?.approbations
                        )
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Refus
                    </span>

                    <strong>
                      {
                        formatNumber(
                          stats
                            ?.moderation
                            ?.refus
                        )
                      }
                    </strong>
                  </div>

                </div>

              </article>

            </div>


            {/* OUTILS */}

            <article className="admin-panel admin-priority-panel">

              <div>

                <span>
                  OUTILS DE LA PLATEFORME
                </span>

                <h3>
                  Accès rapides
                </h3>

                <p>
                  Accédez aux fonctionnalités avancées
                  de gestion et de suivi d'AgroMarket.
                </p>

              </div>


              <div className="admin-list-actions">

                <button
                  type="button"
                  className="admin-primary-button"
                  onClick={() =>
                    navigate(
                      "/historique"
                    )
                  }
                >

                  <Icon
                    name="history"
                    size={16}
                  />

                  Historique

                  <Icon
                    name="arrow"
                    size={16}
                  />

                </button>


                <button
                  type="button"
                  className="admin-primary-button"
                  onClick={() =>
                    navigate(
                      "/ai"
                    )
                  }
                >

                  <Icon
                    name="ai"
                    size={16}
                  />

                  AI

                  <Icon
                    name="arrow"
                    size={16}
                  />

                </button>


                <button
                  type="button"
                  className="admin-primary-button"
                  onClick={() =>
                    navigate(
                      "/avis"
                    )
                  }
                >

                  <Icon
                    name="star"
                    size={16}
                  />

                  Avis

                  <Icon
                    name="arrow"
                    size={16}
                  />

                </button>

              </div>

            </article>


            {/* DEMANDES PRIORITAIRES */}

            <article className="admin-panel admin-priority-panel">

              <div>

                <span>
                  ACTION REQUISE
                </span>

                <h3>
                  Demandes vendeur en attente
                </h3>

                <p>
                  {
                    stats
                      ?.demandes_vendeur
                      ?.en_attente ??
                    pendingRequests.length
                  }{" "}
                  demande(s) attendent actuellement
                  une décision administrative.
                </p>

              </div>


              <button
                type="button"
                className="admin-primary-button"
                onClick={() =>
                  setSection(
                    SECTIONS.REQUESTS
                  )
                }
              >

                Examiner les demandes

                <Icon
                  name="arrow"
                  size={16}
                />

              </button>

            </article>

          </section>
        )}


        {/* ====================================================
            DEMANDES VENDEUR
        ===================================================== */}

        {section ===
          SECTIONS.REQUESTS && (

          <section className="admin-section">

            <div className="admin-section-heading">

              <div>

                <span>
                  VENDEURS
                </span>

                <h2>
                  Demandes vendeur
                </h2>

                <p>
                  Examinez et traitez les demandes
                  de passage au statut vendeur.
                </p>

              </div>

              <strong>
                {
                  pendingRequests.length
                }{" "}
                en attente
              </strong>

            </div>


            <div className="admin-tabs">

              {[
                [
                  REQUEST_FILTERS.ALL,
                  "Toutes",
                ],
                [
                  REQUEST_FILTERS.PENDING,
                  "En attente",
                ],
                [
                  REQUEST_FILTERS.ACCEPTED,
                  "Acceptées",
                ],
                [
                  REQUEST_FILTERS.REFUSED,
                  "Refusées",
                ],
              ].map(
                ([
                  value,
                  label,
                ]) => (

                  <button
                    key={
                      value
                    }
                    type="button"
                    className={
                      requestFilter ===
                      value
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setRequestFilter(
                        value
                      )
                    }
                  >
                    {label}
                  </button>

                )
              )}

            </div>


            <div className="admin-list">

              {displayedRequests.length ===
              0 ? (

                <div className="admin-empty">

                  <Icon
                    name="check"
                    size={28}
                  />

                  <h3>
                    Aucune demande
                  </h3>

                  <p>
                    Aucun élément ne correspond
                    au filtre sélectionné.
                  </p>

                </div>

              ) : (

                displayedRequests.map(
                  (demande) => {

                    const utilisateur =
                      demande?.utilisateur ||
                      {};

                    const status =
                      normalizeStatus(
                        demande?.statut
                      );

                    return (

                      <article
                        key={
                          demande.id
                        }
                        className="admin-list-card"
                      >

                        <div className="admin-list-avatar">

                          {(
                            utilisateur.nom ||
                            "U"
                          )
                            .charAt(0)
                            .toUpperCase()}

                        </div>


                        <div className="admin-list-main">

                          <div className="admin-list-heading">

                            <div>

                              <small>
                                Demande #
                                {
                                  demande.id
                                }
                              </small>

                              <h3>
                                {
                                  getUserName(
                                    utilisateur
                                  )
                                }
                              </h3>

                            </div>


                            <span
                              className={`admin-status ${status}`}
                            >
                              {
                                status ||
                                "inconnu"
                              }
                            </span>

                          </div>


                          <div className="admin-list-meta">

                            <span>
                              ID utilisateur :{" "}
                              {
                                demande.utilisateur_id ??
                                "—"
                              }
                            </span>

                            <span>
                              Demande :{" "}
                              {
                                formatDate(
                                  demande.date_demande
                                )
                              }
                            </span>

                            {demande.date_traitement && (
                              <span>
                                Traitée :{" "}
                                {
                                  formatDate(
                                    demande.date_traitement
                                  )
                                }
                              </span>
                            )}

                          </div>


                          {demande.motif && (
                            <p className="admin-list-message">
                              {
                                demande.motif
                              }
                            </p>
                          )}


                          {status ===
                            "en_attente" && (

                            <div className="admin-list-actions">

                              <button
                                type="button"
                                className="admin-success-button"
                                disabled={
                                  actionLoading ===
                                  `request-${demande.id}`
                                }
                                onClick={() =>
                                  handleSellerRequest(
                                    demande,
                                    "accepter"
                                  )
                                }
                              >

                                <Icon
                                  name="check"
                                  size={15}
                                />

                                Accepter

                              </button>


                              <button
                                type="button"
                                className="admin-danger-button"
                                disabled={
                                  actionLoading ===
                                  `request-${demande.id}`
                                }
                                onClick={() =>
                                  handleSellerRequest(
                                    demande,
                                    "refuser"
                                  )
                                }
                              >

                                <Icon
                                  name="close"
                                  size={15}
                                />

                                Refuser

                              </button>

                            </div>

                          )}

                        </div>

                      </article>

                    );
                  }
                )

              )}

            </div>

          </section>
        )}


        {/* ====================================================
            CATALOGUE
        ===================================================== */}

        {section ===
          SECTIONS.CATALOG && (

          <section className="admin-section">

            <div className="admin-section-heading">

              <div>

                <span>
                  CATALOGUE
                </span>

                <h2>
                  Gestion du catalogue
                </h2>

                <p>
                  Organisez le catalogue avec la
                  structure Famille → Catégorie → Produit.
                </p>

              </div>

            </div>


            <div className="admin-two-columns">

              {/* FAMILLE */}

              <article className="admin-panel">

                <div className="admin-panel-header">

                  <div>

                    <span>
                      FAMILLES
                    </span>

                    <h3>
                      {
                        editingFamille
                          ? "Modifier une famille"
                          : "Créer une famille"
                      }
                    </h3>

                  </div>

                  <Icon
                    name="folder"
                    size={20}
                  />

                </div>


                <form
                  className="admin-form"
                  onSubmit={
                    submitFamille
                  }
                >

                  <label>
                    Nom
                  </label>

                  <input
                    type="text"
                    value={
                      familleForm.nom
                    }
                    onChange={(
                      event
                    ) =>
                      setFamilleForm(
                        (current) => ({
                          ...current,
                          nom:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="Ex. Agriculture"
                    maxLength={100}
                    required
                  />


                  <label>
                    Description
                  </label>

                  <textarea
                    value={
                      familleForm.description
                    }
                    onChange={(
                      event
                    ) =>
                      setFamilleForm(
                        (current) => ({
                          ...current,
                          description:
                            event.target.value,
                        })
                      )
                    }
                    rows={4}
                    maxLength={1000}
                    placeholder="Description de la famille..."
                  />


                  <div className="admin-form-actions">

                    {editingFamille && (

                      <button
                        type="button"
                        className="admin-secondary-button"
                        onClick={
                          cancelEditFamille
                        }
                      >
                        Annuler
                      </button>

                    )}


                    <button
                      type="submit"
                      className="admin-primary-button"
                      disabled={
                        submitting
                      }
                    >

                      <Icon
                        name={
                          editingFamille
                            ? "edit"
                            : "plus"
                        }
                        size={16}
                      />

                      {
                        editingFamille
                          ? "Enregistrer"
                          : "Créer la famille"
                      }

                    </button>

                  </div>

                </form>

              </article>


              {/* CATÉGORIE */}

              <article className="admin-panel">

                <div className="admin-panel-header">

                  <div>

                    <span>
                      CATÉGORIES
                    </span>

                    <h3>
                      {
                        editingCategorie
                          ? "Modifier une catégorie"
                          : "Créer une catégorie"
                      }
                    </h3>

                  </div>

                  <Icon
                    name="catalog"
                    size={20}
                  />

                </div>


                <form
                  className="admin-form"
                  onSubmit={
                    submitCategorie
                  }
                >

                  <label>
                    Famille
                  </label>

                  <select
                    value={
                      categorieForm.famille_id
                    }
                    onChange={(
                      event
                    ) =>
                      setCategorieForm(
                        (current) => ({
                          ...current,
                          famille_id:
                            event.target.value,
                        })
                      )
                    }
                    required
                  >

                    <option value="">
                      Sélectionner une famille
                    </option>

                    {familles.map(
                      (famille) => (

                        <option
                          key={
                            famille.id
                          }
                          value={
                            famille.id
                          }
                        >
                          {
                            famille.nom
                          }
                        </option>

                      )
                    )}

                  </select>


                  <label>
                    Nom
                  </label>

                  <input
                    type="text"
                    value={
                      categorieForm.nom
                    }
                    onChange={(
                      event
                    ) =>
                      setCategorieForm(
                        (current) => ({
                          ...current,
                          nom:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="Ex. Céréales"
                    maxLength={100}
                    required
                  />


                  <label>
                    Description
                  </label>

                  <textarea
                    value={
                      categorieForm.description
                    }
                    onChange={(
                      event
                    ) =>
                      setCategorieForm(
                        (current) => ({
                          ...current,
                          description:
                            event.target.value,
                        })
                      )
                    }
                    rows={3}
                    maxLength={1000}
                    placeholder="Description..."
                  />


                  <div className="admin-form-actions">

                    {editingCategorie && (

                      <button
                        type="button"
                        className="admin-secondary-button"
                        onClick={
                          cancelEditCategorie
                        }
                      >
                        Annuler
                      </button>

                    )}


                    <button
                      type="submit"
                      className="admin-primary-button"
                      disabled={
                        submitting
                      }
                    >

                      <Icon
                        name={
                          editingCategorie
                            ? "edit"
                            : "plus"
                        }
                        size={16}
                      />

                      {
                        editingCategorie
                          ? "Enregistrer"
                          : "Créer la catégorie"
                      }

                    </button>

                  </div>

                </form>

              </article>

            </div>


            {/* LISTE FAMILLES */}

            <article className="admin-panel">

              <div className="admin-panel-header">

                <div>

                  <span>
                    ARBORESCENCE
                  </span>

                  <h3>
                    Familles du catalogue
                  </h3>

                </div>

                <strong>
                  {
                    familles.length
                  }
                </strong>

              </div>


              <div className="admin-catalog-list">

                {familles.map(
                  (famille) => {

                    const familleCategories =
                      categories.filter(
                        (categorie) =>
                          Number(
                            categorie?.famille_id
                          ) ===
                          Number(
                            famille?.id
                          )
                      );

                    return (

                      <div
                        key={
                          famille.id
                        }
                        className="admin-catalog-row"
                      >

                        <div className="admin-catalog-main">

                          <div className="admin-catalog-icon">

                            <Icon
                              name="folder"
                              size={18}
                            />

                          </div>


                          <div>

                            <strong>
                              {
                                famille.nom
                              }
                            </strong>

                            <span>
                              {
                                familleCategories.length
                              }{" "}
                              catégorie
                              {familleCategories.length >
                              1
                                ? "s"
                                : ""}
                            </span>

                            {famille.description && (
                              <p>
                                {
                                  famille.description
                                }
                              </p>
                            )}

                          </div>

                        </div>


                        <div className="admin-row-actions">

                          <button
                            type="button"
                            aria-label={`Modifier ${famille.nom}`}
                            onClick={() =>
                              startEditFamille(
                                famille
                              )
                            }
                          >

                            <Icon
                              name="edit"
                              size={15}
                            />

                          </button>


                          <button
                            type="button"
                            className="danger"
                            aria-label={`Supprimer ${famille.nom}`}
                            disabled={
                              actionLoading ===
                              `famille-${famille.id}`
                            }
                            onClick={() =>
                              handleDeleteFamille(
                                famille
                              )
                            }
                          >

                            <Icon
                              name="trash"
                              size={15}
                            />

                          </button>

                        </div>

                      </div>

                    );
                  }
                )}


                {familles.length ===
                  0 && (

                  <div className="admin-empty-inline">
                    Aucune famille enregistrée.
                  </div>

                )}

              </div>

            </article>


            {/* LISTE CATÉGORIES */}

            <article className="admin-panel">

              <div className="admin-panel-header">

                <div>

                  <span>
                    CATÉGORIES
                  </span>

                  <h3>
                    Catégories du catalogue
                  </h3>

                </div>

                <strong>
                  {
                    categories.length
                  }
                </strong>

              </div>


              <div className="admin-catalog-list">

                {categories.map(
                  (categorie) => (

                    <div
                      key={
                        categorie.id
                      }
                      className="admin-catalog-row"
                    >

                      <div className="admin-catalog-main">

                        <div className="admin-catalog-icon">

                          <Icon
                            name="catalog"
                            size={18}
                          />

                        </div>


                        <div>

                          <strong>
                            {
                              categorie.nom
                            }
                          </strong>

                          <span>
                            {
                              getFamilleName(
                                categorie.famille_id
                              )
                            }
                          </span>

                          {categorie.description && (
                            <p>
                              {
                                categorie.description
                              }
                            </p>
                          )}

                        </div>

                      </div>


                      <div className="admin-row-actions">

                        <button
                          type="button"
                          aria-label={`Modifier ${categorie.nom}`}
                          onClick={() =>
                            startEditCategorie(
                              categorie
                            )
                          }
                        >

                          <Icon
                            name="edit"
                            size={15}
                          />

                        </button>


                        <button
                          type="button"
                          className="danger"
                          aria-label={`Supprimer ${categorie.nom}`}
                          disabled={
                            actionLoading ===
                            `categorie-${categorie.id}`
                          }
                          onClick={() =>
                            handleDeleteCategorie(
                              categorie
                            )
                          }
                        >

                          <Icon
                            name="trash"
                            size={15}
                          />

                        </button>

                      </div>

                    </div>

                  )
                )}


                {categories.length ===
                  0 && (

                  <div className="admin-empty-inline">
                    Aucune catégorie enregistrée.
                  </div>

                )}

              </div>

            </article>

          </section>
        )}


        {/* ====================================================
            MODÉRATEURS
        ===================================================== */}

        {section ===
          SECTIONS.MODERATORS && (

          <section className="admin-section">

            <div className="admin-section-heading">

              <div>

                <span>
                  ÉQUIPE
                </span>

                <h2>
                  Gestion des modérateurs
                </h2>

                <p>
                  Créez et administrez les comptes
                  responsables du contrôle des annonces.
                </p>

              </div>

            </div>


            <div className="admin-two-columns">

              {/* CRÉATION */}

              <article className="admin-panel">

                <div className="admin-panel-header">

                  <div>

                    <span>
                      NOUVEAU COMPTE
                    </span>

                    <h3>
                      Créer un modérateur
                    </h3>

                  </div>

                  <Icon
                    name="moderator"
                    size={20}
                  />

                </div>


                <form
                  className="admin-form"
                  onSubmit={
                    submitModerator
                  }
                >

                  <label>
                    Nom
                  </label>

                  <input
                    type="text"
                    value={
                      moderatorForm.nom
                    }
                    onChange={(
                      event
                    ) =>
                      setModeratorForm(
                        (current) => ({
                          ...current,
                          nom:
                            event.target.value,
                        })
                      )
                    }
                    maxLength={150}
                    required
                  />


                  <label>
                    Téléphone
                  </label>

                  <input
                    type="tel"
                    value={
                      moderatorForm.telephone
                    }
                    onChange={(
                      event
                    ) =>
                      setModeratorForm(
                        (current) => ({
                          ...current,
                          telephone:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="+226..."
                    minLength={8}
                    maxLength={30}
                    required
                  />


                  <label>
                    Email
                  </label>

                  <input
                    type="email"
                    value={
                      moderatorForm.email
                    }
                    onChange={(
                      event
                    ) =>
                      setModeratorForm(
                        (current) => ({
                          ...current,
                          email:
                            event.target.value,
                        })
                      )
                    }
                    maxLength={255}
                  />


                  <label>
                    Mot de passe
                  </label>

                  <input
                    type="password"
                    value={
                      moderatorForm.mot_de_passe
                    }
                    onChange={(
                      event
                    ) =>
                      setModeratorForm(
                        (current) => ({
                          ...current,
                          mot_de_passe:
                            event.target.value,
                        })
                      )
                    }
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                  />


                  <button
                    type="submit"
                    className="admin-primary-button"
                    disabled={
                      submitting
                    }
                  >

                    <Icon
                      name="plus"
                      size={16}
                    />

                    {
                      submitting
                        ? "Création..."
                        : "Créer le modérateur"
                    }

                  </button>

                </form>

              </article>


              {/* LISTE */}

              <article className="admin-panel">

                <div className="admin-panel-header">

                  <div>

                    <span>
                      ÉQUIPE ACTUELLE
                    </span>

                    <h3>
                      Modérateurs
                    </h3>

                  </div>

                  <strong>
                    {
                      moderateurs.length
                    }
                  </strong>

                </div>


                <div className="admin-moderators-list">

                  {moderateurs.map(
                    (moderator) => {

                      const status =
                        normalizeStatus(
                          moderator?.statut_compte
                        ) ||
                        "actif";

                      return (

                        <div
                          key={
                            moderator.id
                          }
                          className="admin-moderator-row"
                        >

                          <div className="admin-list-avatar">

                            {(
                              moderator.nom ||
                              "M"
                            )
                              .charAt(0)
                              .toUpperCase()}

                          </div>


                          <div className="admin-moderator-content">

                            <strong>
                              {
                                moderator.nom ||
                                "Modérateur"
                              }
                            </strong>

                            <span>
                              {
                                moderator.telephone ||
                                "Téléphone non renseigné"
                              }
                            </span>

                            {moderator.email && (
                              <span>
                                {
                                  moderator.email
                                }
                              </span>
                            )}

                            <small
                              className={`admin-status ${status}`}
                            >
                              {
                                status
                              }
                            </small>

                          </div>


                          <div className="admin-row-actions">

                            {status !==
                              "actif" && (

                              <button
                                type="button"
                                disabled={
                                  actionLoading ===
                                  `moderator-${moderator.id}`
                                }
                                onClick={() =>
                                  changeModeratorStatus(
                                    moderator,
                                    "actif"
                                  )
                                }
                              >
                                Activer
                              </button>

                            )}


                            {status ===
                              "actif" && (

                              <button
                                type="button"
                                disabled={
                                  actionLoading ===
                                  `moderator-${moderator.id}`
                                }
                                onClick={() =>
                                  changeModeratorStatus(
                                    moderator,
                                    "suspendu"
                                  )
                                }
                              >
                                Suspendre
                              </button>

                            )}


                            <button
                              type="button"
                              className="danger"
                              aria-label={`Supprimer ${moderator.nom || "le modérateur"}`}
                              disabled={
                                actionLoading ===
                                `delete-moderator-${moderator.id}`
                              }
                              onClick={() =>
                                handleDeleteModerator(
                                  moderator
                                )
                              }
                            >

                              <Icon
                                name="trash"
                                size={15}
                              />

                            </button>

                          </div>

                        </div>

                      );
                    }
                  )}


                  {moderateurs.length ===
                    0 && (

                    <div className="admin-empty-inline">
                      Aucun modérateur actuellement.
                    </div>

                  )}

                </div>

              </article>

            </div>

          </section>
        )}


        {/* ====================================================
            MODÉRATION
        ===================================================== */}

        {section ===
          SECTIONS.MODERATION && (

          <section className="admin-section">

            <div className="admin-section-heading">

              <div>

                <span>
                  CONTRÔLE DES ANNONCES
                </span>

                <h2>
                  Annonces en attente
                </h2>

                <p>
                  Vérifiez les annonces avant leur
                  publication sur la marketplace.
                </p>

              </div>

              <strong>
                {
                  annonces.length
                }{" "}
                en attente
              </strong>

            </div>


            <div className="admin-list">

              {annonces.length ===
              0 ? (

                <div className="admin-empty">

                  <Icon
                    name="check"
                    size={30}
                  />

                  <h3>
                    Aucune annonce à modérer
                  </h3>

                  <p>
                    Toutes les annonces en attente
                    ont été traitées.
                  </p>

                </div>

              ) : (

                annonces.map(
                  (annonce) => (

                    <article
                      key={
                        annonce.id
                      }
                      className="admin-list-card"
                    >

                      <div className="admin-moderation-symbol">

                        <Icon
                          name="package"
                          size={24}
                        />

                      </div>


                      <div className="admin-list-main">

                        <div className="admin-list-heading">

                          <div>

                            <small>
                              Annonce #
                              {
                                annonce.id
                              }
                            </small>

                            <h3>
                              {
                                annonce
                                  ?.produit
                                  ?.nom ||
                                annonce
                                  ?.produit_nom ||
                                `Produit #${
                                  annonce.produit_id ||
                                  ""
                                }`
                              }
                            </h3>

                          </div>

                          <span className="admin-status en_attente">
                            En attente
                          </span>

                        </div>


                        <div className="admin-moderation-info">

                          <div>

                            <span>
                              Prix
                            </span>

                            <strong>
                              {
                                formatMoney(
                                  annonce.prix
                                )
                              }
                            </strong>

                          </div>


                          <div>

                            <span>
                              Quantité
                            </span>

                            <strong>
                              {
                                formatNumber(
                                  annonce.quantite
                                )
                              }{" "}
                              {
                                annonce.unite ||
                                ""
                              }
                            </strong>

                          </div>


                          <div>

                            <span>
                              Région
                            </span>

                            <strong>
                              {
                                annonce.region ||
                                "—"
                              }
                            </strong>

                          </div>


                          <div>

                            <span>
                              Commune
                            </span>

                            <strong>
                              {
                                annonce.commune ||
                                "—"
                              }
                            </strong>

                          </div>

                        </div>


                        <div className="admin-list-actions">

                          <button
                            type="button"
                            className="admin-success-button"
                            disabled={
                              actionLoading ===
                              `annonce-${annonce.id}`
                            }
                            onClick={() =>
                              handleAnnonceAction(
                                annonce,
                                "approuver"
                              )
                            }
                          >

                            <Icon
                              name="check"
                              size={15}
                            />

                            Approuver

                          </button>


                          <button
                            type="button"
                            className="admin-danger-button"
                            disabled={
                              actionLoading ===
                              `annonce-${annonce.id}`
                            }
                            onClick={() =>
                              handleAnnonceAction(
                                annonce,
                                "refuser"
                              )
                            }
                          >

                            <Icon
                              name="close"
                              size={15}
                            />

                            Refuser

                          </button>

                        </div>

                      </div>

                    </article>

                  )
                )

              )}

            </div>

          </section>
        )}

      </section>

    </main>
  );
}


export default AdminDashboard;