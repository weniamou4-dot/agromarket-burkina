from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# BASE
# ============================================================

class SearchBaseModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        use_enum_values=True,
    )


# ============================================================
# PAGINATION
# ============================================================

class SearchPagination(SearchBaseModel):
    page: int = Field(
        ...,
        ge=1,
    )

    limit: int = Field(
        ...,
        ge=1,
        le=100,
    )

    total: int = Field(
        ...,
        ge=0,
    )

    pages: int = Field(
        ...,
        ge=1,
    )


# ============================================================
# PRODUIT
# ============================================================

class SearchProduct(SearchBaseModel):
    id: int

    nom: str

    secteur: str | None = None

    type_produit: str | None = None


# ============================================================
# VENDEUR
# ============================================================

class SearchVendeur(SearchBaseModel):
    id: int

    nom: str

    photo_profil: str | None = None

    telephone: str | None = None


# ============================================================
# IMAGE D'ANNONCE
# ============================================================

class SearchImage(SearchBaseModel):
    """
    Image associée à une annonce.

    L'URL est conservée telle quelle depuis le backend,
    par exemple :

        /uploads/annonces/image.jpg
    """

    id: int

    annonce_id: int

    url: str

    date_creation: datetime | None = None


# ============================================================
# RÉSULTAT DE RECHERCHE
# ============================================================

class SearchResult(SearchBaseModel):
    id: int

    produit_id: int

    vendeur_id: int

    # --------------------------------------------------------
    # Produit complet
    # --------------------------------------------------------

    produit: SearchProduct

    produit_nom: str

    # --------------------------------------------------------
    # Vendeur complet
    # --------------------------------------------------------

    vendeur: SearchVendeur

    vendeur_nom: str

    # --------------------------------------------------------
    # Informations annonce
    # --------------------------------------------------------

    prix: float

    quantite: float

    unite: str

    region: str

    province: str | None = None

    commune: str | None = None

    statut: str

    # --------------------------------------------------------
    # Images
    # --------------------------------------------------------

    images: list[SearchImage] = Field(
        default_factory=list,
    )


# ============================================================
# RÉPONSE PRINCIPALE
# ============================================================

class SearchResponse(SearchBaseModel):
    resultats: list[SearchResult]

    pagination: SearchPagination


# ============================================================
# SUGGESTION
# ============================================================

class SearchSuggestion(SearchBaseModel):
    produit_id: int

    nom: str


class SearchSuggestionResponse(SearchBaseModel):
    suggestions: list[SearchSuggestion]


# ============================================================
# STATISTIQUES DE RECHERCHE
# ============================================================

class SearchStatsResponse(SearchBaseModel):
    total_resultats: int

    page: int

    limit: int

    pages: int

    recherche: str | None = None