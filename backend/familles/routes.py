from __future__ import annotations

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy.orm import Session

from auth.routes import get_current_admin
from database import get_db
from models import Utilisateur

from familles.schemas import (
    FamilleActionResponse,
    FamilleCreate,
    FamilleDetailResponse,
    FamilleResponse,
    FamilleSearchResponse,
    FamilleUpdate,
)
from familles.services import (
    FamilleConflictError,
    FamilleNotFoundError,
    FamilleServiceError,
    FamilleValidationError,
    creer_famille,
    lister_familles,
    modifier_famille,
    obtenir_famille,
    rechercher_familles,
    statistiques_famille,
    supprimer_famille,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/familles",
    tags=["Familles"],
)


# ============================================================
# GESTION DES ERREURS
# ============================================================

def convertir_erreur(
    exc: Exception,
) -> HTTPException:

    if isinstance(
        exc,
        FamilleNotFoundError,
    ):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    if isinstance(
        exc,
        FamilleConflictError,
    ):
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )

    if isinstance(
        exc,
        FamilleValidationError,
    ):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Une erreur est survenue.",
    )


# ============================================================
# LISTE PUBLIQUE
# ============================================================

@router.get(
    "/",
    response_model=list[FamilleResponse],
)
def get_familles(
    db: Session = Depends(get_db),
):
    return lister_familles(db)


# ============================================================
# RECHERCHE
# ============================================================

@router.get(
    "/recherche",
    response_model=list[FamilleSearchResponse],
)
def rechercher(
    q: str = Query(
        ...,
        min_length=1,
        max_length=100,
    ),
    db: Session = Depends(get_db),
):
    try:
        return rechercher_familles(
            db=db,
            recherche=q,
        )

    except FamilleServiceError as exc:
        raise convertir_erreur(exc)


# ============================================================
# OBTENIR UNE FAMILLE
# ============================================================

@router.get(
    "/{famille_id}",
    response_model=FamilleResponse,
)
def get_famille(
    famille_id: int,
    db: Session = Depends(get_db),
):
    try:
        return obtenir_famille(
            db,
            famille_id,
        )

    except FamilleServiceError as exc:
        raise convertir_erreur(exc)


# ============================================================
# DÉTAILS
# ============================================================

@router.get(
    "/{famille_id}/details",
    response_model=FamilleDetailResponse,
)
def get_details_famille(
    famille_id: int,
    db: Session = Depends(get_db),
):
    try:
        return statistiques_famille(
            db,
            famille_id,
        )

    except FamilleServiceError as exc:
        raise convertir_erreur(exc)


# ============================================================
# CRÉER
# ADMIN
# ============================================================

@router.post(
    "/",
    response_model=FamilleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_famille(
    data: FamilleCreate,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(
        get_current_admin
    ),
):
    try:

        famille = creer_famille(
            db=db,
            nom=data.nom,
            description=data.description,
        )

        db.commit()
        db.refresh(famille)

        return famille

    except FamilleServiceError as exc:

        db.rollback()
        raise convertir_erreur(exc)


# ============================================================
# MODIFIER
# ADMIN
# ============================================================

@router.patch(
    "/{famille_id}",
    response_model=FamilleResponse,
)
def update_famille(
    famille_id: int,
    data: FamilleUpdate,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(
        get_current_admin
    ),
):
    try:

        famille = modifier_famille(
            db=db,
            famille_id=famille_id,
            nom=data.nom,
            description=data.description,
        )

        db.commit()
        db.refresh(famille)

        return famille

    except FamilleServiceError as exc:

        db.rollback()
        raise convertir_erreur(exc)


# ============================================================
# SUPPRIMER
# ADMIN
# ============================================================

@router.delete(
    "/{famille_id}",
    response_model=FamilleActionResponse,
)
def delete_famille(
    famille_id: int,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(
        get_current_admin
    ),
):
    try:

        supprimer_famille(
            db,
            famille_id,
        )

        db.commit()

        return FamilleActionResponse(
            message="Famille supprimée avec succès."
        )

    except FamilleServiceError as exc:

        db.rollback()
        raise convertir_erreur(exc)