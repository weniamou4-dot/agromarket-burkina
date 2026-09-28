
# ============================================================
# AGROMARKET BURKINA
# AUTH / SCHEMAS
# Version professionnelle définitive
#
# Fonctionnalités :
# - authentification locale
# - authentification Google
# - gestion du profil
# - géolocalisation utilisateur
# - vérification email / téléphone
# - récupération du mot de passe
# - réinitialisation du mot de passe
# - gestion des vendeurs
# - gestion des modérateurs
# - administration
# - statistiques globales
# - consentement aux règles de confidentialité
# ============================================================

from datetime import datetime
from enum import Enum

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)


# ============================================================
# CONFIGURATION COMMUNE
# ============================================================

class AgroAuthBaseModel(BaseModel):
    """
    Configuration commune à tous les schémas
    du module Authentification.
    """

    model_config = ConfigDict(
        from_attributes=True,
        str_strip_whitespace=True,
        extra="forbid",
    )


# ============================================================
# TYPES MÉTIERS
# ============================================================

class UserRole(str, Enum):
    """
    Rôles disponibles sur AgroMarket Burkina.
    """

    ACHETEUR = "acheteur"
    VENDEUR = "vendeur"
    ADMIN = "admin"
    ADMINISTRATEUR = "administrateur"
    MODERATEUR = "moderateur"


class UserStatus(str, Enum):
    """
    États possibles d'un compte utilisateur.
    """

    ACTIF = "actif"
    EN_ATTENTE = "en_attente"
    BLOQUE = "bloque"
    SUSPENDU = "suspendu"


class AuthMethod(str, Enum):
    """
    Méthode d'authentification du compte.
    """

    LOCAL = "local"
    GOOGLE = "google"
    HYBRIDE = "hybride"


class SellerRequestStatus(str, Enum):
    """
    États d'une demande pour devenir vendeur.
    """

    EN_ATTENTE = "en_attente"
    ACCEPTEE = "acceptee"
    REFUSEE = "refusee"


class LocationSource(str, Enum):
    """
    Source de géolocalisation.
    """

    GPS = "gps"
    MANUELLE = "manuelle"
    INCONNUE = "inconnue"


# ============================================================
# LOCALISATION
# ============================================================

class UserLocationSchema(
    AgroAuthBaseModel
):
    """
    Informations de géolocalisation d'un utilisateur.
    """

    latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
        description="Latitude géographique.",
        examples=[12.3714],
    )

    longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
        description="Longitude géographique.",
        examples=[-1.5197],
    )

    localisation_source: LocationSource = Field(
        default=LocationSource.INCONNUE,
        description="Source de la localisation.",
    )

    @field_validator(
        "longitude",
        mode="before",
    )
    @classmethod
    def valider_longitude(
        cls,
        valeur,
    ):
        """
        Conversion pratique des coordonnées reçues.
        """

        if valeur is None:
            return None

        return float(valeur)


# ============================================================
# INSCRIPTION LOCALE
# ============================================================

class RegisterRequest(
    AgroAuthBaseModel
):
    """
    Création d'un compte utilisateur avec
    téléphone, email éventuel et mot de passe.

    Le rôle est volontairement absent.

    Le backend impose toujours :

        role = acheteur

    Le statut est également géré par le backend.

    L'utilisateur doit accepter explicitement
    les conditions d'utilisation et la politique
    de confidentialité.
    """

    nom: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Nom complet.",
        examples=["Tantan Ouédraogo"],
    )

    telephone: str = Field(
        ...,
        min_length=8,
        max_length=20,
        description="Numéro de téléphone.",
        examples=["55021266"],
    )

    email: EmailStr | None = Field(
        default=None,
        description="Adresse email facultative.",
        examples=["utilisateur@gmail.com"],
    )

    mot_de_passe: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Mot de passe.",
    )

    confidentialite_acceptee: bool = Field(
        ...,
        description=(
            "Acceptation obligatoire des conditions "
            "d'utilisation et de la politique de "
            "confidentialité."
        ),
        examples=[True],
    )

    version_confidentialite: str = Field(
        default="1.0",
        min_length=1,
        max_length=20,
        description=(
            "Version de la politique de confidentialité "
            "acceptée."
        ),
        examples=["1.0"],
    )

    @field_validator(
        "telephone"
    )
    @classmethod
    def normaliser_telephone(
        cls,
        valeur: str,
    ) -> str:
        """
        Supprime les espaces inutiles du téléphone.
        """

        valeur = valeur.strip()

        if not valeur:
            raise ValueError(
                "Le numéro de téléphone est obligatoire."
            )

        return valeur

    @field_validator(
        "version_confidentialite"
    )
    @classmethod
    def valider_version_confidentialite(
        cls,
        valeur: str,
    ) -> str:
        """
        Nettoie et vérifie la version de la politique.
        """

        valeur = valeur.strip()

        if not valeur:
            raise ValueError(
                "La version de la politique de confidentialité "
                "est obligatoire."
            )

        return valeur

    @model_validator(
        mode="after"
    )
    def verifier_acceptation_confidentialite(
        self,
    ):
        """
        L'inscription est impossible sans acceptation
        explicite de la politique de confidentialité.
        """

        if not self.confidentialite_acceptee:
            raise ValueError(
                "Vous devez accepter les conditions d'utilisation "
                "et la politique de confidentialité pour créer "
                "un compte."
            )

        return self


# ============================================================
# CONNEXION LOCALE
# ============================================================

class LoginRequest(
    AgroAuthBaseModel
):
    """
    Connexion classique par téléphone
    et mot de passe.
    """

    telephone: str = Field(
        ...,
        min_length=8,
        max_length=20,
        description="Numéro de téléphone.",
        examples=["55021266"],
    )

    mot_de_passe: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Mot de passe.",
    )

    @field_validator(
        "telephone"
    )
    @classmethod
    def nettoyer_telephone(
        cls,
        valeur: str,
    ) -> str:
        return valeur.strip()


# ============================================================
# CONNEXION GOOGLE
# ============================================================

class GoogleLoginRequest(
    AgroAuthBaseModel
):
    """
    Authentification avec Google.

    credential correspond au token/credential
    fourni par Google au frontend.

    Le backend doit impérativement vérifier ce
    credential auprès de Google avant de considérer
    l'utilisateur comme authentifié.
    """

    credential: str = Field(
        ...,
        min_length=10,
        max_length=10000,
        description=(
            "Credential ou ID Token fourni par Google."
        ),
    )


# ============================================================
# COMPLÉTER UN COMPTE GOOGLE
# ============================================================

class GoogleCompleteProfileRequest(
    AgroAuthBaseModel
):
    """
    Complète les informations d'un compte
    créé avec Google.
    """

    telephone: str = Field(
        ...,
        min_length=8,
        max_length=20,
        description=(
            "Numéro de téléphone de l'utilisateur."
        ),
        examples=["70000000"],
    )

    adresse: str | None = Field(
        default=None,
        max_length=255,
        description="Adresse.",
    )

    latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
        description="Latitude.",
    )

    longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
        description="Longitude.",
    )

    localisation_source: LocationSource = Field(
        default=LocationSource.INCONNUE,
        description="Source de la localisation.",
    )

    @field_validator(
        "telephone"
    )
    @classmethod
    def nettoyer_telephone(
        cls,
        valeur: str,
    ) -> str:
        valeur = valeur.strip()

        if not valeur:
            raise ValueError(
                "Le numéro de téléphone est obligatoire."
            )

        return valeur


# ============================================================
# TOKEN
# ============================================================

class TokenResponse(
    AgroAuthBaseModel
):
    """
    Token JWT retourné après authentification.
    """

    access_token: str = Field(
        ...,
        description="Token JWT.",
    )

    token_type: str = Field(
        default="bearer",
        description="Type du token.",
    )

    expires_in: int | None = Field(
        default=None,
        ge=1,
        description=(
            "Durée de validité du token en secondes."
        ),
    )


# ============================================================
# RÉPONSE GOOGLE
# ============================================================

class GoogleAuthResponse(
    AgroAuthBaseModel
):
    """
    Réponse d'une authentification Google.
    """

    access_token: str = Field(
        ...,
        description="Token JWT AgroMarket.",
    )

    token_type: str = Field(
        default="bearer",
    )

    expires_in: int | None = Field(
        default=None,
        ge=1,
    )

    is_new_user: bool = Field(
        default=False,
        description=(
            "Indique si le compte vient d'être créé."
        ),
    )

    profile_complete: bool = Field(
        default=True,
        description=(
            "Indique si le profil contient "
            "les informations obligatoires."
        ),
    )


# ============================================================
# ACTUALISATION DU TOKEN
# ============================================================

class RefreshTokenRequest(
    AgroAuthBaseModel
):
    """
    Prévu pour une architecture avec refresh token.
    """

    refresh_token: str = Field(
        ...,
        min_length=10,
        max_length=10000,
        description="Refresh token.",
    )


class RefreshTokenResponse(
    TokenResponse
):
    """
    Nouveau token après actualisation.
    """

    refresh_token: str | None = Field(
        default=None,
        description="Nouveau refresh token éventuel.",
    )


# ============================================================
# PROFIL PUBLIC / CONNECTÉ
# ============================================================

class UserProfileResponse(
    AgroAuthBaseModel
):
    """
    Profil utilisateur retourné par l'API.

    Aucune donnée secrète n'est exposée.

    Les informations de consentement sont exposées
    uniquement lorsque le backend les utilise pour
    le profil de l'utilisateur connecté.
    """

    id: int = Field(
        ...,
        ge=1,
    )

    nom: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    telephone: str | None = Field(
        default=None,
        min_length=8,
        max_length=20,
    )

    email: EmailStr | None = None

    photo_profil: str | None = Field(
        default=None,
        max_length=500,
    )

    adresse: str | None = Field(
        default=None,
        max_length=255,
    )

    description: str | None = Field(
        default=None,
        max_length=2000,
    )

    google_id: str | None = Field(
        default=None,
        max_length=255,
    )

    methode_authentification: AuthMethod = Field(
        default=AuthMethod.LOCAL,
        description=(
            "Méthode d'authentification du compte."
        ),
    )

    mot_de_passe_defini: bool = Field(
        default=False,
        description=(
            "Indique si un mot de passe local est défini. "
            "Le hash du mot de passe n'est jamais exposé."
        ),
    )

    email_verifie: bool = Field(
        default=False,
    )

    telephone_verifie: bool = Field(
        default=False,
    )

    role: UserRole

    statut_compte: UserStatus

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

    localisation_source: LocationSource = (
        LocationSource.INCONNUE
    )

    confidentialite_acceptee: bool = Field(
        default=False,
        description=(
            "Indique si l'utilisateur a accepté "
            "la politique de confidentialité."
        ),
    )

    version_confidentialite: str | None = Field(
        default=None,
        max_length=20,
        description=(
            "Version de la politique de confidentialité "
            "acceptée par l'utilisateur."
        ),
    )

    date_acceptation_confidentialite: datetime | None = Field(
        default=None,
        description=(
            "Date d'acceptation de la politique "
            "de confidentialité."
        ),
    )

    date_creation: datetime

    date_modification: datetime | None = None

    dernier_login: datetime | None = None


# ============================================================
# PROFIL RÉSUMÉ
# ============================================================

class UserResume(
    AgroAuthBaseModel
):
    """
    Version légère du profil.
    """

    id: int = Field(
        ...,
        ge=1,
    )

    nom: str = Field(
        ...,
        min_length=2,
        max_length=100,
    )

    photo_profil: str | None = Field(
        default=None,
        max_length=500,
    )

    role: UserRole

    statut_compte: UserStatus


# ============================================================
# MODIFICATION DU PROFIL
# ============================================================

class UserProfileUpdateRequest(
    AgroAuthBaseModel
):
    """
    Modification partielle du profil.

    Le rôle, le statut, Google ID, les informations
    de consentement et les dates sont protégés et ne
    peuvent pas être modifiés avec cette requête.
    """

    nom: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    telephone: str | None = Field(
        default=None,
        min_length=8,
        max_length=20,
    )

    email: EmailStr | None = None

    adresse: str | None = Field(
        default=None,
        max_length=255,
    )

    description: str | None = Field(
        default=None,
        max_length=2000,
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

    localisation_source: LocationSource | None = None

    @field_validator(
        "telephone"
    )
    @classmethod
    def nettoyer_telephone(
        cls,
        valeur,
    ):
        if valeur is None:
            return None

        valeur = valeur.strip()

        return valeur or None


# ============================================================
# MOT DE PASSE
# ============================================================

class ChangePasswordRequest(
    AgroAuthBaseModel
):
    """
    Changement du mot de passe par l'utilisateur
    connecté.
    """

    ancien_mot_de_passe: str = Field(
        ...,
        min_length=1,
        max_length=128,
    )

    nouveau_mot_de_passe: str = Field(
        ...,
        min_length=8,
        max_length=128,
    )

    @field_validator(
        "nouveau_mot_de_passe"
    )
    @classmethod
    def valider_nouveau_mot_de_passe(
        cls,
        valeur: str,
    ) -> str:
        if not valeur.strip():
            raise ValueError(
                "Le nouveau mot de passe "
                "ne peut pas être vide."
            )

        return valeur


# ============================================================
# OUBLI DE MOT DE PASSE
# ============================================================

class ForgotPasswordRequest(
    AgroAuthBaseModel
):
    """
    Demande de réinitialisation du mot de passe.

    L'utilisateur peut fournir :
    - son adresse email ;
    - ou son numéro de téléphone.

    Au moins une des deux informations est obligatoire.

    Le backend ne doit jamais révéler si le compte
    existe ou non.
    """

    telephone: str | None = Field(
        default=None,
        min_length=8,
        max_length=20,
        description=(
            "Numéro de téléphone associé au compte."
        ),
        examples=["70000000"],
    )

    email: EmailStr | None = Field(
        default=None,
        description=(
            "Adresse email associée au compte."
        ),
        examples=["utilisateur@gmail.com"],
    )

    @field_validator(
        "telephone"
    )
    @classmethod
    def nettoyer_telephone(
        cls,
        valeur: str | None,
    ) -> str | None:
        """
        Nettoie le numéro de téléphone.
        """

        if valeur is None:
            return None

        valeur = valeur.strip()

        return valeur or None

    @model_validator(
        mode="after"
    )
    def verifier_identifiant(
        self,
    ):
        """
        Vérifie qu'au moins un moyen d'identification
        a été fourni.
        """

        if not self.telephone and not self.email:
            raise ValueError(
                "Veuillez fournir votre numéro de téléphone "
                "ou votre adresse email."
            )

        return self


# ============================================================
# RÉINITIALISATION DU MOT DE PASSE
# ============================================================

class ResetPasswordRequest(
    AgroAuthBaseModel
):
    """
    Réinitialisation du mot de passe
    avec un token de récupération.

    Le token est généré par le backend et envoyé
    à l'utilisateur par email.

    Le token brut ne doit jamais être stocké
    en base de données.
    """

    token: str = Field(
        ...,
        min_length=10,
        max_length=10000,
        description=(
            "Token sécurisé de réinitialisation "
            "du mot de passe."
        ),
    )

    nouveau_mot_de_passe: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Nouveau mot de passe.",
    )

    @field_validator(
        "token"
    )
    @classmethod
    def nettoyer_token(
        cls,
        valeur: str,
    ) -> str:
        """
        Supprime les espaces accidentels
        autour du token.
        """

        valeur = valeur.strip()

        if not valeur:
            raise ValueError(
                "Le token de réinitialisation "
                "est obligatoire."
            )

        return valeur

    @field_validator(
        "nouveau_mot_de_passe"
    )
    @classmethod
    def valider_nouveau_mot_de_passe(
        cls,
        valeur: str,
    ) -> str:
        """
        Vérifie que le mot de passe ne contient
        pas uniquement des espaces.
        """

        if not valeur.strip():
            raise ValueError(
                "Le nouveau mot de passe "
                "ne peut pas être vide."
            )

        return valeur


# ============================================================
# PHOTO DE PROFIL
# ============================================================

class ProfilePhotoResponse(
    AgroAuthBaseModel
):
    """
    Réponse après modification de la photo.
    """

    message: str

    photo_profil: str | None = Field(
        default=None,
        max_length=500,
    )


# ============================================================
# VÉRIFICATION EMAIL
# ============================================================

class VerifyEmailRequest(
    AgroAuthBaseModel
):
    """
    Vérification d'une adresse email.
    """

    token: str = Field(
        ...,
        min_length=10,
        max_length=10000,
    )


class VerifyEmailResponse(
    AgroAuthBaseModel
):
    """
    Réponse après vérification email.
    """

    message: str

    email: EmailStr

    email_verifie: bool


# ============================================================
# VÉRIFICATION TÉLÉPHONE
# ============================================================

class VerifyPhoneRequest(
    AgroAuthBaseModel
):
    """
    Vérification d'un numéro de téléphone.
    """

    code: str = Field(
        ...,
        min_length=4,
        max_length=10,
    )


class VerifyPhoneResponse(
    AgroAuthBaseModel
):
    """
    Réponse après vérification téléphone.
    """

    message: str

    telephone: str

    telephone_verifie: bool


# ============================================================
# MODÉRATEUR - CRÉATION
# ============================================================

class ModeratorCreateRequest(
    AgroAuthBaseModel
):
    """
    Création d'un compte modérateur.

    Cette opération est réservée à l'administrateur.

    Le backend impose :

        role = moderateur
        statut_compte = actif
        methode_authentification = local
    """

    nom: str = Field(
        ...,
        min_length=2,
        max_length=100,
        examples=["Jean Ouédraogo"],
    )

    telephone: str = Field(
        ...,
        min_length=8,
        max_length=20,
        examples=["70000000"],
    )

    email: EmailStr | None = None

    mot_de_passe: str = Field(
        ...,
        min_length=8,
        max_length=128,
    )


# ============================================================
# MODÉRATEUR - MODIFICATION
# ============================================================

class ModeratorUpdateRequest(
    AgroAuthBaseModel
):
    """
    Modification d'un modérateur.
    """

    nom: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    telephone: str | None = Field(
        default=None,
        min_length=8,
        max_length=20,
    )

    email: EmailStr | None = None


# ============================================================
# MODÉRATEUR - MOT DE PASSE
# ============================================================

class ModeratorPasswordUpdateRequest(
    AgroAuthBaseModel
):
    """
    Réinitialisation du mot de passe
    d'un modérateur par l'administrateur.
    """

    mot_de_passe: str = Field(
        ...,
        min_length=8,
        max_length=128,
    )


# ============================================================
# MODÉRATEUR - STATUT
# ============================================================

class ModeratorStatusUpdateRequest(
    AgroAuthBaseModel
):
    """
    Changement du statut d'un modérateur.
    """

    statut_compte: UserStatus = Field(
        ...,
        description=(
            "Nouveau statut du modérateur."
        ),
    )

    @field_validator(
        "statut_compte"
    )
    @classmethod
    def verifier_statut_moderateur(
        cls,
        valeur: UserStatus,
    ) -> UserStatus:

        if valeur not in {
            UserStatus.ACTIF,
            UserStatus.BLOQUE,
            UserStatus.SUSPENDU,
        }:
            raise ValueError(
                "Statut de modérateur invalide."
            )

        return valeur


# ============================================================
# DEMANDE VENDEUR
# ============================================================

class DemandeVendeurResponse(
    AgroAuthBaseModel
):
    """
    Réponse d'une demande vendeur.
    """

    id: int = Field(
        ...,
        ge=1,
    )

    utilisateur_id: int = Field(
        ...,
        ge=1,
    )

    statut: SellerRequestStatus

    motif: str | None = Field(
        default=None,
        max_length=2000,
    )

    date_demande: datetime

    date_traitement: datetime | None = None


# ============================================================
# DEMANDE VENDEUR AVEC UTILISATEUR
# ============================================================

class DemandeVendeurDetailResponse(
    DemandeVendeurResponse
):
    """
    Version détaillée utilisée par l'administration.
    """

    utilisateur: UserResume


# ============================================================
# TRAITEMENT DEMANDE VENDEUR
# ============================================================

class DemandeVendeurTraitement(
    AgroAuthBaseModel
):
    """
    Motif utilisé lorsque l'administrateur
    accepte ou refuse une demande.
    """

    motif: str | None = Field(
        default=None,
        max_length=2000,
    )


# ============================================================
# PAGINATION GÉNÉRIQUE
# ============================================================

class PaginationMeta(
    AgroAuthBaseModel
):
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
# LISTE UTILISATEURS ADMIN
# ============================================================

class AdminUserListResponse(
    AgroAuthBaseModel
):
    """
    Liste paginée des utilisateurs pour
    l'administration.
    """

    utilisateurs: list[
        UserProfileResponse
    ] = Field(
        default_factory=list,
    )

    pagination: PaginationMeta


# ============================================================
# STATISTIQUES UTILISATEURS
# ============================================================

class AdminUtilisateursStats(
    AgroAuthBaseModel
):
    """
    Répartition des utilisateurs par rôle.
    """

    total: int = Field(
        default=0,
        ge=0,
    )

    acheteurs: int = Field(
        default=0,
        ge=0,
    )

    vendeurs: int = Field(
        default=0,
        ge=0,
    )

    administrateurs: int = Field(
        default=0,
        ge=0,
    )

    moderateurs: int = Field(
        default=0,
        ge=0,
    )


# ============================================================
# STATISTIQUES COMPTES
# ============================================================

class AdminComptesStats(
    AgroAuthBaseModel
):
    """
    Répartition par statut du compte.
    """

    actifs: int = Field(
        default=0,
        ge=0,
    )

    en_attente: int = Field(
        default=0,
        ge=0,
    )

    bloques: int = Field(
        default=0,
        ge=0,
    )

    suspendus: int = Field(
        default=0,
        ge=0,
    )


# ============================================================
# STATISTIQUES AUTHENTIFICATION
# ============================================================

class AdminAuthentificationStats(
    AgroAuthBaseModel
):
    """
    Répartition des méthodes d'authentification.
    """

    total: int = Field(
        default=0,
        ge=0,
    )

    comptes_locaux: int = Field(
        default=0,
        ge=0,
    )

    comptes_google: int = Field(
        default=0,
        ge=0,
    )

    comptes_hybrides: int = Field(
        default=0,
        ge=0,
    )

    emails_verifies: int = Field(
        default=0,
        ge=0,
    )

    telephones_verifies: int = Field(
        default=0,
        ge=0,
    )


# ============================================================
# STATISTIQUES CATALOGUE
# ============================================================

class AdminCatalogueStats(
    AgroAuthBaseModel
):
    """
    Statistiques générales du catalogue.
    """

    familles: int = Field(
        default=0,
        ge=0,
    )

    categories: int = Field(
        default=0,
        ge=0,
    )

    produits: int = Field(
        default=0,
        ge=0,
    )

    produits_bruts: int = Field(
        default=0,
        ge=0,
    )

    produits_transformes: int = Field(
        default=0,
        ge=0,
    )


# ============================================================
# STATISTIQUES ANNONCES
# ============================================================

class AdminAnnoncesStats(
    AgroAuthBaseModel
):
    """
    Statistiques des annonces.
    """

    total: int = Field(
        default=0,
        ge=0,
    )

    publiees: int = Field(
        default=0,
        ge=0,
    )

    en_attente: int = Field(
        default=0,
        ge=0,
    )

    refusees: int = Field(
        default=0,
        ge=0,
    )


# ============================================================
# STATISTIQUES COMMANDES
# ============================================================

class AdminCommandesStats(
    AgroAuthBaseModel
):
    """
    Statistiques des commandes.
    """

    total: int = Field(
        default=0,
        ge=0,
    )

    en_attente: int = Field(
        default=0,
        ge=0,
    )

    confirmees: int = Field(
        default=0,
        ge=0,
    )

    preparees: int = Field(
        default=0,
        ge=0,
    )

    livrees: int = Field(
        default=0,
        ge=0,
    )

    annulees: int = Field(
        default=0,
        ge=0,
    )

    chiffre_total: float = Field(
        default=0,
        ge=0,
    )


# ============================================================
# STATISTIQUES DEMANDES VENDEUR
# ============================================================

class AdminDemandesVendeurStats(
    AgroAuthBaseModel
):
    """
    Statistiques des demandes vendeur.
    """

    total: int = Field(
        default=0,
        ge=0,
    )

    en_attente: int = Field(
        default=0,
        ge=0,
    )

    acceptees: int = Field(
        default=0,
        ge=0,
    )

    refusees: int = Field(
        default=0,
        ge=0,
    )


# ============================================================
# STATISTIQUES NOTIFICATIONS
# ============================================================

class AdminNotificationsStats(
    AgroAuthBaseModel
):
    """
    Statistiques des notifications.
    """

    total: int = Field(
        default=0,
        ge=0,
    )

    non_lues: int = Field(
        default=0,
        ge=0,
    )

    lues: int = Field(
        default=0,
        ge=0,
    )


# ============================================================
# STATISTIQUES AVIS
# ============================================================

class AdminAvisStats(
    AgroAuthBaseModel
):
    """
    Statistiques des avis.
    """

    total: int = Field(
        default=0,
        ge=0,
    )

    visibles: int = Field(
        default=0,
        ge=0,
    )

    invisibles: int = Field(
        default=0,
        ge=0,
    )

    achats_verifies: int = Field(
        default=0,
        ge=0,
    )

    moyenne: float = Field(
        default=0,
        ge=0,
        le=5,
    )


# ============================================================
# STATISTIQUES MODÉRATION
# ============================================================

class AdminModerationStats(
    AgroAuthBaseModel
):
    """
    Statistiques des actions de modération.
    """

    total_actions: int = Field(
        default=0,
        ge=0,
    )

    soumissions: int = Field(
        default=0,
        ge=0,
    )

    approbations: int = Field(
        default=0,
        ge=0,
    )

    refus: int = Field(
        default=0,
        ge=0,
    )

    remises_en_moderation: int = Field(
        default=0,
        ge=0,
    )


# ============================================================
# STATISTIQUES GÉOLOCALISATION
# ============================================================

class AdminGeolocalisationStats(
    AgroAuthBaseModel
):
    """
    Statistiques liées à la localisation.
    """

    utilisateurs_localises: int = Field(
        default=0,
        ge=0,
    )

    utilisateurs_gps: int = Field(
        default=0,
        ge=0,
    )

    annonces_localisees: int = Field(
        default=0,
        ge=0,
    )

    annonces_gps: int = Field(
        default=0,
        ge=0,
    )


# ============================================================
# STATISTIQUES GLOBALES
# ============================================================

class AdminStatistiquesResponse(
    AgroAuthBaseModel
):
    """
    Tableau de bord statistique global
    de l'administration.
    """

    utilisateurs: AdminUtilisateursStats

    comptes: AdminComptesStats

    authentification: AdminAuthentificationStats

    catalogue: AdminCatalogueStats

    annonces: AdminAnnoncesStats

    commandes: AdminCommandesStats

    demandes_vendeur: AdminDemandesVendeurStats

    notifications: AdminNotificationsStats

    avis: AdminAvisStats

    moderation: AdminModerationStats

    geolocalisation: AdminGeolocalisationStats


# ============================================================
# RÉPONSE SIMPLE
# ============================================================

class MessageResponse(
    AgroAuthBaseModel
):
    """
    Réponse standard pour les opérations simples.
    """

    message: str = Field(
        ...,
        min_length=1,
        max_length=1000,
    )


# ============================================================
# RÉPONSE DE SUPPRESSION
# ============================================================

class DeleteUserResponse(
    AgroAuthBaseModel
):
    """
    Réponse après suppression d'un utilisateur.
    """

    message: str

    utilisateur_id: int = Field(
        ...,
        ge=1,
    )


# ============================================================
# MOT DE PASSE POUR COMPTE GOOGLE
# ============================================================

class SetPasswordRequest(
    AgroAuthBaseModel
):
    """
    Ajout d'un mot de passe local
    à un compte Google.
    """

    nouveau_mot_de_passe: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description=(
            "Nouveau mot de passe local."
        ),
    )

    @field_validator(
        "nouveau_mot_de_passe"
    )
    @classmethod
    def valider_nouveau_mot_de_passe(
        cls,
        valeur: str,
    ) -> str:

        if not valeur.strip():
            raise ValueError(
                "Le nouveau mot de passe "
                "ne peut pas être vide."
            )

        return valeur


# ============================================================
# ALIASES DE COMPATIBILITÉ
# ============================================================

AuthProvider = AuthMethod

ProductLocationSource = LocationSource
