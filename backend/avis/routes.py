from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from auth.routes import get_current_user
from database import get_db
from models import Utilisateur

from avis.schemas import (
    AvisActionResponse,
    AvisCreate,
    AvisListResponse,
    AvisPagination,
    AvisResponse,
    AvisStatsResponse,
    AvisUpdate,
)
from avis.services import (
    AvisConflictError,
    AvisNotFoundError,
    AvisPermissionError,
    AvisServiceError,
    AvisValidationError,
    avis_par_annonce,
    avis_par_utilisateur,
    creer_avis,
    modifier_avis,
    modifier_visibilite_avis,
    obtenir_avis,
    paginer_avis,
    rechercher_avis,
    statistiques_avis,
    supprimer_avis,
    verifier_droits_moderation,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/avis",
    tags=["Avis"],
)


# ============================================================
# UTILITAIRE DE CONVERSION D'ERREURS
# ============================================================

def convertir_erreur(
    exc: Exception,
) -> HTTPException:

    if isinstance(exc, AvisNotFoundError):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    if isinstance(exc, AvisPermissionError):
        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        )

    if isinstance(exc, AvisConflictError):
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )

    if isinstance(exc, AvisValidationError):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Une erreur est survenue.",
    )


# ============================================================
# CRÉER UN AVIS
# ============================================================

@router.post(
    "/",
    response_model=AvisResponse,
    status_code=status.HTTP_201_CREATED,
)
def creer_avis_route(
    data: AvisCreate,
    db: Session = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    try:
        avis = creer_avis(
            db=db,
            utilisateur_id=utilisateur.id,
            annonce_id=data.annonce_id,
            note=data.note,
            commentaire=data.commentaire,
            commande_id=data.commande_id,
        )

        db.commit()
        db.refresh(avis)

        return avis

    except AvisServiceError as exc:
        db.rollback()
        raise convertir_erreur(exc)


# ============================================================
# OBTENIR UN AVIS
# ============================================================

@router.get(
    "/{avis_id}",
    response_model=AvisResponse,
)
def obtenir_avis_route(
    avis_id: int,
    db: Session = Depends(get_db),
):
    try:
        return obtenir_avis(
            db,
            avis_id,
        )

    except AvisServiceError as exc:
        raise convertir_erreur(exc)


# ============================================================
# MODIFIER UN AVIS
# ============================================================

@router.patch(
    "/{avis_id}",
    response_model=AvisResponse,
)
def modifier_avis_route(
    avis_id: int,
    data: AvisUpdate,
    db: Session = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    try:
        avis = modifier_avis(
            db=db,
            avis_id=avis_id,
            utilisateur_id=utilisateur.id,
            note=data.note,
            commentaire=data.commentaire,
        )

        db.commit()
        db.refresh(avis)

        return avis

    except AvisServiceError as exc:
        db.rollback()
        raise convertir_erreur(exc)


# ============================================================
# SUPPRIMER UN AVIS
# ============================================================

@router.delete(
    "/{avis_id}",
    response_model=AvisActionResponse,
)
def supprimer_avis_route(
    avis_id: int,
    db: Session = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    try:
        supprimer_avis(
            db=db,
            avis_id=avis_id,
            utilisateur_id=utilisateur.id,
        )

        db.commit()

        return AvisActionResponse(
            message="Avis supprimé avec succès."
        )

    except AvisServiceError as exc:
        db.rollback()
        raise convertir_erreur(exc)


# ============================================================
# AVIS D'UNE ANNONCE
# ============================================================

@router.get(
    "/annonce/{annonce_id}",
    response_model=AvisListResponse,
)
def avis_annonce_route(
    annonce_id: int,
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

    try:
        avis = avis_par_annonce(
            db=db,
            annonce_id=annonce_id,
            uniquement_visibles=True,
        )

        pagination = paginer_avis(
            avis=avis,
            page=page,
            limit=limit,
        )

        return AvisListResponse(
            avis=pagination["avis"],
            pagination=AvisPagination(
                page=pagination["page"],
                limit=pagination["limit"],
                total=pagination["total"],
                pages=pagination["pages"],
            ),
        )

    except AvisServiceError as exc:
        raise convertir_erreur(exc)


# ============================================================
# AVIS D'UN UTILISATEUR
# ============================================================

@router.get(
    "/utilisateur/{utilisateur_id}",
    response_model=list[AvisResponse],
)
def avis_utilisateur_route(
    utilisateur_id: int,
    db: Session = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):

    if utilisateur.id != utilisateur_id:

        role = (
            getattr(utilisateur, "role", "") or ""
        ).lower()

        if role not in {
            "admin",
            "administrateur",
            "moderateur",
        }:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès non autorisé.",
            )

    try:
        return avis_par_utilisateur(
            db,
            utilisateur_id,
        )

    except AvisServiceError as exc:
        raise convertir_erreur(exc)


# ============================================================
# RECHERCHE / FILTRE
# ============================================================

@router.get(
    "/",
    response_model=AvisListResponse,
)
def rechercher_avis_route(
    annonce_id: Optional[int] = Query(
        default=None,
        gt=0,
    ),
    utilisateur_id: Optional[int] = Query(
        default=None,
        gt=0,
    ),
    note: Optional[int] = Query(
        default=None,
        ge=1,
        le=5,
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

    try:
        avis = rechercher_avis(
            db=db,
            annonce_id=annonce_id,
            utilisateur_id=utilisateur_id,
            note=note,
            visible=True,
        )

        pagination = paginer_avis(
            avis=avis,
            page=page,
            limit=limit,
        )

        return AvisListResponse(
            avis=pagination["avis"],
            pagination=AvisPagination(
                page=pagination["page"],
                limit=pagination["limit"],
                total=pagination["total"],
                pages=pagination["pages"],
            ),
        )

    except AvisServiceError as exc:
        raise convertir_erreur(exc)


# ============================================================
# STATISTIQUES
# ============================================================

@router.get(
    "/statistiques/resume",
    response_model=AvisStatsResponse,
)
def statistiques_avis_route(
    annonce_id: Optional[int] = Query(
        default=None,
        gt=0,
    ),
    db: Session = Depends(get_db),
):

    try:
        return statistiques_avis(
            db=db,
            annonce_id=annonce_id,
        )

    except AvisServiceError as exc:
        raise convertir_erreur(exc)


# ============================================================
# MODÉRATION : VISIBILITÉ
# ============================================================

@router.patch(
    "/{avis_id}/visibilite",
    response_model=AvisResponse,
)
def modifier_visibilite_route(
    avis_id: int,
    visible: bool = Query(...),
    db: Session = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):

    try:
        verifier_droits_moderation(
            utilisateur
        )

        avis = modifier_visibilite_avis(
            db=db,
            avis_id=avis_id,
            visible=visible,
        )

        db.commit()
        db.refresh(avis)

        return avis

    except AvisServiceError as exc:
        db.rollback()
        raise convertir_erreur(exc)