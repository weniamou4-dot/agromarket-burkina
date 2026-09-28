from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# BASE
# ============================================================

class CategoryBaseModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )


# ============================================================
# CRÉATION
# ============================================================

class CategorieCreate(CategoryBaseModel):
    nom: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    description: str | None = Field(
        default=None,
        max_length=1000,
    )

    famille_id: int = Field(
        ...,
        gt=0,
    )


# ============================================================
# MODIFICATION
# ============================================================

class CategorieUpdate(CategoryBaseModel):
    nom: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    description: str | None = Field(
        default=None,
        max_length=1000,
    )

    famille_id: int | None = Field(
        default=None,
        gt=0,
    )


# ============================================================
# RÉPONSE
# ============================================================

class CategorieResponse(CategoryBaseModel):
    id: int
    nom: str
    description: str | None = None
    famille_id: int


# ============================================================
# CATÉGORIE AVEC MÉTADONNÉES
# ============================================================

class CategorieDetailResponse(CategoryBaseModel):
    id: int
    nom: str
    description: str | None = None
    famille_id: int
    nombre_produits: int = 0


# ============================================================
# FAMILLE
# ============================================================

class FamilleCreate(CategoryBaseModel):
    nom: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    description: str | None = Field(
        default=None,
        max_length=1000,
    )


class FamilleUpdate(CategoryBaseModel):
    nom: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    description: str | None = Field(
        default=None,
        max_length=1000,
    )


class FamilleResponse(CategoryBaseModel):
    id: int
    nom: str
    description: str | None = None


class FamilleDetailResponse(CategoryBaseModel):
    id: int
    nom: str
    description: str | None = None
    nombre_categories: int = 0


# ============================================================
# ACTION
# ============================================================

class CategoryActionResponse(CategoryBaseModel):
    message: str