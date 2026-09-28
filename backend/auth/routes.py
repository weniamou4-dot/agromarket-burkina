
from datetime import datetime
from math import ceil
from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)

from jose import JWTError

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import (
    Session,
    selectinload,
)

from products.schemas import (
    AnnonceListResponse,
    AnnonceResponse,
)

from auth.email_service import (
    EmailServiceError,
    envoyer_email_reinitialisation_mot_de_passe,
)

from database import get_db

from models import (
    Annonce,
    Avis,
    Categorie,
    Commande,
    DemandeVendeur,
    Famille,
    HistoriqueModeration,
    Notification,
    Produit,
    Utilisateur,
)

from auth.schemas import (
    AdminAnnoncesStats,
    AdminAuthentificationStats,
    AdminAvisStats,
    AdminCatalogueStats,
    AdminCommandesStats,
    AdminComptesStats,
    AdminDemandesVendeurStats,
    AdminGeolocalisationStats,
    AdminModerationStats,
    AdminNotificationsStats,
    AdminStatistiquesResponse,
    AdminUserListResponse,
    AdminUtilisateursStats,
    DemandeVendeurDetailResponse,
    DemandeVendeurResponse,
    DemandeVendeurTraitement,
    GoogleAuthResponse,
    GoogleCompleteProfileRequest,
    GoogleLoginRequest,
    LoginRequest,
    MessageResponse,
    ModeratorCreateRequest,
    ModeratorPasswordUpdateRequest,
    ModeratorStatusUpdateRequest,
    ModeratorUpdateRequest,
    PaginationMeta,
    ProfilePhotoResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    RegisterRequest,
    UserProfileResponse,
    UserProfileUpdateRequest,
    UserResume,
    UserRole,
    UserStatus,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    SetPasswordRequest,
)

from auth.dependencies import (
    get_current_admin,
    get_current_acheteur,
    get_current_user,
)

from auth.security import (
    create_access_token,
    create_refresh_token,
    get_access_token_expires_in,
    get_refresh_user_id,
)

from auth.services import (
    AccountDisabledError,
    InvalidCredentialsError,
    ResourceAlreadyExistsError,
    ResourceNotFoundError,
    ValidationServiceError,
    authentifier_google,
    authentifier_local,
    changer_mot_de_passe,
    completer_compte_google,
    creer_compte_local,
    definir_mot_de_passe_local,
    enregistrer_connexion,
    modifier_photo_profil,
    modifier_profil,
    modifier_role,
    modifier_statut_compte,
    profil_est_complet,
    supprimer_photo_profil,
    demander_reinitialisation_mot_de_passe,
    reinitialiser_mot_de_passe,
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentification"],
)

user_router = APIRouter(
    tags=["Utilisateurs"],
)

admin_router = APIRouter(
    prefix="/admin",
    tags=["Administration"],
)

BASE_DIR = (
    Path(__file__)
    .resolve()
    .parent
    .parent
)

PROFILE_UPLOAD_DIR = (
    BASE_DIR
    / "uploads"
    / "profiles"
)

PROFILE_UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

ALLOWED_PROFILE_IMAGES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024

CURRENT_CONFIDENTIALITE_VERSION = "1.0"


def convertir_erreur(
    erreur: Exception,
) -> HTTPException:
    if isinstance(
        erreur,
        ResourceNotFoundError,
    ):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(erreur),
        )

    if isinstance(
        erreur,
        ResourceAlreadyExistsError,
    ):
        return HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(erreur),
        )

    if isinstance(
        erreur,
        InvalidCredentialsError,
    ):
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(erreur),
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    if isinstance(
        erreur,
        AccountDisabledError,
    ):
        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(erreur),
        )

    if isinstance(
        erreur,
        ValidationServiceError,
    ):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(erreur),
        )

    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Une erreur interne est survenue.",
    )


def construire_profil_response(
    utilisateur: Utilisateur,
) -> dict:
    return {
        "id": utilisateur.id,
        "nom": utilisateur.nom,
        "telephone": utilisateur.telephone,
        "email": utilisateur.email,
        "photo_profil": utilisateur.photo_profil,
        "adresse": utilisateur.adresse,
        "description": utilisateur.description,
        "google_id": utilisateur.google_id,
        "methode_authentification": (
            utilisateur.methode_authentification
            or "local"
        ),
        "mot_de_passe_defini": bool(
            utilisateur.mot_de_passe_hash
        ),
        "email_verifie": bool(
            utilisateur.email_verifie
        ),
        "telephone_verifie": bool(
            utilisateur.telephone_verifie
        ),
        "role": utilisateur.role,
        "statut_compte": (
            utilisateur.statut_compte
        ),
        "latitude": utilisateur.latitude,
        "longitude": utilisateur.longitude,
        "localisation_source": (
            utilisateur.localisation_source
            or "inconnue"
        ),
        "confidentialite_acceptee": bool(
            getattr(
                utilisateur,
                "confidentialite_acceptee",
                False,
            )
        ),
        "version_confidentialite": getattr(
            utilisateur,
            "version_confidentialite",
            None,
        ),
        "date_acceptation_confidentialite": getattr(
            utilisateur,
            "date_acceptation_confidentialite",
            None,
        ),
        "date_creation": (
            utilisateur.date_creation
        ),
        "date_modification": (
            utilisateur.date_modification
        ),
        "dernier_login": (
            utilisateur.dernier_login
        ),
    }


def obtenir_chemin_photo_locale(
    photo: str | None,
) -> Path | None:
    if not photo:
        return None

    prefix = "/uploads/profiles/"

    if not photo.startswith(prefix):
        return None

    nom_fichier = Path(photo).name

    if not nom_fichier:
        return None

    chemin = (
        PROFILE_UPLOAD_DIR
        / nom_fichier
    ).resolve()

    dossier = (
        PROFILE_UPLOAD_DIR
        .resolve()
    )

    try:
        chemin.relative_to(dossier)
    except ValueError:
        return None

    return chemin


def supprimer_photo_locale(
    photo: str | None,
) -> None:
    chemin = obtenir_chemin_photo_locale(
        photo
    )

    if chemin is None:
        return

    try:
        if (
            chemin.exists()
            and chemin.is_file()
        ):
            chemin.unlink()
    except OSError:
        pass


def enregistrer_photo_profil(
    fichier: UploadFile,
) -> tuple[str, int]:
    content_type = (
        fichier.content_type
        or ""
    ).lower()

    extension = (
        ALLOWED_PROFILE_IMAGES.get(
            content_type
        )
    )

    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Format d'image non autorisé. "
                "Utilisez JPG, PNG ou WEBP."
            ),
        )

    nom_fichier = (
        f"{uuid4().hex}{extension}"
    )

    chemin = (
        PROFILE_UPLOAD_DIR
        / nom_fichier
    )

    taille = 0

    try:
        with chemin.open("wb") as destination:
            while True:
                bloc = fichier.file.read(
                    1024 * 1024
                )

                if not bloc:
                    break

                taille += len(bloc)

                if (
                    taille
                    > MAX_PROFILE_IMAGE_SIZE
                ):
                    raise HTTPException(
                        status_code=(
                            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
                        ),
                        detail=(
                            "La photo ne doit "
                            "pas dépasser 5 Mo."
                        ),
                    )

                destination.write(bloc)

    except HTTPException:
        supprimer_photo_locale(
            f"/uploads/profiles/{nom_fichier}"
        )
        raise

    except OSError as erreur:
        supprimer_photo_locale(
            f"/uploads/profiles/{nom_fichier}"
        )

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Impossible d'enregistrer "
                "la photo."
            ),
        ) from erreur

    if taille == 0:
        supprimer_photo_locale(
            f"/uploads/profiles/{nom_fichier}"
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le fichier image est vide.",
        )

    chemin_relatif = (
        f"/uploads/profiles/{nom_fichier}"
    )

    return (
        chemin_relatif,
        taille,
    )


@router.post(
    "/register",
    response_model=UserProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    if not data.confidentialite_acceptee:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Vous devez accepter les conditions "
                "d'utilisation et la politique de "
                "confidentialité pour créer un compte."
            ),
        )

    try:
        utilisateur = creer_compte_local(
            db,
            data,
        )

        utilisateur.confidentialite_acceptee = True
        utilisateur.date_acceptation_confidentialite = (
            datetime.utcnow()
        )
        utilisateur.version_confidentialite = (
            CURRENT_CONFIDENTIALITE_VERSION
        )

        db.commit()

        db.refresh(
            utilisateur
        )

        return construire_profil_response(
            utilisateur
        )

    except (
        ResourceAlreadyExistsError,
        ValidationServiceError,
    ) as erreur:
        db.rollback()
        raise convertir_erreur(
            erreur
        )

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Un compte avec ces "
                "informations existe déjà."
            ),
        )


@router.post(
    "/login",
    response_model=RefreshTokenResponse,
)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    try:
        utilisateur = authentifier_local(
            db,
            data.telephone,
            data.mot_de_passe,
        )

        enregistrer_connexion(
            utilisateur
        )

        db.commit()

        db.refresh(
            utilisateur
        )

    except (
        InvalidCredentialsError,
        AccountDisabledError,
        ValidationServiceError,
        ResourceNotFoundError,
    ) as erreur:
        db.rollback()
        raise convertir_erreur(
            erreur
        )

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Impossible de se connecter."
            ),
        )

    return RefreshTokenResponse(
        access_token=create_access_token(
            utilisateur.id
        ),
        token_type="bearer",
        expires_in=get_access_token_expires_in(),
        refresh_token=create_refresh_token(
            utilisateur.id
        ),
    )


@router.post(
    "/google",
    response_model=GoogleAuthResponse,
)
def login_google(
    data: GoogleLoginRequest,
    db: Session = Depends(get_db),
):
    try:
        utilisateur, is_new_user = (
            authentifier_google(
                db,
                data.credential,
            )
        )

        enregistrer_connexion(
            utilisateur
        )

        db.commit()

        db.refresh(
            utilisateur
        )

    except (
        InvalidCredentialsError,
        AccountDisabledError,
        ResourceAlreadyExistsError,
        ValidationServiceError,
    ) as erreur:
        db.rollback()
        raise convertir_erreur(
            erreur
        )

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Impossible d'utiliser "
                "Google."
            ),
        )

    return GoogleAuthResponse(
        access_token=create_access_token(
            utilisateur.id
        ),
        token_type="bearer",
        expires_in=get_access_token_expires_in(),
        is_new_user=is_new_user,
        profile_complete=profil_est_complet(
            utilisateur
        ),
    )


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
)
def mot_de_passe_oublie(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    try:
        resultat = demander_reinitialisation_mot_de_passe(
            db,
            email=data.email,
            telephone=data.telephone,
        )

        utilisateur = None
        token = None

        if resultat:
            utilisateur, token = resultat

        if (
            utilisateur is not None
            and token is not None
            and utilisateur.email
        ):
            db.commit()

            envoyer_email_reinitialisation_mot_de_passe(
                destinataire=utilisateur.email,
                token=token,
            )
        else:
            db.commit()

    except ValidationServiceError as erreur:
        db.rollback()
        raise convertir_erreur(
            erreur
        )

    except EmailServiceError:
        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "La demande a été enregistrée, "
                "mais l'email n'a pas pu être envoyé. "
                "Veuillez réessayer plus tard."
            ),
        )

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Impossible de traiter "
                "la demande de réinitialisation."
            ),
        )

    return MessageResponse(
        message=(
            "Si un compte correspondant existe "
            "et qu'une adresse email vérifiée est "
            "disponible, un lien de réinitialisation "
            "vous sera envoyé."
        )
    )


@router.post(
    "/reset-password",
    response_model=MessageResponse,
)
def reinitialiser_mon_mot_de_passe(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    try:
        reinitialiser_mot_de_passe(
            db,
            data.token,
            data.nouveau_mot_de_passe,
        )

        db.commit()

    except (
        ValidationServiceError,
        ResourceNotFoundError,
    ) as erreur:
        db.rollback()
        raise convertir_erreur(
            erreur
        )

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Impossible de réinitialiser "
                "le mot de passe."
            ),
        )

    return MessageResponse(
        message=(
            "Mot de passe réinitialisé "
            "avec succès. Vous pouvez "
            "maintenant vous connecter."
        )
    )


@router.post(
    "/refresh",
    response_model=RefreshTokenResponse,
)
def refresh_token(
    data: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    try:
        user_id = get_refresh_user_id(
            data.refresh_token
        )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Refresh token invalide "
                "ou expiré."
            ),
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    utilisateur = (
        db.query(Utilisateur)
        .filter(
            Utilisateur.id == user_id
        )
        .first()
    )

    if utilisateur is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable.",
        )

    if utilisateur.statut_compte != "actif":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Votre compte n'est pas actif."
            ),
        )

    return RefreshTokenResponse(
        access_token=create_access_token(
            utilisateur.id
        ),
        token_type="bearer",
        expires_in=get_access_token_expires_in(),
        refresh_token=create_refresh_token(
            utilisateur.id
        ),
    )


@user_router.get(
    "/users/me",
    response_model=UserProfileResponse,
)
def mon_profil(
    current_user: Utilisateur = Depends(
        get_current_user
    ),
):
    return construire_profil_response(
        current_user
    )
@user_router.get(
    "/users/me/annonces",
    response_model=AnnonceListResponse,
)
def mes_annonces(
    page: int = Query(
        1,
        ge=1,
        description="Numéro de page.",
    ),
    limit: int = Query(
        20,
        ge=1,
        le=100,
        description="Nombre d'annonces par page.",
    ),
    current_user: Utilisateur = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    """
    Retourne les annonces appartenant
    à l'utilisateur connecté.

    La pagination est effectuée directement
    au niveau de la base de données.

    Les annonces sont triées de la plus récente
    à la plus ancienne.
    """

    # ========================================================
    # REQUÊTE DE BASE
    # ========================================================

    query = (
        db.query(Annonce)
        .filter(
            Annonce.vendeur_id
            == current_user.id
        )
    )

    # ========================================================
    # TOTAL
    # ========================================================

    total = (
        query.with_entities(
            func.count(
                Annonce.id
            )
        )
        .scalar()
        or 0
    )

    # ========================================================
    # NOMBRE DE PAGES
    # ========================================================

    pages = (
        ceil(total / limit)
        if total
        else 0
    )

    # ========================================================
    # PROTECTION PAGE HORS LIMITE
    # ========================================================

    if pages > 0 and page > pages:
        page = pages

    # ========================================================
    # PAGINATION SQL
    # ========================================================

    offset = (
        page - 1
    ) * limit

    annonces = (
        query
        .options(
            selectinload(
                Annonce.produit
            ),
            selectinload(
                Annonce.vendeur
            ),
            selectinload(
                Annonce.images
            ),
        )
        .order_by(
            Annonce.date_publication.desc(),
            Annonce.id.desc(),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    # ========================================================
    # CONVERSION DES ANNONCES
    # ========================================================

    resultats = [
        AnnonceResponse.model_validate(
            annonce
        )
        for annonce in annonces
    ]

    # ========================================================
    # RÉPONSE
    # ========================================================

    return AnnonceListResponse(
        annonces=resultats,
        pagination=PaginationMeta(
            page=page,
            limit=limit,
            total=total,
            pages=pages,
        ),
    )

@user_router.patch(
    "/users/me",
    response_model=UserProfileResponse,
)
def modifier_mon_profil(
    data: UserProfileUpdateRequest,
    current_user: Utilisateur = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    try:
        utilisateur = modifier_profil(
            db,
            current_user,
            data,
        )

        db.commit()

        db.refresh(
            utilisateur
        )

        return construire_profil_response(
            utilisateur
        )

    except (
        ResourceAlreadyExistsError,
        ResourceNotFoundError,
        ValidationServiceError,
    ) as erreur:
        db.rollback()
        raise convertir_erreur(
            erreur
        )

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Impossible d'enregistrer "
                "les modifications."
            ),
        )


@user_router.post(
    "/users/me/photo",
    response_model=ProfilePhotoResponse,
)
def upload_photo_profil(
    file: UploadFile = File(...),
    current_user: Utilisateur = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    ancienne_photo = (
        current_user.photo_profil
    )

    nouvelle_photo = None

    try:
        nouvelle_photo, _ = (
            enregistrer_photo_profil(
                file
            )
        )

        modifier_photo_profil(
            current_user,
            nouvelle_photo,
        )

        db.commit()

        db.refresh(
            current_user
        )

    except HTTPException:
        db.rollback()

        if nouvelle_photo:
            supprimer_photo_locale(
                nouvelle_photo
            )

        raise

    except Exception:
        db.rollback()

        if nouvelle_photo:
            supprimer_photo_locale(
                nouvelle_photo
            )

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Impossible de mettre à jour "
                "la photo de profil."
            ),
        )

    supprimer_photo_locale(
        ancienne_photo
    )

    return ProfilePhotoResponse(
        message=(
            "Photo de profil modifiée "
            "avec succès."
        ),
        photo_profil=(
            current_user.photo_profil
        ),
    )


@user_router.delete(
    "/users/me/photo",
    response_model=ProfilePhotoResponse,
)
def supprimer_ma_photo(
    current_user: Utilisateur = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    ancienne_photo = (
        current_user.photo_profil
    )

    try:
        supprimer_photo_profil(
            current_user
        )

        db.commit()

        db.refresh(
            current_user
        )

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Impossible de supprimer "
                "la photo de profil."
            ),
        )

    supprimer_photo_locale(
        ancienne_photo
    )

    return ProfilePhotoResponse(
        message=(
            "Photo de profil supprimée "
            "avec succès."
        ),
        photo_profil=None,
    )


@user_router.patch(
    "/users/me/google-profile",
    response_model=UserProfileResponse,
)
def completer_profil_google(
    data: GoogleCompleteProfileRequest,
    current_user: Utilisateur = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    try:
        utilisateur = completer_compte_google(
            db,
            current_user,
            data,
        )

        db.commit()

        db.refresh(
            utilisateur
        )

        return construire_profil_response(
            utilisateur
        )

    except (
        ResourceAlreadyExistsError,
        ResourceNotFoundError,
        ValidationServiceError,
    ) as erreur:
        db.rollback()
        raise convertir_erreur(
            erreur
        )

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Impossible de compléter "
                "le profil Google."
            ),
        )


@user_router.patch(
    "/users/me/password",
    response_model=MessageResponse,
)
def changer_mon_mot_de_passe(
    data: ChangePasswordRequest,
    current_user: Utilisateur = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    try:
        utilisateur = changer_mot_de_passe(
            db,
            current_user,
            data.ancien_mot_de_passe,
            data.nouveau_mot_de_passe,
        )

        db.commit()

        db.refresh(
            utilisateur
        )

    except (
        InvalidCredentialsError,
        ValidationServiceError,
    ) as erreur:
        db.rollback()
        raise convertir_erreur(
            erreur
        )

    return MessageResponse(
        message=(
            "Mot de passe modifié "
            "avec succès."
        )
    )


@user_router.post(
    "/users/me/password",
    response_model=MessageResponse,
)
def definir_mon_mot_de_passe(
    data: SetPasswordRequest,
    current_user: Utilisateur = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    try:
        utilisateur = definir_mot_de_passe_local(
            db,
            current_user,
            data.nouveau_mot_de_passe,
        )

        db.commit()

        db.refresh(
            utilisateur
        )

    except (
        ResourceAlreadyExistsError,
        ResourceNotFoundError,
        ValidationServiceError,
    ) as erreur:
        db.rollback()
        raise convertir_erreur(
            erreur
        )

    return MessageResponse(
        message=(
            "Mot de passe ajouté "
            "avec succès."
        )
    )


@user_router.post(
    "/users/me/demande-vendeur",
    response_model=DemandeVendeurResponse,
    status_code=status.HTTP_201_CREATED,
)
def demander_devenir_vendeur(
    current_user: Utilisateur = Depends(
        get_current_acheteur
    ),
    db: Session = Depends(get_db),
):
    demande_existante = (
        db.query(DemandeVendeur)
        .filter(
            DemandeVendeur.utilisateur_id
            == current_user.id,
            DemandeVendeur.statut
            == "en_attente",
        )
        .first()
    )

    if demande_existante:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Une demande vendeur "
                "est déjà en attente."
            ),
        )

    demande = DemandeVendeur(
        utilisateur_id=current_user.id,
        statut="en_attente",
        motif=None,
        date_demande=datetime.utcnow(),
        date_traitement=None,
    )

    db.add(
        demande
    )

    try:
        db.commit()

        db.refresh(
            demande
        )

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Impossible d'enregistrer "
                "la demande vendeur."
            ),
        )

    return demande


@user_router.get(
    "/users/me/demande-vendeur",
    response_model=DemandeVendeurResponse | None,
)
def voir_ma_demande_vendeur(
    current_user: Utilisateur = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    return (
        db.query(DemandeVendeur)
        .filter(
            DemandeVendeur.utilisateur_id
            == current_user.id
        )
        .order_by(
            DemandeVendeur.id.desc()
        )
        .first()
    )


@admin_router.get(
    "/utilisateurs",
    response_model=AdminUserListResponse,
)
def lister_utilisateurs(
    page: int = Query(
        1,
        ge=1,
    ),
    limit: int = Query(
        20,
        ge=1,
        le=100,
    ),
    role: UserRole | None = None,
    statut: UserStatus | None = None,
    current_admin: Utilisateur = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    query = db.query(
        Utilisateur
    )

    if role is not None:
        query = query.filter(
            Utilisateur.role
            == role.value
        )

    if statut is not None:
        query = query.filter(
            Utilisateur.statut_compte
            == statut.value
        )

    total = (
        query
        .with_entities(
            func.count(
                Utilisateur.id
            )
        )
        .scalar()
        or 0
    )

    pages = (
        ceil(total / limit)
        if total
        else 0
    )

    utilisateurs = (
        query
        .order_by(
            Utilisateur.date_creation.desc()
        )
        .offset(
            (page - 1) * limit
        )
        .limit(limit)
        .all()
    )

    resultats = [
        construire_profil_response(
            utilisateur
        )
        for utilisateur
        in utilisateurs
    ]

    return AdminUserListResponse(
        utilisateurs=resultats,
        pagination=PaginationMeta(
            page=page,
            limit=limit,
            total=total,
            pages=pages,
        ),
    )


@admin_router.get(
    "/demandes-vendeur",
    response_model=list[
        DemandeVendeurDetailResponse
    ],
)
def lister_demandes_vendeur(
    current_admin: Utilisateur = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    demandes = (
        db.query(DemandeVendeur)
        .order_by(
            DemandeVendeur.date_demande.desc()
        )
        .all()
    )

    resultats = []

    for demande in demandes:
        utilisateur = demande.utilisateur

        if utilisateur is None:
            continue

        resultats.append(
            {
                "id": demande.id,
                "utilisateur_id": (
                    demande.utilisateur_id
                ),
                "statut": demande.statut,
                "motif": demande.motif,
                "date_demande": (
                    demande.date_demande
                ),
                "date_traitement": (
                    demande.date_traitement
                ),
                "utilisateur": UserResume(
                    id=utilisateur.id,
                    nom=utilisateur.nom,
                    photo_profil=(
                        utilisateur.photo_profil
                    ),
                    role=utilisateur.role,
                    statut_compte=(
                        utilisateur.statut_compte
                    ),
                ),
            }
        )

    return resultats


def traiter_demande_vendeur(
    db: Session,
    demande_id: int,
    nouveau_statut: str,
    data: DemandeVendeurTraitement,
):
    demande = (
        db.query(DemandeVendeur)
        .filter(
            DemandeVendeur.id
            == demande_id
        )
        .first()
    )

    if demande is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Demande vendeur "
                "introuvable."
            ),
        )

    if demande.statut != "en_attente":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Cette demande a déjà "
                "été traitée."
            ),
        )

    utilisateur = demande.utilisateur

    if utilisateur is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Utilisateur introuvable."
            ),
        )

    try:
        if nouveau_statut == "acceptee":
            modifier_role(
                db,
                utilisateur,
                "vendeur",
            )
        else:
            modifier_role(
                db,
                utilisateur,
                "acheteur",
            )

        demande.statut = (
            nouveau_statut
        )

        demande.motif = (
            data.motif.strip()
            if data.motif
            else None
        )

        demande.date_traitement = (
            datetime.utcnow()
        )

        db.commit()

        db.refresh(
            demande
        )

    except (
        ValidationServiceError,
        ResourceNotFoundError,
    ) as erreur:
        db.rollback()
        raise convertir_erreur(
            erreur
        )

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Impossible de traiter "
                "la demande vendeur."
            ),
        )

    return demande


@admin_router.patch(
    "/demandes-vendeur/{demande_id}/accepter",
    response_model=DemandeVendeurResponse,
)
def accepter_demande_vendeur(
    demande_id: int,
    data: DemandeVendeurTraitement,
    current_admin: Utilisateur = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    return traiter_demande_vendeur(
        db,
        demande_id,
        "acceptee",
        data,
    )


@admin_router.patch(
    "/demandes-vendeur/{demande_id}/refuser",
    response_model=DemandeVendeurResponse,
)
def refuser_demande_vendeur(
    demande_id: int,
    data: DemandeVendeurTraitement,
    current_admin: Utilisateur = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    return traiter_demande_vendeur(
        db,
        demande_id,
        "refusee",
        data,
    )


@admin_router.post(
    "/moderateurs",
    response_model=UserProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
def creer_moderateur(
    data: ModeratorCreateRequest,
    current_admin: Utilisateur = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    telephone = str(
        data.telephone
    ).strip()

    email = (
        str(data.email)
        .strip()
        .lower()
        if data.email
        else None
    )

    existe_telephone = (
        db.query(Utilisateur)
        .filter(
            Utilisateur.telephone
            == telephone
        )
        .first()
    )

    if existe_telephone:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Ce numéro de téléphone "
                "est déjà utilisé."
            ),
        )

    if email:
        existe_email = (
            db.query(Utilisateur)
            .filter(
                func.lower(
                    Utilisateur.email
                )
                == email
            )
            .first()
        )

        if existe_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Cette adresse email "
                    "est déjà utilisée."
                ),
            )

    from auth.security import hash_password

    moderateur = Utilisateur(
        nom=data.nom.strip(),
        telephone=telephone,
        email=email,
        email_verifie=False,
        telephone_verifie=False,
        google_id=None,
        methode_authentification="local",
        photo_profil=None,
        mot_de_passe_hash=hash_password(
            data.mot_de_passe
        ),
        adresse=None,
        description=None,
        latitude=None,
        longitude=None,
        localisation_source="inconnue",
        role="moderateur",
        statut_compte="actif",
    )

    db.add(
        moderateur
    )

    try:
        db.commit()

        db.refresh(
            moderateur
        )

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Impossible de créer "
                "le modérateur."
            ),
        )

    return construire_profil_response(
        moderateur
    )


@admin_router.get(
    "/moderateurs",
    response_model=list[
        UserProfileResponse
    ],
)
def lister_moderateurs(
    current_admin: Utilisateur = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    moderateurs = (
        db.query(Utilisateur)
        .filter(
            Utilisateur.role
            == "moderateur"
        )
        .order_by(
            Utilisateur.nom.asc()
        )
        .all()
    )

    return [
        construire_profil_response(
            moderateur
        )
        for moderateur
        in moderateurs
    ]


@admin_router.get(
    "/moderateurs/{moderateur_id}",
    response_model=UserProfileResponse,
)
def consulter_moderateur(
    moderateur_id: int,
    current_admin: Utilisateur = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    moderateur = (
        db.query(Utilisateur)
        .filter(
            Utilisateur.id
            == moderateur_id,
            Utilisateur.role
            == "moderateur",
        )
        .first()
    )

    if moderateur is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modérateur introuvable.",
        )

    return construire_profil_response(
        moderateur
    )


@admin_router.patch(
    "/moderateurs/{moderateur_id}",
    response_model=UserProfileResponse,
)
def modifier_moderateur(
    moderateur_id: int,
    data: ModeratorUpdateRequest,
    current_admin: Utilisateur = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    moderateur = (
        db.query(Utilisateur)
        .filter(
            Utilisateur.id
            == moderateur_id,
            Utilisateur.role
            == "moderateur",
        )
        .first()
    )

    if moderateur is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modérateur introuvable.",
        )

    if "nom" in data.model_fields_set:
        nom = (
            data.nom.strip()
            if data.nom
            else ""
        )

        if not nom:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Le nom est obligatoire."
                ),
            )

        moderateur.nom = nom

    if "telephone" in data.model_fields_set:
        telephone = (
            str(data.telephone).strip()
            if data.telephone
            else ""
        )

        if not telephone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Le téléphone est obligatoire."
                ),
            )

        existe = (
            db.query(Utilisateur)
            .filter(
                Utilisateur.telephone
                == telephone,
                Utilisateur.id
                != moderateur.id,
            )
            .first()
        )

        if existe:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Ce numéro de téléphone "
                    "est déjà utilisé."
                ),
            )

        moderateur.telephone = telephone

    if "email" in data.model_fields_set:
        email = (
            str(data.email).strip().lower()
            if data.email
            else None
        )

        if email:
            existe = (
                db.query(Utilisateur)
                .filter(
                    func.lower(
                        Utilisateur.email
                    )
                    == email,
                    Utilisateur.id
                    != moderateur.id,
                )
                .first()
            )

            if existe:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "Cette adresse email "
                        "est déjà utilisée."
                    ),
                )

        moderateur.email = email

    try:
        db.commit()

        db.refresh(
            moderateur
        )

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Impossible de modifier "
                "le modérateur."
            ),
        )

    return construire_profil_response(
        moderateur
    )


@admin_router.patch(
    "/moderateurs/{moderateur_id}/mot-de-passe",
    response_model=MessageResponse,
)
def modifier_mot_de_passe_moderateur(
    moderateur_id: int,
    data: ModeratorPasswordUpdateRequest,
    current_admin: Utilisateur = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    moderateur = (
        db.query(Utilisateur)
        .filter(
            Utilisateur.id
            == moderateur_id,
            Utilisateur.role
            == "moderateur",
        )
        .first()
    )

    if moderateur is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modérateur introuvable.",
        )

    from auth.security import hash_password

    moderateur.mot_de_passe_hash = (
        hash_password(
            data.mot_de_passe
        )
    )

    if moderateur.google_id:
        moderateur.methode_authentification = (
            "hybride"
        )
    else:
        moderateur.methode_authentification = (
            "local"
        )

    try:
        db.commit()

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Impossible de modifier "
                "le mot de passe."
            ),
        )

    return MessageResponse(
        message=(
            "Mot de passe du modérateur "
            "modifié avec succès."
        )
    )


@admin_router.patch(
    "/moderateurs/{moderateur_id}/statut",
    response_model=UserProfileResponse,
)
def modifier_statut_moderateur(
    moderateur_id: int,
    data: ModeratorStatusUpdateRequest,
    current_admin: Utilisateur = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    moderateur = (
        db.query(Utilisateur)
        .filter(
            Utilisateur.id
            == moderateur_id,
            Utilisateur.role
            == "moderateur",
        )
        .first()
    )

    if moderateur is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modérateur introuvable.",
        )

    statut = (
        data.statut_compte.value
        if hasattr(
            data.statut_compte,
            "value",
        )
        else str(
            data.statut_compte
        )
    )

    if statut == "en_attente":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Un modérateur ne peut pas "
                "être en attente."
            ),
        )

    try:
        modifier_statut_compte(
            db,
            moderateur,
            statut,
        )

        db.commit()

        db.refresh(
            moderateur
        )

    except ValidationServiceError as erreur:
        db.rollback()
        raise convertir_erreur(
            erreur
        )

    return construire_profil_response(
        moderateur
    )


@admin_router.delete(
    "/moderateurs/{moderateur_id}",
    response_model=MessageResponse,
)
def supprimer_moderateur(
    moderateur_id: int,
    current_admin: Utilisateur = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    moderateur = (
        db.query(Utilisateur)
        .filter(
            Utilisateur.id
            == moderateur_id,
            Utilisateur.role
            == "moderateur",
        )
        .first()
    )

    if moderateur is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modérateur introuvable.",
        )

    historique = (
        db.query(
            HistoriqueModeration
        )
        .filter(
            HistoriqueModeration.acteur_id
            == moderateur.id
        )
        .first()
    )

    if historique:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Impossible de supprimer ce "
                "modérateur car il possède "
                "un historique de modération."
            ),
        )

    try:
        db.delete(
            moderateur
        )

        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Impossible de supprimer "
                "ce modérateur."
            ),
        )

    return MessageResponse(
        message=(
            "Modérateur supprimé "
            "avec succès."
        )
    )


@admin_router.get(
    "/statistiques",
    response_model=AdminStatistiquesResponse,
)
def statistiques_admin(
    current_admin: Utilisateur = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db),
):
    total_utilisateurs = (
        db.query(
            func.count(
                Utilisateur.id
            )
        )
        .scalar()
        or 0
    )

    acheteurs = (
        db.query(
            func.count(
                Utilisateur.id
            )
        )
        .filter(
            Utilisateur.role
            == "acheteur"
        )
        .scalar()
        or 0
    )

    vendeurs = (
        db.query(
            func.count(
                Utilisateur.id
            )
        )
        .filter(
            Utilisateur.role
            == "vendeur"
        )
        .scalar()
        or 0
    )

    administrateurs = (
        db.query(
            func.count(
                Utilisateur.id
            )
        )
        .filter(
            Utilisateur.role.in_(
                [
                    "admin",
                    "administrateur",
                ]
            )
        )
        .scalar()
        or 0
    )

    moderateurs = (
        db.query(
            func.count(
                Utilisateur.id
            )
        )
        .filter(
            Utilisateur.role
            == "moderateur"
        )
        .scalar()
        or 0
    )

    comptes_actifs = (
        db.query(
            func.count(
                Utilisateur.id
            )
        )
        .filter(
            Utilisateur.statut_compte
            == "actif"
        )
        .scalar()
        or 0
    )

    comptes_attente = (
        db.query(
            func.count(
                Utilisateur.id
            )
        )
        .filter(
            Utilisateur.statut_compte
            == "en_attente"
        )
        .scalar()
        or 0
    )

    comptes_bloques = (
        db.query(
            func.count(
                Utilisateur.id
            )
        )
        .filter(
            Utilisateur.statut_compte
            == "bloque"
        )
        .scalar()
        or 0
    )

    comptes_suspendus = (
        db.query(
            func.count(
                Utilisateur.id
            )
        )
        .filter(
            Utilisateur.statut_compte
            == "suspendu"
        )
        .scalar()
        or 0
    )

    comptes_locaux = (
        db.query(
            func.count(
                Utilisateur.id
            )
        )
        .filter(
            Utilisateur.methode_authentification
            == "local"
        )
        .scalar()
        or 0
    )

    comptes_google = (
        db.query(
            func.count(
                Utilisateur.id
            )
        )
        .filter(
            Utilisateur.methode_authentification
            == "google"
        )
        .scalar()
        or 0
    )

    comptes_hybrides = (
        db.query(
            func.count(
                Utilisateur.id
            )
        )
        .filter(
            Utilisateur.methode_authentification
            == "hybride"
        )
        .scalar()
        or 0
    )

    emails_verifies = (
        db.query(
            func.count(
                Utilisateur.id
            )
        )
        .filter(
            Utilisateur.email_verifie.is_(True)
        )
        .scalar()
        or 0
    )

    telephones_verifies = (
        db.query(
            func.count(
                Utilisateur.id
            )
        )
        .filter(
            Utilisateur.telephone_verifie.is_(True)
        )
        .scalar()
        or 0
    )

    total_familles = (
        db.query(
            func.count(
                Famille.id
            )
        )
        .scalar()
        or 0
    )

    total_categories = (
        db.query(
            func.count(
                Categorie.id
            )
        )
        .scalar()
        or 0
    )

    total_produits = (
        db.query(
            func.count(
                Produit.id
            )
        )
        .scalar()
        or 0
    )

    produits_bruts = (
        db.query(
            func.count(
                Produit.id
            )
        )
        .filter(
            Produit.est_valide.is_(True),
            Produit.type_produit
            == "brut",
        )
        .scalar()
        or 0
    )

    produits_transformes = (
        db.query(
            func.count(
                Produit.id
            )
        )
        .filter(
            Produit.est_valide.is_(True),
            Produit.type_produit
            == "transforme",
        )
        .scalar()
        or 0
    )

    annonces_total = (
        db.query(
            func.count(
                Annonce.id
            )
        )
        .scalar()
        or 0
    )

    annonces_publiees = (
        db.query(
            func.count(
                Annonce.id
            )
        )
        .filter(
            Annonce.statut
            == "publiee"
        )
        .scalar()
        or 0
    )

    annonces_attente = (
        db.query(
            func.count(
                Annonce.id
            )
        )
        .filter(
            Annonce.statut
            == "en_attente"
        )
        .scalar()
        or 0
    )

    annonces_refusees = (
        db.query(
            func.count(
                Annonce.id
            )
        )
        .filter(
            Annonce.statut
            == "refusee"
        )
        .scalar()
        or 0
    )

    annonces_localisees = (
        db.query(
            func.count(
                Annonce.id
            )
        )
        .filter(
            Annonce.latitude.isnot(None),
            Annonce.longitude.isnot(None),
        )
        .scalar()
        or 0
    )

    annonces_gps = (
        db.query(
            func.count(
                Annonce.id
            )
        )
        .filter(
            Annonce.localisation_source
            == "gps"
        )
        .scalar()
        or 0
    )

    commandes_total = (
        db.query(
            func.count(
                Commande.id
            )
        )
        .scalar()
        or 0
    )

    commandes_attente = (
        db.query(
            func.count(
                Commande.id
            )
        )
        .filter(
            Commande.statut
            == "en_attente"
        )
        .scalar()
        or 0
    )

    commandes_confirmees = (
        db.query(
            func.count(
                Commande.id
            )
        )
        .filter(
            Commande.statut
            == "confirmee"
        )
        .scalar()
        or 0
    )

    commandes_preparees = (
        db.query(
            func.count(
                Commande.id
            )
        )
        .filter(
            Commande.statut
            == "preparee"
        )
        .scalar()
        or 0
    )

    commandes_livrees = (
        db.query(
            func.count(
                Commande.id
            )
        )
        .filter(
            Commande.statut
            == "livree"
        )
        .scalar()
        or 0
    )

    commandes_annulees = (
        db.query(
            func.count(
                Commande.id
            )
        )
        .filter(
            Commande.statut
            == "annulee"
        )
        .scalar()
        or 0
    )

    chiffre_total = (
        db.query(
            func.coalesce(
                func.sum(
                    Commande.prix_total
                ),
                0,
            )
        )
        .scalar()
        or 0
    )

    demandes_total = (
        db.query(
            func.count(
                DemandeVendeur.id
            )
        )
        .scalar()
        or 0
    )

    demandes_attente = (
        db.query(
            func.count(
                DemandeVendeur.id
            )
        )
        .filter(
            DemandeVendeur.statut
            == "en_attente"
        )
        .scalar()
        or 0
    )

    demandes_acceptees = (
        db.query(
            func.count(
                DemandeVendeur.id
            )
        )
        .filter(
            DemandeVendeur.statut
            == "acceptee"
        )
        .scalar()
        or 0
    )

    demandes_refusees = (
        db.query(
            func.count(
                DemandeVendeur.id
            )
        )
        .filter(
            DemandeVendeur.statut
            == "refusee"
        )
        .scalar()
        or 0
    )

    notifications_total = (
        db.query(
            func.count(
                Notification.id
            )
        )
        .scalar()
        or 0
    )

    notifications_non_lues = (
        db.query(
            func.count(
                Notification.id
            )
        )
        .filter(
            Notification.est_lue.is_(False)
        )
        .scalar()
        or 0
    )

    notifications_lues = (
        notifications_total
        - notifications_non_lues
    )

    avis_total = (
        db.query(
            func.count(
                Avis.id
            )
        )
        .scalar()
        or 0
    )

    avis_visibles = (
        db.query(
            func.count(
                Avis.id
            )
        )
        .filter(
            Avis.est_visible.is_(True)
        )
        .scalar()
        or 0
    )

    avis_invisibles = (
        avis_total
        - avis_visibles
    )

    moyenne_avis = (
        db.query(
            func.coalesce(
                func.avg(
                    Avis.note
                ),
                0,
            )
        )
        .scalar()
        or 0
    )

    moderation_total = (
        db.query(
            func.count(
                HistoriqueModeration.id
            )
        )
        .scalar()
        or 0
    )

    moderation_soumises = (
        db.query(
            func.count(
                HistoriqueModeration.id
            )
        )
        .filter(
            HistoriqueModeration.action
            == "soumise"
        )
        .scalar()
        or 0
    )

    moderation_approbations = (
        db.query(
            func.count(
                HistoriqueModeration.id
            )
        )
        .filter(
            HistoriqueModeration.action
            == "approuvee"
        )
        .scalar()
        or 0
    )

    moderation_refus = (
        db.query(
            func.count(
                HistoriqueModeration.id
            )
        )
        .filter(
            HistoriqueModeration.action
            == "refusee"
        )
        .scalar()
        or 0
    )

    moderation_remises = (
        db.query(
            func.count(
                HistoriqueModeration.id
            )
        )
        .filter(
            HistoriqueModeration.action
            == "remise_en_moderation"
        )
        .scalar()
        or 0
    )

    utilisateurs_localises = (
        db.query(
            func.count(
                Utilisateur.id
            )
        )
        .filter(
            Utilisateur.latitude.isnot(None),
            Utilisateur.longitude.isnot(None),
        )
        .scalar()
        or 0
    )

    utilisateurs_gps = (
        db.query(
            func.count(
                Utilisateur.id
            )
        )
        .filter(
            Utilisateur.localisation_source
            == "gps"
        )
        .scalar()
        or 0
    )

    return AdminStatistiquesResponse(
        utilisateurs=AdminUtilisateursStats(
            total=total_utilisateurs,
            acheteurs=acheteurs,
            vendeurs=vendeurs,
            administrateurs=administrateurs,
            moderateurs=moderateurs,
        ),
        comptes=AdminComptesStats(
            actifs=comptes_actifs,
            en_attente=comptes_attente,
            bloques=comptes_bloques,
            suspendus=comptes_suspendus,
        ),
        authentification=AdminAuthentificationStats(
            total=total_utilisateurs,
            comptes_locaux=comptes_locaux,
            comptes_google=comptes_google,
            comptes_hybrides=comptes_hybrides,
            emails_verifies=emails_verifies,
            telephones_verifies=telephones_verifies,
        ),
        catalogue=AdminCatalogueStats(
            familles=total_familles,
            categories=total_categories,
            produits=total_produits,
            produits_bruts=produits_bruts,
            produits_transformes=produits_transformes,
        ),
        annonces=AdminAnnoncesStats(
            total=annonces_total,
            publiees=annonces_publiees,
            en_attente=annonces_attente,
            refusees=annonces_refusees,
        ),
        commandes=AdminCommandesStats(
            total=commandes_total,
            en_attente=commandes_attente,
            confirmees=commandes_confirmees,
            preparees=commandes_preparees,
            livrees=commandes_livrees,
            annulees=commandes_annulees,
            chiffre_total=float(
                chiffre_total
            ),
        ),
        demandes_vendeur=AdminDemandesVendeurStats(
            total=demandes_total,
            en_attente=demandes_attente,
            acceptees=demandes_acceptees,
            refusees=demandes_refusees,
        ),
        notifications=AdminNotificationsStats(
            total=notifications_total,
            non_lues=notifications_non_lues,
            lues=notifications_lues,
        ),
        avis=AdminAvisStats(
            total=avis_total,
            visibles=avis_visibles,
            invisibles=avis_invisibles,
            achats_verifies=0,
            moyenne=float(
                moyenne_avis
            ),
        ),
        moderation=AdminModerationStats(
            total_actions=moderation_total,
            soumissions=moderation_soumises,
            approbations=moderation_approbations,
            refus=moderation_refus,
            remises_en_moderation=(
                moderation_remises
            ),
        ),
        geolocalisation=AdminGeolocalisationStats(
            utilisateurs_localises=(
                utilisateurs_localises
            ),
            utilisateurs_gps=(
                utilisateurs_gps
            ),
            annonces_localisees=(
                annonces_localisees
            ),
            annonces_gps=(
                annonces_gps
            ),
        ),
    )
