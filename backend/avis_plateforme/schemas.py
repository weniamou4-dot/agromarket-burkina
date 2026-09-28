# ============================================================
# AGROMARKET BURKINA
# SCHÉMAS - AVIS PLATEFORME
#
# Fonctionnalités :
# - Création d'un avis global sur AgroMarket
# - Modification de son avis
# - Affichage public des avis
# - Modération des avis
# - Statistiques globales des avis
# ============================================================

from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


# ============================================================
# AVIS PLATEFORME - BASE
# ============================================================


class AvisPlateformeBase(BaseModel):
    """
    Données communes utilisées par les avis sur la plateforme.
    """

    note: int = Field(
        ...,
        ge=1,
        le=5,
        description="Note attribuée à AgroMarket Burkina, de 1 à 5.",
    )

    commentaire: str | None = Field(
        default=None,
        max_length=1000,
        description="Commentaire facultatif de l'utilisateur.",
    )

    # --------------------------------------------------------
    # VALIDATION COMMENTAIRE
    # --------------------------------------------------------

    @field_validator("commentaire")
    @classmethod
    def valider_commentaire(
        cls,
        valeur: str | None,
    ) -> str | None:
        """
        Nettoie le commentaire et évite d'enregistrer
        un texte composé uniquement d'espaces.
        """

        if valeur is None:
            return None

        valeur = valeur.strip()

        if not valeur:
            return None

        return valeur


# ============================================================
# CRÉATION D'UN AVIS
# ============================================================


class AvisPlateformeCreate(AvisPlateformeBase):
    """
    Schéma utilisé lorsqu'un utilisateur crée
    un avis sur AgroMarket Burkina.
    """

    pass


# ============================================================
# MODIFICATION D'UN AVIS
# ============================================================


class AvisPlateformeUpdate(BaseModel):
    """
    Schéma utilisé pour modifier son avis existant.

    Tous les champs sont facultatifs afin de permettre
    une modification partielle.
    """

    note: int | None = Field(
        default=None,
        ge=1,
        le=5,
        description="Nouvelle note de 1 à 5.",
    )

    commentaire: str | None = Field(
        default=None,
        max_length=1000,
        description="Nouveau commentaire.",
    )

    # --------------------------------------------------------
    # VALIDATION COMMENTAIRE
    # --------------------------------------------------------

    @field_validator("commentaire")
    @classmethod
    def valider_commentaire(
        cls,
        valeur: str | None,
    ) -> str | None:
        """
        Nettoie le commentaire.
        """

        if valeur is None:
            return None

        valeur = valeur.strip()

        if not valeur:
            return None

        return valeur


# ============================================================
# RÉPONSE PUBLIQUE
# ============================================================


class AvisPlateformeResponse(BaseModel):
    """
    Réponse publique d'un avis.

    Les informations sensibles de l'utilisateur ne sont
    volontairement pas exposées.
    """

    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int

    utilisateur_id: int

    note: int

    commentaire: str | None

    date_creation: datetime

    date_modification: datetime | None


# ============================================================
# RÉPONSE ADMINISTRATION / MODÉRATION
# ============================================================


class AvisPlateformeModerationResponse(AvisPlateformeResponse):
    """
    Réponse destinée à l'administration et à la modération.

    La visibilité de l'avis est incluse.
    """

    est_visible: bool


# ============================================================
# STATISTIQUES DES AVIS
# ============================================================


class AvisPlateformeStatistiquesResponse(BaseModel):
    """
    Statistiques globales des avis AgroMarket.
    """

    nombre_total: int = Field(
        ...,
        ge=0,
        description="Nombre total d'avis.",
    )

    nombre_visibles: int = Field(
        ...,
        ge=0,
        description="Nombre d'avis actuellement visibles.",
    )

    nombre_invisibles: int = Field(
        ...,
        ge=0,
        description="Nombre d'avis masqués.",
    )

    note_moyenne: float = Field(
        ...,
        ge=0,
        le=5,
        description="Note moyenne globale.",
    )

    # --------------------------------------------------------
    # RÉPARTITION DES NOTES
    # --------------------------------------------------------

    cinq_etoiles: int = Field(
        default=0,
        ge=0,
    )

    quatre_etoiles: int = Field(
        default=0,
        ge=0,
    )

    trois_etoiles: int = Field(
        default=0,
        ge=0,
    )

    deux_etoiles: int = Field(
        default=0,
        ge=0,
    )

    une_etoile: int = Field(
        default=0,
        ge=0,
    )


# ============================================================
# RÉPONSE APRÈS CRÉATION / MODIFICATION
# ============================================================


class AvisPlateformeOperationResponse(BaseModel):
    """
    Réponse standard après une opération sur un avis.
    """

    message: str

    avis: AvisPlateformeResponse