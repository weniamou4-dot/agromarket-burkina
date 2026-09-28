// src/pages/Products.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import "../styles/pages/products.css";

import { getFamilles } from "../services/api/familles";
import { getCategories } from "../services/api/categories";
import {
  executeSearch,
  fetchSuggestions,
} from "../services/api/search";

import { getImageUrl } from "../utils/media";
import { useDebounce } from "../hooks/useDebounce";

/* ============================================================
   CONSTANTES
============================================================ */

const PAGE_LIMIT = 20;

const SLIDES = [
  {
    id: "agriculture",
    title: "Produits agricoles",
    subtitle:
      "Découvrez les produits agricoles disponibles auprès des vendeurs du Burkina Faso.",
    image: "/images/home/mais.jpg",
    label: "Agriculture",
  },
  {
    id: "cereales",
    title: "Céréales et produits vivriers",
    subtitle:
      "Riz, maïs et autres produits vivriers proposés par les producteurs et vendeurs.",
    image: "/images/home/riz-cereales.jpg",
    label: "Céréales",
  },
  {
    id: "maraichage",
    title: "Maraîchage",
    subtitle:
      "Retrouvez les produits maraîchers disponibles dans différentes régions.",
    image: "/images/home/maraichage.jpg",
    label: "Maraîchage",
  },
  {
    id: "elevage",
    title: "Élevage",
    subtitle:
      "Animaux, produits d'élevage et offres proposées sur le marché burkinabè.",
    image: "/images/home/elevage.jpg",
    label: "Élevage",
  },
  {
    id: "intrants",
    title: "Intrants et matériel agricole",
    subtitle:
      "Semences, engrais, produits phytosanitaires et matériel pour accompagner les producteurs.",
    image: "/images/home/engrais.jpg",
    label: "Intrants",
  },
  {
    id: "marche",
    title: "Marché du Burkina Faso",
    subtitle:
      "Une plateforme pour découvrir les produits disponibles dans les différentes régions du Burkina Faso.",
    image: "/images/home/marche-agricole.jpg",
    label: "Marché du Burkina Faso",
  },
];

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
    "aria-hidden": true,
  };

  switch (name) {
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      );

    case "filter":
      return (
        <svg {...common}>
          <path d="M4 6h16" />
          <path d="M7 12h10" />
          <path d="M10 18h4" />
        </svg>
      );

    case "location":
      return (
        <svg {...common}>
          <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );

    case "package":
      return (
        <svg {...common}>
          <path d="m21 8-9-5-9 5 9 5 9-5Z" />
          <path d="M3 8v8l9 5 9-5V8" />
          <path d="M12 13v8" />
          <path d="m7.5 5.5 9 5" />
        </svg>
      );

    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 11a8.1 8.1 0 0 0-14.8-4L3 10" />
          <path d="M3 5v5h5" />
          <path d="M4 13a8.1 8.1 0 0 0 14.8 4L21 14" />
          <path d="M21 19v-5h-5" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

    case "chevron-left":
      return (
        <svg {...common}>
          <path d="m15 18-6-6 6-6" />
        </svg>
      );

    case "chevron-right":
      return (
        <svg {...common}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );

    case "chevron-down":
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
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
   HELPERS
============================================================ */

function normalizeCollection(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.items)) {
    return value.items;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  if (Array.isArray(value?.resultats)) {
    return value.resultats;
  }

  if (Array.isArray(value?.results)) {
    return value.results;
  }

  return [];
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "Prix non renseigné";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return `${value} FCFA`;
  }

  return `${new Intl.NumberFormat("fr-FR").format(number)} FCFA`;
}

function getProductName(annonce) {
  return (
    annonce?.produit?.nom ||
    annonce?.produit?.libelle ||
    annonce?.produit_nom ||
    annonce?.nom_produit ||
    annonce?.nom ||
    "Produit agricole"
  );
}

function getProductType(annonce) {
  return (
    annonce?.produit?.type_produit ||
    annonce?.type_produit ||
    ""
  );
}

function getTypeLabel(type) {
  const value = normalizeText(type);

  if (value === "brut") {
    return "Produit brut";
  }

  if (value === "transforme" || value === "transformé") {
    return "Produit transformé";
  }

  if (value === "intrant") {
    return "Intrant";
  }

  if (value === "materiel" || value === "matériel") {
    return "Matériel";
  }

  return type || "Produit";
}

function getSecteur(annonce) {
  return (
    annonce?.produit?.secteur ||
    annonce?.secteur ||
    ""
  );
}

function getSecteurLabel(secteur) {
  const value = normalizeText(secteur);

  if (value === "agricole" || value === "agriculture") {
    return "Agriculture";
  }

  if (value === "elevage" || value === "élevage") {
    return "Élevage";
  }

  if (value === "agroalimentaire") {
    return "Agroalimentaire";
  }

  return secteur || "Agriculture";
}

/*
 * IMPORTANT :
 * Les images du backend ressemblent à :
 *
 * /uploads/9617490a48f946468b9bc2461a97066a.jpg
 *
 * getImageUrl() transforme correctement ce chemin
 * en URL du backend FastAPI.
 */
function getAnnonceImage(annonce) {
  const images = Array.isArray(annonce?.images)
    ? annonce.images
    : [];

  if (images.length === 0) {
    return null;
  }

  const validImage = images.find((image) => {
    const path =
      image?.url ||
      image?.image_url ||
      image?.chemin ||
      image?.path;

    return Boolean(path);
  });

  if (!validImage) {
    return null;
  }

  const imagePath =
    validImage?.url ||
    validImage?.image_url ||
    validImage?.chemin ||
    validImage?.path ||
    null;

  return getImageUrl(imagePath);
}

function getSellerName(annonce) {
  return (
    annonce?.vendeur?.nom ||
    annonce?.vendeur?.username ||
    annonce?.vendeur?.prenom ||
    annonce?.vendeur_nom ||
    "Vendeur"
  );
}

function getLocation(annonce) {
  const parts = [
    annonce?.commune,
    annonce?.province,
    annonce?.region,
  ].filter(Boolean);

  if (parts.length === 0) {
    return "Burkina Faso";
  }

  return parts.join(" • ");
}

function getSuggestionLabel(suggestion) {
  if (typeof suggestion === "string") {
    return suggestion;
  }

  return (
    suggestion?.label ||
    suggestion?.nom ||
    suggestion?.name ||
    suggestion?.produit?.nom ||
    suggestion?.value ||
    ""
  );
}

function getSuggestionKey(suggestion, index) {
  if (typeof suggestion === "string") {
    return `${suggestion}-${index}`;
  }

  return (
    suggestion?.id ||
    suggestion?.produit_id ||
    suggestion?.value ||
    `${index}`
  );
}

function getFamilyId(item) {
  return (
    item?.id ??
    item?.famille_id ??
    item?.familleId ??
    ""
  );
}

function getFamilyName(item) {
  return (
    item?.nom ||
    item?.libelle ||
    item?.name ||
    item?.titre ||
    "Famille"
  );
}

function getCategoryId(item) {
  return (
    item?.id ??
    item?.categorie_id ??
    item?.categorieId ??
    ""
  );
}

function getCategoryName(item) {
  return (
    item?.nom ||
    item?.libelle ||
    item?.name ||
    item?.titre ||
    "Catégorie"
  );
}

/* ============================================================
   COMPOSANT
============================================================ */

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();

  /* ----------------------------------------------------------
     SLIDER
  ---------------------------------------------------------- */

  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % SLIDES.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  const goToPreviousSlide = () => {
    setActiveSlide((current) =>
      current === 0 ? SLIDES.length - 1 : current - 1
    );
  };

  const goToNextSlide = () => {
    setActiveSlide((current) => (current + 1) % SLIDES.length);
  };

  /* ----------------------------------------------------------
     FILTRES
  ---------------------------------------------------------- */

  const [search, setSearch] = useState(
    searchParams.get("q") || ""
  );

  const [familleId, setFamilleId] = useState(
    searchParams.get("famille_id") || ""
  );

  const [categorieId, setCategorieId] = useState(
    searchParams.get("categorie_id") || ""
  );

  const [typeProduit, setTypeProduit] = useState(
    searchParams.get("type_produit") || ""
  );

  const [region, setRegion] = useState(
    searchParams.get("region") || ""
  );

  const [province, setProvince] = useState(
    searchParams.get("province") || ""
  );

  const [commune, setCommune] = useState(
    searchParams.get("commune") || ""
  );

  const [prixMin, setPrixMin] = useState(
    searchParams.get("prix_min") || ""
  );

  const [prixMax, setPrixMax] = useState(
    searchParams.get("prix_max") || ""
  );

  const [page, setPage] = useState(
    Number(searchParams.get("page")) || 1
  );

  const debouncedSearch = useDebounce(search, 450);

  /* ----------------------------------------------------------
     DONNÉES
  ---------------------------------------------------------- */

  const [familles, setFamilles] = useState([]);
  const [categories, setCategories] = useState([]);

  const [annonces, setAnnonces] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    pages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [loadingFamilies, setLoadingFamilies] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [error, setError] = useState("");

  /* ----------------------------------------------------------
     SUGGESTIONS
  ---------------------------------------------------------- */

  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] =
    useState(false);
  const [showSuggestions, setShowSuggestions] =
    useState(false);

  /* ----------------------------------------------------------
     CHARGEMENT FAMILLES
  ---------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    async function loadFamilles() {
      try {
        setLoadingFamilies(true);

        const response = await getFamilles();

        if (!cancelled) {
          setFamilles(normalizeCollection(response));
        }
      } catch (err) {
        console.error(
          "Erreur lors du chargement des familles :",
          err
        );

        if (!cancelled) {
          setFamilles([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingFamilies(false);
        }
      }
    }

    loadFamilles();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ----------------------------------------------------------
     CHARGEMENT CATÉGORIES
  ---------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        setLoadingCategories(true);

        const response = await getCategories();

        if (!cancelled) {
          setCategories(normalizeCollection(response));
        }
      } catch (err) {
        console.error(
          "Erreur lors du chargement des catégories :",
          err
        );

        if (!cancelled) {
          setCategories([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingCategories(false);
        }
      }
    }

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ----------------------------------------------------------
     RECHERCHE
  ---------------------------------------------------------- */

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await executeSearch({
        produit: debouncedSearch.trim(),
        famille_id: familleId || "",
        categorie_id: categorieId || "",
        type_produit: typeProduit || "",
        region: region || "",
        province: province || "",
        commune: commune || "",
        prix_min: prixMin || "",
        prix_max: prixMax || "",
        page,
        limit: PAGE_LIMIT,
      });

      const results = normalizeCollection(
        response?.resultats
      );

      setAnnonces(results);

      const backendPagination =
        response?.pagination || {};

      const total =
        Number(
          backendPagination?.total ??
            backendPagination?.total_items ??
            backendPagination?.count ??
            results.length
        ) || 0;

      const currentPage =
        Number(
          backendPagination?.page ??
            backendPagination?.current_page ??
            page
        ) || page;

      const limit =
        Number(
          backendPagination?.limit ??
            backendPagination?.page_size ??
            PAGE_LIMIT
        ) || PAGE_LIMIT;

      const pages =
        Number(
          backendPagination?.pages ??
            backendPagination?.total_pages
        ) ||
        Math.max(1, Math.ceil(total / limit));

      setPagination({
        page: currentPage,
        limit,
        total,
        pages,
      });
    } catch (err) {
      console.error(
        "Erreur lors du chargement des produits :",
        err
      );

      setAnnonces([]);

      setError(
        err?.message ||
          "Impossible de charger les produits pour le moment."
      );
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearch,
    familleId,
    categorieId,
    typeProduit,
    region,
    province,
    commune,
    prixMin,
    prixMax,
    page,
  ]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  /* ----------------------------------------------------------
     URL
  ---------------------------------------------------------- */

  useEffect(() => {
    const params = new URLSearchParams();

    if (search.trim()) {
      params.set("q", search.trim());
    }

    if (familleId) {
      params.set("famille_id", familleId);
    }

    if (categorieId) {
      params.set("categorie_id", categorieId);
    }

    if (typeProduit) {
      params.set("type_produit", typeProduit);
    }

    if (region) {
      params.set("region", region);
    }

    if (province) {
      params.set("province", province);
    }

    if (commune) {
      params.set("commune", commune);
    }

    if (prixMin) {
      params.set("prix_min", prixMin);
    }

    if (prixMax) {
      params.set("prix_max", prixMax);
    }

    if (page > 1) {
      params.set("page", String(page));
    }

    setSearchParams(params, {
      replace: true,
    });
  }, [
    search,
    familleId,
    categorieId,
    typeProduit,
    region,
    province,
    commune,
    prixMin,
    prixMax,
    page,
    setSearchParams,
  ]);

  /* ----------------------------------------------------------
     SUGGESTIONS
  ---------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    async function loadSuggestions() {
      const query = search.trim();

      if (query.length < 2) {
        setSuggestions([]);
        setSuggestionsLoading(false);
        return;
      }

      try {
        setSuggestionsLoading(true);

        const response = await fetchSuggestions(query);

        if (!cancelled) {
          setSuggestions(
            normalizeCollection(response).slice(0, 8)
          );
        }
      } catch (err) {
        console.error(
          "Erreur suggestions :",
          err
        );

        if (!cancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setSuggestionsLoading(false);
        }
      }
    }

    loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, [search]);

  /* ----------------------------------------------------------
     CATÉGORIES FILTRÉES
  ---------------------------------------------------------- */

  const filteredCategories = useMemo(() => {
    if (!familleId) {
      return categories;
    }

    return categories.filter((category) => {
      const categoryFamilyId =
        category?.famille_id ??
        category?.familleId ??
        category?.famille?.id ??
        "";

      return String(categoryFamilyId) === String(familleId);
    });
  }, [categories, familleId]);

  /* ----------------------------------------------------------
     FILTRES
  ---------------------------------------------------------- */

  const resetFilters = () => {
    setSearch("");
    setFamilleId("");
    setCategorieId("");
    setTypeProduit("");
    setRegion("");
    setProvince("");
    setCommune("");
    setPrixMin("");
    setPrixMax("");
    setPage(1);
    setSuggestions([]);
  };

  const handleFamilyChange = (event) => {
    setFamilleId(event.target.value);
    setCategorieId("");
    setPage(1);
  };

  const handleFilterChange = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion) => {
    const label = getSuggestionLabel(suggestion);

    if (label) {
      setSearch(label);
      setPage(1);
    }

    setShowSuggestions(false);
  };

  /* ----------------------------------------------------------
     PAGINATION
  ---------------------------------------------------------- */

  const totalPages = Math.max(
    1,
    Number(pagination?.pages) || 1
  );

  const changePage = (nextPage) => {
    if (
      nextPage < 1 ||
      nextPage > totalPages ||
      nextPage === page
    ) {
      return;
    }

    setPage(nextPage);

    window.scrollTo({
      top: 420,
      behavior: "smooth",
    });
  };

  const paginationPages = useMemo(() => {
    const pages = [];

    if (totalPages <= 7) {
      for (let index = 1; index <= totalPages; index += 1) {
        pages.push(index);
      }

      return pages;
    }

    pages.push(1);

    if (page > 4) {
      pages.push("...");
    }

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    for (let index = start; index <= end; index += 1) {
      pages.push(index);
    }

    if (page < totalPages - 3) {
      pages.push("...");
    }

    pages.push(totalPages);

    return pages;
  }, [page, totalPages]);

  /* ----------------------------------------------------------
     STATISTIQUES
  ---------------------------------------------------------- */

  const activeFiltersCount = [
    familleId,
    categorieId,
    typeProduit,
    region,
    province,
    commune,
    prixMin,
    prixMax,
  ].filter(Boolean).length;

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <main className="products-page">
      {/* ======================================================
          HERO / SLIDER
      ====================================================== */}

      <section className="products-slider">
        <div className="products-slider-track">
          {SLIDES.map((slide, index) => (
            <article
              key={slide.id}
              className={`products-slide ${
                index === activeSlide
                  ? "is-active"
                  : ""
              }`}
              aria-hidden={index !== activeSlide}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="products-slide-image"
              />

              <div className="products-slide-overlay" />

              <div className="products-slide-content">
                <span className="products-slide-label">
                  {slide.label}
                </span>

                <h1>{slide.title}</h1>

                <p>{slide.subtitle}</p>

                <Link
                  to="#produits"
                  className="products-slide-button"
                >
                  Découvrir les produits
                  <Icon
                    name="arrow"
                    size={18}
                  />
                </Link>
              </div>
            </article>
          ))}
        </div>

        <button
          type="button"
          className="slider-control slider-control-prev"
          onClick={goToPreviousSlide}
          aria-label="Image précédente"
        >
          <Icon
            name="chevron-left"
            size={24}
          />
        </button>

        <button
          type="button"
          className="slider-control slider-control-next"
          onClick={goToNextSlide}
          aria-label="Image suivante"
        >
          <Icon
            name="chevron-right"
            size={24}
          />
        </button>

        <div className="products-slider-dots">
          {SLIDES.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={
                index === activeSlide
                  ? "is-active"
                  : ""
              }
              onClick={() => setActiveSlide(index)}
              aria-label={`Afficher ${slide.title}`}
              aria-current={
                index === activeSlide
                  ? "true"
                  : undefined
              }
            />
          ))}
        </div>

        <div className="products-slider-progress">
          <span
            style={{
              width: `${
                ((activeSlide + 1) /
                  SLIDES.length) *
                100
              }%`,
            }}
          />
        </div>
      </section>

      {/* ======================================================
          RECHERCHE
      ====================================================== */}

      <section className="products-search-section">
        <div className="products-search-container">
          <div className="products-search-heading">
            <span>AGROMARKET BURKINA</span>
            <h2>Trouvez vos produits agricoles</h2>
            <p>
              Recherchez des produits disponibles
              partout au Burkina Faso.
            </p>
          </div>

          <form
            className="products-search-bar"
            onSubmit={handleSearchSubmit}
          >
            <div className="search-input-wrapper">
              <Icon
                name="search"
                size={22}
              />

              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  if (search.trim().length >= 2) {
                    setShowSuggestions(true);
                  }
                }}
                placeholder="Rechercher du riz, maïs, bétail, légumes..."
                autoComplete="off"
                aria-label="Rechercher un produit"
              />

              {search && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => {
                    setSearch("");
                    setSuggestions([]);
                    setShowSuggestions(false);
                    setPage(1);
                  }}
                  aria-label="Effacer la recherche"
                >
                  <Icon
                    name="close"
                    size={18}
                  />
                </button>
              )}

              {showSuggestions &&
                search.trim().length >= 2 && (
                  <div className="search-suggestions">
                    {suggestionsLoading ? (
                      <div className="search-suggestion-loading">
                        Recherche...
                      </div>
                    ) : suggestions.length > 0 ? (
                      suggestions.map(
                        (suggestion, index) => {
                          const label =
                            getSuggestionLabel(
                              suggestion
                            );

                          if (!label) {
                            return null;
                          }

                          return (
                            <button
                              type="button"
                              className="search-suggestion"
                              key={getSuggestionKey(
                                suggestion,
                                index
                              )}
                              onClick={() =>
                                handleSuggestionClick(
                                  suggestion
                                )
                              }
                            >
                              <Icon
                                name="search"
                                size={17}
                              />
                              <span>{label}</span>
                            </button>
                          );
                        }
                      )
                    ) : (
                      <div className="search-suggestion-loading">
                        Aucun produit trouvé
                      </div>
                    )}
                  </div>
                )}
            </div>

            <button
              type="submit"
              className="search-button"
            >
              Rechercher
            </button>
          </form>
        </div>
      </section>

      {/* ======================================================
          CONTENU
      ====================================================== */}

      <section
        className="products-content"
        id="produits"
      >
        <div className="products-layout">
          {/* ==================================================
              SIDEBAR
          ================================================== */}

          <aside className="products-sidebar">
            <div className="filters-card">
              <div className="filters-header">
                <div>
                  <span className="filters-eyebrow">
                    RECHERCHE
                  </span>

                  <h2>
                    Filtres
                    {activeFiltersCount > 0 && (
                      <span className="filters-count">
                        {activeFiltersCount}
                      </span>
                    )}
                  </h2>
                </div>

                <Icon
                  name="filter"
                  size={22}
                />
              </div>

              {/* Famille */}
              <div className="filter-group">
                <label htmlFor="famille">
                  Famille de produits
                </label>

                <select
                  id="famille"
                  value={familleId}
                  onChange={handleFamilyChange}
                  disabled={loadingFamilies}
                >
                  <option value="">
                    Toutes les familles
                  </option>

                  {familles.map((famille) => (
                    <option
                      key={getFamilyId(famille)}
                      value={getFamilyId(famille)}
                    >
                      {getFamilyName(famille)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Catégorie */}
              <div className="filter-group">
                <label htmlFor="categorie">
                  Catégorie
                </label>

                <select
                  id="categorie"
                  value={categorieId}
                  onChange={handleFilterChange(
                    setCategorieId
                  )}
                  disabled={loadingCategories}
                >
                  <option value="">
                    Toutes les catégories
                  </option>

                  {filteredCategories.map(
                    (category) => (
                      <option
                        key={getCategoryId(category)}
                        value={getCategoryId(category)}
                      >
                        {getCategoryName(category)}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Type */}
              <div className="filter-group">
                <label htmlFor="typeProduit">
                  Type de produit
                </label>

                <select
                  id="typeProduit"
                  value={typeProduit}
                  onChange={handleFilterChange(
                    setTypeProduit
                  )}
                >
                  <option value="">
                    Tous les types
                  </option>
                  <option value="brut">
                    Produit brut
                  </option>
                  <option value="transforme">
                    Produit transformé
                  </option>
                  <option value="intrant">
                    Intrant
                  </option>
                  <option value="materiel">
                    Matériel
                  </option>
                </select>
              </div>

              {/* Région */}
              <div className="filter-group">
                <label htmlFor="region">
                  Région
                </label>

                <div className="filter-input-icon">
                  <Icon
                    name="location"
                    size={17}
                  />

                  <input
                    id="region"
                    type="text"
                    value={region}
                    onChange={handleFilterChange(
                      setRegion
                    )}
                    placeholder="Ex. Centre"
                  />
                </div>
              </div>

              {/* Province */}
              <div className="filter-group">
                <label htmlFor="province">
                  Province
                </label>

                <input
                  id="province"
                  type="text"
                  value={province}
                  onChange={handleFilterChange(
                    setProvince
                  )}
                  placeholder="Ex. Kadiogo"
                />
              </div>

              {/* Commune */}
              <div className="filter-group">
                <label htmlFor="commune">
                  Commune
                </label>

                <input
                  id="commune"
                  type="text"
                  value={commune}
                  onChange={handleFilterChange(
                    setCommune
                  )}
                  placeholder="Ex. Ouagadougou"
                />
              </div>

              {/* Prix */}
              <div className="filter-group">
                <label>
                  Prix
                </label>

                <div className="filter-price-grid">
                  <div className="price-input">
                    <span>Min</span>
                    <input
                      type="number"
                      min="0"
                      value={prixMin}
                      onChange={handleFilterChange(
                        setPrixMin
                      )}
                      placeholder="0"
                    />
                  </div>

                  <div className="price-input">
                    <span>Max</span>
                    <input
                      type="number"
                      min="0"
                      value={prixMax}
                      onChange={handleFilterChange(
                        setPrixMax
                      )}
                      placeholder="∞"
                    />
                  </div>
                </div>
              </div>

              <div className="filters-actions">
                <button
                  type="button"
                  className="reset-filters-button"
                  onClick={resetFilters}
                >
                  <Icon
                    name="refresh"
                    size={17}
                  />
                  Réinitialiser
                </button>
              </div>
            </div>
          </aside>

          {/* ==================================================
              PRODUITS
          ================================================== */}

          <div className="products-results">
            <div className="results-header">
              <div>
                <span className="section-eyebrow">
                  MARCHÉ AGRICOLE
                </span>

                <h2>
                  Produits disponibles
                </h2>

                {!loading && (
                  <p>
                    {pagination.total || annonces.length}{" "}
                    produit
                    {(pagination.total ||
                      annonces.length) !== 1
                      ? "s"
                      : ""}{" "}
                    trouvé
                    {(pagination.total ||
                      annonces.length) !== 1
                      ? "s"
                      : ""}
                  </p>
                )}
              </div>

              <button
                type="button"
                className="refresh-products-button"
                onClick={loadProducts}
                disabled={loading}
              >
                <Icon
                  name="refresh"
                  size={17}
                />
                Actualiser
              </button>
            </div>

            {/* Loading */}
            {loading && (
              <div className="products-state">
                <div className="loading-spinner" />
                <h3>
                  Chargement des produits...
                </h3>
                <p>
                  Nous récupérons les annonces
                  disponibles.
                </p>
              </div>
            )}

            {/* Erreur */}
            {!loading && error && (
              <div className="products-state products-error-state">
                <div className="state-icon">
                  !
                </div>

                <h3>
                  Impossible de charger les produits
                </h3>

                <p>{error}</p>

                <button
                  type="button"
                  className="state-button"
                  onClick={loadProducts}
                >
                  Réessayer
                </button>
              </div>
            )}

            {/* Aucun résultat */}
            {!loading &&
              !error &&
              annonces.length === 0 && (
                <div className="products-state">
                  <div className="state-icon">
                    <Icon
                      name="package"
                      size={38}
                    />
                  </div>

                  <h3>
                    Aucun produit trouvé
                  </h3>

                  <p>
                    Aucun produit ne correspond
                    actuellement à vos critères.
                  </p>

                  <button
                    type="button"
                    className="state-button"
                    onClick={resetFilters}
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              )}

            {/* Grille */}
            {!loading &&
              !error &&
              annonces.length > 0 && (
                <div className="products-grid">
                  {annonces.map((annonce) => {
                    const imageUrl =
                      getAnnonceImage(annonce);

                    const productName =
                      getProductName(annonce);

                    const typeProduit =
                      getProductType(annonce);

                    const secteur =
                      getSecteur(annonce);

                    return (
                      <article
                        className="product-card"
                        key={annonce.id}
                      >
                        <Link
                          to={`/produits/${annonce.id}`}
                          className="product-image-link"
                        >
                          <div className="product-image">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={productName}
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.style.display =
                                    "none";

                                  const parent =
                                    event.currentTarget
                                      .parentElement;

                                  if (
                                    parent &&
                                    !parent.querySelector(
                                      ".image-error-placeholder"
                                    )
                                  ) {
                                    const placeholder =
                                      document.createElement(
                                        "div"
                                      );

                                    placeholder.className =
                                      "no-image image-error-placeholder";

                                    placeholder.innerHTML =
                                      `
                                        <span class="no-image-icon">📦</span>
                                        <span>Photo indisponible</span>
                                      `;

                                    parent.appendChild(
                                      placeholder
                                    );
                                  }
                                }}
                              />
                            ) : (
                              <div className="no-image">
                                <span className="no-image-icon">
                                  <Icon
                                    name="package"
                                    size={38}
                                  />
                                </span>
                                <span>
                                  Aucune photo
                                </span>
                              </div>
                            )}

                            {typeProduit && (
                              <span className="product-type-badge">
                                {getTypeLabel(
                                  typeProduit
                                )}
                              </span>
                            )}

                            <span className="product-view-badge">
                              Voir le produit
                              <Icon
                                name="arrow"
                                size={14}
                              />
                            </span>
                          </div>
                        </Link>

                        <div className="product-card-body">
                          <div className="product-card-top">
                            <span className="product-category">
                              {getSecteurLabel(
                                secteur
                              )}
                            </span>

                            <span className="product-status">
                              Disponible
                            </span>
                          </div>

                          <Link
                            to={`/produits/${annonce.id}`}
                            className="product-title-link"
                          >
                            {productName}
                          </Link>

                          <div className="product-price">
                            {formatPrice(
                              annonce.prix
                            )}

                            {annonce.unite && (
                              <span>
                                / {annonce.unite}
                              </span>
                            )}
                          </div>

                          <div className="product-meta">
                            <div>
                              <Icon
                                name="package"
                                size={16}
                              />

                              <span>
                                {annonce.quantite ??
                                  "—"}{" "}
                                {annonce.unite ||
                                  ""}
                              </span>
                            </div>

                            <div>
                              <Icon
                                name="location"
                                size={16}
                              />

                              <span>
                                {getLocation(
                                  annonce
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="product-seller">
                            <span className="seller-avatar">
                              {getSellerName(
                                annonce
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </span>

                            <div>
                              <small>
                                Vendeur
                              </small>

                              <strong>
                                {getSellerName(
                                  annonce
                                )}
                              </strong>
                            </div>
                          </div>

                          <Link
                            to={`/produits/${annonce.id}`}
                            className="product-button"
                          >
                            Consulter
                            <Icon
                              name="arrow"
                              size={17}
                            />
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

            {/* Pagination */}
            {!loading &&
              !error &&
              annonces.length > 0 &&
              totalPages > 1 && (
                <nav
                  className="products-pagination"
                  aria-label="Pagination des produits"
                >
                  <button
                    type="button"
                    className="pagination-arrow"
                    onClick={() =>
                      changePage(page - 1)
                    }
                    disabled={page <= 1}
                    aria-label="Page précédente"
                  >
                    <Icon
                      name="chevron-left"
                      size={20}
                    />
                  </button>

                  {paginationPages.map(
                    (paginationPage, index) =>
                      paginationPage === "..." ? (
                        <span
                          key={`dots-${index}`}
                          className="pagination-dots"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          type="button"
                          key={paginationPage}
                          className={
                            paginationPage === page
                              ? "is-active"
                              : ""
                          }
                          onClick={() =>
                            changePage(
                              paginationPage
                            )
                          }
                        >
                          {paginationPage}
                        </button>
                      )
                  )}

                  <button
                    type="button"
                    className="pagination-arrow"
                    onClick={() =>
                      changePage(page + 1)
                    }
                    disabled={
                      page >= totalPages
                    }
                    aria-label="Page suivante"
                  >
                    <Icon
                      name="chevron-right"
                      size={20}
                    />
                  </button>
                </nav>
              )}
          </div>
        </div>
      </section>
    </main>
  );
}