# ============================================================
# AGROMARKET BURKINA
# HISTORIQUE / ROUTES
# Version professionnelle stabilisée
#
# Fonctionnalités :
# - consultation d'un historique
# - consultation par annonce
# - consultation par acteur
# - recherche et filtrage
# - pagination
# - statistiques
# - dernière action
# - vérification de cohérence
# ============================================================

from __future__ import annotations

from typing import Any, Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)

from sqlalchemy.orm import Session

from database import get_db

from models import Utilisateur

from auth.routes import (
    get_current_user,
)

from historique.schemas import (
    HistoriqueModerationResponse,
    HistoriqueModerationResume,
    HistoriqueListResponse,
    HistoriqueAnnonceResponse,
    HistoriqueActeurResponse,
    HistoriqueStatsResponse,
    HistoriqueActionResponse,
)

from historique.services import (
    HistoriqueNotFoundError,
    HistoriqueAnnonceNotFoundError,
    HistoriqueActeurNotFoundError,
    HistoriquePermissionError,
    HistoriqueValidationError,
    obtenir_historique,
    historique_par_annonce,
    historique_par_acteur,
    rechercher_historique,
    paginer_historique,
    statistiques_historique,
    derniere_action_annonce,
    verifier_coherence_historique,
    verifier_droits_historique,
)


# ============================================================
# ROUTEUR
# ============================================================

router = APIRouter(
    prefix="/historique",
    tags=["Historique de modération"],
)


# ============================================================
# GESTION DES ERREURS MÉTIER
# ============================================================

def gerer_erreur_service(
    erreur: Exception,
):
    """
    Convertit les exceptions du service
    en réponses HTTP appropriées.
    """

    if isinstance(
        erreur,
        HistoriqueNotFoundError,
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(erreur),
        )

    if isinstance(
        erreur,
        HistoriqueAnnonceNotFoundError,
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(erreur),
        )

    if isinstance(
        erreur,
        HistoriqueActeurNotFoundError,
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(erreur),
        )

    if isinstance(
        erreur,
        HistoriquePermissionError,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(erreur),
        )

    if isinstance(
        erreur,
        HistoriqueValidationError,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(erreur),
        )

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=(
            "Une erreur interne est survenue "
            "lors du traitement de l'historique."
        ),
    )


# ============================================================
# VÉRIFICATION DES DROITS DE CONSULTATION GLOBALE
# ============================================================

def verifier_acces_historique(
    utilisateur: Utilisateur,
) -> None:
    """
    Vérifie que l'utilisateur possède les droits
    nécessaires pour consulter l'historique global.
    """

    try:
        verifier_droits_historique(
            utilisateur
        )

    except Exception as erreur:
        gerer_erreur_service(erreur)


# ============================================================
# CONSULTER UN HISTORIQUE PAR ID
# ============================================================
#
# IMPORTANT :
# Cette route est placée après les routes statiques.
# ============================================================

@router.get(
    "/{historique_id}",
    response_model=HistoriqueModerationResponse,
    summary="Consulter un historique par son identifiant",
)
def consulter_historique(
    historique_id: int,
    current_user: Utilisateur = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    """
    Retourne une entrée précise de l'historique.

    L'utilisateur doit être authentifié.
    """

    try:
        historique = obtenir_historique(
            db=db,
            historique_id=historique_id,
        )

        return historique

    except Exception as erreur:
        gerer_erreur_service(erreur)


# ============================================================
# HISTORIQUE D'UNE ANNONCE
# ============================================================

@router.get(
    "/annonce/{annonce_id}",
    response_model=HistoriqueAnnonceResponse,
    summary="Consulter l'historique d'une annonce",
)
def consulter_historique_annonce(
    annonce_id: int,
    current_user: Utilisateur = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    """
    Retourne toutes les actions enregistrées
    pour une annonce.

    L'accès nécessite une authentification.
    """

    try:
        historiques = historique_par_annonce(
            db=db,
            annonce_id=annonce_id,
        )

        return HistoriqueAnnonceResponse(
            annonce_id=annonce_id,
            historiques=historiques,
            total=len(historiques),
        )

    except Exception as erreur:
        gerer_erreur_service(erreur)


# ============================================================
# DERNIÈRE ACTION D'UNE ANNONCE
# ============================================================

@router.get(
    "/annonce/{annonce_id}/derniere-action",
    response_model=HistoriqueModerationResponse,
    summary="Consulter la dernière action d'une annonce",
)
def consulter_derniere_action(
    annonce_id: int,
    current_user: Utilisateur = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    """
    Retourne la dernière action connue
    pour une annonce.
    """

    try:
        historique = derniere_action_annonce(
            db=db,
            annonce_id=annonce_id,
        )

        if historique is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=(
                    "Aucune action historique "
                    "n'a été trouvée pour cette annonce."
                ),
            )

        return historique

    except HTTPException:
        raise

    except Exception as erreur:
        gerer_erreur_service(erreur)


# ============================================================
# VÉRIFICATION DE COHÉRENCE
# ============================================================

@router.get(
    "/annonce/{annonce_id}/coherence",
    response_model=dict[str, Any],
    summary="Vérifier la cohérence de l'historique",
)
def verifier_coherence(
    annonce_id: int,
    current_user: Utilisateur = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    """
    Vérifie la cohérence entre le statut actuel
    de l'annonce et sa dernière entrée historique.

    Réservé aux modérateurs et administrateurs.
    """

    try:
        verifier_acces_historique(
            current_user
        )

        return verifier_coherence_historique(
            db=db,
            annonce_id=annonce_id,
        )

    except HTTPException:
        raise

    except Exception as erreur:
        gerer_erreur_service(erreur)


# ============================================================
# HISTORIQUE D'UN ACTEUR
# ============================================================

@router.get(
    "/acteur/{acteur_id}",
    response_model=HistoriqueActeurResponse,
    summary="Consulter l'historique d'un acteur",
)
def consulter_historique_acteur(
    acteur_id: int,
    current_user: Utilisateur = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    """
    Retourne toutes les actions réalisées
    par un acteur.

    Réservé aux modérateurs et administrateurs.
    """

    try:
        verifier_acces_historique(
            current_user
        )

        historiques = historique_par_acteur(
            db=db,
            acteur_id=acteur_id,
        )

        return HistoriqueActeurResponse(
            acteur_id=acteur_id,
            historiques=historiques,
            total=len(historiques),
        )

    except Exception as erreur:
        gerer_erreur_service(erreur)


# ============================================================
# RECHERCHE / FILTRAGE
# ============================================================

@router.get(
    "/",
    response_model=HistoriqueListResponse,
    summary="Rechercher dans l'historique",
)
def rechercher(
    annonce_id: Optional[int] = Query(
        default=None,
        gt=0,
        description="Identifiant de l'annonce.",
    ),
    acteur_id: Optional[int] = Query(
        default=None,
        gt=0,
        description="Identifiant de l'acteur.",
    ),
    action: Optional[str] = Query(
        default=None,
        description="Action de modération.",
    ),
    page: int = Query(
        default=1,
        ge=1,
        description="Numéro de page.",
    ),
    limit: int = Query(
        default=20,
        ge=1,
        le=100,
        description="Nombre d'éléments par page.",
    ),
    current_user: Utilisateur = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    """
    Recherche et pagination dans l'historique.

    Réservé aux modérateurs et administrateurs.
    """

    try:
        verifier_acces_historique(
            current_user
        )

        historiques = rechercher_historique(
            db=db,
            annonce_id=annonce_id,
            acteur_id=acteur_id,
            action=action,
        )

        resultat = paginer_historique(
            historiques=historiques,
            page=page,
            limit=limit,
        )

        return HistoriqueListResponse(
            historiques=resultat["historiques"],
            pagination={
                "page": resultat["page"],
                "limit": resultat["limit"],
                "total": resultat["total"],
                "pages": resultat["pages"],
            },
        )

    except Exception as erreur:
        gerer_erreur_service(erreur)


# ============================================================
# STATISTIQUES
# ============================================================

@router.get(
    "/statistiques/resume",
    response_model=HistoriqueStatsResponse,
    summary="Consulter les statistiques de l'historique",
)
def consulter_statistiques(
    annonce_id: Optional[int] = Query(
        default=None,
        gt=0,
    ),
    acteur_id: Optional[int] = Query(
        default=None,
        gt=0,
    ),
    current_user: Utilisateur = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    """
    Retourne les statistiques des actions
    de modération.

    Réservé aux modérateurs et administrateurs.
    """

    try:
        verifier_acces_historique(
            current_user
        )

        return statistiques_historique(
            db=db,
            annonce_id=annonce_id,
            acteur_id=acteur_id,
        )

    except Exception as erreur:
        gerer_erreur_service(erreur)