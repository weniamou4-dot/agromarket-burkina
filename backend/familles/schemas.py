from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# BASE
# ============================================================

class FamilleBaseModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )


# ============================================================
# CRÉATION
# ============================================================

class FamilleCreate(FamilleBaseModel):
    nom: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    description: str | None = Field(
        default=None,
        max_length=1000,
    )


# ============================================================
# MODIFICATION
# ============================================================

class FamilleUpdate(FamilleBaseModel):
    nom: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    description: str | None = Field(
        default=None,
        max_length=1000,
    )


# ============================================================
# RÉPONSE
# ============================================================

class FamilleResponse(FamilleBaseModel):
    id: int
    nom: str
    description: str | None = None


# ============================================================
# DÉTAIL
# ============================================================

class FamilleDetailResponse(FamilleBaseModel):
    id: int
    nom: str
    description: str | None = None
    nombre_categories: int


# ============================================================
# RECHERCHE
# ============================================================

class FamilleSearchResponse(FamilleBaseModel):
    id: int
    nom: str
    description: str | None = None


# ============================================================
# ACTION
# ============================================================

class FamilleActionResponse(FamilleBaseModel):
    message: str