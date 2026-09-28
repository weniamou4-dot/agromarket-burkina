# ============================================================
# AGROMARKET BURKINA
# AUTH / DEPENDENCIES
# Version professionnelle définitive
#
# Responsabilités :
# - récupérer l'utilisateur connecté
# - vérifier le JWT
# - vérifier l'état du compte
# - contrôler les rôles
# - centraliser les permissions FastAPI
#
# IMPORTANT :
# Aucune logique métier complexe ici.
# ============================================================

from collections.abc import Callable

from fastapi import (
    Depends,
    HTTPException,
    status,
)

from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from jose import JWTError

from sqlalchemy.orm import Session

from database import get_db

from models import Utilisateur

from auth.security import (
    get_access_user_id,
)


# ============================================================
# SÉCURITÉ HTTP
# ============================================================

security_bearer = HTTPBearer(
    auto_error=True,
)


# ============================================================
# CONSTANTES RÔLES
# ============================================================

ROLES_ADMIN = {
    "admin",
    "administrateur",
}

ROLES_MODERATION = {
    "moderateur",
    "admin",
    "administrateur",
}

ROLE_VENDEUR = "vendeur"

ROLE_ACHETEUR = "acheteur"

ROLE_MODERATEUR = "moderateur"


# ============================================================
# STATUTS COMPTE
# ============================================================

STATUT_COMPTE_ACTIF = "actif"

STATUT_COMPTE_EN_ATTENTE = "en_attente"

STATUT_COMPTE_BLOQUE = "bloque"

STATUT_COMPTE_SUSPENDU = "suspendu"


STATUTS_COMPTE_DESACTIVES = {
    STATUT_COMPTE_BLOQUE,
    STATUT_COMPTE_SUSPENDU,
}


# ============================================================
# EXCEPTIONS
# ============================================================

def authentication_exception() -> HTTPException:
    """
    Exception standard lorsqu'un utilisateur
    n'est pas authentifié.
    """

    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentification requise.",
        headers={
            "WWW-Authenticate": "Bearer",
        },
    )


def permission_exception(
    message: str,
) -> HTTPException:
    """
    Exception standard pour un accès interdit.
    """

    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=message,
    )


# ============================================================
# UTILISATEUR CONNECTÉ
# ============================================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        security_bearer
    ),
    db: Session = Depends(get_db),
) -> Utilisateur:
    """
    Retourne l'utilisateur authentifié.

    Étapes :

    1. récupère le Bearer token ;
    2. vérifie la signature JWT ;
    3. vérifie que le token est un access token ;
    4. récupère l'identifiant utilisateur ;
    5. vérifie que l'utilisateur existe ;
    6. vérifie que son compte n'est pas bloqué ou suspendu.
    """

    token = credentials.credentials

    # ========================================================
    # DÉCODAGE JWT
    # ========================================================

    try:

        user_id = get_access_user_id(
            token
        )

    except (
        JWTError,
        ValueError,
        TypeError,
    ):

        raise authentication_exception()

    # ========================================================
    # RECHERCHE UTILISATEUR
    # ========================================================

    utilisateur = (
        db.query(Utilisateur)
        .filter(
            Utilisateur.id
            == user_id
        )
        .first()
    )

    if utilisateur is None:

        raise authentication_exception()

    # ========================================================
    # COMPTE DÉSACTIVÉ
    # ========================================================

    if (
        utilisateur.statut_compte
        in STATUTS_COMPTE_DESACTIVES
    ):

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Votre compte est bloqué "
                "ou suspendu."
            ),
        )

    return utilisateur


# ============================================================
# ADMINISTRATEUR
# ============================================================

def get_current_admin(
    current_user: Utilisateur = Depends(
        get_current_user
    ),
) -> Utilisateur:
    """
    Vérifie que l'utilisateur est administrateur.
    """

    if (
        current_user.role
        not in ROLES_ADMIN
    ):

        raise permission_exception(
            "Accès réservé aux administrateurs."
        )

    return current_user


# ============================================================
# MODÉRATION
# ============================================================

def get_current_moderation_user(
    current_user: Utilisateur = Depends(
        get_current_user
    ),
) -> Utilisateur:
    """
    Autorise :

    - modérateur
    - administrateur
    """

    if (
        current_user.role
        not in ROLES_MODERATION
    ):

        raise permission_exception(
            "Accès réservé aux modérateurs "
            "et administrateurs."
        )

    return current_user


# ============================================================
# MODÉRATEUR SEUL
# ============================================================

def get_current_moderateur(
    current_user: Utilisateur = Depends(
        get_current_user
    ),
) -> Utilisateur:
    """
    Vérifie que l'utilisateur est exclusivement
    un modérateur.
    """

    if (
        current_user.role
        != ROLE_MODERATEUR
    ):

        raise permission_exception(
            "Accès réservé aux modérateurs."
        )

    return current_user


# ============================================================
# VENDEUR
# ============================================================

def get_current_vendeur(
    current_user: Utilisateur = Depends(
        get_current_user
    ),
) -> Utilisateur:
    """
    Vérifie que l'utilisateur est vendeur.
    """

    if (
        current_user.role
        != ROLE_VENDEUR
    ):

        raise permission_exception(
            "Accès réservé aux vendeurs."
        )

    return current_user


# ============================================================
# ACHETEUR
# ============================================================

def get_current_acheteur(
    current_user: Utilisateur = Depends(
        get_current_user
    ),
) -> Utilisateur:
    """
    Vérifie que l'utilisateur est acheteur.
    """

    if (
        current_user.role
        != ROLE_ACHETEUR
    ):

        raise permission_exception(
            "Accès réservé aux acheteurs."
        )

    return current_user


# ============================================================
# VÉRIFICATION RÔLES MULTIPLES
# ============================================================

def require_roles(
    *roles: str,
) -> Callable:
    """
    Génère une dépendance FastAPI permettant
    d'autoriser plusieurs rôles.

    Exemple :

        Depends(
            require_roles(
                "admin",
                "moderateur",
            )
        )
    """

    roles_autorises = set(
        roles
    )

    def dependency(
        current_user: Utilisateur = Depends(
            get_current_user
        ),
    ) -> Utilisateur:

        if (
            current_user.role
            not in roles_autorises
        ):

            raise permission_exception(
                "Vous n'avez pas les droits "
                "nécessaires."
            )

        return current_user

    return dependency


# ============================================================
# VÉRIFICATION COMPTE ACTIF
# ============================================================

def require_active_account(
    current_user: Utilisateur = Depends(
        get_current_user
    ),
) -> Utilisateur:
    """
    Vérifie explicitement que le compte est actif.
    """

    if (
        current_user.statut_compte
        != STATUT_COMPTE_ACTIF
    ):

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Votre compte n'est pas actuellement actif."
            ),
        )

    return current_user


# ============================================================
# VÉRIFICATION EMAIL
# ============================================================

def require_verified_email(
    current_user: Utilisateur = Depends(
        get_current_user
    ),
) -> Utilisateur:
    """
    Vérifie qu'une adresse email a été vérifiée.
    """

    if not current_user.email:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Une adresse email est requise."
            ),
        )

    if not current_user.email_verifie:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Veuillez vérifier votre adresse email."
            ),
        )

    return current_user


# ============================================================
# VÉRIFICATION TÉLÉPHONE
# ============================================================

def require_verified_phone(
    current_user: Utilisateur = Depends(
        get_current_user
    ),
) -> Utilisateur:
    """
    Vérifie que le téléphone a été vérifié.
    """

    if not current_user.telephone:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Un numéro de téléphone est requis."
            ),
        )

    if not current_user.telephone_verifie:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Veuillez vérifier votre "
                "numéro de téléphone."
            ),
        )

    return current_user


# ============================================================
# ADMIN OU MODÉRATEUR
# ============================================================

def get_current_admin_or_moderateur(
    current_user: Utilisateur = Depends(
        get_current_user
    ),
) -> Utilisateur:
    """
    Autorise administrateur ou modérateur.
    """

    if (
        current_user.role
        not in {
            "admin",
            "administrateur",
            "moderateur",
        }
    ):

        raise permission_exception(
            "Accès réservé aux administrateurs "
            "et modérateurs."
        )

    return current_user