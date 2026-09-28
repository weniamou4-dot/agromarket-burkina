from __future__ import annotations

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)
from sqlalchemy.orm import Session

from database import get_db

from products.schemas import TypeProduit

from search.schemas import (
    SearchResponse,
    SearchResult,
    SearchPagination,
    SearchSuggestion,
    SearchSuggestionResponse,
    SearchImage,
)
from search.services import (
    SearchServiceError,
    SearchValidationError,
    obtenir_suggestions,
    rechercher_annonces,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/recherche",
    tags=["Recherche"],
)


# ============================================================
# RECHERCHE DES ANNONCES
# ============================================================

@router.get(
    "/annonces",
    response_model=SearchResponse,
)
def rechercher(
    produit: str | None = Query(
        default=None,
        max_length=150,
        description="Nom du produit recherché",
    ),

    produit_id: int | None = Query(
        default=None,
        gt=0,
    ),

    famille_id: int | None = Query(
        default=None,
        gt=0,
    ),

    categorie_id: int | None = Query(
        default=None,
        gt=0,
    ),

    type_produit: TypeProduit | None = Query(
        default=None,
    ),

    region: str | None = Query(
        default=None,
        max_length=100,
    ),

    province: str | None = Query(
        default=None,
        max_length=100,
    ),

    commune: str | None = Query(
        default=None,
        max_length=100,
    ),

    prix_min: float | None = Query(
        default=None,
        ge=0,
    ),

    prix_max: float | None = Query(
        default=None,
        ge=0,
    ),

    page: int = Query(
        default=1,
        ge=1,
    ),

    limit: int = Query(
        default=20,
        ge=1,
        le=100,
    ),

    db: Session = Depends(get_db),
):
    """
    Recherche publique des annonces.

    Exemples :

        /recherche/annonces?produit=tomate

        /recherche/annonces?produit=mais&region=Centre

        /recherche/annonces?categorie_id=2&prix_max=15000
    """

    try:

        # --------------------------------------------------------
        # RECHERCHE
        # --------------------------------------------------------

        donnees = rechercher_annonces(
            db=db,
            produit=produit,
            produit_id=produit_id,
            famille_id=famille_id,
            categorie_id=categorie_id,
            type_produit=(
                type_produit.value
                if type_produit
                else None
            ),
            region=region,
            province=province,
            commune=commune,
            prix_min=prix_min,
            prix_max=prix_max,
            page=page,
            limit=limit,
        )

        # --------------------------------------------------------
        # NORMALISATION DES RÉSULTATS
        # --------------------------------------------------------

        resultats: list[SearchResult] = []

        for annonce in donnees["resultats"]:

            # ====================================================
            # PRODUIT
            # ====================================================

            produit_obj = getattr(
                annonce,
                "produit",
                None,
            )

            produit_id_result = getattr(
                annonce,
                "produit_id",
                None,
            )

            produit_nom = None
            produit_secteur = None
            produit_type = None

            if produit_obj is not None:

                produit_nom = getattr(
                    produit_obj,
                    "nom",
                    None,
                )

                produit_secteur = getattr(
                    produit_obj,
                    "secteur",
                    None,
                )

                produit_type = getattr(
                    produit_obj,
                    "type_produit",
                    None,
                )

                produit_id_result = getattr(
                    produit_obj,
                    "id",
                    produit_id_result,
                )

            # ----------------------------------------------------
            # Sécurité : nom du produit
            # ----------------------------------------------------

            if produit_nom is not None:

                produit_nom = str(
                    produit_nom
                ).strip()

                if not produit_nom:
                    produit_nom = None

            # ====================================================
            # VENDEUR
            # ====================================================

            vendeur_obj = getattr(
                annonce,
                "vendeur",
                None,
            )

            vendeur_id_result = getattr(
                annonce,
                "vendeur_id",
                None,
            )

            vendeur_nom = None
            vendeur_photo = None
            vendeur_telephone = None

            if vendeur_obj is not None:

                vendeur_id_result = getattr(
                    vendeur_obj,
                    "id",
                    vendeur_id_result,
                )

                vendeur_nom = getattr(
                    vendeur_obj,
                    "nom",
                    None,
                )

                vendeur_photo = getattr(
                    vendeur_obj,
                    "photo_profil",
                    None,
                )

                vendeur_telephone = getattr(
                    vendeur_obj,
                    "telephone",
                    None,
                )

            # ----------------------------------------------------
            # Sécurité : nom du vendeur
            # ----------------------------------------------------

            if vendeur_nom is not None:

                vendeur_nom = str(
                    vendeur_nom
                ).strip()

                if not vendeur_nom:
                    vendeur_nom = None

            # ====================================================
            # IMAGES DE L'ANNONCE
            # ====================================================

            images_result: list[SearchImage] = []

            annonce_images = getattr(
                annonce,
                "images",
                None,
            )

            if annonce_images:

                for image in annonce_images:

                    image_id = getattr(
                        image,
                        "id",
                        None,
                    )

                    image_annonce_id = getattr(
                        image,
                        "annonce_id",
                        annonce.id,
                    )

                    image_url = getattr(
                        image,
                        "url",
                        None,
                    )

                    image_date_creation = getattr(
                        image,
                        "date_creation",
                        None,
                    )

                    # ------------------------------------------------
                    # On ignore les images sans URL valide
                    # ------------------------------------------------

                    if not image_url:
                        continue

                    images_result.append(
                        SearchImage(
                            id=image_id,
                            annonce_id=image_annonce_id,
                            url=str(image_url),
                            date_creation=image_date_creation,
                        )
                    )

            # ====================================================
            # OBJET SEARCH RESULT
            # ====================================================

            resultats.append(
                SearchResult(
                    id=annonce.id,

                    produit_id=produit_id_result,

                    vendeur_id=vendeur_id_result,

                    produit={
                        "id": produit_id_result,
                        "nom": (
                            produit_nom
                            or "Produit sans nom"
                        ),
                        "secteur": produit_secteur,
                        "type_produit": produit_type,
                    },

                    produit_nom=(
                        produit_nom
                        or "Produit sans nom"
                    ),

                    vendeur={
                        "id": vendeur_id_result,
                        "nom": (
                            vendeur_nom
                            or "Vendeur AgroMarket"
                        ),
                        "photo_profil": vendeur_photo,
                        "telephone": vendeur_telephone,
                    },

                    vendeur_nom=(
                        vendeur_nom
                        or "Vendeur AgroMarket"
                    ),

                    prix=float(
                        annonce.prix
                    ),

                    quantite=float(
                        annonce.quantite
                    ),

                    unite=annonce.unite,

                    region=annonce.region,

                    province=annonce.province,

                    commune=annonce.commune,

                    statut=annonce.statut,

                    # ------------------------------------------------
                    # Images
                    # ------------------------------------------------

                    images=images_result,
                )
            )

        # --------------------------------------------------------
        # RÉPONSE
        # --------------------------------------------------------

        return SearchResponse(
            resultats=resultats,

            pagination=SearchPagination(
                page=donnees["page"],
                limit=donnees["limit"],
                total=donnees["total"],
                pages=donnees["pages"],
            ),
        )

    # ============================================================
    # ERREURS DE VALIDATION
    # ============================================================

    except SearchValidationError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    # ============================================================
    # ERREURS SERVICE
    # ============================================================

    except SearchServiceError as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


# ============================================================
# SUGGESTIONS DE PRODUITS
# ============================================================

@router.get(
    "/suggestions",
    response_model=SearchSuggestionResponse,
)
def suggestions(
    q: str = Query(
        ...,
        min_length=1,
        max_length=150,
    ),

    limit: int = Query(
        default=10,
        ge=1,
        le=20,
    ),

    db: Session = Depends(get_db),
):
    """
    Retourne les produits correspondant
    à la saisie de l'utilisateur.

    Exemple :

        /recherche/suggestions?q=tom
    """

    try:

        donnees = obtenir_suggestions(
            db=db,
            recherche=q,
            limit=limit,
        )

        return SearchSuggestionResponse(
            suggestions=[
                SearchSuggestion(
                    produit_id=item[
                        "produit_id"
                    ],
                    nom=item["nom"],
                )
                for item in donnees
            ]
        )

    except SearchServiceError as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )