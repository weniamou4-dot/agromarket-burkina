# ============================================================
# AGROMARKET BURKINA
# PRODUCTS / ROUTES
# Version professionnelle stabilisée
#
# Responsabilités :
# - API HTTP produits
# - API HTTP annonces
# - recherche intelligente
# - géolocalisation
# - itinéraire sécurisé
# - modération
# - gestion des images
# - permissions
#
# IMPORTANT :
#
# La logique métier est centralisée dans :
#
#     products/services.py
#
# Les routes ne doivent pas reproduire la logique métier.
# ============================================================

from math import ceil
from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db

from models import (
    Annonce,
    Utilisateur,
)

from products.schemas import (
    AnnonceCreate,
    AnnonceItineraireResponse,
    AnnonceListResponse,
    AnnonceModerationResponse,
    AnnonceResponse,
    AnnonceSearchRequest,
    AnnonceUpdate,
    ImageUploadResponse,
    PaginationMeta,
    ProduitCreate,
    ProduitListResponse,
    ProduitResponse,
    ProduitSearchRequest,
    ProduitUpdate,
    RechercheResponse,
    SecteurProduit,
)

from products.services import (
    AnnouncementAlreadyProcessedError,
    AnnouncementNotFoundError,
    CategoryNotFoundError,
    ProductAlreadyExistsError,
    ProductNotFoundError,
    ProductPermissionError,
    ProductServiceError,
    ProductValidationError,

    approuver_annonce,

    creer_annonce,
    creer_image_annonce,
    creer_produit_admin,

    lister_annonces_en_attente,
    lister_produits_publics,

    modifier_annonce,
    modifier_produit,

    obtenir_annonce,
    obtenir_annonce_moderation,
    obtenir_annonce_public,
    obtenir_coordonnees_itineraire,

    obtenir_historique_annonce,
    obtenir_produit_public,

    rechercher_annonces_intelligemment,
    rechercher_produits_intelligemment,

    supprimer_annonce,
    supprimer_image_annonce,
    supprimer_produit,

    refuser_annonce,
)

from auth.dependencies import (
    get_current_admin,
    get_current_moderation_user,
    get_current_user,
    get_current_vendeur,
)


# ============================================================
# CONSTANTES
# ============================================================

ROLE_ADMIN = {
    "admin",
    "administrateur",
}

ROLE_MODERATION = {
    "moderateur",
    "admin",
    "administrateur",
}

STATUT_EN_ATTENTE = "en_attente"

STATUT_PUBLIEE = "publiee"

STATUT_REFUSEE = "refusee"

MAX_PAGE_SIZE = 100

MAX_IMAGE_SIZE = 5 * 1024 * 1024

MAX_IMAGES_PAR_ANNONCE = 10

UPLOAD_DIR = Path("uploads")

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


# ============================================================
# ROUTEUR PRODUITS
# ============================================================

product_router = APIRouter(
    prefix="/produits",
    tags=["Produits"],
)


# ============================================================
# ROUTEUR ANNONCES
# ============================================================

annonce_router = APIRouter(
    prefix="/annonces",
    tags=["Annonces"],
)


# ============================================================
# OUTILS
# ============================================================

def traduire_erreur_service(
    erreur: Exception,
) -> HTTPException:
    """
    Convertit une exception métier en
    réponse HTTP cohérente.
    """

    if isinstance(
        erreur,
        (
            ProductNotFoundError,
            AnnouncementNotFoundError,
            CategoryNotFoundError,
        ),
    ):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(erreur),
        )

    if isinstance(
        erreur,
        (
            ProductAlreadyExistsError,
            AnnouncementAlreadyProcessedError,
        ),
    ):
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(erreur),
        )

    if isinstance(
        erreur,
        ProductPermissionError,
    ):
        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(erreur),
        )

    if isinstance(
        erreur,
        ProductValidationError,
    ):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(erreur),
        )

    if isinstance(
        erreur,
        ProductServiceError,
    ):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(erreur),
        )

    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Une erreur interne est survenue.",
    )


def calculer_pagination(
    total: int,
    page: int,
    limit: int,
) -> PaginationMeta:
    """
    Construit les métadonnées de pagination.
    """

    pages = (
        ceil(total / limit)
        if total
        else 0
    )

    return PaginationMeta(
        page=page,
        limit=limit,
        total=total,
        pages=pages,
    )


def obtenir_extension_image(
    file: UploadFile,
) -> str:
    """
    Vérifie le type MIME et retourne
    l'extension correspondante.
    """

    extension = ALLOWED_IMAGE_TYPES.get(
        file.content_type
    )

    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Format d'image non autorisé. "
                "Utilisez JPG, PNG ou WEBP."
            ),
        )

    return extension


def verifier_signature_image(
    contenu: bytes,
    content_type: str | None,
) -> None:
    """
    Vérifie la signature binaire réelle du fichier.

    Cette vérification empêche notamment de simplement
    renommer un fichier arbitraire en .jpg, .png ou .webp.
    """

    if not contenu:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le fichier image est vide.",
        )

    if content_type == "image/jpeg":

        if not contenu.startswith(
            b"\xff\xd8\xff"
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le fichier JPEG est invalide.",
            )

    elif content_type == "image/png":

        if not contenu.startswith(
            b"\x89PNG\r\n\x1a\n"
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le fichier PNG est invalide.",
            )

    elif content_type == "image/webp":

        if not (
            contenu[:4] == b"RIFF"
            and contenu[8:12] == b"WEBP"
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le fichier WEBP est invalide.",
            )


def supprimer_fichier(
    chemin: Path,
) -> None:
    """
    Supprime silencieusement un fichier s'il existe.
    """

    try:

        if chemin.exists():
            chemin.unlink()

    except OSError:
        pass


# ============================================================
# PRODUITS
# ============================================================


# ============================================================
# LISTE DES PRODUITS PUBLICS
# ============================================================

@product_router.get(
    "/",
    response_model=ProduitListResponse,
)
def lister_produits(
    categorie_id: int | None = Query(
        default=None,
        gt=0,
    ),

    secteur: SecteurProduit | None = Query(
        default=None,
    ),

    type_produit: str | None = Query(
        default=None,
    ),

    page: int = Query(
        default=1,
        ge=1,
    ),

    limit: int = Query(
        default=20,
        ge=1,
        le=MAX_PAGE_SIZE,
    ),

    db: Session = Depends(get_db),
):
    """
    Liste paginée des produits validés.

    Filtres :
    - catégorie ;
    - secteur ;
    - type de produit.

    Brut / Transformé est applicable uniquement
    aux secteurs agricole et élevage.
    """

    try:

        produits = lister_produits_publics(
            db=db,
            categorie_id=categorie_id,
            type_produit=type_produit,
            secteur=secteur,
        )

    except ProductServiceError as erreur:

        raise traduire_erreur_service(
            erreur
        )

    total = len(produits)

    debut = (
        (page - 1)
        * limit
    )

    fin = debut + limit

    produits_page = produits[
        debut:fin
    ]

    return ProduitListResponse(
        produits=produits_page,
        pagination=calculer_pagination(
            total,
            page,
            limit,
        ),
    )


# ============================================================
# RECHERCHE INTELLIGENTE PRODUITS
# ============================================================

@product_router.post(
    "/recherche-intelligente",
    response_model=RechercheResponse,
)
def recherche_intelligente_produits(
    data: ProduitSearchRequest,

    db: Session = Depends(get_db),
):
    """
    Recherche intelligente des produits.

    Pipeline métier :
        recherche
            ↓
        normalisation
            ↓
        RapidFuzz
            ↓
        score
            ↓
        correction éventuelle
    """

    try:

        resultat = rechercher_produits_intelligemment(
            db=db,
            recherche=data.recherche or "",
            categorie_id=data.categorie_id,
            type_produit=data.type_produit,
            limit=data.limit,
            secteur=data.secteur,
        )

    except ProductServiceError as erreur:

        raise traduire_erreur_service(
            erreur
        )

    produits = resultat.get(
        "produits",
        [],
    )

    scores = resultat.get(
        "scores",
        {},
    )

    return RechercheResponse(
        recherche_originale=(
            resultat.get(
                "recherche_originale",
                data.recherche or "",
            )
        ),

        correction=(
            resultat.get(
                "correction"
            )
        ),

        produits=produits,

        scores={
            str(produit.id): float(
                scores.get(
                    produit.id,
                    0,
                )
            )
            for produit in produits
        },
    )


# ============================================================
# CONSULTER UN PRODUIT PUBLIC
# ============================================================

@product_router.get(
    "/{produit_id}",
    response_model=ProduitResponse,
)
def consulter_produit(
    produit_id: int,

    db: Session = Depends(get_db),
):
    """
    Retourne un produit validé.
    """

    try:

        return obtenir_produit_public(
            db,
            produit_id,
        )

    except ProductServiceError as erreur:

        raise traduire_erreur_service(
            erreur
        )


# ============================================================
# CRÉER UN PRODUIT
# ADMIN
# ============================================================

@product_router.post(
    "/",
    response_model=ProduitResponse,
    status_code=status.HTTP_201_CREATED,
)
def creer_produit(
    data: ProduitCreate,

    current_admin: Utilisateur = Depends(
        get_current_admin
    ),

    db: Session = Depends(get_db),
):
    """
    Création administrative d'un produit.

    Le produit créé par l'administrateur
    est validé directement par le service.
    """

    try:

        produit = creer_produit_admin(
            db,
            data,
        )

        db.commit()

        db.refresh(
            produit
        )

        return produit

    except ProductServiceError as erreur:

        db.rollback()

        raise traduire_erreur_service(
            erreur
        )

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Impossible de créer "
                "le produit."
            ),
        )


# ============================================================
# MODIFIER UN PRODUIT
# ADMIN
# ============================================================

@product_router.patch(
    "/{produit_id}",
    response_model=ProduitResponse,
)
def modifier_produit_route(
    produit_id: int,

    data: ProduitUpdate,

    current_admin: Utilisateur = Depends(
        get_current_admin
    ),

    db: Session = Depends(get_db),
):
    """
    Modification administrative d'un produit.
    """

    try:

        produit = modifier_produit(
            db,
            produit_id,
            data,
        )

        db.commit()

        db.refresh(
            produit
        )

        return produit

    except ProductServiceError as erreur:

        db.rollback()

        raise traduire_erreur_service(
            erreur
        )

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Impossible de modifier "
                "le produit."
            ),
        )


# ============================================================
# SUPPRIMER UN PRODUIT
# ADMIN
# ============================================================

@product_router.delete(
    "/{produit_id}",
)
def supprimer_produit_route(
    produit_id: int,

    current_admin: Utilisateur = Depends(
        get_current_admin
    ),

    db: Session = Depends(get_db),
):
    """
    Supprime un produit non utilisé.
    """

    try:

        supprimer_produit(
            db,
            produit_id,
        )

        db.commit()

        return {
            "message": (
                "Produit supprimé avec succès."
            ),
            "produit_id": produit_id,
        }

    except ProductServiceError as erreur:

        db.rollback()

        raise traduire_erreur_service(
            erreur
        )

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Impossible de supprimer "
                "le produit."
            ),
        )


# ============================================================
# ANNONCES
# ============================================================


# ============================================================
# LISTE DES ANNONCES PUBLIQUES
# ============================================================

@annonce_router.get(
    "/",
    response_model=AnnonceListResponse,
)
def lister_annonces(
    recherche: str | None = Query(
        default=None,
        max_length=150,
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

    produit_id: int | None = Query(
        default=None,
        gt=0,
    ),

    categorie_id: int | None = Query(
        default=None,
        gt=0,
    ),

    secteur: SecteurProduit | None = Query(
        default=None,
    ),

    type_produit: str | None = Query(
        default=None,
    ),

    prix_min: float | None = Query(
        default=None,
        ge=0,
    ),

    prix_max: float | None = Query(
        default=None,
        ge=0,
    ),

    latitude: float | None = Query(
        default=None,
        ge=-90,
        le=90,
    ),

    longitude: float | None = Query(
        default=None,
        ge=-180,
        le=180,
    ),

    rayon_km: float | None = Query(
        default=None,
        gt=0,
        le=500,
    ),

    page: int = Query(
        default=1,
        ge=1,
    ),

    limit: int = Query(
        default=20,
        ge=1,
        le=MAX_PAGE_SIZE,
    ),

    db: Session = Depends(get_db),
):
    """
    Liste et filtre les annonces publiques.

    Fonctionnalités :
    - recherche texte ;
    - région ;
    - province ;
    - commune ;
    - catégorie ;
    - produit ;
    - secteur ;
    - type ;
    - prix ;
    - position ;
    - rayon.
    """

    try:

        # ----------------------------------------------------
        # Le service retourne au maximum les candidats
        # nécessaires pour construire la page demandée.
        #
        # Limite de sécurité globale :
        # jamais plus de 200 annonces candidates.
        # ----------------------------------------------------

        nombre_demande = min(
            page * limit,
            200,
        )

        resultat = rechercher_annonces_intelligemment(
            db=db,
            recherche=recherche,
            region=region,
            province=province,
            commune=commune,
            produit_id=produit_id,
            categorie_id=categorie_id,
            type_produit=type_produit,
            prix_min=prix_min,
            prix_max=prix_max,
            latitude=latitude,
            longitude=longitude,
            rayon_km=rayon_km,
            limit=nombre_demande,
            secteur=secteur,
        )

        annonces = resultat.get(
            "annonces",
            [],
        )

        # ----------------------------------------------------
        # Pagination locale des résultats retournés
        # par le service.
        # ----------------------------------------------------

        total_estime = len(
            annonces
        )

        debut = (
            (page - 1)
            * limit
        )

        fin = debut + limit

        annonces_page = annonces[
            debut:fin
        ]

        return AnnonceListResponse(
            annonces=annonces_page,

            pagination=calculer_pagination(
                total_estime,
                page,
                limit,
            ),
        )

    except ProductServiceError as erreur:

        raise traduire_erreur_service(
            erreur
        )


# ============================================================
# RECHERCHE INTELLIGENTE DES ANNONCES
# ============================================================

@annonce_router.post(
    "/recherche-intelligente",
    response_model=AnnonceListResponse,
)
def recherche_intelligente_annonces(
    data: AnnonceSearchRequest,

    db: Session = Depends(get_db),
):
    """
    Recherche intelligente des annonces.

    Contrairement à la recherche des produits,
    cette route retourne directement des annonces.

    Elle ne transforme donc pas les annonces
    en objets ProduitResponse.
    """

    try:

        resultat = rechercher_annonces_intelligemment(
            db=db,

            recherche=data.recherche,

            region=data.region,

            province=data.province,

            commune=data.commune,

            produit_id=data.produit_id,

            categorie_id=data.categorie_id,

            type_produit=data.type_produit,

            prix_min=data.prix_min,

            prix_max=data.prix_max,

            latitude=data.latitude,

            longitude=data.longitude,

            rayon_km=data.rayon_km,

            limit=data.limit,

            secteur=data.secteur,
        )

    except ProductServiceError as erreur:

        raise traduire_erreur_service(
            erreur
        )

    annonces = resultat.get(
        "annonces",
        [],
    )

    # --------------------------------------------------------
    # Le service peut fournir des scores de pertinence.
    #
    # Le schéma public des annonces ne les expose pas
    # actuellement. On retourne donc les annonces elles-mêmes
    # sans fabriquer un format non prévu par les schemas.
    # --------------------------------------------------------

    return AnnonceListResponse(
        annonces=annonces,

        pagination=calculer_pagination(
            len(annonces),
            1,
            max(len(annonces), 1),
        ),
    )


# ============================================================
# CRÉER UNE ANNONCE
# VENDEUR
# ============================================================

@annonce_router.post(
    "/",
    response_model=AnnonceResponse,
    status_code=status.HTTP_201_CREATED,
)
def creer_annonce_route(
    data: AnnonceCreate,

    current_vendeur: Utilisateur = Depends(
        get_current_vendeur
    ),

    db: Session = Depends(get_db),
):
    """
    Crée une annonce.

    Le vendeur courant est automatiquement
    utilisé comme propriétaire.

    La logique métier et les règles de localisation
    sont gérées par products/services.py.
    """

    try:

        annonce = creer_annonce(
            db=db,
            vendeur=current_vendeur,
            data=data,
        )

        db.commit()

        db.refresh(
            annonce
        )

        return obtenir_annonce(
            db,
            annonce.id,
        )

    except ProductServiceError as erreur:

        db.rollback()

        raise traduire_erreur_service(
            erreur
        )

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Impossible de créer "
                "l'annonce."
            ),
        )


# ============================================================
# RECHERCHE PAR PROXIMITÉ
#
# IMPORTANT :
#
# Cette route doit être placée AVANT :
#
#     /{annonce_id}
#
# ============================================================

@annonce_router.get(
    "/proximite",
    response_model=list[AnnonceResponse],
)
def annonces_proximite(
    latitude: float = Query(
        ...,
        ge=-90,
        le=90,
    ),

    longitude: float = Query(
        ...,
        ge=-180,
        le=180,
    ),

    rayon_km: float = Query(
        default=50,
        gt=0,
        le=500,
    ),

    limit: int = Query(
        default=20,
        ge=1,
        le=MAX_PAGE_SIZE,
    ),

    secteur: SecteurProduit | None = Query(
        default=None,
    ),

    type_produit: str | None = Query(
        default=None,
    ),

    db: Session = Depends(get_db),
):
    """
    Retourne les annonces publiées proches
    d'une position.

    Le calcul de distance est effectué
    côté backend.

    Les coordonnées exactes des annonces
    ne sont pas exposées dans cette réponse.
    """

    try:

        resultat = rechercher_annonces_intelligemment(
            db=db,

            recherche=None,

            latitude=latitude,

            longitude=longitude,

            rayon_km=rayon_km,

            limit=limit,

            secteur=secteur,

            type_produit=type_produit,
        )

    except ProductServiceError as erreur:

        raise traduire_erreur_service(
            erreur
        )

    return resultat.get(
        "annonces",
        [],
    )


# ============================================================
# MODÉRATION — LISTE
#
# IMPORTANT :
#
# Cette route doit être placée avant :
#
#     /{annonce_id}
#
# ============================================================

@annonce_router.get(
    "/moderation/en-attente",
    response_model=list[
        AnnonceModerationResponse
    ],
)
def lister_annonces_moderation(
    current_user: Utilisateur = Depends(
        get_current_moderation_user
    ),

    db: Session = Depends(get_db),
):
    """
    Liste les annonces en attente de modération.

    Les coordonnées exactes peuvent être retournées
    ici car l'accès est réservé aux utilisateurs
    autorisés à la modération.
    """

    try:

        return lister_annonces_en_attente(
            db
        )

    except ProductServiceError as erreur:

        raise traduire_erreur_service(
            erreur
        )


# ============================================================
# MODÉRATION — DÉTAIL
# ============================================================

@annonce_router.get(
    "/moderation/{annonce_id}",
    response_model=AnnonceModerationResponse,
)
def consulter_annonce_moderation_route(
    annonce_id: int,

    current_user: Utilisateur = Depends(
        get_current_moderation_user
    ),

    db: Session = Depends(get_db),
):
    """
    Consultation détaillée d'une annonce
    avant modération.

    Les coordonnées exactes sont réservées
    à la modération autorisée.
    """

    try:

        return obtenir_annonce_moderation(
            db,
            annonce_id,
        )

    except ProductServiceError as erreur:

        raise traduire_erreur_service(
            erreur
        )


# ============================================================
# ITINÉRAIRE PUBLIC SÉCURISÉ
#
# IMPORTANT :
#
# Les coordonnées exactes ne sont retournées
# que si le service autorise l'itinéraire.
#
# Une localisation de type :
#
#     domicile
#
# ne peut JAMAIS être utilisée pour un itinéraire public.
# ============================================================

@annonce_router.get(
    "/{annonce_id}/itineraire",
    response_model=AnnonceItineraireResponse,
)
def itineraire_annonce(
    annonce_id: int,

    db: Session = Depends(get_db),
):
    """
    Retourne les coordonnées nécessaires
    pour construire un itinéraire.

    Sécurité :
    - annonce publiée obligatoire ;
    - localisation publique obligatoire ;
    - coordonnées obligatoires ;
    - domicile interdit ;
    - seules les localisations publiques prévues
      pour recevoir des visiteurs sont autorisées.
    """

    try:

        return obtenir_coordonnees_itineraire(
            db,
            annonce_id,
        )

    except ProductServiceError as erreur:

        raise traduire_erreur_service(
            erreur
        )


# ============================================================
# MODÉRATION — APPROBATION
# ============================================================

@annonce_router.patch(
    "/{annonce_id}/approuver",
)
def approuver_annonce_route(
    annonce_id: int,

    current_user: Utilisateur = Depends(
        get_current_moderation_user
    ),

    db: Session = Depends(get_db),
):
    """
    Approuve une annonce.

    Le service effectue :
    - publication ;
    - validation du produit ;
    - historique ;
    - notification du vendeur.
    """

    try:

        annonce = approuver_annonce(
            db=db,
            annonce_id=annonce_id,
            moderateur=current_user,
        )

        db.commit()

        db.refresh(
            annonce
        )

        return {
            "message": (
                "Annonce approuvée "
                "avec succès."
            ),

            "annonce_id": annonce.id,

            "produit_id": annonce.produit_id,

            "statut": annonce.statut,

            "produit_valide": (
                annonce.produit.est_valide
                if annonce.produit
                else False
            ),
        }

    except ProductServiceError as erreur:

        db.rollback()

        raise traduire_erreur_service(
            erreur
        )

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Impossible d'approuver "
                "l'annonce."
            ),
        )


# ============================================================
# MODÉRATION — REFUS
# ============================================================

@annonce_router.patch(
    "/{annonce_id}/refuser",
)
def refuser_annonce_route(
    annonce_id: int,

    motif: str | None = Query(
        default=None,
        max_length=2000,
    ),

    current_user: Utilisateur = Depends(
        get_current_moderation_user
    ),

    db: Session = Depends(get_db),
):
    """
    Refuse une annonce.

    Le motif est transmis au service,
    qui gère l'historique et la notification.
    """

    try:

        annonce = refuser_annonce(
            db=db,
            annonce_id=annonce_id,
            moderateur=current_user,
            motif=motif,
        )

        db.commit()

        db.refresh(
            annonce
        )

        return {
            "message": "Annonce refusée.",

            "annonce_id": annonce.id,

            "produit_id": annonce.produit_id,

            "statut": annonce.statut,

            "motif": motif,
        }

    except ProductServiceError as erreur:

        db.rollback()

        raise traduire_erreur_service(
            erreur
        )

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Impossible de refuser "
                "l'annonce."
            ),
        )


# ============================================================
# HISTORIQUE D'UNE ANNONCE
# ============================================================

@annonce_router.get(
    "/{annonce_id}/historique",
)
def historique_annonce(
    annonce_id: int,

    current_user: Utilisateur = Depends(
        get_current_moderation_user
    ),

    db: Session = Depends(get_db),
):
    """
    Retourne l'historique de modération
    d'une annonce.
    """

    try:

        historique = obtenir_historique_annonce(
            db,
            annonce_id,
        )

        return {
            "annonce_id": annonce_id,
            "historique": historique,
        }

    except ProductServiceError as erreur:

        raise traduire_erreur_service(
            erreur
        )


# ============================================================
# AJOUTER UNE IMAGE
# VENDEUR / ADMIN
# ============================================================

@annonce_router.post(
    "/{annonce_id}/images",
    response_model=ImageUploadResponse,
)
async def ajouter_image(
    annonce_id: int,

    file: UploadFile = File(...),

    current_user: Utilisateur = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db),
):
    """
    Upload sécurisé d'une image d'annonce.
    """

    # --------------------------------------------------------
    # RÉCUPÉRATION DE L'ANNONCE
    # --------------------------------------------------------

    try:

        annonce = obtenir_annonce(
            db,
            annonce_id,
        )

    except ProductServiceError as erreur:

        raise traduire_erreur_service(
            erreur
        )

    # --------------------------------------------------------
    # AUTORISATION
    # --------------------------------------------------------

    if not (
        annonce.vendeur_id
        == current_user.id
        or current_user.role
        in ROLE_ADMIN
    ):

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Vous n'êtes pas autorisé "
                "à ajouter une image."
            ),
        )

    # --------------------------------------------------------
    # LIMITE D'IMAGES
    # --------------------------------------------------------

    if (
        len(annonce.images)
        >= MAX_IMAGES_PAR_ANNONCE
    ):

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Une annonce ne peut pas "
                f"contenir plus de "
                f"{MAX_IMAGES_PAR_ANNONCE} images."
            ),
        )

    # --------------------------------------------------------
    # FORMAT
    # --------------------------------------------------------

    extension = obtenir_extension_image(
        file
    )

    # --------------------------------------------------------
    # LECTURE
    # --------------------------------------------------------

    contenu = await file.read()

    if len(contenu) > MAX_IMAGE_SIZE:

        raise HTTPException(
            status_code=(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
            ),
            detail=(
                "L'image ne doit pas dépasser 5 Mo."
            ),
        )

    # --------------------------------------------------------
    # SIGNATURE BINAIRE
    # --------------------------------------------------------

    verifier_signature_image(
        contenu,
        file.content_type,
    )

    # --------------------------------------------------------
    # NOM DE FICHIER SÉCURISÉ
    # --------------------------------------------------------

    nom_fichier = (
        f"{uuid4().hex}"
        f"{extension}"
    )

    chemin = (
        UPLOAD_DIR
        / nom_fichier
    )

    url = (
        f"/uploads/{nom_fichier}"
    )

    # --------------------------------------------------------
    # ÉCRITURE SUR DISQUE
    # --------------------------------------------------------

    try:

        with open(
            chemin,
            "wb",
        ) as fichier:

            fichier.write(
                contenu
            )

    except OSError:

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Impossible d'enregistrer "
                "l'image."
            ),
        )

    # --------------------------------------------------------
    # ENREGISTREMENT EN BASE
    # --------------------------------------------------------

    try:

        image = creer_image_annonce(
            db=db,
            annonce_id=annonce_id,
            url=url,
        )

        db.commit()

        db.refresh(
            image
        )

    except ProductServiceError as erreur:

        db.rollback()

        supprimer_fichier(
            chemin
        )

        raise traduire_erreur_service(
            erreur
        )

    except IntegrityError:

        db.rollback()

        supprimer_fichier(
            chemin
        )

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Impossible d'enregistrer "
                "l'image dans la base."
            ),
        )

    except Exception:

        db.rollback()

        supprimer_fichier(
            chemin
        )

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Impossible d'enregistrer "
                "l'image dans la base."
            ),
        )

    # --------------------------------------------------------
    # RÉPONSE
    # --------------------------------------------------------

    return ImageUploadResponse(
        id=image.id,

        annonce_id=image.annonce_id,

        url=image.url,

        message=(
            "Image ajoutée avec succès."
        ),
    )


# ============================================================
# SUPPRIMER UNE IMAGE
# VENDEUR / ADMIN
# ============================================================

@annonce_router.delete(
    "/{annonce_id}/images/{image_id}",
)
def supprimer_image(
    annonce_id: int,

    image_id: int,

    current_user: Utilisateur = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db),
):
    """
    Supprime une image d'annonce.
    """

    # --------------------------------------------------------
    # RÉCUPÉRATION DE L'ANNONCE
    # --------------------------------------------------------

    try:

        annonce = obtenir_annonce(
            db,
            annonce_id,
        )

    except ProductServiceError as erreur:

        raise traduire_erreur_service(
            erreur
        )

    # --------------------------------------------------------
    # AUTORISATION
    # --------------------------------------------------------

    if not (
        annonce.vendeur_id
        == current_user.id
        or current_user.role
        in ROLE_ADMIN
    ):

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Vous n'êtes pas autorisé "
                "à supprimer cette image."
            ),
        )

    # --------------------------------------------------------
    # SUPPRESSION BASE + RÉCUPÉRATION FICHIER
    # --------------------------------------------------------

    try:

        image, chemin = supprimer_image_annonce(
            db=db,
            annonce_id=annonce_id,
            image_id=image_id,
        )

        db.commit()

    except ProductServiceError as erreur:

        db.rollback()

        raise traduire_erreur_service(
            erreur
        )

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Impossible de supprimer "
                "l'image."
            ),
        )

    except Exception:

        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Impossible de supprimer "
                "l'image."
            ),
        )

    # --------------------------------------------------------
    # SUPPRESSION DU FICHIER PHYSIQUE
    # --------------------------------------------------------

    if chemin is not None:

        supprimer_fichier(
            chemin
        )

    return {
        "message": (
            "Image supprimée avec succès."
        ),

        "image_id": image_id,

        "annonce_id": annonce_id,
    }


# ============================================================
# CONSULTER UNE ANNONCE PUBLIQUE
#
# IMPORTANT :
#
# Cette route est volontairement placée APRÈS
# toutes les routes statiques / spécialisées.
# ============================================================

@annonce_router.get(
    "/{annonce_id}",
    response_model=AnnonceResponse,
)
def consulter_annonce(
    annonce_id: int,

    db: Session = Depends(get_db),
):
    """
    Retourne uniquement une annonce publiée.

    Les coordonnées GPS exactes ne sont pas
    exposées dans la réponse publique.
    """

    try:

        return obtenir_annonce_public(
            db,
            annonce_id,
        )

    except ProductServiceError as erreur:

        raise traduire_erreur_service(
            erreur
        )


# ============================================================
# MODIFIER UNE ANNONCE
# VENDEUR / ADMIN
# ============================================================

@annonce_router.patch(
    "/{annonce_id}",
    response_model=AnnonceResponse,
)
def modifier_annonce_route(
    annonce_id: int,

    data: AnnonceUpdate,

    current_user: Utilisateur = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db),
):
    """
    Modifie une annonce.

    Une modification effectuée par le vendeur
    peut provoquer une remise en modération.

    La cohérence finale de la localisation
    est vérifiée dans le service après fusion
    avec les valeurs existantes.
    """

    try:

        annonce = modifier_annonce(
            db=db,
            annonce_id=annonce_id,
            current_user=current_user,
            data=data,
        )

        db.commit()

        db.refresh(
            annonce
        )

        return obtenir_annonce(
            db,
            annonce.id,
        )

    except ProductServiceError as erreur:

        db.rollback()

        raise traduire_erreur_service(
            erreur
        )

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Impossible de modifier "
                "l'annonce."
            ),
        )


# ============================================================
# SUPPRIMER UNE ANNONCE
# VENDEUR / ADMIN
# ============================================================

@annonce_router.delete(
    "/{annonce_id}",
)
def supprimer_annonce_route(
    annonce_id: int,

    current_user: Utilisateur = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db),
):
    """
    Supprime une annonce ainsi que
    les fichiers images associés.
    """

    try:

        chemins = supprimer_annonce(
            db=db,
            annonce_id=annonce_id,
            current_user=current_user,
        )

        db.commit()

    except ProductServiceError as erreur:

        db.rollback()

        raise traduire_erreur_service(
            erreur
        )

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Impossible de supprimer "
                "l'annonce."
            ),
        )

    except Exception:

        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Une erreur est survenue "
                "lors de la suppression."
            ),
        )

    # --------------------------------------------------------
    # SUPPRESSION DES FICHIERS
    # --------------------------------------------------------

    for chemin in chemins:

        supprimer_fichier(
            chemin
        )

    return {
        "message": (
            "Annonce supprimée avec succès."
        ),

        "annonce_id": annonce_id,
    }