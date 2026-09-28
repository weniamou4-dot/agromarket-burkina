from __future__ import annotations

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from auth.routes import get_current_admin
from database import get_db
from models import Utilisateur

from categories.schemas import (
    CategorieCreate,
    CategorieDetailResponse,
    CategorieResponse,
    CategorieUpdate,
    CategoryActionResponse,
    FamilleCreate,
    FamilleDetailResponse,
    FamilleResponse,
    FamilleUpdate,
)
from categories.services import (
    CategoryConflictError,
    CategoryNotFoundError,
    CategoryServiceError,
    CategoryValidationError,
    FamilleNotFoundError,
    creer_categorie,
    creer_famille,
    lister_categories,
    lister_familles,
    modifier_categorie,
    modifier_famille,
    obtenir_categorie,
    obtenir_famille,
    statistiques_categorie,
    statistiques_famille,
    supprimer_categorie,
    supprimer_famille,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/categories",
    tags=["Catégories"],
)


# ============================================================
# GESTION DES ERREURS
# ============================================================

def convertir_erreur(
    exc: Exception,
) -> HTTPException:

    if isinstance(
        exc,
        (
            CategoryNotFoundError,
            FamilleNotFoundError,
        ),
    ):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )

    if isinstance(
        exc,
        CategoryConflictError,
    ):
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )

    if isinstance(
        exc,
        CategoryValidationError,
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
# FAMILLES
# ============================================================

@router.get(
    "/familles",
    response_model=list[FamilleResponse],
)
def get_familles(
    db: Session = Depends(get_db),
):
    return lister_familles(db)


@router.get(
    "/familles/{famille_id}",
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

    except CategoryServiceError as exc:
        raise convertir_erreur(exc)


@router.get(
    "/familles/{famille_id}/details",
    response_model=FamilleDetailResponse,
)
def details_famille(
    famille_id: int,
    db: Session = Depends(get_db),
):
    try:

        return statistiques_famille(
            db,
            famille_id,
        )

    except CategoryServiceError as exc:
        raise convertir_erreur(exc)


@router.post(
    "/familles",
    response_model=FamilleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_famille(
    data: FamilleCreate,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_admin),
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

    except CategoryServiceError as exc:

        db.rollback()
        raise convertir_erreur(exc)


@router.patch(
    "/familles/{famille_id}",
    response_model=FamilleResponse,
)
def update_famille(
    famille_id: int,
    data: FamilleUpdate,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_admin),
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

    except CategoryServiceError as exc:

        db.rollback()
        raise convertir_erreur(exc)


@router.delete(
    "/familles/{famille_id}",
    response_model=CategoryActionResponse,
)
def delete_famille(
    famille_id: int,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_admin),
):
    try:

        supprimer_famille(
            db,
            famille_id,
        )

        db.commit()

        return CategoryActionResponse(
            message="Famille supprimée avec succès."
        )

    except CategoryServiceError as exc:

        db.rollback()
        raise convertir_erreur(exc)


# ============================================================
# CATÉGORIES
# ============================================================

@router.get(
    "/",
    response_model=list[CategorieResponse],
)
def get_categories(
    famille_id: int | None = None,
    db: Session = Depends(get_db),
):
    try:

        return lister_categories(
            db,
            famille_id,
        )

    except CategoryServiceError as exc:
        raise convertir_erreur(exc)


@router.get(
    "/{categorie_id}",
    response_model=CategorieResponse,
)
def get_categorie(
    categorie_id: int,
    db: Session = Depends(get_db),
):
    try:
        return obtenir_categorie(
            db,
            categorie_id,
        )

    except CategoryServiceError as exc:
        raise convertir_erreur(exc)


@router.get(
    "/{categorie_id}/details",
    response_model=CategorieDetailResponse,
)
def get_categorie_details(
    categorie_id: int,
    db: Session = Depends(get_db),
):
    try:

        return statistiques_categorie(
            db,
            categorie_id,
        )

    except CategoryServiceError as exc:
        raise convertir_erreur(exc)


@router.post(
    "/",
    response_model=CategorieResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_categorie(
    data: CategorieCreate,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_admin),
):
    try:

        categorie = creer_categorie(
            db=db,
            nom=data.nom,
            famille_id=data.famille_id,
            description=data.description,
        )

        db.commit()
        db.refresh(categorie)

        return categorie

    except CategoryServiceError as exc:

        db.rollback()
        raise convertir_erreur(exc)


@router.patch(
    "/{categorie_id}",
    response_model=CategorieResponse,
)
def update_categorie(
    categorie_id: int,
    data: CategorieUpdate,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_admin),
):
    try:

        categorie = modifier_categorie(
            db=db,
            categorie_id=categorie_id,
            nom=data.nom,
            description=data.description,
            famille_id=data.famille_id,
        )

        db.commit()
        db.refresh(categorie)

        return categorie

    except CategoryServiceError as exc:

        db.rollback()
        raise convertir_erreur(exc)


@router.delete(
    "/{categorie_id}",
    response_model=CategoryActionResponse,
)
def delete_categorie(
    categorie_id: int,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_admin),
):
    try:

        supprimer_categorie(
            db,
            categorie_id,
        )

        db.commit()

        return CategoryActionResponse(
            message="Catégorie supprimée avec succès."
        )

    except CategoryServiceError as exc:

        db.rollback()
        raise convertir_erreur(exc)