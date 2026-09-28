# ============================================================
# AGROMARKET BURKINA
# AUTH / SECURITY
# Version professionnelle définitive
#
# RESPONSABILITÉS :
# - configuration de sécurité
# - configuration JWT
# - hash des mots de passe
# - vérification des mots de passe
# - création des access tokens
# - création des refresh tokens
# - tokens de réinitialisation de mot de passe
# - configuration Google
#
# IMPORTANT :
# - La logique métier reste dans auth/services.py
# - Les routes HTTP restent dans auth/routes.py
# - Aucun mot de passe en clair n'est stocké
# - Les tokens de réinitialisation ne sont jamais stockés
#   en clair dans la base de données
# ============================================================


# ============================================================
# IMPORTS STANDARD
# ============================================================

from datetime import (
    datetime,
    timedelta,
    timezone,
)

import hashlib
import secrets


# ============================================================
# JWT
# ============================================================

from jose import (
    JWTError,
    jwt,
)


# ============================================================
# PASSWORD HASHING
# ============================================================

from pwdlib import PasswordHash


# ============================================================
# PYDANTIC SETTINGS
# ============================================================

from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
)


# ============================================================
# CONFIGURATION
# ============================================================

class Settings(BaseSettings):
    """
    Configuration centralisée de la sécurité
    et de l'authentification.

    Les valeurs sont chargées depuis le fichier .env.
    """

    # ========================================================
    # BASE DE DONNÉES
    # ========================================================

    DATABASE_URL: str | None = None

    # ========================================================
    # JWT
    # ========================================================

    SECRET_KEY: str

    ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ========================================================
    # GOOGLE
    # ========================================================

    GOOGLE_CLIENT_ID: str | None = None

    # ========================================================
    # SÉCURITÉ MOT DE PASSE
    # ========================================================

    PASSWORD_MIN_LENGTH: int = 8

    PASSWORD_MAX_LENGTH: int = 128

    # ========================================================
    # RÉINITIALISATION MOT DE PASSE
    # ========================================================

    # Durée de validité d'un lien de réinitialisation.
    #
    # Exemple :
    # PASSWORD_RESET_TOKEN_EXPIRE_MINUTES=30
    #
    # Le token sera donc valable 30 minutes.

    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30

    # ========================================================
    # JWT
    # ========================================================

    JWT_LEEWAY_SECONDS: int = 10

    # ========================================================
    # PYDANTIC SETTINGS
    # ========================================================

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


# ============================================================
# INSTANCE CONFIGURATION
# ============================================================

settings = Settings()


# ============================================================
# HASHAGE DES MOTS DE PASSE
# ============================================================

password_hash = PasswordHash.recommended()


# ============================================================
# VALIDATION MOT DE PASSE
# ============================================================

def validate_password(
    password: str,
) -> str:
    """
    Vérifie la validité minimale d'un mot de passe.

    Le hashage n'est jamais effectué avant cette validation.
    """

    if not isinstance(
        password,
        str,
    ):
        raise ValueError(
            "Le mot de passe doit être une chaîne."
        )


    if not password:

        raise ValueError(
            "Le mot de passe est obligatoire."
        )


    if (
        len(password)
        < settings.PASSWORD_MIN_LENGTH
    ):

        raise ValueError(
            f"Le mot de passe doit contenir "
            f"au moins {settings.PASSWORD_MIN_LENGTH} caractères."
        )


    if (
        len(password)
        > settings.PASSWORD_MAX_LENGTH
    ):

        raise ValueError(
            f"Le mot de passe ne peut pas dépasser "
            f"{settings.PASSWORD_MAX_LENGTH} caractères."
        )


    return password


# ============================================================
# HASHER UN MOT DE PASSE
# ============================================================

def hash_password(
    password: str,
) -> str:
    """
    Hash sécurisé d'un mot de passe.

    Aucun mot de passe en clair n'est enregistré
    dans la base de données.
    """

    password = validate_password(
        password
    )


    return password_hash.hash(
        password
    )


# ============================================================
# VÉRIFIER UN MOT DE PASSE
# ============================================================

def verify_password(
    password: str,
    hashed_password: str | None,
) -> bool:
    """
    Compare un mot de passe en clair avec son hash.

    Retourne False lorsque le hash est absent
    ou invalide.

    Cela est nécessaire pour les comptes Google
    qui peuvent ne pas avoir de mot de passe local.
    """

    if not password:

        return False


    if not hashed_password:

        return False


    try:

        return password_hash.verify(
            password,
            hashed_password,
        )

    except Exception:

        return False


# ============================================================
# DATE UTC
# ============================================================

def utc_now() -> datetime:
    """
    Retourne la date UTC avec timezone.
    """

    return datetime.now(
        timezone.utc
    )


# ============================================================
# EXPIRATION ACCESS TOKEN
# ============================================================

def get_access_token_expiration() -> datetime:
    """
    Calcule la date d'expiration d'un access token.
    """

    return (
        utc_now()
        + timedelta(
            minutes=(
                settings.ACCESS_TOKEN_EXPIRE_MINUTES
            )
        )
    )


# ============================================================
# DURÉE ACCESS TOKEN
# ============================================================

def get_access_token_expires_in() -> int:
    """
    Retourne la durée de vie de l'access token
    en secondes.
    """

    return int(
        settings.ACCESS_TOKEN_EXPIRE_MINUTES
        * 60
    )


# ============================================================
# CRÉATION ACCESS TOKEN
# ============================================================

def create_access_token(
    user_id: int,
) -> str:
    """
    Crée un JWT d'accès.

    Payload :

        sub  = identifiant utilisateur
        iat  = date d'émission
        exp  = date d'expiration
        type = access

    Le token ne contient aucune information sensible.
    """

    if not isinstance(
        user_id,
        int,
    ):

        raise ValueError(
            "user_id doit être un entier."
        )


    if user_id <= 0:

        raise ValueError(
            "user_id doit être supérieur à zéro."
        )


    now = utc_now()


    expire = (
        now
        + timedelta(
            minutes=(
                settings.ACCESS_TOKEN_EXPIRE_MINUTES
            )
        )
    )


    payload = {

        "sub": str(
            user_id
        ),

        "iat": int(
            now.timestamp()
        ),

        "exp": int(
            expire.timestamp()
        ),

        "type": "access",
    }


    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


# ============================================================
# CRÉATION REFRESH TOKEN
# ============================================================

def create_refresh_token(
    user_id: int,
) -> str:
    """
    Crée un refresh token JWT.
    """

    if not isinstance(
        user_id,
        int,
    ):

        raise ValueError(
            "user_id doit être un entier."
        )


    if user_id <= 0:

        raise ValueError(
            "user_id doit être supérieur à zéro."
        )


    now = utc_now()


    expire = (
        now
        + timedelta(
            days=(
                settings.REFRESH_TOKEN_EXPIRE_DAYS
            )
        )
    )


    payload = {

        "sub": str(
            user_id
        ),

        "iat": int(
            now.timestamp()
        ),

        "exp": int(
            expire.timestamp()
        ),

        "type": "refresh",
    }


    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


# ============================================================
# TOKEN DE RÉINITIALISATION
# ============================================================

def generate_password_reset_token() -> str:
    """
    Génère un token sécurisé pour la réinitialisation
    du mot de passe.

    Le token est généré avec secrets.token_urlsafe()
    et ne contient aucune information sur l'utilisateur.

    IMPORTANT :
    Le token brut doit uniquement être envoyé à
    l'utilisateur par le canal prévu (email).

    Il ne doit jamais être enregistré directement
    dans la base de données.
    """

    return secrets.token_urlsafe(
        32
    )


# ============================================================
# HASHER TOKEN DE RÉINITIALISATION
# ============================================================

def hash_password_reset_token(
    token: str,
) -> str:
    """
    Produit le hash SHA-256 d'un token de réinitialisation.

    Seul ce hash sera enregistré dans la base de données.

    Ainsi, même si la table password_reset_tokens
    est compromise, les tokens utilisables ne sont
    pas directement récupérables.
    """

    if not isinstance(
        token,
        str,
    ):

        raise ValueError(
            "Le token doit être une chaîne."
        )


    token = token.strip()


    if not token:

        raise ValueError(
            "Le token de réinitialisation est obligatoire."
        )


    return hashlib.sha256(
        token.encode(
            "utf-8"
        )
    ).hexdigest()


# ============================================================
# EXPIRATION TOKEN RÉINITIALISATION
# ============================================================

def get_password_reset_token_expiration() -> datetime:
    """
    Calcule la date d'expiration d'un token
    de réinitialisation de mot de passe.
    """

    return (
        utc_now()
        + timedelta(
            minutes=(
                settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
            )
        )
    )


# ============================================================
# DURÉE TOKEN RÉINITIALISATION
# ============================================================

def get_password_reset_token_expires_in() -> int:
    """
    Retourne la durée de validité du token
    de réinitialisation en secondes.
    """

    return int(
        settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
        * 60
    )


# ============================================================
# VÉRIFIER EXPIRATION TOKEN RÉINITIALISATION
# ============================================================

def password_reset_token_is_expired(
    expires_at: datetime,
) -> bool:
    """
    Vérifie si un token de réinitialisation est expiré.

    Compatible avec les dates UTC naïves et timezone-aware.
    """

    if expires_at is None:

        return True


    now = utc_now()


    # --------------------------------------------------------
    # Compatibilité avec une date SQLAlchemy naïve UTC
    # --------------------------------------------------------

    if expires_at.tzinfo is None:

        now = datetime.utcnow()

    else:

        now = utc_now()


    return expires_at <= now


# ============================================================
# DÉCODER UN TOKEN JWT
# ============================================================

def decode_token(
    token: str,
) -> dict:
    """
    Décode et vérifie un JWT.

    Cette fonction centralise la vérification du token
    afin d'éviter de répéter la logique dans plusieurs
    fichiers.
    """

    if not token:

        raise JWTError(
            "Token manquant."
        )


    payload = jwt.decode(

        token,

        settings.SECRET_KEY,

        algorithms=[
            settings.ALGORITHM
        ],

        options={
            "leeway": (
                settings.JWT_LEEWAY_SECONDS
            ),
        },
    )


    return payload


# ============================================================
# EXTRAIRE USER ID DU TOKEN
# ============================================================

def get_user_id_from_token(
    token: str,
) -> int:
    """
    Récupère l'identifiant utilisateur depuis le JWT.
    """

    payload = decode_token(
        token
    )


    user_id = payload.get(
        "sub"
    )


    if user_id is None:

        raise JWTError(
            "Le token ne contient pas "
            "d'identifiant utilisateur."
        )


    try:

        user_id = int(
            user_id
        )

    except (
        TypeError,
        ValueError,
    ):

        raise JWTError(
            "Identifiant utilisateur invalide."
        )


    if user_id <= 0:

        raise JWTError(
            "Identifiant utilisateur invalide."
        )


    return user_id


# ============================================================
# VÉRIFIER TYPE TOKEN
# ============================================================

def verify_token_type(
    token: str,
    expected_type: str = "access",
) -> dict:
    """
    Vérifie qu'un token est du type attendu.

    Exemple :

        verify_token_type(
            token,
            "access",
        )

    ou :

        verify_token_type(
            token,
            "refresh",
        )
    """

    payload = decode_token(
        token
    )


    token_type = payload.get(
        "type"
    )


    if token_type != expected_type:

        raise JWTError(
            "Type de token invalide."
        )


    return payload


# ============================================================
# USER ID ACCESS TOKEN
# ============================================================

def get_access_user_id(
    token: str,
) -> int:
    """
    Vérifie qu'il s'agit d'un access token
    puis retourne l'ID utilisateur.
    """

    payload = verify_token_type(
        token,
        expected_type="access",
    )


    user_id = payload.get(
        "sub"
    )


    if user_id is None:

        raise JWTError(
            "Identifiant utilisateur manquant."
        )


    try:

        user_id = int(
            user_id
        )

    except (
        ValueError,
        TypeError,
    ):

        raise JWTError(
            "Identifiant utilisateur invalide."
        )


    if user_id <= 0:

        raise JWTError(
            "Identifiant utilisateur invalide."
        )


    return user_id


# ============================================================
# USER ID REFRESH TOKEN
# ============================================================

def get_refresh_user_id(
    token: str,
) -> int:
    """
    Vérifie qu'il s'agit d'un refresh token
    puis retourne l'ID utilisateur.
    """

    payload = verify_token_type(
        token,
        expected_type="refresh",
    )


    user_id = payload.get(
        "sub"
    )


    if user_id is None:

        raise JWTError(
            "Identifiant utilisateur manquant."
        )


    try:

        user_id = int(
            user_id
        )

    except (
        ValueError,
        TypeError,
    ):

        raise JWTError(
            "Identifiant utilisateur invalide."
        )


    if user_id <= 0:

        raise JWTError(
            "Identifiant utilisateur invalide."
        )


    return user_id


# ============================================================
# CONFIGURATION GOOGLE
# ============================================================

def google_auth_configured() -> bool:
    """
    Vérifie si Google OAuth est configuré.
    """

    return bool(
        settings.GOOGLE_CLIENT_ID
    )


# ============================================================
# GOOGLE CLIENT ID
# ============================================================

def get_google_client_id() -> str:
    """
    Retourne le Google Client ID.

    Une erreur est levée si Google n'est pas configuré.
    """

    if not settings.GOOGLE_CLIENT_ID:

        raise RuntimeError(
            "GOOGLE_CLIENT_ID n'est pas configuré "
            "dans le fichier .env."
        )


    return settings.GOOGLE_CLIENT_ID


# ============================================================
# VÉRIFIER CONFIGURATION DE SÉCURITÉ
# ============================================================

def validate_security_settings() -> None:
    """
    Vérifie les paramètres critiques au démarrage
    de l'application.
    """

    # --------------------------------------------------------
    # SECRET KEY
    # --------------------------------------------------------

    if not settings.SECRET_KEY:

        raise RuntimeError(
            "SECRET_KEY est obligatoire "
            "dans le fichier .env."
        )


    if len(settings.SECRET_KEY) < 32:

        raise RuntimeError(
            "SECRET_KEY doit contenir au moins "
            "32 caractères."
        )


    # --------------------------------------------------------
    # ACCESS TOKEN
    # --------------------------------------------------------

    if (
        settings.ACCESS_TOKEN_EXPIRE_MINUTES
        <= 0
    ):

        raise RuntimeError(
            "ACCESS_TOKEN_EXPIRE_MINUTES "
            "doit être supérieur à zéro."
        )


    # --------------------------------------------------------
    # REFRESH TOKEN
    # --------------------------------------------------------

    if (
        settings.REFRESH_TOKEN_EXPIRE_DAYS
        <= 0
    ):

        raise RuntimeError(
            "REFRESH_TOKEN_EXPIRE_DAYS "
            "doit être supérieur à zéro."
        )


    # --------------------------------------------------------
    # MOT DE PASSE
    # --------------------------------------------------------

    if (
        settings.PASSWORD_MIN_LENGTH
        < 8
    ):

        raise RuntimeError(
            "PASSWORD_MIN_LENGTH ne peut pas "
            "être inférieur à 8."
        )


    if (
        settings.PASSWORD_MAX_LENGTH
        < settings.PASSWORD_MIN_LENGTH
    ):

        raise RuntimeError(
            "PASSWORD_MAX_LENGTH doit être "
            "supérieur à PASSWORD_MIN_LENGTH."
        )


    # --------------------------------------------------------
    # TOKEN RÉINITIALISATION
    # --------------------------------------------------------

    if (
        settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
        <= 0
    ):

        raise RuntimeError(
            "PASSWORD_RESET_TOKEN_EXPIRE_MINUTES "
            "doit être supérieur à zéro."
        )


    # --------------------------------------------------------
    # LEEWAY JWT
    # --------------------------------------------------------

    if (
        settings.JWT_LEEWAY_SECONDS
        < 0
    ):

        raise RuntimeError(
            "JWT_LEEWAY_SECONDS ne peut pas être négatif."
        )


# ============================================================
# VALIDATION AU CHARGEMENT
# ============================================================

validate_security_settings()