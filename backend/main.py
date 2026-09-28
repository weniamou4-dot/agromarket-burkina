# ============================================================
# AGROMARKET BURKINA
# MAIN APPLICATION
# Version professionnelle
# ============================================================

from pathlib import Path

from dotenv import load_dotenv

# ============================================================
# VARIABLES D'ENVIRONNEMENT
# ============================================================

# Charge le fichier .env avant les autres imports de
# l'application qui peuvent utiliser ses variables.
load_dotenv()


# ============================================================
# FASTAPI
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import (
    get_swagger_ui_html,
    get_swagger_ui_oauth2_redirect_html,
)
from fastapi.openapi.utils import get_openapi
from fastapi.staticfiles import StaticFiles

from swagger_ui_bundle import swagger_ui_path


# ============================================================
# BASE DE DONNÉES
# ============================================================

from database import Base, engine


# ============================================================
# MODÈLES
# ============================================================
# Les imports permettent à SQLAlchemy de connaître tous les
# modèles avant l'utilisation de l'application.
# ============================================================

from models import (
    Annonce,
    Avis,
    Categorie,
    Commande,
    DemandeVendeur,
    Famille,
    HistoriqueModeration,
    ImageAnnonce,
    Notification,
    Produit,
    Utilisateur,
)
from avis_plateforme.models import AvisPlateforme

# ============================================================
# AUTHENTIFICATION
# ============================================================

from auth.routes import (
    router as auth_router,
    user_router,
    admin_router,
)


# ============================================================
# PRODUITS / ANNONCES
# ============================================================

from products.routes import (
    annonce_router,
    product_router,
)


# ============================================================
# FAMILLES
# ============================================================

from familles.routes import (
    router as familles_router,
)


# ============================================================
# CATÉGORIES
# ============================================================

from categories.routes import (
    router as categories_router,
)

from messagerie.routes import messagerie_router
# ============================================================
# COMMANDES
# ============================================================

from orders.routes import (
    order_router,
)


# ============================================================
# NOTIFICATIONS
# ============================================================

from notifications.routes import (
    router as notification_router,
)


# ============================================================
# AVIS
# ============================================================

from avis.routes import (
    router as avis_router,
)
# ============================================================
# AVIS SUR LA PLATEFORME
# ============================================================

from avis_plateforme.routes import (
    avis_plateforme_router,
)

# ============================================================
# RECHERCHE
# ============================================================

from search.routes import (
    router as search_router,
)


# ============================================================
# INTELLIGENCE ARTIFICIELLE
# ============================================================

from ai.routes import (
    router as ai_router,
)


# ============================================================
# HISTORIQUE
# ============================================================

from historique.routes import (
    router as historique_router,
)


# ============================================================
# DOSSIERS DE STOCKAGE
# ============================================================

BASE_DIR = (
    Path(__file__)
    .resolve()
    .parent
)

UPLOAD_DIR = (
    BASE_DIR / "uploads"
)

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# ============================================================
# APPLICATION FASTAPI
# ============================================================

app = FastAPI(

    title=(
        "AgroMarket Burkina API"
    ),

    description=(
        "API de la plateforme agricole "
        "et commerciale burkinabè."
    ),

    version="1.0.0",

    # --------------------------------------------------------
    # Désactivation des interfaces automatiques.
    # Nous utilisons nos propres interfaces locales.
    # --------------------------------------------------------

    docs_url=None,

    redoc_url=None,

    openapi_url="/openapi.json",
)


# ============================================================
# OPENAPI 3.0.3
# ============================================================
#
# Certaines versions de Swagger UI anciennes ne comprennent
# pas correctement OpenAPI 3.1.x.
#
# Nous forçons donc la documentation sur OpenAPI 3.0.3.
#
# ============================================================

app.openapi_version = "3.0.3"


def custom_openapi():
    """
    Génère le document OpenAPI de l'application.

    Le schéma est mis en cache pour éviter de le recalculer
    à chaque requête.
    """

    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
        openapi_version="3.0.3",
    )

    app.openapi_schema = openapi_schema

    return app.openapi_schema


app.openapi = custom_openapi


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        # Développement local
        "http://localhost:5173",
        "http://127.0.0.1:5173",

        # Production Render
        "https://agromarket-burkina-web.onrender.com",
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)
# ============================================================
# FICHIERS STATIQUES AGROMARKET
# ============================================================
#
# Exemple :
#
# /uploads/profiles/photo.jpg
#
# /uploads/annonces/photo.jpg
#
# ============================================================

app.mount(

    "/uploads",

    StaticFiles(
        directory=str(
            UPLOAD_DIR
        )
    ),

    name="uploads",
)


# ============================================================
# SWAGGER UI LOCAL
# ============================================================
#
# Les fichiers CSS et JavaScript de Swagger sont servis
# directement depuis le backend.
#
# Aucun CDN externe n'est nécessaire.
#
# ============================================================

app.mount(

    "/swagger-ui",

    StaticFiles(
        directory=swagger_ui_path
    ),

    name="swagger-ui",
)


# ============================================================
# DOCUMENTATION SWAGGER
# ============================================================

@app.get(
    "/docs",
    include_in_schema=False,
)
async def custom_swagger_ui():

    return get_swagger_ui_html(

        openapi_url=(
            app.openapi_url
        ),

        title=(
            f"{app.title} - "
            "Documentation API"
        ),

        oauth2_redirect_url=(
            app.swagger_ui_oauth2_redirect_url
        ),

        swagger_js_url=(
            "/swagger-ui/"
            "swagger-ui-bundle.js"
        ),

        swagger_css_url=(
            "/swagger-ui/"
            "swagger-ui.css"
        ),
    )


# ============================================================
# SWAGGER OAUTH2 REDIRECT
# ============================================================

@app.get(
    app.swagger_ui_oauth2_redirect_url,
    include_in_schema=False,
)
async def swagger_ui_redirect():

    return get_swagger_ui_oauth2_redirect_html()


# ============================================================
# ROUTES AUTHENTIFICATION
# ============================================================

app.include_router(
    auth_router
)


# ============================================================
# ROUTES UTILISATEURS
# ============================================================

app.include_router(
    user_router
)


# ============================================================
# ROUTES ADMINISTRATION
# ============================================================

app.include_router(
    admin_router
)


# ============================================================
# ROUTES INTELLIGENCE ARTIFICIELLE
# ============================================================

app.include_router(
    ai_router
)


# ============================================================
# ROUTES HISTORIQUE
# ============================================================

app.include_router(
    historique_router
)


# ============================================================
# ROUTES PRODUITS
# ============================================================

app.include_router(
    product_router
)


# ============================================================
# ROUTES ANNONCES
# ============================================================

app.include_router(
    annonce_router
)


# ============================================================
# ROUTES FAMILLES
# ============================================================

app.include_router(
    familles_router
)


# ============================================================
# ROUTES CATÉGORIES
# ============================================================

app.include_router(
    categories_router
)

app.include_router(messagerie_router)
# ============================================================
# ROUTES COMMANDES
# ============================================================

app.include_router(
    order_router
)


# ============================================================
# ROUTES NOTIFICATIONS
# ============================================================

app.include_router(
    notification_router
)


# ============================================================
# ROUTES AVIS
# ============================================================

app.include_router(
    avis_router
)

# ============================================================
# ROUTES AVIS SUR LA PLATEFORME
# ============================================================

app.include_router(
    avis_plateforme_router
)
# ============================================================
# ROUTES RECHERCHE
# ============================================================

app.include_router(
    search_router
)


# ============================================================
# ROUTE RACINE
# ============================================================

@app.get(
    "/",
    tags=["Système"],
)
def accueil():

    return {
        "message": (
            "Bienvenue sur "
            "AgroMarket Burkina 🇧🇫"
        ),

        "status": (
            "API opérationnelle"
        ),

        "version": "1.0.0",
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get(
    "/health",
    tags=["Système"],
)
def health():

    return {
        "status": "OK",
        "service": "AgroMarket Burkina API",
        "version": "1.0.0",
    }