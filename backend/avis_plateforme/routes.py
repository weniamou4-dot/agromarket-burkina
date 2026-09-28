# ============================================================
# AGROMARKET BURKINA
# ROUTES - AVIS PLATEFORME
#
# Fonctionnalités :
# - Créer son avis sur AgroMarket
# - Modifier son avis
# - Supprimer son avis
# - Consulter les avis publics
# - Consulter son propre avis
# - Modérer les avis
# - Consulter les statistiques
# ============================================================

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy.orm import Session

from database import get_db

from .schemas import (
    AvisPlateformeCreate,
    AvisPlateformeModerationResponse,
    AvisPlateformeOperationResponse,
    AvisPlateformeResponse,
    AvisPlateformeStatistiquesResponse,
    AvisPlateformeUpdate,
)

from .services import (
    AvisPlateformeAlreadyExistsError,
    AvisPlateformeNotFoundError,
    AvisPlateformePermissionError,
    AvisPlateformeServiceError,
    AvisPlateformeValidationError,
    afficher_avis_plateforme,
    creer_avis_plateforme,
    masquer_avis_plateforme,
    modifier_avis_plateforme,
    obtenir_avis_plateforme,
    obtenir_avis_pour_moderation,
    obtenir_avis_publics,
    obtenir_avis_utilisateur,
    obtenir_statistiques_avis_plateforme,
    supprimer_avis_plateforme,
)

from auth.dependencies import get_current_user


# ============================================================
# ROUTER
# ============================================================

avis_plateforme_router = APIRouter(
    prefix="/avis-plateforme",
    tags=["Avis plateforme"],
)


# ============================================================
# OUTIL : TRADUCTION DES ERREURS MÉTIER
# ============================================================


def traduire_erreur_service(
    erreur: AvisPlateformeServiceError,
) -> HTTPException:
    """
    Transforme les exceptions métier en réponses HTTP.
    """

    if isinstance(
        erreur,
        AvisPlateformeNotFoundError,
    ):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(erreur),
        )

    if isinstance(
        erreur,
        AvisPlateformeAlreadyExistsError,
    ):
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(erreur),
        )

    if isinstance(
        erreur,
        AvisPlateformePermissionError,
    ):
        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(erreur),
        )

    if isinstance(
        erreur,
        AvisPlateformeValidationError,
    ):
        return HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(erreur),
        )

    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Une erreur interne est survenue.",
    )


# ============================================================
# CRÉER UN AVIS
# ============================================================


@avis_plateforme_router.post(
    "",
    response_model=AvisPlateformeOperationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Publier un avis sur AgroMarket",
)
def creer_avis(
    donnees: AvisPlateformeCreate,
    db: Session = Depends(get_db),
    utilisateur=Depends(get_current_user),
):
    """
    Permet à un utilisateur connecté de publier
    un avis global sur AgroMarket Burkina.
    """

    try:

        avis = creer_avis_plateforme(
            db=db,
            utilisateur=utilisateur,
            note=donnees.note,
            commentaire=donnees.commentaire,
        )

        return AvisPlateformeOperationResponse(
            message="Votre avis a été publié avec succès.",
            avis=avis,
        )

    except AvisPlateformeServiceError as erreur:
        raise traduire_erreur_service(erreur)


# ============================================================
# MON AVIS
# ============================================================


@avis_plateforme_router.get(
    "/moi",
    response_model=AvisPlateformeResponse | None,
    summary="Consulter mon avis sur AgroMarket",
)
def obtenir_mon_avis(
    db: Session = Depends(get_db),
    utilisateur=Depends(get_current_user),
):
    """
    Retourne l'avis actuel de l'utilisateur connecté.
    """

    return obtenir_avis_utilisateur(
        db=db,
        utilisateur_id=utilisateur.id,
    )


# ============================================================
# AVIS PUBLICS
# ============================================================


@avis_plateforme_router.get(
    "",
    response_model=list[AvisPlateformeResponse],
    summary="Afficher les avis publics",
)
def liste_avis_publics(
    skip: int = Query(
        default=0,
        ge=0,
        description="Nombre d'avis à ignorer.",
    ),
    limit: int = Query(
        default=20,
        ge=1,
        le=100,
        description="Nombre maximal d'avis.",
    ),
    db: Session = Depends(get_db),
):
    """
    Retourne uniquement les avis visibles publiquement.

    Cette route est publique.
    """

    return obtenir_avis_publics(
        db=db,
        skip=skip,
        limit=limit,
    )


# ============================================================
# MODÉRATION - LISTE
#
# IMPORTANT :
# Cette route doit être déclarée AVANT /{avis_id}.
# ============================================================


@avis_plateforme_router.get(
    "/moderation/liste",
    response_model=list[AvisPlateformeModerationResponse],
    summary="Lister les avis pour modération",
)
def liste_avis_moderation(
    skip: int = Query(
        default=0,
        ge=0,
    ),
    limit: int = Query(
        default=50,
        ge=1,
        le=100,
    ),
    db: Session = Depends(get_db),
    moderateur=Depends(get_current_user),
):
    """
    Retourne tous les avis pour les administrateurs
    et modérateurs autorisés.
    """

    try:

        return obtenir_avis_pour_moderation(
            db=db,
            moderateur=moderateur,
            skip=skip,
            limit=limit,
        )

    except AvisPlateformeServiceError as erreur:
        raise traduire_erreur_service(erreur)


# ============================================================
# MODÉRATION - MASQUER
#
# Déclarée avant /{avis_id}.
# ============================================================


@avis_plateforme_router.patch(
    "/moderation/{avis_id}/masquer",
    response_model=AvisPlateformeModerationResponse,
    summary="Masquer un avis",
)
def masquer_avis(
    avis_id: int,
    db: Session = Depends(get_db),
    moderateur=Depends(get_current_user),
):
    """
    Masque un avis de l'affichage public.
    """

    try:

        return masquer_avis_plateforme(
            db=db,
            avis_id=avis_id,
            moderateur=moderateur,
        )

    except AvisPlateformeServiceError as erreur:
        raise traduire_erreur_service(erreur)


# ============================================================
# MODÉRATION - AFFICHER
#
# Déclarée avant /{avis_id}.
# ============================================================


@avis_plateforme_router.patch(
    "/moderation/{avis_id}/afficher",
    response_model=AvisPlateformeModerationResponse,
    summary="Rendre un avis visible",
)
def afficher_avis(
    avis_id: int,
    db: Session = Depends(get_db),
    moderateur=Depends(get_current_user),
):
    """
    Rend un avis à nouveau visible publiquement.
    """

    try:

        return afficher_avis_plateforme(
            db=db,
            avis_id=avis_id,
            moderateur=moderateur,
        )

    except AvisPlateformeServiceError as erreur:
        raise traduire_erreur_service(erreur)


# ============================================================
# STATISTIQUES
#
# Déclarée avant /{avis_id}.
# ============================================================


@avis_plateforme_router.get(
    "/statistiques",
    response_model=AvisPlateformeStatistiquesResponse,
    summary="Statistiques des avis plateforme",
)
def statistiques_avis(
    db: Session = Depends(get_db),
):
    """
    Retourne les statistiques globales des avis :

    - nombre total
    - nombre visibles
    - nombre invisibles
    - note moyenne
    - répartition des notes
    """

    return obtenir_statistiques_avis_plateforme(
        db=db,
    )


# ============================================================
# AVIS UNIQUE
#
# IMPORTANT :
# Cette route dynamique doit être placée APRÈS
# toutes les routes statiques.
# ============================================================


@avis_plateforme_router.get(
    "/{avis_id}",
    response_model=AvisPlateformeResponse,
    summary="Consulter un avis",
)
def detail_avis(
    avis_id: int,
    db: Session = Depends(get_db),
):
    """
    Retourne un avis uniquement s'il est visible publiquement.
    """

    try:

        avis = obtenir_avis_plateforme(
            db=db,
            avis_id=avis_id,
        )

        if not avis.est_visible:

            raise AvisPlateformeNotFoundError(
                "Cet avis n'est pas disponible publiquement."
            )

        return avis

    except AvisPlateformeServiceError as erreur:
        raise traduire_erreur_service(erreur)


# ============================================================
# MODIFIER MON AVIS
#
# Cette route dynamique reste après les routes statiques.
# ============================================================


@avis_plateforme_router.patch(
    "/{avis_id}",
    response_model=AvisPlateformeOperationResponse,
    summary="Modifier mon avis",
)
def modifier_avis(
    avis_id: int,
    donnees: AvisPlateformeUpdate,
    db: Session = Depends(get_db),
    utilisateur=Depends(get_current_user),
):
    """
    Permet à l'auteur de modifier son propre avis.
    """

    try:

        avis = modifier_avis_plateforme(
            db=db,
            avis_id=avis_id,
            utilisateur=utilisateur,
            note=donnees.note,
            commentaire=donnees.commentaire,
        )

        return AvisPlateformeOperationResponse(
            message="Votre avis a été modifié avec succès.",
            avis=avis,
        )

    except AvisPlateformeServiceError as erreur:
        raise traduire_erreur_service(erreur)


# ============================================================
# SUPPRIMER MON AVIS
# ============================================================


@avis_plateforme_router.delete(
    "/{avis_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Supprimer mon avis",
)
def supprimer_avis(
    avis_id: int,
    db: Session = Depends(get_db),
    utilisateur=Depends(get_current_user),
):
    """
    Permet à l'auteur de supprimer son propre avis.
    """

    try:

        supprimer_avis_plateforme(
            db=db,
            avis_id=avis_id,
            utilisateur=utilisateur,
        )

    except AvisPlateformeServiceError as erreur:
        raise traduire_erreur_service(erreur)

    return None