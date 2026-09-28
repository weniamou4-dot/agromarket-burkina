# ============================================================
# AGROMARKET BURKINA
# PRODUCTS / SCHEMAS
# Version professionnelle complète et sécurisée
#
# Fonctionnalités :
# - Familles
# - Catégories
# - Produits
# - Secteurs
# - Annonces
# - Géolocalisation
# - Protection de la localisation privée
# - Images
# - Recherche
# - Modération
# ============================================================

from __future__ import annotations

import enum
from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    model_validator,
)


# ============================================================
# CONFIGURATION COMMUNE
# ============================================================


class AgroProductBaseModel(BaseModel):
    """
    Configuration commune à tous les schémas du module Produits.
    """

    model_config = ConfigDict(
        from_attributes=True,
        str_strip_whitespace=True,
        extra="forbid",
    )


# ============================================================
# SECTEUR DU PRODUIT
# ============================================================


class SecteurProduit(str, enum.Enum):
    """
    Secteurs disponibles dans AgroMarket Burkina.

    Organisation du catalogue :

        Produit agricole
            ├── Brut
            └── Transformé

        Élevage
            ├── Brut
            └── Transformé

        Matériel agricole

        Engrais

        Produits phytosanitaires

    Brut / Transformé concerne uniquement :
        - Produit agricole
        - Élevage
    """

    PRODUIT_AGRICOLE = "agricole"
    ELEVAGE = "elevage"
    MATERIEL_AGRICOLE = "materiel_agricole"
    ENGRAIS = "engrais"
    PHYTOSANITAIRE = "phytosanitaire"


# ============================================================
# TYPE DU PRODUIT
# ============================================================


class TypeProduit(str, enum.Enum):
    """
    Type de produit.

    Utilisé uniquement pour :
        - Produit agricole
        - Élevage
    """

    BRUT = "brut"
    TRANSFORME = "transforme"


# ============================================================
# STATUT PRODUIT
# ============================================================


class StatutProduit(str, enum.Enum):
    """
    Statut de validation du produit dans le catalogue.
    """

    EN_ATTENTE = "en_attente"
    VALIDE = "valide"


# ============================================================
# STATUT ANNONCE
# ============================================================


class StatutAnnonce(str, enum.Enum):
    """
    Statut d'une annonce.
    """

    EN_ATTENTE = "en_attente"
    PUBLIEE = "publiee"
    REFUSEE = "refusee"


# ============================================================
# SOURCE DE LOCALISATION
# ============================================================


class LocalisationSource(str, enum.Enum):
    """
    Origine des coordonnées géographiques.
    """

    GPS = "gps"
    MANUELLE = "manuelle"
    INCONNUE = "inconnue"


# ============================================================
# TYPE DE LOCALISATION
# ============================================================


class TypeLocalisation(str, enum.Enum):
    """
    Type de lieu associé à une annonce.

    DOMICILE :
        Lieu personnel du vendeur.
        Il reste toujours privé.

    POINT_DE_VENTE :
        Lieu commercial destiné aux transactions.

    POINT_DE_RENCONTRE :
        Lieu convenu entre acheteur et vendeur
        pour effectuer la transaction.

    Les coordonnées exactes d'un domicile ne doivent
    jamais être exposées publiquement.
    """

    DOMICILE = "domicile"
    POINT_DE_VENTE = "point_vente"
    POINT_DE_RENCONTRE = "point_rencontre"


# ============================================================
# VISIBILITÉ DE LA LOCALISATION
# ============================================================


class VisibiliteLocalisation(str, enum.Enum):
    """
    Niveau de visibilité de la localisation.

    PRIVEE :
        Les coordonnées exactes ne sont pas exposées
        dans les réponses publiques.

    PUBLIQUE :
        Le point peut être utilisé pour l'affichage
        public et l'itinéraire lorsque le service
        l'autorise.

    IMPORTANT :
        Un domicile ne peut jamais être public.
    """

    PRIVEE = "privee"
    PUBLIQUE = "publique"


# ============================================================
# VALIDATION DU TYPE SELON LE SECTEUR
# ============================================================


def valider_type_selon_secteur(
    secteur: SecteurProduit,
    type_produit: TypeProduit | None,
) -> TypeProduit | None:
    """
    Vérifie la cohérence entre le secteur et le type.

    Règles :

    Produit agricole :
        brut ou transforme obligatoire.

    Élevage :
        brut ou transforme obligatoire.

    Matériel agricole :
        aucun type.

    Engrais :
        aucun type.

    Phytosanitaire :
        aucun type.
    """

    secteurs_avec_type = {
        SecteurProduit.PRODUIT_AGRICOLE,
        SecteurProduit.ELEVAGE,
    }

    secteurs_sans_type = {
        SecteurProduit.MATERIEL_AGRICOLE,
        SecteurProduit.ENGRAIS,
        SecteurProduit.PHYTOSANITAIRE,
    }

    if secteur in secteurs_avec_type:

        if type_produit is None:
            raise ValueError(
                "Le type du produit est obligatoire "
                "pour les secteurs Produit agricole et Élevage."
            )

        return type_produit

    if secteur in secteurs_sans_type:

        if type_produit is not None:
            raise ValueError(
                "Le type Brut/Transformé ne doit pas être renseigné "
                "pour ce secteur."
            )

        return None

    return type_produit


# ============================================================
# GÉOLOCALISATION
# ============================================================


class GeolocalisationSchema(AgroProductBaseModel):
    """
    Coordonnées géographiques internes.

    Les coordonnées précises peuvent être conservées
    côté backend sans être exposées publiquement.
    """

    latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
    )

    longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
    )

    localisation_source: LocalisationSource = Field(
        default=LocalisationSource.INCONNUE,
    )

    type_localisation: TypeLocalisation = Field(
        default=TypeLocalisation.DOMICILE,
    )

    visibilite_localisation: VisibiliteLocalisation = Field(
        default=VisibiliteLocalisation.PRIVEE,
    )

    @model_validator(mode="after")
    def verifier_coherence(self):
        """
        Vérifie la cohérence complète de la localisation.
        """

        latitude = self.latitude
        longitude = self.longitude

        # ----------------------------------------------------
        # Latitude / longitude ensemble
        # ----------------------------------------------------

        if (
            (latitude is None and longitude is not None)
            or
            (latitude is not None and longitude is None)
        ):
            raise ValueError(
                "La latitude et la longitude doivent "
                "être fournies ensemble."
            )

        # ----------------------------------------------------
        # Coordonnées => source obligatoire
        # ----------------------------------------------------

        if (
            latitude is not None
            and longitude is not None
            and self.localisation_source
            == LocalisationSource.INCONNUE
        ):
            raise ValueError(
                "Une source de localisation doit être "
                "précisée lorsque les coordonnées sont fournies."
            )

        # ----------------------------------------------------
        # Localisation publique => coordonnées obligatoires
        # ----------------------------------------------------

        if (
            self.visibilite_localisation
            == VisibiliteLocalisation.PUBLIQUE
            and (
                latitude is None
                or longitude is None
            )
        ):
            raise ValueError(
                "Une localisation publique doit disposer "
                "de coordonnées géographiques."
            )

        # ----------------------------------------------------
        # Domicile => jamais public
        # ----------------------------------------------------

        if (
            self.type_localisation
            == TypeLocalisation.DOMICILE
            and self.visibilite_localisation
            == VisibiliteLocalisation.PUBLIQUE
        ):
            raise ValueError(
                "La localisation du domicile ne peut pas "
                "être rendue publique."
            )

        return self


# ============================================================
# FAMILLE
# ============================================================


class FamilleCreate(AgroProductBaseModel):
    """
    Création d'une famille de produits.
    """

    nom: str = Field(
        ...,
        min_length=2,
        max_length=150,
    )

    description: str | None = Field(
        default=None,
        max_length=2000,
    )


class FamilleResponse(AgroProductBaseModel):
    """
    Réponse famille.
    """

    id: int = Field(
        ...,
        ge=1,
    )

    nom: str

    description: str | None = None


# ============================================================
# CATÉGORIE
# ============================================================


class CategorieCreate(AgroProductBaseModel):
    """
    Création d'une catégorie.
    """

    nom: str = Field(
        ...,
        min_length=2,
        max_length=150,
    )

    description: str | None = Field(
        default=None,
        max_length=2000,
    )

    famille_id: int = Field(
        ...,
        gt=0,
    )


class CategorieResponse(AgroProductBaseModel):
    """
    Réponse catégorie.
    """

    id: int = Field(
        ...,
        ge=1,
    )

    nom: str

    description: str | None = None

    famille_id: int = Field(
        ...,
        ge=1,
    )


# ============================================================
# PRODUIT — CRÉATION
# ============================================================


class ProduitCreate(AgroProductBaseModel):
    """
    Création d'un produit par l'administration.
    """

    nom: str = Field(
        ...,
        min_length=2,
        max_length=150,
    )

    description: str | None = Field(
        default=None,
        max_length=5000,
    )

    categorie_id: int = Field(
        ...,
        gt=0,
    )

    secteur: SecteurProduit = Field(
        default=SecteurProduit.PRODUIT_AGRICOLE,
    )

    type_produit: TypeProduit | None = Field(
        default=None,
    )

    @model_validator(mode="after")
    def verifier_type_secteur(self):
        """
        Vérifie la cohérence secteur/type.
        """

        self.type_produit = valider_type_selon_secteur(
            self.secteur,
            self.type_produit,
        )

        return self


# ============================================================
# PRODUIT — MODIFICATION
# ============================================================


class ProduitUpdate(AgroProductBaseModel):
    """
    Modification partielle d'un produit.

    La validation complète de la cohérence secteur/type
    doit être réalisée dans le service après fusion avec
    les données existantes en base.
    """

    nom: str | None = Field(
        default=None,
        min_length=2,
        max_length=150,
    )

    description: str | None = Field(
        default=None,
        max_length=5000,
    )

    categorie_id: int | None = Field(
        default=None,
        gt=0,
    )

    secteur: SecteurProduit | None = Field(
        default=None,
    )

    type_produit: TypeProduit | None = Field(
        default=None,
    )

    @model_validator(mode="after")
    def verifier_coherence_si_fournie(self):
        """
        Vérifie les incohérences évidentes dans une
        modification partielle.

        La validation finale sera réalisée dans le service
        après fusion avec le produit existant.
        """

        secteurs_sans_type = {
            SecteurProduit.MATERIEL_AGRICOLE,
            SecteurProduit.ENGRAIS,
            SecteurProduit.PHYTOSANITAIRE,
        }

        if (
            self.secteur in secteurs_sans_type
            and self.type_produit is not None
        ):
            raise ValueError(
                "Le type Brut/Transformé ne doit pas être renseigné "
                "pour ce secteur."
            )

        return self


# ============================================================
# PRODUIT — RÉPONSE
# ============================================================


class ProduitResponse(AgroProductBaseModel):
    """
    Réponse complète d'un produit.
    """

    id: int = Field(
        ...,
        ge=1,
    )

    nom: str

    description: str | None = None

    categorie_id: int = Field(
        ...,
        ge=1,
    )

    secteur: SecteurProduit

    type_produit: TypeProduit | None = None

    est_valide: bool

    statut_produit: StatutProduit


# ============================================================
# PRODUIT — RÉSUMÉ
# ============================================================


class ProduitResume(AgroProductBaseModel):
    """
    Version légère utilisée dans les annonces.
    """

    id: int = Field(
        ...,
        ge=1,
    )

    nom: str

    secteur: SecteurProduit

    type_produit: TypeProduit | None = None

    statut_produit: StatutProduit


# ============================================================
# IMAGE
# ============================================================


class ImageResponse(AgroProductBaseModel):
    """
    Image associée à une annonce.
    """

    id: int = Field(
        ...,
        ge=1,
    )

    annonce_id: int = Field(
        ...,
        ge=1,
    )

    url: str

    date_creation: datetime


# ============================================================
# RÉSUMÉ VENDEUR
# ============================================================


class VendeurResume(AgroProductBaseModel):
    """
    Informations minimales du vendeur.
    """

    id: int = Field(
        ...,
        ge=1,
    )

    nom: str

    photo_profil: str | None = None
    telephone: str | None = None


# ============================================================
# ANNONCE — CRÉATION
# ============================================================


class AnnonceCreate(AgroProductBaseModel):
    """
    Création d'une annonce par un vendeur.

    La localisation GPS peut être fournie automatiquement
    par le frontend après autorisation de l'utilisateur.

    Sécurité :

    - domicile = privé par défaut
    - domicile ne peut jamais être public
    - une localisation publique nécessite des coordonnées
    - les coordonnées exactes ne sont pas exposées dans
      la réponse publique
    """

    produit_nom: str = Field(
        ...,
        min_length=2,
        max_length=150,
    )

    description_produit: str | None = Field(
        default=None,
        max_length=5000,
    )

    categorie_id: int = Field(
        ...,
        gt=0,
    )

    secteur: SecteurProduit = Field(
        default=SecteurProduit.PRODUIT_AGRICOLE,
    )

    type_produit: TypeProduit | None = Field(
        default=None,
    )

    prix: float = Field(
        ...,
        gt=0,
    )

    quantite: float = Field(
        ...,
        gt=0,
    )

    unite: str = Field(
        ...,
        min_length=1,
        max_length=30,
    )

    region: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    province: str | None = Field(
        default=None,
        max_length=100,
    )

    commune: str | None = Field(
        default=None,
        max_length=100,
    )

    # ========================================================
    # GPS
    # ========================================================

    latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
    )

    longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
    )

    localisation_source: LocalisationSource = Field(
        default=LocalisationSource.INCONNUE,
    )

    # ========================================================
    # TYPE DE LIEU
    # ========================================================

    type_localisation: TypeLocalisation = Field(
        default=TypeLocalisation.DOMICILE,
    )

    # ========================================================
    # VISIBILITÉ
    # ========================================================

    visibilite_localisation: VisibiliteLocalisation = Field(
        default=VisibiliteLocalisation.PRIVEE,
    )

    @model_validator(mode="after")
    def verifier_donnees(self):
        """
        Vérifie la cohérence générale de l'annonce.
        """

        # ----------------------------------------------------
        # Secteur / type
        # ----------------------------------------------------

        self.type_produit = valider_type_selon_secteur(
            self.secteur,
            self.type_produit,
        )

        # ----------------------------------------------------
        # Latitude / longitude
        # ----------------------------------------------------

        if (
            (self.latitude is None and self.longitude is not None)
            or
            (self.latitude is not None and self.longitude is None)
        ):
            raise ValueError(
                "La latitude et la longitude doivent "
                "être fournies ensemble."
            )

        # ----------------------------------------------------
        # Source de localisation
        # ----------------------------------------------------

        if (
            self.latitude is not None
            and self.longitude is not None
            and self.localisation_source
            == LocalisationSource.INCONNUE
        ):
            raise ValueError(
                "Une source de localisation doit être "
                "précisée lorsque les coordonnées sont fournies."
            )

        # ----------------------------------------------------
        # Localisation publique
        # ----------------------------------------------------

        if (
            self.visibilite_localisation
            == VisibiliteLocalisation.PUBLIQUE
            and (
                self.latitude is None
                or self.longitude is None
            )
        ):
            raise ValueError(
                "Une localisation publique doit disposer "
                "de coordonnées géographiques."
            )

        # ----------------------------------------------------
        # Protection du domicile
        # ----------------------------------------------------

        if (
            self.type_localisation
            == TypeLocalisation.DOMICILE
            and self.visibilite_localisation
            == VisibiliteLocalisation.PUBLIQUE
        ):
            raise ValueError(
                "La localisation du domicile ne peut pas "
                "être rendue publique."
            )

        return self


# ============================================================
# ANNONCE — MODIFICATION
# ============================================================


class AnnonceUpdate(AgroProductBaseModel):
    """
    Modification partielle d'une annonce.

    IMPORTANT :

    Le service doit fusionner les valeurs existantes
    avant de réaliser la validation finale de la
    localisation.
    """

    prix: float | None = Field(
        default=None,
        gt=0,
    )

    quantite: float | None = Field(
        default=None,
        gt=0,
    )

    unite: str | None = Field(
        default=None,
        min_length=1,
        max_length=30,
    )

    region: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    province: str | None = Field(
        default=None,
        max_length=100,
    )

    commune: str | None = Field(
        default=None,
        max_length=100,
    )

    # ========================================================
    # GPS
    # ========================================================

    latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
    )

    longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
    )

    localisation_source: LocalisationSource | None = Field(
        default=None,
    )

    # ========================================================
    # TYPE DE LIEU
    # ========================================================

    type_localisation: TypeLocalisation | None = Field(
        default=None,
    )

    # ========================================================
    # VISIBILITÉ
    # ========================================================

    visibilite_localisation: VisibiliteLocalisation | None = Field(
        default=None,
    )

    @model_validator(mode="after")
    def verifier_geolocalisation(self):
        """
        Vérifie les règles de cohérence pouvant être
        déterminées directement à partir des données envoyées.

        La validation finale doit être effectuée dans
        le service après fusion avec les données existantes.
        """

        # ----------------------------------------------------
        # Latitude / longitude
        # ----------------------------------------------------

        if (
            (self.latitude is None and self.longitude is not None)
            or
            (self.latitude is not None and self.longitude is None)
        ):
            raise ValueError(
                "La latitude et la longitude doivent "
                "être fournies ensemble."
            )

        # ----------------------------------------------------
        # Coordonnées + source explicitement inconnue
        # ----------------------------------------------------

        if (
            self.latitude is not None
            and self.longitude is not None
            and (
                self.localisation_source is None
                or self.localisation_source
                == LocalisationSource.INCONNUE
            )
        ):
            raise ValueError(
                "Une source de localisation doit être "
                "précisée lorsque les coordonnées sont fournies."
            )

        # ----------------------------------------------------
        # Type + visibilité fournis simultanément
        # ----------------------------------------------------

        if (
            self.type_localisation
            == TypeLocalisation.DOMICILE
            and self.visibilite_localisation
            == VisibiliteLocalisation.PUBLIQUE
        ):
            raise ValueError(
                "La localisation du domicile ne peut pas "
                "être rendue publique."
            )

        return self


# ============================================================
# ANNONCE — RÉPONSE PUBLIQUE
# ============================================================


class AnnonceResponse(AgroProductBaseModel):
    """
    Réponse publique d'une annonce.

    IMPORTANT :

    Les coordonnées GPS exactes ne sont volontairement
    PAS exposées ici.

    Le frontend peut utiliser :

        région
        province
        commune

    et, lorsque cela est autorisé, un endpoint sécurisé
    pour obtenir un itinéraire vers un point public.

    Cette séparation évite d'exposer publiquement
    l'adresse exacte du domicile d'un vendeur.
    """

    id: int = Field(
        ...,
        ge=1,
    )

    produit_id: int = Field(
        ...,
        ge=1,
    )

    vendeur_id: int = Field(
        ...,
        ge=1,
    )

    produit: ProduitResume

    prix: float

    quantite: float

    unite: str

    region: str

    province: str | None = None

    commune: str | None = None

    localisation_source: LocalisationSource

    type_localisation: TypeLocalisation

    visibilite_localisation: VisibiliteLocalisation

    statut: StatutAnnonce

    date_publication: datetime | None = None

    images: list[ImageResponse] = Field(
        default_factory=list,
    )

    vendeur: VendeurResume | None = None


# ============================================================
# ANNONCE — LOCALISATION PUBLIQUE
# ============================================================


class AnnonceLocalisationResponse(AgroProductBaseModel):
    """
    Localisation destinée à l'affichage public.

    Ne contient volontairement aucune coordonnée GPS exacte.
    """

    region: str

    province: str | None = None

    commune: str | None = None

    type_localisation: TypeLocalisation

    visibilite_localisation: VisibiliteLocalisation

    localisation_disponible: bool = False


# ============================================================
# ANNONCE — ITINÉRAIRE
# ============================================================


class AnnonceItineraireResponse(AgroProductBaseModel):
    """
    Coordonnées destinées à la fonctionnalité d'itinéraire.

    Ce schéma ne doit être retourné que lorsque le point
    géographique est explicitement autorisé à être partagé.

    Il ne doit JAMAIS être utilisé pour exposer
    les coordonnées privées d'un domicile.
    """

    latitude: float = Field(
        ...,
        ge=-90,
        le=90,
    )

    longitude: float = Field(
        ...,
        ge=-180,
        le=180,
    )

    type_localisation: TypeLocalisation

    message: str


# ============================================================
# ANNONCE — MODÉRATION
# ============================================================


class AnnonceModerationResponse(AgroProductBaseModel):
    """
    Réponse détaillée destinée à la modération.

    Les coordonnées exactes peuvent être visibles par
    les rôles autorisés à la modération.
    """

    id: int = Field(
        ...,
        ge=1,
    )

    produit_id: int = Field(
        ...,
        ge=1,
    )

    vendeur_id: int = Field(
        ...,
        ge=1,
    )

    produit: ProduitResponse

    prix: float

    quantite: float

    unite: str

    region: str

    province: str | None = None

    commune: str | None = None

    latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
    )

    longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
    )

    localisation_source: LocalisationSource

    type_localisation: TypeLocalisation

    visibilite_localisation: VisibiliteLocalisation

    statut: StatutAnnonce

    date_publication: datetime | None = None

    images: list[ImageResponse] = Field(
        default_factory=list,
    )

    vendeur: VendeurResume | None = None


# ============================================================
# PAGINATION
# ============================================================


class PaginationMeta(AgroProductBaseModel):
    """
    Métadonnées de pagination.
    """

    page: int = Field(
        default=1,
        ge=1,
    )

    limit: int = Field(
        default=20,
        ge=1,
        le=100,
    )

    total: int = Field(
        default=0,
        ge=0,
    )

    pages: int = Field(
        default=0,
        ge=0,
    )


# ============================================================
# LISTE PRODUITS
# ============================================================


class ProduitListResponse(AgroProductBaseModel):
    """
    Liste paginée des produits.
    """

    produits: list[ProduitResponse] = Field(
        default_factory=list,
    )

    pagination: PaginationMeta


# ============================================================
# LISTE ANNONCES
# ============================================================


class AnnonceListResponse(AgroProductBaseModel):
    """
    Liste paginée des annonces publiques.
    """

    annonces: list[AnnonceResponse] = Field(
        default_factory=list,
    )

    pagination: PaginationMeta


# ============================================================
# RECHERCHE PRODUITS
# ============================================================


class ProduitSearchRequest(AgroProductBaseModel):
    """
    Recherche intelligente de produits.
    """

    recherche: str = Field(
        default="",
        max_length=150,
    )

    secteur: SecteurProduit | None = Field(
        default=None,
    )

    categorie_id: int | None = Field(
        default=None,
        gt=0,
    )

    type_produit: TypeProduit | None = Field(
        default=None,
    )

    page: int = Field(
        default=1,
        ge=1,
    )

    limit: int = Field(
        default=20,
        ge=1,
        le=100,
    )

    @model_validator(mode="after")
    def verifier_type_secteur(self):
        """
        Vérifie la cohérence du filtre secteur/type.
        """

        secteurs_sans_type = {
            SecteurProduit.MATERIEL_AGRICOLE,
            SecteurProduit.ENGRAIS,
            SecteurProduit.PHYTOSANITAIRE,
        }

        if (
            self.secteur in secteurs_sans_type
            and self.type_produit is not None
        ):
            raise ValueError(
                "Le type Brut/Transformé ne peut pas être utilisé "
                "avec ce secteur."
            )

        return self


# ============================================================
# RECHERCHE ANNONCES
# ============================================================


class AnnonceSearchRequest(AgroProductBaseModel):
    """
    Recherche intelligente des annonces.
    """

    recherche: str = Field(
        default="",
        max_length=150,
    )

    secteur: SecteurProduit | None = Field(
        default=None,
    )

    region: str | None = Field(
        default=None,
        max_length=100,
    )

    province: str | None = Field(
        default=None,
        max_length=100,
    )

    commune: str | None = Field(
        default=None,
        max_length=100,
    )

    produit_id: int | None = Field(
        default=None,
        gt=0,
    )

    categorie_id: int | None = Field(
        default=None,
        gt=0,
    )

    type_produit: TypeProduit | None = Field(
        default=None,
    )

    prix_min: float | None = Field(
        default=None,
        ge=0,
    )

    prix_max: float | None = Field(
        default=None,
        ge=0,
    )

    latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
    )

    longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
    )

    rayon_km: float | None = Field(
        default=None,
        gt=0,
    )

    page: int = Field(
        default=1,
        ge=1,
    )

    limit: int = Field(
        default=20,
        ge=1,
        le=100,
    )

    @model_validator(mode="after")
    def verifier_requete(self):
        """
        Vérifie la cohérence des filtres.
        """

        secteurs_sans_type = {
            SecteurProduit.MATERIEL_AGRICOLE,
            SecteurProduit.ENGRAIS,
            SecteurProduit.PHYTOSANITAIRE,
        }

        # ----------------------------------------------------
        # Secteur / type
        # ----------------------------------------------------

        if (
            self.secteur in secteurs_sans_type
            and self.type_produit is not None
        ):
            raise ValueError(
                "Le type Brut/Transformé ne peut pas être utilisé "
                "avec ce secteur."
            )

        # ----------------------------------------------------
        # Prix
        # ----------------------------------------------------

        if (
            self.prix_min is not None
            and self.prix_max is not None
            and self.prix_min > self.prix_max
        ):
            raise ValueError(
                "Le prix minimum ne peut pas être supérieur "
                "au prix maximum."
            )

        # ----------------------------------------------------
        # Latitude / longitude
        # ----------------------------------------------------

        if (
            (self.latitude is None and self.longitude is not None)
            or
            (self.latitude is not None and self.longitude is None)
        ):
            raise ValueError(
                "La latitude et la longitude doivent "
                "être fournies ensemble."
            )

        # ----------------------------------------------------
        # Rayon
        # ----------------------------------------------------

        if (
            self.rayon_km is not None
            and (
                self.latitude is None
                or self.longitude is None
            )
        ):
            raise ValueError(
                "Un rayon de recherche nécessite "
                "des coordonnées géographiques."
            )

        return self


# ============================================================
# RÉSULTAT DE RECHERCHE
# ============================================================


class RechercheResultat(AgroProductBaseModel):
    """
    Élément individuel retourné par une recherche de produits.
    """

    produit: ProduitResponse

    score: float | None = Field(
        default=None,
        ge=0,
        le=100,
    )


class RechercheResponse(AgroProductBaseModel):
    """
    Réponse d'une recherche intelligente de produits.
    """

    recherche_originale: str

    correction: str | None = None

    produits: list[ProduitResponse] = Field(
        default_factory=list,
    )

    scores: dict[str, float] = Field(
        default_factory=dict,
    )


# ============================================================
# GÉOLOCALISATION — RÉPONSE
# ============================================================


class GeolocalisationResponse(AgroProductBaseModel):
    """
    Réponse concernant une distance géographique.

    Les coordonnées privées ne sont pas renvoyées.
    """

    distance_km: float | None = Field(
        default=None,
        ge=0,
    )


# ============================================================
# UPLOAD IMAGE
# ============================================================


class ImageUploadResponse(AgroProductBaseModel):
    """
    Réponse après upload d'une image.
    """

    id: int = Field(
        ...,
        ge=1,
    )

    annonce_id: int = Field(
        ...,
        ge=1,
    )

    url: str

    message: str


# ============================================================
# ACTION PRODUIT
# ============================================================


class ProduitActionResponse(AgroProductBaseModel):
    """
    Réponse générique après une action sur un produit.
    """

    message: str

    produit: ProduitResponse | None = None


# ============================================================
# COMPATIBILITÉ
# ============================================================

# Alias conservés pour éviter de casser
# d'éventuels imports existants dans le projet.


ProductSector = SecteurProduit

ProductType = TypeProduit

AnnouncementStatus = StatutAnnonce

ProductStatus = StatutProduit

LocationSource = LocalisationSource

LocationType = TypeLocalisation

LocationVisibility = VisibiliteLocalisation