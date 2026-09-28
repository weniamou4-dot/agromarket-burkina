import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { getAnnonces } from "../services/api/products";
import { getFamilles } from "../services/api/familles";
import {
  searchSuggestions,
  getSearchSuggestions,
} from "../services/api/search";

import "../styles/pages/home.css";

/* ============================================================
   CONFIGURATION API
============================================================ */

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

/* ============================================================
   ICONES
============================================================ */

function Icon({ name, size = 24 }) {
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

  const icons = {
    search: (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    ),

    arrowRight: (
      <svg {...common}>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    ),

    arrowLeft: (
      <svg {...common}>
        <path d="M19 12H5" />
        <path d="m11 18-6-6 6-6" />
      </svg>
    ),

    mapPin: (
      <svg {...common}>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),

    shoppingBag: (
      <svg {...common}>
        <path d="M6 8h12l1 13H5L6 8Z" />
        <path d="M9 8a3 3 0 0 1 6 0" />
      </svg>
    ),

    users: (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20a6 6 0 0 1 12 0" />
        <path d="M16 5.5a3 3 0 0 1 0 5.8" />
        <path d="M18 14a5 5 0 0 1 3 4" />
      </svg>
    ),

    shield: (
      <svg {...common}>
        <path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),

    truck: (
      <svg {...common}>
        <path d="M3 6h11v10H3z" />
        <path d="M14 10h4l3 3v3h-7z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </svg>
    ),

    leaf: (
      <svg {...common}>
        <path d="M20 4C11 4 5 8 5 14c0 3 2 5 5 5 6 0 10-6 10-15Z" />
        <path d="M5 19c2-4 5-7 10-10" />
      </svg>
    ),

    wheat: (
      <svg {...common}>
        <path d="M12 21V5" />
        <path d="M12 8C8 8 7 6 7 4c3 0 5 1 5 4Z" />
        <path d="M12 12c-4 0-5-2-5-4 3 0 5 1 5 4Z" />
        <path d="M12 16c-4 0-5-2-5-4 3 0 5 1 5 4Z" />
        <path d="M12 8c4 0 5-2 5-4-3 0-5 1-5 4Z" />
        <path d="M12 12c4 0 5-2 5-4-3 0-5 1-5 4Z" />
        <path d="M12 16c4 0 5-2 5-4 3 0 5 1 5 4Z" />
      </svg>
    ),

    heart: (
      <svg {...common}>
        <path d="M20.8 8.6c0 5.4-8.8 10.2-8.8 10.2S3.2 14 3.2 8.6A4.6 4.6 0 0 1 12 6.2a4.6 4.6 0 0 1 8.8 2.4Z" />
      </svg>
    ),
  };

  return icons[name] || null;
}

/* ============================================================
   SLIDER PRINCIPAL
============================================================ */

const MARKET_SLIDES = [
  {
    id: "mais",
    title: "Maïs du Burkina Faso",
    subtitle: "Céréales",
    description:
      "Découvrez les offres de maïs provenant des producteurs et vendeurs agricoles du Burkina Faso.",
    image: "/images/home/mais.jpg",
    buttonText: "Voir le maïs",
    search: "maïs",
  },

  {
    id: "riz-cereales",
    title: "Riz et céréales",
    subtitle: "Produits céréaliers",
    description:
      "Trouvez du riz, du mil, du sorgho et d'autres céréales disponibles auprès des vendeurs.",
    image: "/images/home/riz-cereales.jpg",
    buttonText: "Voir les céréales",
    search: "riz",
  },

  {
    id: "maraichage",
    title: "Légumes et produits maraîchers",
    subtitle: "Maraîchage",
    description:
      "Tomates, oignons, choux, pommes de terre et autres produits maraîchers du Burkina Faso.",
    image: "/images/home/maraichage.jpg",
    buttonText: "Voir le maraîchage",
    search: "légumes",
  },

  {
    id: "elevage",
    title: "Élevage et bétail",
    subtitle: "Élevage",
    description:
      "Découvrez les produits issus de l'élevage et les offres de bétail disponibles.",
    image: "/images/home/elevage.jpg",
    buttonText: "Voir l'élevage",
    search: "élevage",
  },

  {
    id: "engrais",
    title: "Engrais agricoles",
    subtitle: "Intrants agricoles",
    description:
      "Retrouvez différents types d'engrais destinés à améliorer la production agricole.",
    image: "/images/home/engrais.jpg",
    buttonText: "Voir les engrais",
    search: "engrais",
  },

  {
    id: "phytosanitaire",
    title: "Produits phytosanitaires",
    subtitle: "Protection des cultures",
    description:
      "Produits et solutions agricoles destinés à la protection et à l'entretien des cultures.",
    image: "/images/home/phytosanitaire.jpg",
    buttonText: "Voir les produits",
    search: "phytosanitaire",
  },

  {
    id: "semences",
    title: "Semences agricoles",
    subtitle: "Semences",
    description:
      "Trouvez des semences agricoles adaptées aux différents besoins des producteurs.",
    image: "/images/home/semences.jpg",
    buttonText: "Voir les semences",
    search: "semences",
  },

  {
    id: "materiel-agricole",
    title: "Matériel agricole",
    subtitle: "Équipements",
    description:
      "Découvrez des équipements et matériels destinés aux activités agricoles.",
    image: "/images/home/materiel-agricole.jpg",
    buttonText: "Voir le matériel",
    search: "matériel agricole",
  },

  {
    id: "irrigation",
    title: "Irrigation",
    subtitle: "Gestion de l'eau",
    description:
      "Pompes, équipements et solutions d'irrigation pour accompagner les producteurs.",
    image: "/images/home/irrigation.jpg",
    buttonText: "Voir l'irrigation",
    search: "irrigation",
  },

  {
    id: "outils-agricoles",
    title: "Outils agricoles",
    subtitle: "Outils",
    description:
      "Découvrez les outils nécessaires aux différentes activités agricoles.",
    image: "/images/home/outils-agricoles.jpg",
    buttonText: "Voir les outils",
    search: "outils agricoles",
  },

  {
    id: "aviculture",
    title: "Aviculture",
    subtitle: "Élevage de volailles",
    description:
      "Découvrez les produits et équipements destinés à l'aviculture.",
    image: "/images/home/aviculture.jpg",
    buttonText: "Voir l'aviculture",
    search: "aviculture",
  },

  {
    id: "marche-agricole",
    title: "Le marché agricole burkinabè",
    subtitle: "AgroMarket Burkina",
    description:
      "Une plateforme pour découvrir, rechercher et commercialiser les produits agricoles et d'élevage.",
    image: "/images/home/marche-agricole.jpg",
    buttonText: "Explorer le marché",
    search: "",
  },
];

/* ============================================================
   OUTILS
============================================================ */

function unwrapCollection(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response?.results)) {
    return response.results;
  }

  if (Array.isArray(response?.annonces)) {
    return response.annonces;
  }

  if (Array.isArray(response?.familles)) {
    return response.familles;
  }

  return [];
}

/* ============================================================
   RESOLUTION URL IMAGE
============================================================ */

function resolveMediaUrl(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const image = value.trim();

  if (!image) {
    return null;
  }

  /* Image déjà complète */
  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:") ||
    image.startsWith("blob:")
  ) {
    return image;
  }

  /* URL relative retournée par FastAPI */
  const cleanImagePath = image.replace(/^\/+/, "");

  return `${API_URL}/${cleanImagePath}`;
}

/* ============================================================
   URL IMAGE PRODUIT
============================================================ */

function getProductImage(item) {
  const image =
    item?.images?.[0]?.url ||
    item?.images?.[0]?.image_url ||
    item?.image_url ||
    item?.image ||
    item?.photo ||
    item?.photo_url ||
    item?.image_principale ||
    item?.produit?.image_url ||
    item?.produit?.image ||
    item?.produit?.photo ||
    item?.produit?.photo_url ||
    null;

  return resolveMediaUrl(image);
}

/* ============================================================
   IMAGE FAMILLE
   Les familles utilisent les images déjà présentes
   dans le slider principal.
============================================================ */

function getFamilyImage(family) {
  const familyName = (
    family?.nom ||
    family?.name ||
    family?.libelle ||
    family?.titre ||
    ""
  )
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    familyName.includes("mais") ||
    familyName.includes("cereale") ||
    familyName.includes("cereal")
  ) {
    return "/images/home/mais.jpg";
  }

  if (familyName.includes("riz")) {
    return "/images/home/riz-cereales.jpg";
  }

  if (
    familyName.includes("legume") ||
    familyName.includes("maraicher") ||
    familyName.includes("maraichage")
  ) {
    return "/images/home/maraichage.jpg";
  }

  if (
    familyName.includes("elevage") ||
    familyName.includes("betail")
  ) {
    return "/images/home/elevage.jpg";
  }

  if (familyName.includes("engrais")) {
    return "/images/home/engrais.jpg";
  }

  if (
    familyName.includes("phytosanitaire") ||
    familyName.includes("protection")
  ) {
    return "/images/home/phytosanitaire.jpg";
  }

  if (familyName.includes("semence")) {
    return "/images/home/semences.jpg";
  }

  if (
    familyName.includes("materiel") ||
    familyName.includes("equipement")
  ) {
    return "/images/home/materiel-agricole.jpg";
  }

  if (familyName.includes("irrigation")) {
    return "/images/home/irrigation.jpg";
  }

  if (familyName.includes("outil")) {
    return "/images/home/outils-agricoles.jpg";
  }

  if (
    familyName.includes("aviculture") ||
    familyName.includes("volaille")
  ) {
    return "/images/home/aviculture.jpg";
  }

  return "/images/home/marche-agricole.jpg";
}

/* ============================================================
   PRIX
============================================================ */

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "Prix non renseigné";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return String(value);
  }

  return `${new Intl.NumberFormat("fr-FR").format(number)} FCFA`;
}

/* ============================================================
   NOM PRODUIT
============================================================ */

function getProductName(item) {
  return (
    item?.produit?.nom ||
    item?.produit_nom ||
    item?.nom_produit ||
    item?.nom ||
    item?.titre ||
    "Produit agricole"
  );
}

/* ============================================================
   DESCRIPTION
============================================================ */

function getProductDescription(item) {
  return (
    item?.description ||
    item?.produit?.description ||
    "Produit disponible sur AgroMarket Burkina."
  );
}

/* ============================================================
   LOCALISATION
============================================================ */

function getLocation(item) {
  const parts = [
    item?.commune,
    item?.province,
    item?.region,
  ].filter(Boolean);

  return parts.length
    ? parts.join(" · ")
    : "Burkina Faso";
}

/* ============================================================
   SUGGESTIONS
============================================================ */

function getSuggestionValue(item) {
  if (typeof item === "string") {
    return item;
  }

  return (
    item?.nom ||
    item?.name ||
    item?.label ||
    item?.titre ||
    item?.produit_nom ||
    ""
  );
}

/* ============================================================
   HOME
============================================================ */

export default function Home() {
  const navigate = useNavigate();

  const [annonces, setAnnonces] = useState([]);
  const [familles, setFamilles] = useState([]);

  const [loadingAnnonces, setLoadingAnnonces] =
    useState(true);

  const [loadingFamilles, setLoadingFamilles] =
    useState(true);

  const [errorAnnonces, setErrorAnnonces] =
    useState("");

  const [errorFamilles, setErrorFamilles] =
    useState("");

  const [search, setSearch] = useState("");

  const [suggestions, setSuggestions] =
    useState([]);

  const [showSuggestions, setShowSuggestions] =
    useState(false);

  const [searchLoading, setSearchLoading] =
    useState(false);

  const [currentSlide, setCurrentSlide] =
    useState(0);

  const [isSliderPaused, setIsSliderPaused] =
    useState(false);

  /* ==========================================================
     CHARGEMENT DES ANNONCES
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadAnnonces() {
      setLoadingAnnonces(true);
      setErrorAnnonces("");

      try {
        const response = await getAnnonces({
          page: 1,
          limit: 8,
        });

        if (!mounted) {
          return;
        }

        const collection =
          unwrapCollection(response);

        setAnnonces(collection.slice(0, 8));
      } catch (error) {
        if (!mounted) {
          return;
        }

        console.error(
          "Erreur chargement annonces :",
          error
        );

        setErrorAnnonces(
          error?.response?.data?.detail ||
            error?.message ||
            "Impossible de charger les annonces."
        );
      } finally {
        if (mounted) {
          setLoadingAnnonces(false);
        }
      }
    }

    loadAnnonces();

    return () => {
      mounted = false;
    };
  }, []);

  /* ==========================================================
     CHARGEMENT DES FAMILLES
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    async function loadFamilles() {
      setLoadingFamilles(true);
      setErrorFamilles("");

      try {
        const response = await getFamilles();

        if (!mounted) {
          return;
        }

        setFamilles(
          unwrapCollection(response).slice(0, 8)
        );
      } catch (error) {
        if (!mounted) {
          return;
        }

        console.error(
          "Erreur chargement familles :",
          error
        );

        setErrorFamilles(
          error?.response?.data?.detail ||
            error?.message ||
            "Impossible de charger les catégories."
        );
      } finally {
        if (mounted) {
          setLoadingFamilles(false);
        }
      }
    }

    loadFamilles();

    return () => {
      mounted = false;
    };
  }, []);

  /* ==========================================================
     SLIDER AUTOMATIQUE
  ========================================================== */

  useEffect(() => {
    if (isSliderPaused) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCurrentSlide((previous) => {
        return (
          (previous + 1) %
          MARKET_SLIDES.length
        );
      });
    }, 6500);

    return () => {
      window.clearInterval(timer);
    };
  }, [isSliderPaused]);

  /* ==========================================================
     RECHERCHE / SUGGESTIONS
  ========================================================== */

  useEffect(() => {
    const value = search.trim();

    if (!value) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchLoading(false);

      return undefined;
    }

    let cancelled = false;

    const timer = window.setTimeout(
      async () => {
        setSearchLoading(true);

        try {
          let response;

          if (
            typeof searchSuggestions ===
            "function"
          ) {
            response =
              await searchSuggestions(value);
          } else if (
            typeof getSearchSuggestions ===
            "function"
          ) {
            response =
              await getSearchSuggestions(value);
          }

          if (cancelled) {
            return;
          }

          const values = unwrapCollection(
            response
          )
            .map(getSuggestionValue)
            .filter(Boolean)
            .slice(0, 6);

          setSuggestions(values);

          setShowSuggestions(
            values.length > 0
          );
        } catch (error) {
          if (!cancelled) {
            console.warn(
              "Suggestions indisponibles :",
              error
            );

            setSuggestions([]);
            setShowSuggestions(false);
          }
        } finally {
          if (!cancelled) {
            setSearchLoading(false);
          }
        }
      },
      300
    );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search]);

  /* ==========================================================
     RECHERCHE
  ========================================================== */

  function submitSearch(value = search) {
    const query = value.trim();

    setShowSuggestions(false);

    if (!query) {
      navigate("/produits");
      return;
    }

    navigate(
      `/produits?search=${encodeURIComponent(
        query
      )}`
    );
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    submitSearch();
  }

  /* ==========================================================
     SLIDER
  ========================================================== */

  function previousSlide() {
    setCurrentSlide((previous) => {
      return previous === 0
        ? MARKET_SLIDES.length - 1
        : previous - 1;
    });
  }

  function nextSlide() {
    setCurrentSlide((previous) => {
      return (
        (previous + 1) %
        MARKET_SLIDES.length
      );
    });
  }

  function goToSlide(index) {
    setCurrentSlide(index);
  }

  /* ==========================================================
     STATISTIQUES
  ========================================================== */

  const stats = useMemo(
    () => [
      {
        icon: "shoppingBag",
        value: `${annonces.length}+`,
        label: "Annonces visibles",
      },

      {
        icon: "leaf",
        value: `${familles.length}+`,
        label: "Familles de produits",
      },

      {
        icon: "mapPin",
        value: "13",
        label: "Régions du Burkina",
      },

      {
        icon: "users",
        value: "100%",
        label: "Marché burkinabè",
      },
    ],
    [annonces.length, familles.length]
  );

  /* ==========================================================
     RENDU
  ========================================================== */

  return (
    <main className="home-page">

      {/* ======================================================
          SLIDER
      ====================================================== */}

      <section
        className="home-slider"
        onMouseEnter={() =>
          setIsSliderPaused(true)
        }
        onMouseLeave={() =>
          setIsSliderPaused(false)
        }
        onFocus={() =>
          setIsSliderPaused(true)
        }
        onBlur={(event) => {
          if (
            !event.currentTarget.contains(
              event.relatedTarget
            )
          ) {
            setIsSliderPaused(false);
          }
        }}
      >
        {MARKET_SLIDES.map(
          (slide, index) => (
            <article
              key={slide.id}
              className={`home-slide ${
                index === currentSlide
                  ? "home-slide-active"
                  : ""
              }`}
              aria-hidden={
                index !== currentSlide
              }
            >
              <img
                className="home-slide-image"
                src={slide.image}
                alt={slide.title}
                loading={
                  index === 0
                    ? "eager"
                    : "lazy"
                }
              />

              <div className="home-slide-overlay" />

              <div className="home-container home-slide-inner">
                <div className="home-slide-content">

                  <span className="home-slide-badge">
                    <Icon
                      name="leaf"
                      size={17}
                    />

                    {slide.subtitle}
                  </span>

                  <div className="home-slide-copy">

                    <h1>
                      {slide.title}
                    </h1>

                    <p>
                      {slide.description}
                    </p>

                    <button
                      type="button"
                      className="home-slide-button"
                      onClick={() => {
                        if (slide.search) {
                          submitSearch(
                            slide.search
                          );
                        } else {
                          navigate(
                            "/produits"
                          );
                        }
                      }}
                    >
                      {slide.buttonText}

                      <Icon
                        name="arrowRight"
                        size={18}
                      />
                    </button>

                  </div>
                </div>
              </div>
            </article>
          )
        )}

        <button
          type="button"
          className="home-slider-arrow home-slider-arrow-left"
          onClick={previousSlide}
          aria-label="Image précédente"
        >
          <Icon
            name="arrowLeft"
            size={24}
          />
        </button>

        <button
          type="button"
          className="home-slider-arrow home-slider-arrow-right"
          onClick={nextSlide}
          aria-label="Image suivante"
        >
          <Icon
            name="arrowRight"
            size={24}
          />
        </button>

        <div className="home-slider-bottom">

          <div className="home-slider-dots">
            {MARKET_SLIDES.map(
              (slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  className={`home-slider-dot ${
                    index === currentSlide
                      ? "home-slider-dot-active"
                      : ""
                  }`}
                  onClick={() =>
                    goToSlide(index)
                  }
                  aria-label={`Afficher ${slide.title}`}
                  aria-current={
                    index === currentSlide
                      ? "true"
                      : undefined
                  }
                />
              )
            )}
          </div>

          <div className="home-slider-counter">
            <strong>
              {String(
                currentSlide + 1
              ).padStart(2, "0")}
            </strong>

            <span>/</span>

            <span>
              {String(
                MARKET_SLIDES.length
              ).padStart(2, "0")}
            </span>
          </div>

        </div>
      </section>

      {/* ======================================================
          RECHERCHE
      ====================================================== */}

      <section className="home-hero-bottom">
        <div className="home-container">

          <div className="home-hero-search-card">

            <div className="home-search-intro">

              <div className="home-search-intro-icon">
                <Icon
                  name="search"
                  size={23}
                />
              </div>

              <div>
                <strong>
                  Que recherchez-vous ?
                </strong>

                <span>
                  Produits agricoles,
                  élevage, équipements et
                  intrants.
                </span>
              </div>

            </div>

            <form
              className="home-search"
              onSubmit={
                handleSearchSubmit
              }
              autoComplete="off"
            >

              <div className="home-search-input-wrapper">

                <Icon
                  name="search"
                  size={21}
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  onFocus={() => {
                    if (
                      suggestions.length >
                      0
                    ) {
                      setShowSuggestions(
                        true
                      );
                    }
                  }}
                  placeholder="Ex. maïs, riz, engrais, bétail..."
                  aria-label="Rechercher un produit"
                />

                {searchLoading && (
                  <span className="home-search-loading" />
                )}

                {showSuggestions &&
                  suggestions.length > 0 && (
                    <div className="home-search-suggestions">

                      {suggestions.map(
                        (
                          suggestion,
                          index
                        ) => (
                          <button
                            type="button"
                            key={`${suggestion}-${index}`}
                            onMouseDown={(
                              event
                            ) => {
                              event.preventDefault();

                              setSearch(
                                suggestion
                              );

                              submitSearch(
                                suggestion
                              );
                            }}
                          >
                            <Icon
                              name="search"
                              size={17}
                            />

                            <span>
                              {suggestion}
                            </span>
                          </button>
                        )
                      )}

                    </div>
                  )}

              </div>

              <button
                type="submit"
                className="home-search-button"
              >
                Rechercher
              </button>

            </form>

          </div>

        </div>
      </section>

      {/* ======================================================
          INTRODUCTION
      ====================================================== */}

      <section className="home-market-section">
        <div className="home-container">

          <div className="home-market-card">

            <div className="home-market-icon home-market-logo">
              <img
                src="/images/home/logo-agromarket.png"
                alt="Logo AgroMarket Burkina"
              />
            </div>

            <div>

              <span className="home-section-eyebrow">
                AgroMarket Burkina
              </span>

              <h2>
                Le marché numérique de
                l'agriculture burkinabè
              </h2>

              <p>
                AgroMarket Burkina facilite la
                mise en relation entre producteurs,
                vendeurs et acheteurs autour des
                produits agricoles, de l'élevage et
                des équipements agricoles.
              </p>

            </div>

            <Link
              to="/produits"
              className="home-text-link"
            >
              Explorer le marché

              <Icon
                name="arrowRight"
                size={18}
              />
            </Link>

          </div>

        </div>
      </section>

      {/* ======================================================
          STATISTIQUES
      ====================================================== */}

      <section className="home-stats-section">
        <div className="home-container">

          <div className="home-stats-grid">

            {stats.map((stat) => (
              <div
                className="home-stat-card"
                key={stat.label}
              >

                <div className="home-stat-icon">
                  <Icon
                    name={stat.icon}
                    size={25}
                  />
                </div>

                <div>

                  <strong>
                    {stat.value}
                  </strong>

                  <span>
                    {stat.label}
                  </span>

                </div>

              </div>
            ))}

          </div>

        </div>
      </section>

      {/* ======================================================
          FAMILLES
      ====================================================== */}

      <section className="home-families-section">
        <div className="home-container">

          <div className="home-section-header">

            <div>

              <span className="home-section-eyebrow">
                Catégories
              </span>

              <h2>
                Explorez nos familles
                de produits
              </h2>

              <p>
                Trouvez rapidement les
                produits qui vous intéressent.
              </p>

            </div>

            <Link
              to="/produits"
              className="home-outline-link"
            >
              Voir tout

              <Icon
                name="arrowRight"
                size={18}
              />
            </Link>

          </div>

          {loadingFamilles ? (

            <div className="home-loading">
              <span className="home-spinner" />
              Chargement des catégories...
            </div>

          ) : errorFamilles ? (

            <div className="home-error">
              {errorFamilles}
            </div>

          ) : familles.length === 0 ? (

            <div className="home-empty">
              Aucune catégorie disponible
              pour le moment.
            </div>

          ) : (

            <div className="home-families-grid">

              {familles.map(
                (family, index) => {

                  const familyId =
                    family?.id ??
                    family?.famille_id ??
                    family?.categorie_id;

                  const familyName =
                    family?.nom ||
                    family?.name ||
                    family?.libelle ||
                    family?.titre ||
                    "Famille de produits";

                  const familyImage =
                    getFamilyImage(family);

                  return (

                    <Link
                      key={
                        familyId ?? index
                      }
                      to={
                        familyId
                          ? `/produits?famille=${familyId}`
                          : "/produits"
                      }
                      className="home-family-card"
                    >

                      {/* IMAGE DE LA FAMILLE */}
                      <div className="home-family-image">

                        <img
                          src={familyImage}
                          alt={familyName}
                          loading="lazy"
                          onError={(event) => {
                            if (
                              event.currentTarget
                                .dataset
                                .fallbackApplied
                            ) {
                              return;
                            }

                            event.currentTarget.dataset.fallbackApplied =
                              "true";

                            event.currentTarget.src =
                              "/images/home/marche-agricole.jpg";
                          }}
                        />

                      </div>

                      {/* CONTENU */}
                      <div className="home-family-content">

                        <h3>
                          {familyName}
                        </h3>

                        <p>
                          Découvrir les
                          produits
                        </p>

                      </div>

                      {/* FLECHE */}
                      <span className="home-family-arrow">
                        <Icon
                          name="arrowRight"
                          size={18}
                        />
                      </span>

                    </Link>

                  );
                }
              )}

            </div>

          )}

        </div>
      </section>

      {/* ======================================================
          PRODUITS
      ====================================================== */}

      <section className="home-products-section">
        <div className="home-container">

          <div className="home-section-header">

            <div>

              <span className="home-section-eyebrow">
                Marché
              </span>

              <h2>
                Produits disponibles
              </h2>

              <p>
                Découvrez les annonces actuellement
                publiées sur AgroMarket Burkina.
              </p>

            </div>

            <Link
              to="/produits"
              className="home-outline-link"
            >
              Tous les produits

              <Icon
                name="arrowRight"
                size={18}
              />
            </Link>

          </div>

          {loadingAnnonces ? (

            <div className="home-loading">
              <span className="home-spinner" />
              Chargement des produits...
            </div>

          ) : errorAnnonces ? (

            <div className="home-error">
              {errorAnnonces}
            </div>

          ) : annonces.length === 0 ? (

            <div className="home-empty">

              <Icon
                name="shoppingBag"
                size={30}
              />

              <h3>
                Aucune annonce disponible
              </h3>

              <p>
                Les produits publiés
                apparaîtront ici.
              </p>

            </div>

          ) : (

            <div className="home-products-grid">

              {annonces.map(
                (annonce, index) => {

                  const image =
                    getProductImage(
                      annonce
                    );

                  const name =
                    getProductName(
                      annonce
                    );

                  const description =
                    getProductDescription(
                      annonce
                    );

                  const location =
                    getLocation(
                      annonce
                    );

                  return (

                    <Link
                      key={
                        annonce?.id ??
                        index
                      }
                      to={`/produits/${annonce?.id}`}
                      className="home-product-card"
                    >

                      {/* IMAGE PRODUIT */}
                      <div className="home-product-image">

                        {image ? (

                          <img
                            src={image}
                            alt={name}
                            loading="lazy"
                            onError={(event) => {

                              console.error(
                                "Image produit impossible à charger :",
                                image
                              );

                              event.currentTarget.style.display =
                                "none";

                              const parent =
                                event.currentTarget
                                  .parentElement;

                              if (parent) {
                                parent.classList.add(
                                  "home-product-image-error"
                                );
                              }
                            }}
                          />

                        ) : (

                          <div className="home-product-image-placeholder">

                            <Icon
                              name="leaf"
                              size={38}
                            />

                          </div>

                        )}

                      </div>

                      {/* INFORMATIONS PRODUIT */}

                      <div className="home-product-content">

                        <div className="home-product-location">

                          <Icon
                            name="mapPin"
                            size={15}
                          />

                          <span>
                            {location}
                          </span>

                        </div>

                        <h3>
                          {name}
                        </h3>

                        <p>
                          {description}
                        </p>

                        <div className="home-product-footer">

                          <strong>
                            {formatPrice(
                              annonce?.prix
                            )}
                          </strong>

                          <span>
                            {annonce?.quantite
                              ? `${annonce.quantite} ${
                                  annonce?.unite ||
                                  ""
                                }`
                              : "Disponible"}
                          </span>

                        </div>

                      </div>

                    </Link>

                  );
                }
              )}

            </div>

          )}

        </div>
      </section>

      {/* ======================================================
          CONFIANCE
      ====================================================== */}

      <section className="home-trust-section">
        <div className="home-container">

          <div className="home-section-header home-section-header-centered">

            <div>

              <span className="home-section-eyebrow">
                Pourquoi AgroMarket ?
              </span>

              <h2>
                Un marché pensé pour
                le Burkina Faso
              </h2>

              <p>
                Une expérience simple pour
                trouver et commercialiser les
                produits agricoles.
              </p>

            </div>

          </div>

          <div className="home-trust-grid">

            <div className="home-trust-card">

              <div className="home-trust-icon">
                <Icon
                  name="mapPin"
                  size={27}
                />
              </div>

              <h3>
                Marché local
              </h3>

              <p>
                Une plateforme dédiée aux
                producteurs, vendeurs et
                acheteurs du Burkina Faso.
              </p>

            </div>

            <div className="home-trust-card">

              <div className="home-trust-icon">
                <Icon
                  name="shield"
                  size={27}
                />
              </div>

              <h3>
                Contrôle des annonces
              </h3>

              <p>
                Les annonces peuvent être
                soumises à une vérification
                avant leur publication.
              </p>

            </div>

            <div className="home-trust-card">

              <div className="home-trust-icon">
                <Icon
                  name="users"
                  size={27}
                />
              </div>

              <h3>
                Mise en relation
              </h3>

              <p>
                Facilitez les échanges entre
                vendeurs et acheteurs à travers
                une même plateforme.
              </p>

            </div>

            <div className="home-trust-card">

              <div className="home-trust-icon">
                <Icon
                  name="truck"
                  size={27}
                />
              </div>

              <h3>
                Produits variés
              </h3>

              <p>
                Agriculture, élevage, intrants,
                équipements et solutions agricoles.
              </p>

            </div>

          </div>

        </div>
      </section>

      {/* ======================================================
          COMMENT ÇA MARCHE
      ====================================================== */}

      <section className="home-how-section">
        <div className="home-container">

          <div className="home-section-header home-section-header-centered">

            <div>

              <span className="home-section-eyebrow">
                Fonctionnement
              </span>

              <h2>
                Comment utiliser
                AgroMarket ?
              </h2>

            </div>

          </div>

          <div className="home-how-grid">

            <div className="home-how-card">

              <span className="home-how-number">
                01
              </span>

              <div className="home-how-icon">
                <Icon
                  name="search"
                  size={26}
                />
              </div>

              <h3>
                Recherchez
              </h3>

              <p>
                Recherchez un produit
                agricole ou une catégorie.
              </p>

            </div>

            <div className="home-how-card">

              <span className="home-how-number">
                02
              </span>

              <div className="home-how-icon">
                <Icon
                  name="shoppingBag"
                  size={26}
                />
              </div>

              <h3>
                Comparez
              </h3>

              <p>
                Consultez les annonces
                et leurs informations.
              </p>

            </div>

            <div className="home-how-card">

              <span className="home-how-number">
                03
              </span>

              <div className="home-how-icon">
                <Icon
                  name="users"
                  size={26}
                />
              </div>

              <h3>
                Contactez
              </h3>

              <p>
                Entrez en relation
                avec le vendeur.
              </p>

            </div>

            <div className="home-how-card">

              <span className="home-how-number">
                04
              </span>

              <div className="home-how-icon">
                <Icon
                  name="heart"
                  size={26}
                />
              </div>

              <h3>
                Développez votre activité
              </h3>

              <p>
                Publiez vos produits et
                développez votre visibilité.
              </p>

            </div>

          </div>

        </div>
      </section>

      {/* ======================================================
          ESPACE VENDEUR
      ====================================================== */}

      <section className="home-seller-section">
        <div className="home-container">

          <div className="home-seller-card">

            <div className="home-seller-icon">
              <Icon
                name="leaf"
                size={34}
              />
            </div>

            <div className="home-seller-content">

              <span className="home-section-eyebrow">
                Vous êtes producteur ou vendeur ?
              </span>

              <h2>
                Présentez vos produits
                sur AgroMarket Burkina
              </h2>

              <p>
                Publiez vos annonces et rendez
                vos produits visibles auprès
                des acheteurs.
              </p>

            </div>

            <Link
              to="/annonces/nouvelle"
              className="home-primary-button"
            >
              Publier une annonce

              <Icon
                name="arrowRight"
                size={18}
              />
            </Link>

          </div>

        </div>
      </section>

      {/* ======================================================
          CTA FINAL
      ====================================================== */}

      <section className="home-final-cta">
        <div className="home-container">

          <div className="home-final-cta-content">

            <span className="home-section-eyebrow">
              AgroMarket Burkina
            </span>

            <h2>
              Le marché agricole burkinabè,
              <br />
              plus proche de vous.
            </h2>

            <p>
              Explorez les produits, trouvez
              des vendeurs et développez vos
              activités agricoles.
            </p>

            <div className="home-final-actions">

              <Link
                to="/produits"
                className="home-primary-button"
              >
                Explorer les produits

                <Icon
                  name="arrowRight"
                  size={18}
                />
              </Link>

              <Link
                to="/annonces/nouvelle"
                className="home-secondary-button"
              >
                Vendre sur AgroMarket
              </Link>

            </div>

          </div>

        </div>
      </section>

    </main>
  );
}