# ============================================================
# AGROMARKET BURKINA
# AUTH / SERVICES
# Version professionnelle stabilisée
#
# RESPONSABILITÉS :
# - création des comptes
# - authentification locale
# - authentification Google
# - gestion du profil
# - gestion de la photo
# - géolocalisation
# - gestion des mots de passe
# - récupération du mot de passe
# - réinitialisation du mot de passe
# - vérification de complétude
# - gestion des rôles
# - gestion des statuts
# - gestion des vérifications email/téléphone
# - association / dissociation Google
# - gestion de la dernière connexion
#
# IMPORTANT :
# - aucune logique HTTP ici
# - aucun APIRouter()
# - aucun Depends()
# - aucune HTTPException
# - cryptographie des mots de passe dans auth/security.py
# - routes HTTP dans auth/routes.py
# ============================================================

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any
import hashlib
import secrets

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from models import (
    Utilisateur,
    PasswordResetToken,
)

from auth.security import (
    hash_password,
    verify_password,
)


# ============================================================
# CONFIGURATION RÉINITIALISATION MOT DE PASSE
# ============================================================

PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES = 30


# ============================================================
# EXCEPTIONS MÉTIER
# ============================================================

class AuthServiceError(Exception):
    """Exception générale du module d'authentification."""


class ResourceNotFoundError(AuthServiceError):
    """Ressource introuvable."""


class ResourceAlreadyExistsError(AuthServiceError):
    """Ressource déjà existante."""


class InvalidCredentialsError(AuthServiceError):
    """Identifiants invalides."""


class AccountDisabledError(AuthServiceError):
    """Compte bloqué, suspendu ou non disponible."""


class ValidationServiceError(AuthServiceError):
    """Données métier invalides."""


class InvalidPasswordResetTokenError(AuthServiceError):
    """
    Token de réinitialisation invalide,
    expiré ou déjà utilisé.
    """


# ============================================================
# RÔLES
# ============================================================

ROLE_ACHETEUR = "acheteur"
ROLE_VENDEUR = "vendeur"
ROLE_ADMIN = "admin"
ROLE_ADMINISTRATEUR = "administrateur"
ROLE_MODERATEUR = "moderateur"

ROLES_VALIDES = {
    ROLE_ACHETEUR,
    ROLE_VENDEUR,
    ROLE_ADMIN,
    ROLE_ADMINISTRATEUR,
    ROLE_MODERATEUR,
}


# ============================================================
# STATUTS COMPTE
# ============================================================

STATUT_ACTIF = "actif"
STATUT_EN_ATTENTE = "en_attente"
STATUT_BLOQUE = "bloque"
STATUT_SUSPENDU = "suspendu"

STATUTS_VALIDES = {
    STATUT_ACTIF,
    STATUT_EN_ATTENTE,
    STATUT_BLOQUE,
    STATUT_SUSPENDU,
}


# ============================================================
# MÉTHODES D'AUTHENTIFICATION
# ============================================================

AUTH_LOCAL = "local"
AUTH_GOOGLE = "google"
AUTH_HYBRIDE = "hybride"

AUTH_METHODES_VALIDES = {
    AUTH_LOCAL,
    AUTH_GOOGLE,
    AUTH_HYBRIDE,
}


# ============================================================
# LOCALISATION
# ============================================================

LOCATION_GPS = "gps"
LOCATION_MANUELLE = "manuelle"
LOCATION_INCONNUE = "inconnue"

SOURCES_LOCALISATION_VALIDES = {
    LOCATION_GPS,
    LOCATION_MANUELLE,
    LOCATION_INCONNUE,
}


# ============================================================
# UTILITAIRES
# ============================================================

def nettoyer_texte(
    valeur: str | None,
) -> str | None:
    """
    Nettoie une chaîne de caractères.

    Retourne None si la valeur est vide.
    """

    if valeur is None:
        return None

    valeur = str(valeur).strip()

    return valeur if valeur else None


def normaliser_email(
    valeur: Any,
) -> str | None:
    """
    Normalise une adresse email.
    """

    if valeur is None:
        return None

    valeur = (
        str(valeur)
        .strip()
        .lower()
    )

    return valeur if valeur else None


def normaliser_telephone(
    valeur: str | None,
) -> str | None:
    """
    Normalise légèrement un numéro.

    Ne force pas de format international.
    """

    if valeur is None:
        return None

    valeur = (
        str(valeur)
        .strip()
        .replace(" ", "")
        .replace("-", "")
        .replace(".", "")
    )

    return valeur if valeur else None


def convertir_enum_ou_valeur(
    valeur: Any,
) -> str | None:
    """
    Convertit un Enum ou une valeur simple en chaîne.
    """

    if valeur is None:
        return None

    if hasattr(valeur, "value"):
        return str(valeur.value)

    return str(valeur)


# ============================================================
# OUTILS TOKEN RÉINITIALISATION
# ============================================================

def generer_token_reinitialisation() -> str:
    """
    Génère un token cryptographiquement sécurisé.

    Le token brut est destiné uniquement à être transmis
    à l'utilisateur.

    Il ne doit jamais être enregistré en base de données.
    """

    return secrets.token_urlsafe(48)


def hasher_token_reinitialisation(
    token: str,
) -> str:
    """
    Calcule le hash SHA-256 du token.

    Seul le hash est enregistré en base.
    """

    token = nettoyer_texte(token)

    if not token:
        raise ValidationServiceError(
            "Le token de réinitialisation est obligatoire."
        )

    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()


def calculer_expiration_token(
    maintenant: datetime | None = None,
) -> datetime:
    """
    Calcule la date d'expiration du token.

    Les dates utilisées par PasswordResetToken sont
    volontairement en UTC naïf afin de rester cohérentes
    avec le modèle SQLAlchemy actuel.
    """

    if maintenant is None:
        maintenant = datetime.utcnow()

    return (
        maintenant
        + timedelta(
            minutes=PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES
        )
    )


# ============================================================
# RECHERCHE UTILISATEUR
# ============================================================

def obtenir_utilisateur(
    db: Session,
    user_id: int,
) -> Utilisateur:
    """
    Recherche un utilisateur par son ID.
    """

    utilisateur = (
        db.query(Utilisateur)
        .filter(
            Utilisateur.id == user_id
        )
        .first()
    )

    if utilisateur is None:
        raise ResourceNotFoundError(
            "Utilisateur introuvable."
        )

    return utilisateur


def obtenir_utilisateur_par_telephone(
    db: Session,
    telephone: str | None,
) -> Utilisateur | None:
    """
    Recherche un utilisateur par téléphone.
    """

    telephone = normaliser_telephone(
        telephone
    )

    if not telephone:
        return None

    return (
        db.query(Utilisateur)
        .filter(
            Utilisateur.telephone == telephone
        )
        .first()
    )


def obtenir_utilisateur_par_email(
    db: Session,
    email: str | None,
) -> Utilisateur | None:
    """
    Recherche un utilisateur par email
    sans tenir compte de la casse.
    """

    email = normaliser_email(email)

    if not email:
        return None

    return (
        db.query(Utilisateur)
        .filter(
            func.lower(
                Utilisateur.email
            ) == email
        )
        .first()
    )


def obtenir_utilisateur_par_google_id(
    db: Session,
    google_id: str | None,
) -> Utilisateur | None:
    """
    Recherche un utilisateur par Google ID.
    """

    google_id = nettoyer_texte(
        google_id
    )

    if not google_id:
        return None

    return (
        db.query(Utilisateur)
        .filter(
            Utilisateur.google_id == google_id
        )
        .first()
    )


# ============================================================
# VÉRIFICATION DU COMPTE
# ============================================================

def verifier_compte_actif(
    utilisateur: Utilisateur,
) -> None:
    """
    Vérifie que le compte peut être utilisé.
    """

    statut = (
        utilisateur.statut_compte
        or STATUT_ACTIF
    )

    if statut == STATUT_BLOQUE:
        raise AccountDisabledError(
            "Votre compte est bloqué."
        )

    if statut == STATUT_SUSPENDU:
        raise AccountDisabledError(
            "Votre compte est suspendu."
        )

    if statut == STATUT_EN_ATTENTE:
        raise AccountDisabledError(
            "Votre compte est encore en attente."
        )

    if statut != STATUT_ACTIF:
        raise AccountDisabledError(
            "Votre compte n'est pas actif."
        )


# ============================================================
# DISPONIBILITÉ TÉLÉPHONE
# ============================================================

def verifier_telephone_disponible(
    db: Session,
    telephone: str | None,
    user_id: int | None = None,
) -> None:
    """
    Vérifie qu'un téléphone n'est pas déjà utilisé.
    """

    telephone = normaliser_telephone(
        telephone
    )

    if not telephone:
        return

    query = (
        db.query(Utilisateur)
        .filter(
            Utilisateur.telephone == telephone
        )
    )

    if user_id is not None:
        query = query.filter(
            Utilisateur.id != user_id
        )

    if query.first() is not None:
        raise ResourceAlreadyExistsError(
            "Ce numéro de téléphone est déjà utilisé."
        )


# ============================================================
# DISPONIBILITÉ EMAIL
# ============================================================

def verifier_email_disponible(
    db: Session,
    email: str | None,
    user_id: int | None = None,
) -> None:
    """
    Vérifie qu'un email n'est pas déjà utilisé.
    """

    email = normaliser_email(email)

    if not email:
        return

    query = (
        db.query(Utilisateur)
        .filter(
            func.lower(
                Utilisateur.email
            ) == email
        )
    )

    if user_id is not None:
        query = query.filter(
            Utilisateur.id != user_id
        )

    if query.first() is not None:
        raise ResourceAlreadyExistsError(
            "Cette adresse email est déjà utilisée."
        )


# ============================================================
# DISPONIBILITÉ GOOGLE
# ============================================================

def verifier_google_id_disponible(
    db: Session,
    google_id: str | None,
    user_id: int | None = None,
) -> None:
    """
    Vérifie qu'un Google ID n'est pas déjà utilisé.
    """

    google_id = nettoyer_texte(
        google_id
    )

    if not google_id:
        return

    query = (
        db.query(Utilisateur)
        .filter(
            Utilisateur.google_id == google_id
        )
    )

    if user_id is not None:
        query = query.filter(
            Utilisateur.id != user_id
        )

    if query.first() is not None:
        raise ResourceAlreadyExistsError(
            "Ce compte Google est déjà associé "
            "à un autre utilisateur."
        )


# ============================================================
# GÉOLOCALISATION
# ============================================================

def valider_geolocalisation(
    latitude: float | None,
    longitude: float | None,
    source: Any,
) -> tuple[
    float | None,
    float | None,
    str,
]:
    """
    Valide latitude, longitude et source.
    """

    source = (
        convertir_enum_ou_valeur(source)
        or LOCATION_INCONNUE
    )

    if source not in SOURCES_LOCALISATION_VALIDES:
        raise ValidationServiceError(
            "Source de localisation invalide."
        )

    if (
        latitude is None
        and longitude is None
    ):
        return (
            None,
            None,
            source,
        )

    if (
        latitude is None
        or longitude is None
    ):
        raise ValidationServiceError(
            "La latitude et la longitude "
            "doivent être fournies ensemble."
        )

    try:
        latitude = float(latitude)
        longitude = float(longitude)

    except (TypeError, ValueError) as exc:

        raise ValidationServiceError(
            "Les coordonnées GPS sont invalides."
        ) from exc

    if not -90 <= latitude <= 90:
        raise ValidationServiceError(
            "La latitude doit être comprise "
            "entre -90 et 90."
        )

    if not -180 <= longitude <= 180:
        raise ValidationServiceError(
            "La longitude doit être comprise "
            "entre -180 et 180."
        )

    if source == LOCATION_INCONNUE:
        source = LOCATION_MANUELLE

    return (
        latitude,
        longitude,
        source,
    )


# ============================================================
# CRÉER COMPTE LOCAL
# ============================================================

def creer_compte_local(
    db: Session,
    data: Any,
) -> Utilisateur:
    """
    Crée un compte local.
    """

    nom = nettoyer_texte(
        data.nom
    )

    telephone = normaliser_telephone(
        data.telephone
    )

    email = normaliser_email(
        data.email
    )

    mot_de_passe = (
        str(data.mot_de_passe)
        if data.mot_de_passe is not None
        else ""
    )

    if not nom:
        raise ValidationServiceError(
            "Le nom est obligatoire."
        )

    if len(nom) < 2:
        raise ValidationServiceError(
            "Le nom doit contenir au moins 2 caractères."
        )

    if not telephone:
        raise ValidationServiceError(
            "Le numéro de téléphone est obligatoire."
        )

    if not mot_de_passe:
        raise ValidationServiceError(
            "Le mot de passe est obligatoire."
        )

    if len(mot_de_passe) < 8:
        raise ValidationServiceError(
            "Le mot de passe doit contenir "
            "au moins 8 caractères."
        )

    verifier_telephone_disponible(
        db,
        telephone,
    )

    verifier_email_disponible(
        db,
        email,
    )

    utilisateur = Utilisateur(
        nom=nom,
        telephone=telephone,
        email=email,

        email_verifie=False,
        telephone_verifie=False,

        google_id=None,

        photo_profil=None,

        mot_de_passe_hash=hash_password(
            mot_de_passe
        ),

        adresse=None,
        description=None,

        role=ROLE_ACHETEUR,
        statut_compte=STATUT_ACTIF,

        methode_authentification=AUTH_LOCAL,

        latitude=None,
        longitude=None,
        localisation_source=LOCATION_INCONNUE,
    )

    db.add(utilisateur)

    return utilisateur


# ============================================================
# AUTHENTIFICATION LOCALE
# ============================================================

def authentifier_local(
    db: Session,
    telephone: str,
    mot_de_passe: str,
) -> Utilisateur:
    """
    Authentifie un compte local.
    """

    telephone = normaliser_telephone(
        telephone
    )

    if (
        not telephone
        or not mot_de_passe
    ):
        raise InvalidCredentialsError(
            "Identifiants incorrects."
        )

    utilisateur = (
        obtenir_utilisateur_par_telephone(
            db,
            telephone,
        )
    )

    if utilisateur is None:
        raise InvalidCredentialsError(
            "Identifiants incorrects."
        )

    verifier_compte_actif(
        utilisateur
    )

    if not utilisateur.mot_de_passe_hash:
        raise InvalidCredentialsError(
            "Ce compte ne possède pas de mot de passe "
            "local. Utilisez la connexion Google."
        )

    if not verify_password(
        mot_de_passe,
        utilisateur.mot_de_passe_hash,
    ):
        raise InvalidCredentialsError(
            "Identifiants incorrects."
        )

    return utilisateur


# ============================================================
# ENREGISTRER UNE CONNEXION
# ============================================================

def enregistrer_connexion(
    utilisateur: Utilisateur,
) -> Utilisateur:
    """
    Met à jour la date de dernière connexion.

    Le commit reste dans la route.
    """

    utilisateur.dernier_login = datetime.utcnow()

    return utilisateur


# ============================================================
# VÉRIFICATION CREDENTIAL GOOGLE
# ============================================================

def verifier_credential_google(
    credential: str,
) -> dict[str, Any]:
    """
    Vérifie un Google ID Token côté backend.
    """

    credential = nettoyer_texte(
        credential
    )

    if not credential:
        raise ValidationServiceError(
            "Credential Google obligatoire."
        )

    try:

        from google.oauth2 import id_token
        from google.auth.transport import requests

    except ImportError as exc:

        raise ValidationServiceError(
            "La bibliothèque google-auth n'est pas installée. "
            "Installez-la avec : pip install google-auth"
        ) from exc

    try:

        from auth.security import (
            get_google_client_id,
        )

        client_id = get_google_client_id()

    except Exception as exc:

        raise ValidationServiceError(
            "La configuration Google est invalide."
        ) from exc

    if not client_id:
        raise ValidationServiceError(
            "GOOGLE_CLIENT_ID est manquant."
        )

    try:

        informations = (
            id_token.verify_oauth2_token(
                credential,
                requests.Request(),
                client_id,
            )
        )

    except Exception as exc:

        raise InvalidCredentialsError(
            "Le credential Google est invalide "
            "ou expiré."
        ) from exc

    google_id = nettoyer_texte(
        informations.get("sub")
    )

    email = normaliser_email(
        informations.get("email")
    )

    nom = nettoyer_texte(
        informations.get("name")
        or informations.get("given_name")
    )

    photo_profil = nettoyer_texte(
        informations.get("picture")
    )

    email_verifie_google = bool(
        informations.get(
            "email_verified",
            False,
        )
    )

    if not google_id:
        raise InvalidCredentialsError(
            "Identifiant Google absent."
        )

    if not email:
        raise InvalidCredentialsError(
            "Adresse email Google absente."
        )

    return {
        "google_id": google_id,
        "email": email,
        "nom": nom,
        "photo_profil": photo_profil,
        "email_verified": email_verifie_google,
    }


# ============================================================
# AUTHENTIFICATION GOOGLE
# ============================================================

def authentifier_google(
    db: Session,
    credential: str,
) -> tuple[
    Utilisateur,
    bool,
]:
    """
    Authentifie un utilisateur avec Google.

    Retourne :
        utilisateur
        is_new_user
    """

    informations = (
        verifier_credential_google(
            credential
        )
    )

    google_id = informations["google_id"]

    email = informations["email"]

    nom = (
        informations.get("nom")
        or "Utilisateur AgroMarket"
    )

    photo_profil = informations.get(
        "photo_profil"
    )

    email_verifie_google = bool(
        informations.get(
            "email_verified",
            False,
        )
    )

    utilisateur = (
        obtenir_utilisateur_par_google_id(
            db,
            google_id,
        )
    )

    if utilisateur is None:

        utilisateur = (
            obtenir_utilisateur_par_email(
                db,
                email,
            )
        )

    if utilisateur is None:

        utilisateur = Utilisateur(
            nom=nom,
            telephone=None,
            email=email,

            email_verifie=(
                email_verifie_google
            ),

            telephone_verifie=False,

            google_id=google_id,

            photo_profil=photo_profil,

            mot_de_passe_hash=None,

            adresse=None,
            description=None,

            role=ROLE_ACHETEUR,

            statut_compte=STATUT_ACTIF,

            methode_authentification=AUTH_GOOGLE,

            latitude=None,
            longitude=None,

            localisation_source=LOCATION_INCONNUE,
        )

        db.add(utilisateur)

        return (
            utilisateur,
            True,
        )

    verifier_compte_actif(
        utilisateur
    )

    if (
        utilisateur.google_id
        and utilisateur.google_id != google_id
    ):

        raise ResourceAlreadyExistsError(
            "Ce compte est déjà associé "
            "à un autre compte Google."
        )

    verifier_google_id_disponible(
        db,
        google_id,
        utilisateur.id,
    )

    utilisateur.google_id = google_id

    if not utilisateur.email:
        utilisateur.email = email

    if (
        email_verifie_google
        and utilisateur.email == email
    ):
        utilisateur.email_verifie = True

    if (
        photo_profil
        and not utilisateur.photo_profil
    ):
        utilisateur.photo_profil = photo_profil

    if utilisateur.mot_de_passe_hash:

        utilisateur.methode_authentification = (
            AUTH_HYBRIDE
        )

    else:

        utilisateur.methode_authentification = (
            AUTH_GOOGLE
        )

    return (
        utilisateur,
        False,
    )


# ============================================================
# COMPLÉTER COMPTE GOOGLE
# ============================================================

def completer_compte_google(
    db: Session,
    utilisateur: Utilisateur,
    data: Any,
) -> Utilisateur:
    """
    Complète les informations d'un compte Google.

    La vérification du téléphone reste séparée.
    """

    if not utilisateur.google_id:

        raise ValidationServiceError(
            "Ce compte n'est pas associé à Google."
        )

    telephone = normaliser_telephone(
        data.telephone
    )

    if not telephone:

        raise ValidationServiceError(
            "Le numéro de téléphone est obligatoire."
        )

    verifier_telephone_disponible(
        db,
        telephone,
        utilisateur.id,
    )

    latitude, longitude, source = (
        valider_geolocalisation(
            getattr(
                data,
                "latitude",
                None,
            ),
            getattr(
                data,
                "longitude",
                None,
            ),
            getattr(
                data,
                "localisation_source",
                LOCATION_INCONNUE,
            ),
        )
    )

    utilisateur.telephone = telephone

    utilisateur.telephone_verifie = False

    utilisateur.adresse = nettoyer_texte(
        getattr(
            data,
            "adresse",
            None,
        )
    )

    utilisateur.latitude = latitude

    utilisateur.longitude = longitude

    utilisateur.localisation_source = source

    if utilisateur.mot_de_passe_hash:

        utilisateur.methode_authentification = (
            AUTH_HYBRIDE
        )

    else:

        utilisateur.methode_authentification = (
            AUTH_GOOGLE
        )

    return utilisateur


# ============================================================
# PROFIL COMPLET
# ============================================================

def profil_est_complet(
    utilisateur: Utilisateur,
) -> bool:
    """
    Détermine si le profil possède les informations
    minimales nécessaires.
    """

    return bool(
        utilisateur.statut_compte == STATUT_ACTIF
        and nettoyer_texte(
            utilisateur.nom
        )
        and normaliser_email(
            utilisateur.email
        )
        and normaliser_telephone(
            utilisateur.telephone
        )
    )


# ============================================================
# MODIFIER PROFIL
# ============================================================

def modifier_profil(
    db: Session,
    utilisateur: Utilisateur,
    data: Any,
) -> Utilisateur:
    """
    Modifie les informations personnelles.

    Le rôle et le statut ne sont jamais modifiés ici.
    """

    fields_set = getattr(
        data,
        "model_fields_set",
        set(),
    )

    if "nom" in fields_set:

        nom = nettoyer_texte(
            data.nom
        )

        if not nom:

            raise ValidationServiceError(
                "Le nom est obligatoire."
            )

        if len(nom) < 2:

            raise ValidationServiceError(
                "Le nom doit contenir "
                "au moins 2 caractères."
            )

        utilisateur.nom = nom

    if "telephone" in fields_set:

        telephone = normaliser_telephone(
            data.telephone
        )

        if not telephone:

            raise ValidationServiceError(
                "Le numéro de téléphone "
                "est obligatoire."
            )

        verifier_telephone_disponible(
            db,
            telephone,
            utilisateur.id,
        )

        if telephone != utilisateur.telephone:

            utilisateur.telephone_verifie = False

        utilisateur.telephone = telephone

    if "email" in fields_set:

        email = normaliser_email(
            data.email
        )

        verifier_email_disponible(
            db,
            email,
            utilisateur.id,
        )

        if email != utilisateur.email:

            utilisateur.email_verifie = False

        utilisateur.email = email

    if "adresse" in fields_set:

        utilisateur.adresse = nettoyer_texte(
            data.adresse
        )

    if "description" in fields_set:

        utilisateur.description = nettoyer_texte(
            data.description
        )

    localisation_modifiee = (
        "latitude" in fields_set
        or "longitude" in fields_set
        or "localisation_source" in fields_set
    )

    if localisation_modifiee:

        latitude = (
            data.latitude
            if "latitude" in fields_set
            else utilisateur.latitude
        )

        longitude = (
            data.longitude
            if "longitude" in fields_set
            else utilisateur.longitude
        )

        source = (
            data.localisation_source
            if "localisation_source" in fields_set
            else (
                utilisateur.localisation_source
                or LOCATION_INCONNUE
            )
        )

        latitude, longitude, source = (
            valider_geolocalisation(
                latitude,
                longitude,
                source,
            )
        )

        utilisateur.latitude = latitude
        utilisateur.longitude = longitude
        utilisateur.localisation_source = source

    return utilisateur


# ============================================================
# PHOTO DE PROFIL
# ============================================================

def modifier_photo_profil(
    utilisateur: Utilisateur,
    photo_profil: str | None,
) -> Utilisateur:
    """
    Modifie la référence de la photo.
    """

    photo_profil = nettoyer_texte(
        photo_profil
    )

    if not photo_profil:

        raise ValidationServiceError(
            "La photo de profil est obligatoire."
        )

    utilisateur.photo_profil = photo_profil

    return utilisateur


# ============================================================
# SUPPRIMER PHOTO
# ============================================================

def supprimer_photo_profil(
    utilisateur: Utilisateur,
) -> Utilisateur:
    """
    Supprime la référence de la photo.
    """

    utilisateur.photo_profil = None

    return utilisateur


# ============================================================
# INVALIDER TOKENS DE RÉINITIALISATION
# ============================================================

def invalider_tokens_reinitialisation(
    db: Session,
    utilisateur_id: int,
    token_exclu_id: int | None = None,
    maintenant: datetime | None = None,
) -> None:
    """
    Invalide tous les tokens de réinitialisation encore actifs
    pour un utilisateur.

    Le commit reste à la charge de la route.
    """

    if maintenant is None:
        maintenant = datetime.utcnow()

    query = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.utilisateur_id
            == utilisateur_id,
            PasswordResetToken.used_at.is_(None),
        )
    )

    if token_exclu_id is not None:

        query = query.filter(
            PasswordResetToken.id
            != token_exclu_id
        )

    tokens_actifs = query.all()

    for reset_token in tokens_actifs:

        reset_token.used_at = maintenant


# ============================================================
# CHANGER MOT DE PASSE
# ============================================================

def changer_mot_de_passe(
    db: Session,
    utilisateur: Utilisateur,
    ancien_mot_de_passe: str,
    nouveau_mot_de_passe: str,
) -> Utilisateur:
    """
    Modifie un mot de passe existant.

    Toute demande de réinitialisation encore active
    est invalidée après changement.
    """

    if not utilisateur.mot_de_passe_hash:

        raise ValidationServiceError(
            "Ce compte ne possède pas "
            "de mot de passe local."
        )

    if not ancien_mot_de_passe:

        raise ValidationServiceError(
            "L'ancien mot de passe "
            "est obligatoire."
        )

    if not verify_password(
        ancien_mot_de_passe,
        utilisateur.mot_de_passe_hash,
    ):

        raise InvalidCredentialsError(
            "L'ancien mot de passe est incorrect."
        )

    if not nouveau_mot_de_passe:

        raise ValidationServiceError(
            "Le nouveau mot de passe "
            "est obligatoire."
        )

    if len(nouveau_mot_de_passe) < 8:

        raise ValidationServiceError(
            "Le nouveau mot de passe doit "
            "contenir au moins 8 caractères."
        )

    utilisateur.mot_de_passe_hash = (
        hash_password(
            nouveau_mot_de_passe
        )
    )

    if utilisateur.google_id:

        utilisateur.methode_authentification = (
            AUTH_HYBRIDE
        )

    else:

        utilisateur.methode_authentification = (
            AUTH_LOCAL
        )

    # Invalider les éventuels liens de reset
    invalider_tokens_reinitialisation(
        db,
        utilisateur.id,
    )

    return utilisateur


# ============================================================
# DÉFINIR MOT DE PASSE LOCAL
# ============================================================

def definir_mot_de_passe_local(
    db: Session,
    utilisateur: Utilisateur,
    nouveau_mot_de_passe: str,
) -> Utilisateur:
    """
    Ajoute un mot de passe local à un compte Google.
    """

    if not utilisateur.google_id:

        raise ValidationServiceError(
            "Cette opération est destinée "
            "aux comptes Google."
        )

    if utilisateur.mot_de_passe_hash:

        raise ValidationServiceError(
            "Ce compte possède déjà "
            "un mot de passe local."
        )

    if not nouveau_mot_de_passe:

        raise ValidationServiceError(
            "Le nouveau mot de passe "
            "est obligatoire."
        )

    if len(nouveau_mot_de_passe) < 8:

        raise ValidationServiceError(
            "Le mot de passe doit contenir "
            "au moins 8 caractères."
        )

    utilisateur.mot_de_passe_hash = (
        hash_password(
            nouveau_mot_de_passe
        )
    )

    utilisateur.methode_authentification = (
        AUTH_HYBRIDE
    )

    invalider_tokens_reinitialisation(
        db,
        utilisateur.id,
    )

    return utilisateur


# ============================================================
# DEMANDE DE RÉINITIALISATION
# ============================================================

def demander_reinitialisation_mot_de_passe(
    db: Session,
    telephone: str | None = None,
    email: str | None = None,
) -> tuple[
    Utilisateur | None,
    str | None,
]:
    """
    Prépare une demande de réinitialisation du mot de passe.

    Recherche l'utilisateur par :
    - email ;
    - téléphone.

    Conditions nécessaires pour générer un token :
    - compte existant ;
    - compte actif ;
    - mot de passe local présent ;
    - adresse email présente ;
    - adresse email vérifiée.

    Retourne :
        (utilisateur, token_brut)

    ou :

        (None, None)

    lorsque le compte n'est pas éligible.

    Le token brut n'est jamais enregistré en base.
    """

    # ========================================================
    # NORMALISATION
    # ========================================================

    telephone = normaliser_telephone(telephone)
    email = normaliser_email(email)

    if not telephone and not email:
        raise ValidationServiceError(
            "Le téléphone ou l'email est obligatoire."
        )

    utilisateur = None

    # ========================================================
    # RECHERCHE PAR EMAIL
    # ========================================================

    if email:
        utilisateur = obtenir_utilisateur_par_email(
            db,
            email,
        )

    # ========================================================
    # RECHERCHE PAR TÉLÉPHONE
    # ========================================================

    if utilisateur is None and telephone:
        utilisateur = obtenir_utilisateur_par_telephone(
            db,
            telephone,
        )

    # ========================================================
    # COMPTE INTROUVABLE
    # ========================================================

    if utilisateur is None:
        return None, None

    # ========================================================
    # SI EMAIL + TÉLÉPHONE SONT FOURNIS
    # ILS DOIVENT CORRESPONDRE AU MÊME COMPTE
    # ========================================================

    if email and telephone:

        utilisateur_email = obtenir_utilisateur_par_email(
            db,
            email,
        )

        utilisateur_telephone = obtenir_utilisateur_par_telephone(
            db,
            telephone,
        )

        if (
            utilisateur_email is None
            or utilisateur_telephone is None
            or utilisateur_email.id != utilisateur_telephone.id
        ):
            raise ValidationServiceError(
                "L'email et le numéro de téléphone "
                "ne correspondent pas au même compte."
            )

        utilisateur = utilisateur_email

    # ========================================================
    # COMPTE ACTIF
    # ========================================================

    verifier_compte_actif(utilisateur)

    # ========================================================
    # MOT DE PASSE LOCAL
    # ========================================================

    if not utilisateur.mot_de_passe_hash:
        return utilisateur, None

    # ========================================================
    # EMAIL DISPONIBLE
    # ========================================================

    if not utilisateur.email:
        return utilisateur, None

    # ========================================================
    # EMAIL VÉRIFIÉ
    # ========================================================

    if not utilisateur.email_verifie:
        return utilisateur, None

    # ========================================================
    # INVALIDER LES ANCIENS TOKENS
    # ========================================================

    maintenant = datetime.utcnow()

    invalider_tokens_reinitialisation(
        db,
        utilisateur.id,
        maintenant=maintenant,
    )

    # ========================================================
    # GÉNÉRER LE NOUVEAU TOKEN
    # ========================================================

    token_brut = generer_token_reinitialisation()

    # ========================================================
    # HASH DU TOKEN
    # ========================================================

    token_hash = hasher_token_reinitialisation(
        token_brut
    )

    # ========================================================
    # EXPIRATION
    # ========================================================

    expiration = calculer_expiration_token(
        maintenant
    )

    # ========================================================
    # ENREGISTRER LE TOKEN
    # ========================================================

    reset_token = PasswordResetToken(
        utilisateur_id=utilisateur.id,
        token_hash=token_hash,
        expires_at=expiration,
        used_at=None,
        created_at=maintenant,
    )

    db.add(reset_token)

    # ========================================================
    # FLUSH
    # ========================================================

    db.flush()

    return utilisateur, token_brut
# ============================================================
# ALIAS DE COMPATIBILITÉ
# ============================================================

def creer_demande_reinitialisation_mot_de_passe(
    db: Session,
    telephone: str | None = None,
    email: str | None = None,
) -> tuple[
    Utilisateur | None,
    str | None,
]:
    """
    Alias de compatibilité.

    Le nom officiel utilisé par routes.py est :
        demander_reinitialisation_mot_de_passe()

    Cet alias permet de conserver la compatibilité avec
    d'éventuels anciens appels internes.
    """

    return demander_reinitialisation_mot_de_passe(
        db=db,
        telephone=telephone,
        email=email,
    )


# ============================================================
# OBTENIR TOKEN DE RÉINITIALISATION
# ============================================================

def obtenir_token_reinitialisation(
    db: Session,
    token: str,
) -> PasswordResetToken:
    """
    Recherche un token de réinitialisation valide.

    Le token reçu est hashé avant la recherche en base.
    """

    token = nettoyer_texte(
        token
    )

    if not token:

        raise InvalidPasswordResetTokenError(
            "Token de réinitialisation invalide."
        )

    token_hash = (
        hasher_token_reinitialisation(
            token
        )
    )

    reset_token = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token_hash
            == token_hash
        )
        .first()
    )

    if reset_token is None:

        raise InvalidPasswordResetTokenError(
            "Le lien de réinitialisation "
            "est invalide."
        )

    maintenant = datetime.utcnow()

    if reset_token.used_at is not None:

        raise InvalidPasswordResetTokenError(
            "Ce lien de réinitialisation "
            "a déjà été utilisé."
        )

    if reset_token.expires_at <= maintenant:

        raise InvalidPasswordResetTokenError(
            "Le lien de réinitialisation "
            "a expiré."
        )

    return reset_token


# ============================================================
# RÉINITIALISER MOT DE PASSE
# ============================================================

def reinitialiser_mot_de_passe(
    db: Session,
    token: str,
    nouveau_mot_de_passe: str,
) -> Utilisateur:
    """
    Réinitialise le mot de passe avec un token valide.

    Le token est :
    - vérifié ;
    - consommé une seule fois ;
    - invalidé après utilisation.

    Les autres tokens actifs du même utilisateur
    sont également invalidés.
    """

    if not nouveau_mot_de_passe:

        raise ValidationServiceError(
            "Le nouveau mot de passe "
            "est obligatoire."
        )

    if len(nouveau_mot_de_passe) < 8:

        raise ValidationServiceError(
            "Le nouveau mot de passe doit "
            "contenir au moins 8 caractères."
        )

    # ========================================================
    # VALIDATION TOKEN
    # ========================================================

    reset_token = (
        obtenir_token_reinitialisation(
            db,
            token,
        )
    )

    # ========================================================
    # UTILISATEUR ASSOCIÉ
    # ========================================================

    utilisateur = obtenir_utilisateur(
        db,
        reset_token.utilisateur_id,
    )

    # ========================================================
    # VÉRIFICATION COMPTE
    # ========================================================

    verifier_compte_actif(
        utilisateur
    )

    # ========================================================
    # NOUVEAU MOT DE PASSE
    # ========================================================

    utilisateur.mot_de_passe_hash = (
        hash_password(
            nouveau_mot_de_passe
        )
    )

    # ========================================================
    # MÉTHODE AUTHENTIFICATION
    # ========================================================

    if utilisateur.google_id:

        utilisateur.methode_authentification = (
            AUTH_HYBRIDE
        )

    else:

        utilisateur.methode_authentification = (
            AUTH_LOCAL
        )

    # ========================================================
    # CONSOMMER LE TOKEN
    # ========================================================

    maintenant = datetime.utcnow()

    reset_token.used_at = maintenant

    # ========================================================
    # INVALIDER LES AUTRES TOKENS
    # ========================================================

    invalider_tokens_reinitialisation(
        db,
        utilisateur.id,
        token_exclu_id=reset_token.id,
        maintenant=maintenant,
    )

    # ========================================================
    # FLUSH
    # ========================================================

    db.flush()

    return utilisateur


# ============================================================
# VÉRIFIER EMAIL
# ============================================================

def verifier_email_utilisateur(
    db: Session,
    utilisateur: Utilisateur,
) -> Utilisateur:
    """
    Valide une adresse email.
    """

    if not utilisateur.email:

        raise ValidationServiceError(
            "Aucune adresse email n'est associée "
            "à ce compte."
        )

    utilisateur.email_verifie = True

    return utilisateur


# ============================================================
# VÉRIFIER TÉLÉPHONE
# ============================================================

def verifier_telephone_utilisateur(
    db: Session,
    utilisateur: Utilisateur,
) -> Utilisateur:
    """
    Valide un numéro de téléphone.

    Cette fonction sera appelée après réussite
    d'un mécanisme OTP.
    """

    if not utilisateur.telephone:

        raise ValidationServiceError(
            "Aucun numéro de téléphone n'est associé "
            "à ce compte."
        )

    utilisateur.telephone_verifie = True

    return utilisateur


# ============================================================
# MODIFIER RÔLE
# ============================================================

def modifier_role(
    db: Session,
    utilisateur: Utilisateur,
    nouveau_role: Any,
) -> Utilisateur:
    """
    Modifie le rôle.

    L'autorisation doit être contrôlée
    dans routes.py / dependencies.py.
    """

    nouveau_role = convertir_enum_ou_valeur(
        nouveau_role
    )

    if nouveau_role not in ROLES_VALIDES:

        raise ValidationServiceError(
            "Rôle utilisateur invalide."
        )

    utilisateur.role = nouveau_role

    return utilisateur


# ============================================================
# MODIFIER STATUT
# ============================================================

def modifier_statut_compte(
    db: Session,
    utilisateur: Utilisateur,
    nouveau_statut: Any,
) -> Utilisateur:
    """
    Modifie le statut du compte.

    L'autorisation est gérée ailleurs.
    """

    nouveau_statut = convertir_enum_ou_valeur(
        nouveau_statut
    )

    if nouveau_statut not in STATUTS_VALIDES:

        raise ValidationServiceError(
            "Statut de compte invalide."
        )

    utilisateur.statut_compte = nouveau_statut

    return utilisateur


# ============================================================
# ASSOCIER GOOGLE
# ============================================================

def associer_google(
    db: Session,
    utilisateur: Utilisateur,
    google_id: str,
    email: str | None = None,
) -> Utilisateur:
    """
    Associe Google à un compte existant.
    """

    google_id = nettoyer_texte(
        google_id
    )

    if not google_id:

        raise ValidationServiceError(
            "google_id obligatoire."
        )

    verifier_google_id_disponible(
        db,
        google_id,
        utilisateur.id,
    )

    utilisateur.google_id = google_id

    if email is not None:

        email = normaliser_email(
            email
        )

        verifier_email_disponible(
            db,
            email,
            utilisateur.id,
        )

        if email != utilisateur.email:

            utilisateur.email_verifie = False

        utilisateur.email = email

    if utilisateur.mot_de_passe_hash:

        utilisateur.methode_authentification = (
            AUTH_HYBRIDE
        )

    else:

        utilisateur.methode_authentification = (
            AUTH_GOOGLE
        )

    return utilisateur


# ============================================================
# DÉTACHER GOOGLE
# ============================================================

def detacher_google(
    db: Session,
    utilisateur: Utilisateur,
) -> Utilisateur:
    """
    Retire Google d'un compte.

    Interdit si aucun mot de passe local
    n'existe.
    """

    if not utilisateur.google_id:

        raise ValidationServiceError(
            "Aucun compte Google n'est associé."
        )

    if not utilisateur.mot_de_passe_hash:

        raise ValidationServiceError(
            "Impossible de détacher Google : "
            "le compte ne possède pas de "
            "mot de passe local."
        )

    utilisateur.google_id = None

    utilisateur.methode_authentification = (
        AUTH_LOCAL
    )

    return utilisateur


# ============================================================
# SAUVEGARDE UTILISATEUR
# ============================================================

def sauvegarder_utilisateur(
    db: Session,
    utilisateur: Utilisateur,
) -> Utilisateur:
    """
    Ajoute l'utilisateur à la session et effectue
    un flush.

    Le commit est volontairement laissé à la couche
    appelante.
    """

    try:

        db.add(
            utilisateur
        )

        db.flush()

        return utilisateur

    except IntegrityError as exc:

        raise ResourceAlreadyExistsError(
            "Impossible d'enregistrer "
            "les informations utilisateur."
        ) from exc