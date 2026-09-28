# ============================================================
# AGROMARKET BURKINA
# ORDERS / ROUTES
# Version professionnelle stabilisée
#
# Responsabilités :
# - API HTTP des commandes
# - création
# - consultation
# - modification
# - annulation
# - changement de statut
# - espace acheteur
# - espace vendeur
# - administration
# - statistiques
#
# IMPORTANT :
# La logique métier se trouve dans :
#
#     orders/services.py
#
# Les routes servent uniquement de couche HTTP.
# ============================================================

from math import ceil

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db

from models import (
    Annonce,
    Commande,
    Utilisateur,
)

from orders.schemas import (
    CommandeActionResponse,
    CommandeCreate,
    CommandeFilter,
    CommandePagination,
    CommandeResponse,
    CommandeResume,
    CommandeStatusUpdate,
    CommandeUpdate,
    CommandesAcheteurResponse,
    CommandesAdminResponse,
    CommandesStatsResponse,
    CommandesVendeurResponse,
    CommandeAnnonceResume,
    StatutCommande,
    CommandeCancelRequest,
)

from orders.services import (
    OrderAnnouncementNotFoundError,
    OrderConflictError,
    OrderNotFoundError,
    OrderPermissionError,
    OrderQuantityError,
    OrderServiceError,
    OrderStatusError,
    OrderValidationError,

    annuler_commande,
    changer_statut_commande,
    construire_resume_commande,
    creer_commande,
    lister_commandes_admin,
    lister_commandes_acheteur,
    lister_commandes_vendeur,
    modifier_commande,
    obtenir_annonce_commandable,
    obtenir_commande,
    paginer_commandes,
    statistiques_commandes,
    verifier_acces_commande,
    verifier_annonce_avant_commande,
)

from auth.dependencies import (
    get_current_admin,
    get_current_user,
    get_current_vendeur,
)


# ============================================================
# ROUTEUR
# ============================================================

order_router = APIRouter(
    prefix="/commandes",
    tags=["Commandes"],
)


# ============================================================
# CONSTANTES
# ============================================================

MAX_PAGE_SIZE = 100


# ============================================================
# CONVERSION DES EXCEPTIONS
# ============================================================

def traduire_erreur_service(
    erreur: Exception,
) -> HTTPException:
    """
    Transforme une exception métier en réponse HTTP.
    """

    if isinstance(
        erreur,
        (
            OrderNotFoundError,
            OrderAnnouncementNotFoundError,
        ),
    ):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(erreur),
        )

    if isinstance(
        erreur,
        (
            OrderPermissionError,
        ),
    ):
        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(erreur),
        )

    if isinstance(
        erreur,
        (
            OrderQuantityError,
            OrderValidationError,
            OrderStatusError,
            OrderConflictError,
        ),
    ):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(erreur),
        )

    if isinstance(
        erreur,
        OrderServiceError,
    ):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(erreur),
        )

    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Une erreur interne est survenue.",
    )


# ============================================================
# CONSTRUIRE RÉPONSE COMMANDE
# ============================================================

def construire_commande_response(
    commande: Commande,
) -> CommandeResponse:
    """
    Transforme une commande SQLAlchemy en schéma Pydantic.

    Nécessaire parce que CommandeAnnonceResume possède
    des champs calculés à partir de plusieurs relations.
    """

    resume = (
        construire_resume_commande(
            commande
        )
    )

    annonce_data = (
        resume.get(
            "annonce"
        )
    )

    annonce_resume = None

    if annonce_data is not None:

        annonce_resume = (
            CommandeAnnonceResume(
                id=annonce_data["id"],

                produit_nom=(
                    annonce_data[
                        "produit_nom"
                    ]
                ),

                vendeur_nom=(
                    annonce_data[
                        "vendeur_nom"
                    ]
                ),

                prix_unitaire=(
                    annonce_data[
                        "prix_unitaire"
                    ]
                ),

                unite=(
                    annonce_data[
                        "unite"
                    ]
                ),

                region=(
                    annonce_data[
                        "region"
                    ]
                ),
            )
        )

    return CommandeResponse(

        id=commande.id,

        acheteur_id=commande.acheteur_id,

        annonce_id=commande.annonce_id,

        quantite=float(
            commande.quantite
        ),

        prix_unitaire=float(
            commande.prix_unitaire
        ),

        prix_total=float(
            commande.prix_total
        ),

        statut=(
            commande.statut
        ),

        date_commande=(
            commande.date_commande
        ),

        annonce=annonce_resume,
    )


# ============================================================
# CONSTRUIRE RÉSUMÉ COMMANDE
# ============================================================

def construire_commande_resume(
    commande: Commande,
) -> CommandeResume:
    """
    Transforme une commande SQLAlchemy en résumé
    prêt à être envoyé au frontend.

    Les informations calculées sont construites
    explicitement afin d'éviter de dépendre d'un
    simple model_validate() sur les relations SQLAlchemy.
    """

    annonce = commande.annonce

    produit = (
        annonce.produit
        if annonce is not None
        else None
    )

    vendeur = (
        annonce.vendeur
        if annonce is not None
        else None
    )

    acheteur = commande.acheteur

    acheteur_nom = (
        acheteur.nom
        if acheteur is not None
        and acheteur.nom
        else f"Acheteur #{commande.acheteur_id}"
    )

    annonce_resume = None

    if annonce is not None:
        annonce_resume = CommandeAnnonceResume(
            id=annonce.id,

            produit_nom=(
                produit.nom
                if produit is not None
                and produit.nom
                else "Produit"
            ),

            vendeur_nom=(
                vendeur.nom
                if vendeur is not None
                and vendeur.nom
                else "Vendeur"
            ),

            prix_unitaire=float(
                annonce.prix
            ),

            unite=annonce.unite,

            region=annonce.region,
        )

    return CommandeResume(
        id=commande.id,

        acheteur_id=commande.acheteur_id,

        acheteur_nom=acheteur_nom,

        annonce_id=commande.annonce_id,

        quantite=float(
            commande.quantite
        ),

        prix_unitaire=float(
            commande.prix_unitaire
        ),

        prix_total=float(
            commande.prix_total
        ),

        statut=commande.statut,

        date_commande=commande.date_commande,

        annonce=annonce_resume,
    )

# ============================================================
# PAGINATION RESPONSE
# ============================================================

def construire_pagination(
    total: int,
    page: int,
    limit: int,
) -> CommandePagination:
    """
    Construit les informations de pagination.
    """

    pages = (
        ceil(
            total / limit
        )
        if total > 0
        else 0
    )

    return CommandePagination(
        page=page,
        limit=limit,
        total=total,
        pages=pages,
    )


# ============================================================
# CRÉER UNE COMMANDE
# ACHETEUR / UTILISATEUR CONNECTÉ
# ============================================================

@order_router.post(
    "/",
    response_model=CommandeActionResponse,
    status_code=status.HTTP_201_CREATED,
)
def creer_nouvelle_commande(
    data: CommandeCreate,

    current_user: Utilisateur = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db),
):
    """
    Crée une nouvelle commande.

    Le frontend fournit seulement :
    - annonce_id
    - quantite

    Le backend détermine :
    - acheteur
    - prix unitaire
    - prix total
    - statut
    """

    try:

        commande = (
            creer_commande(
                db=db,
                acheteur=current_user,
                data=data,
            )
        )

        db.commit()

        db.refresh(
            commande
        )

        # Recharge les relations nécessaires.
        commande = (
            obtenir_commande(
                db,
                commande.id,
            )
        )

        return CommandeActionResponse(
            message=(
                "Commande créée avec succès."
            ),
            commande=(
                construire_commande_response(
                    commande
                )
            ),
        )

    except OrderServiceError as erreur:

        db.rollback()

        raise traduire_erreur_service(
            erreur
        )

    except IntegrityError as erreur:
        db.rollback()

        print("=" * 80)
        print("ERREUR INTEGRITYERROR — CRÉATION COMMANDE")
        print(f"Type : {type(erreur).__name__}")
        print(f"Erreur : {erreur}")
        print(f"Origine : {erreur.orig}")
        print("=" * 80)

        raise HTTPException(
            status_code=409,
            detail="Impossible de créer la commande.",
        )

    except Exception:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Une erreur interne est survenue "
                "lors de la création de la commande."
            ),
        )


# ============================================================
# VÉRIFIER UNE ANNONCE AVANT COMMANDE
# ============================================================

@order_router.get(
    "/disponibilite/{annonce_id}"
)
def verifier_disponibilite_commande(
    annonce_id: int,

    current_user: Utilisateur = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db),
):
    """
    Permet au frontend de vérifier la disponibilité
    avant d'afficher le formulaire de commande.
    """

    try:

        return (
            verifier_annonce_avant_commande(
                db,
                annonce_id,
            )
        )

    except OrderServiceError as erreur:

        raise traduire_erreur_service(
            erreur
        )


# ============================================================
# MES COMMANDES — ACHETEUR
# ============================================================

@order_router.get(
    "/mes",
    response_model=CommandesAcheteurResponse,
)
def mes_commandes(
    statut: StatutCommande | None = Query(
        default=None
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

    current_user: Utilisateur = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db),
):
    """
    Retourne les commandes de l'utilisateur connecté.
    """

    try:

        commandes = (
            lister_commandes_acheteur(
                db=db,
                acheteur_id=current_user.id,
                statut=statut,
            )
        )

        resultat = (
            paginer_commandes(
                commandes,
                page,
                limit,
            )
        )

        resumes = [
            construire_commande_resume(
                commande
            )
            for commande
            in resultat["commandes"]
        ]

        return CommandesAcheteurResponse(

            commandes=resumes,

            pagination=(
                construire_pagination(
                    resultat["total"],
                    page,
                    limit,
                )
            ),
        )

    except OrderServiceError as erreur:

        raise traduire_erreur_service(
            erreur
        )


# ============================================================
# COMMANDES REÇUES — VENDEUR
# ============================================================

@order_router.get(
    "/vendeur",
    response_model=CommandesVendeurResponse,
)
def commandes_du_vendeur(
    statut: StatutCommande | None = Query(
        default=None
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

    current_vendeur: Utilisateur = Depends(
        get_current_vendeur
    ),

    db: Session = Depends(get_db),
):
    """
    Retourne les commandes reçues par le vendeur.
    """

    try:

        commandes = (
            lister_commandes_vendeur(
                db=db,
                vendeur_id=current_vendeur.id,
                statut=statut,
            )
        )

        resultat = (
            paginer_commandes(
                commandes,
                page,
                limit,
            )
        )

        resumes = [
            construire_commande_resume(
                commande
            )
            for commande
            in resultat["commandes"]
        ]

        return CommandesVendeurResponse(

            commandes=resumes,

            pagination=(
                construire_pagination(
                    resultat["total"],
                    page,
                    limit,
                )
            ),
        )

    except OrderServiceError as erreur:

        raise traduire_erreur_service(
            erreur
        )


# ============================================================
# ADMIN — TOUTES LES COMMANDES
# ============================================================

@order_router.get(
    "/admin",
    response_model=CommandesAdminResponse,
)
def toutes_les_commandes_admin(
    statut: StatutCommande | None = Query(
        default=None
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

    current_admin: Utilisateur = Depends(
        get_current_admin
    ),

    db: Session = Depends(get_db),
):
    """
    Liste administrative de toutes les commandes.
    """

    try:

        commandes = (
            lister_commandes_admin(
                db=db,
                statut=statut,
            )
        )

        resultat = (
            paginer_commandes(
                commandes,
                page,
                limit,
            )
        )

        commandes_response = [

            construire_commande_response(
                commande
            )

            for commande
            in resultat["commandes"]
        ]

        return CommandesAdminResponse(

            commandes=(
                commandes_response
            ),

            pagination=(
                construire_pagination(
                    resultat["total"],
                    page,
                    limit,
                )
            ),
        )

    except OrderServiceError as erreur:

        raise traduire_erreur_service(
            erreur
        )


# ============================================================
# STATISTIQUES MES COMMANDES
# ============================================================

@order_router.get(
    "/mes/statistiques",
    response_model=CommandesStatsResponse,
)
def statistiques_mes_commandes(
    current_user: Utilisateur = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db),
):
    """
    Statistiques des commandes de l'utilisateur.
    """

    try:

        stats = (
            statistiques_commandes(
                db=db,
                acheteur_id=current_user.id,
            )
        )

        return CommandesStatsResponse(
            **stats
        )

    except OrderServiceError as erreur:

        raise traduire_erreur_service(
            erreur
        )


# ============================================================
# STATISTIQUES VENDEUR
# ============================================================

@order_router.get(
    "/vendeur/statistiques",
    response_model=CommandesStatsResponse,
)
def statistiques_vendeur(
    current_vendeur: Utilisateur = Depends(
        get_current_vendeur
    ),

    db: Session = Depends(get_db),
):
    """
    Statistiques des commandes reçues par le vendeur.
    """

    try:

        stats = (
            statistiques_commandes(
                db=db,
                vendeur_id=current_vendeur.id,
            )
        )

        return CommandesStatsResponse(
            **stats
        )

    except OrderServiceError as erreur:

        raise traduire_erreur_service(
            erreur
        )


# ============================================================
# STATISTIQUES ADMIN
# ============================================================

@order_router.get(
    "/admin/statistiques",
    response_model=CommandesStatsResponse,
)
def statistiques_admin_commandes(
    current_admin: Utilisateur = Depends(
        get_current_admin
    ),

    db: Session = Depends(get_db),
):
    """
    Statistiques globales des commandes.
    """

    try:

        stats = (
            statistiques_commandes(
                db=db,
            )
        )

        return CommandesStatsResponse(
            **stats
        )

    except OrderServiceError as erreur:

        raise traduire_erreur_service(
            erreur
        )


# ============================================================
# CONSULTER UNE COMMANDE
# ============================================================

@order_router.get(
    "/{commande_id}",
    response_model=CommandeResponse,
)
def consulter_commande(
    commande_id: int,

    current_user: Utilisateur = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db),
):
    """
    Consultation sécurisée d'une commande.

    Autorisés :
    - acheteur concerné ;
    - vendeur concerné ;
    - administrateur.
    """

    try:

        commande = (
            obtenir_commande(
                db,
                commande_id,
            )
        )

        verifier_acces_commande(
            commande,
            current_user,
        )

        return (
            construire_commande_response(
                commande
            )
        )

    except OrderServiceError as erreur:

        raise traduire_erreur_service(
            erreur
        )


# ============================================================
# MODIFIER UNE COMMANDE
# ACHETEUR
# ============================================================

@order_router.patch(
    "/{commande_id}",
    response_model=CommandeActionResponse,
)
def modifier_commande_route(
    commande_id: int,

    data: CommandeUpdate,

    current_user: Utilisateur = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db),
):
    """
    Modifie la quantité d'une commande
    encore en attente.
    """

    try:

        commande = (
            modifier_commande(

                db=db,

                commande_id=commande_id,

                utilisateur=current_user,

                data=data,
            )
        )

        db.commit()

        db.refresh(
            commande
        )

        commande = (
            obtenir_commande(
                db,
                commande.id,
            )
        )

        return CommandeActionResponse(

            message=(
                "Commande modifiée avec succès."
            ),

            commande=(
                construire_commande_response(
                    commande
                )
            ),
        )

    except OrderServiceError as erreur:

        db.rollback()

        raise traduire_erreur_service(
            erreur
        )

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "Impossible de modifier "
                "la commande."
            ),
        )


# ============================================================
# CHANGER STATUT
# VENDEUR / ACHETEUR / ADMIN
# ============================================================

@order_router.patch(
    "/{commande_id}/statut",
    response_model=CommandeActionResponse,
)
def modifier_statut_commande_route(
    commande_id: int,

    data: CommandeStatusUpdate,

    current_user: Utilisateur = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db),
):
    """
    Change le statut d'une commande.

    Les permissions sont appliquées dans le service.
    """

    try:

        commande = (
            changer_statut_commande(

                db=db,

                commande_id=commande_id,

                utilisateur=current_user,

                nouveau_statut=(
                    data.statut
                ),

                motif=data.motif,
            )
        )

        db.commit()

        db.refresh(
            commande
        )

        commande = (
            obtenir_commande(
                db,
                commande.id,
            )
        )

        return CommandeActionResponse(

            message=(
                "Statut de la commande "
                "mis à jour avec succès."
            ),

            commande=(
                construire_commande_response(
                    commande
                )
            ),
        )

    except OrderServiceError as erreur:

        db.rollback()

        raise traduire_erreur_service(
            erreur
        )

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "Impossible de modifier "
                "le statut de la commande."
            ),
        )


# ============================================================
# ANNULER UNE COMMANDE
# ============================================================

@order_router.patch(
    "/{commande_id}/annuler",
    response_model=CommandeActionResponse,
)
def annuler_commande_route(
    commande_id: int,

    data: CommandeCancelRequest = None,

    current_user: Utilisateur = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db),
):
    """
    Annule une commande.

    La quantité disponible est restaurée
    par le service.
    """

    motif = (
        data.motif
        if data is not None
        else None
    )

    try:

        commande = (
            annuler_commande(

                db=db,

                commande_id=commande_id,

                utilisateur=current_user,

                motif=motif,
            )
        )

        db.commit()

        db.refresh(
            commande
        )

        commande = (
            obtenir_commande(
                db,
                commande.id,
            )
        )

        return CommandeActionResponse(

            message=(
                "Commande annulée avec succès."
            ),

            commande=(
                construire_commande_response(
                    commande
                )
            ),
        )

    except OrderServiceError as erreur:

        db.rollback()

        raise traduire_erreur_service(
            erreur
        )

    except IntegrityError:

        db.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "Impossible d'annuler "
                "la commande."
            ),
        )