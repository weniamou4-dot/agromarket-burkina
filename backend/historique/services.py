# ============================================================
# AGROMARKET BURKINA
# HISTORIQUE / SERVICES
# Version professionnelle stabilisée
#
# Responsabilités :
# - création des historiques
# - consultation par annonce
# - consultation par acteur
# - filtrage
# - pagination
# - statistiques
# - sécurité métier
#
# IMPORTANT :
# - aucune route FastAPI ici
# - aucun Depends() ici
# - aucun APIRouter() ici
# - aucune logique HTTP ici
# ============================================================

from __future__ import annotations

from math import ceil
from typing import Any

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from models import (
    Annonce,
    HistoriqueModeration,
    Utilisateur,
)

from historique.schemas import (
    ActionModeration,
    HistoriqueStatutAnnonce,
)


# ============================================================
# EXCEPTIONS MÉTIER
# ============================================================

class HistoriqueServiceError(Exception):
    """
    Exception générale du module Historique.
    """


class HistoriqueNotFoundError(
    HistoriqueServiceError
):
    """
    Historique introuvable.
    """


class HistoriqueAnnonceNotFoundError(
    HistoriqueServiceError
):
    """
    Annonce introuvable.
    """


class HistoriqueActeurNotFoundError(
    HistoriqueServiceError
):
    """
    Acteur introuvable.
    """


class HistoriquePermissionError(
    HistoriqueServiceError
):
    """
    Accès non autorisé.
    """


class HistoriqueValidationError(
    HistoriqueServiceError
):
    """
    Données historiques invalides.
    """


class HistoriqueConflictError(
    HistoriqueServiceError
):
    """
    Conflit métier.
    """


# ============================================================
# CONSTANTES
# ============================================================

ROLE_ADMIN = {
    "admin",
    "administrateur",
}

ROLE_MODERATION = {
    "moderateur",
    "admin",
    "administrateur",
}


# ============================================================
# ACTIONS
# ============================================================

ACTION_SOUMISE = "soumise"

ACTION_APPROUVEE = "approuvee"

ACTION_REFUSEE = "refusee"

ACTION_REMISE_EN_MODERATION = (
    "remise_en_moderation"
)


ACTIONS_VALIDES = {
    ACTION_SOUMISE,
    ACTION_APPROUVEE,
    ACTION_REFUSEE,
    ACTION_REMISE_EN_MODERATION,
}


# ============================================================
# STATUTS
# ============================================================

STATUT_EN_ATTENTE = "en_attente"

STATUT_PUBLIEE = "publiee"

STATUT_REFUSEE = "refusee"


STATUTS_VALIDES = {
    STATUT_EN_ATTENTE,
    STATUT_PUBLIEE,
    STATUT_REFUSEE,
}


# ============================================================
# UTILITAIRES
# ============================================================

def nettoyer_texte(
    valeur: str | None,
) -> str | None:
    """
    Nettoie une chaîne de caractères.
    """

    if valeur is None:
        return None

    valeur = valeur.strip()

    return valeur if valeur else None


def valeur_enum(
    valeur: Any,
) -> str | None:
    """
    Convertit un Enum ou une chaîne en chaîne.
    """

    if valeur is None:
        return None

    if hasattr(
        valeur,
        "value",
    ):
        return str(
            valeur.value
        )

    return str(
        valeur
    )


# ============================================================
# OBTENIR UNE ANNONCE
# ============================================================

def obtenir_annonce(
    db: Session,
    annonce_id: int,
) -> Annonce:
    """
    Vérifie que l'annonce existe.
    """

    annonce = (
        db.query(Annonce)
        .filter(
            Annonce.id
            == annonce_id
        )
        .first()
    )

    if annonce is None:
        raise HistoriqueAnnonceNotFoundError(
            "Annonce introuvable."
        )

    return annonce


# ============================================================
# OBTENIR UN ACTEUR
# ============================================================

def obtenir_acteur(
    db: Session,
    acteur_id: int,
) -> Utilisateur:
    """
    Vérifie que l'acteur existe.
    """

    acteur = (
        db.query(Utilisateur)
        .filter(
            Utilisateur.id
            == acteur_id
        )
        .first()
    )

    if acteur is None:
        raise HistoriqueActeurNotFoundError(
            "Acteur introuvable."
        )

    return acteur


# ============================================================
# VÉRIFIER DROITS
# ============================================================

def verifier_droits_historique(
    utilisateur: Utilisateur,
) -> None:
    """
    Autorise la consultation globale
    de l'historique uniquement aux modérateurs
    et administrateurs.
    """

    if (
        utilisateur.role
        not in ROLE_MODERATION
    ):
        raise HistoriquePermissionError(
            "Accès réservé aux modérateurs "
            "et administrateurs."
        )


# ============================================================
# VALIDER ACTION
# ============================================================

def valider_action(
    action: Any,
) -> str:
    """
    Valide une action d'historique.
    """

    action_valeur = valeur_enum(
        action
    )

    if (
        action_valeur
        not in ACTIONS_VALIDES
    ):
        raise HistoriqueValidationError(
            "Action d'historique invalide."
        )

    return action_valeur


# ============================================================
# VALIDER STATUT
# ============================================================

def valider_statut(
    statut: Any,
) -> str | None:
    """
    Valide un statut d'annonce.

    None est autorisé pour l'ancien statut
    lors de la première soumission.
    """

    if statut is None:
        return None

    statut_valeur = valeur_enum(
        statut
    )

    if (
        statut_valeur
        not in STATUTS_VALIDES
    ):
        raise HistoriqueValidationError(
            "Statut d'annonce invalide."
        )

    return statut_valeur


# ============================================================
# CRÉER HISTORIQUE
# ============================================================

def creer_historique(
    db: Session,
    annonce_id: int,
    acteur_id: int,
    action: Any,
    ancien_statut: Any = None,
    nouveau_statut: Any = None,
    motif: str | None = None,
) -> HistoriqueModeration:
    """
    Crée une entrée d'historique.

    Cette fonction ne fait PAS de commit.

    Cela permet de l'utiliser dans la même transaction
    que l'action métier concernée.
    """

    # ========================================================
    # VÉRIFICATION ANNONCE
    # ========================================================

    annonce = obtenir_annonce(
        db,
        annonce_id,
    )

    # ========================================================
    # VÉRIFICATION ACTEUR
    # ========================================================

    acteur = obtenir_acteur(
        db,
        acteur_id,
    )

    # ========================================================
    # VÉRIFICATION RÔLE ACTEUR
    # ========================================================

    if (
        acteur.role
        not in ROLE_MODERATION
        and (
            valeur_enum(action)
            != ACTION_SOUMISE
            or acteur.role
            != "vendeur"
        )
    ):
        raise HistoriquePermissionError(
            "Cet utilisateur ne peut pas "
            "enregistrer cette action."
        )

    # ========================================================
    # ACTION
    # ========================================================

    action_valeur = valider_action(
        action
    )

    # ========================================================
    # STATUTS
    # ========================================================

    ancien_statut_valeur = (
        valider_statut(
            ancien_statut
        )
    )

    nouveau_statut_valeur = (
        valider_statut(
            nouveau_statut
        )
    )

    # ========================================================
    # CONTRÔLES DE COHÉRENCE
    # ========================================================

    if (
        action_valeur
        == ACTION_SOUMISE
    ):

        if (
            nouveau_statut_valeur
            != STATUT_EN_ATTENTE
        ):
            raise HistoriqueValidationError(
                "Une soumission doit placer "
                "l'annonce en attente."
            )

    elif (
        action_valeur
        == ACTION_APPROUVEE
    ):

        if (
            ancien_statut_valeur
            != STATUT_EN_ATTENTE
            or nouveau_statut_valeur
            != STATUT_PUBLIEE
        ):
            raise HistoriqueValidationError(
                "Une approbation doit correspondre "
                "à la transition en_attente → publiee."
            )

    elif (
        action_valeur
        == ACTION_REFUSEE
    ):

        if (
            ancien_statut_valeur
            != STATUT_EN_ATTENTE
            or nouveau_statut_valeur
            != STATUT_REFUSEE
        ):
            raise HistoriqueValidationError(
                "Un refus doit correspondre "
                "à la transition en_attente → refusee."
            )

    elif (
        action_valeur
        == ACTION_REMISE_EN_MODERATION
    ):

        if (
            nouveau_statut_valeur
            != STATUT_EN_ATTENTE
        ):
            raise HistoriqueValidationError(
                "Une remise en modération doit "
                "placer l'annonce en attente."
            )

    # ========================================================
    # MOTIF
    # ========================================================

    motif = nettoyer_texte(
        motif
    )

    # ========================================================
    # CRÉATION
    # ========================================================

    historique = HistoriqueModeration(

        annonce_id=annonce.id,

        acteur_id=acteur.id,

        action=action_valeur,

        ancien_statut=(
            ancien_statut_valeur
        ),

        nouveau_statut=(
            nouveau_statut_valeur
        ),

        motif=motif,
    )

    db.add(
        historique
    )

    db.flush()

    return historique


# ============================================================
# CRÉER HISTORIQUE DE SOUMISSION
# ============================================================

def enregistrer_soumission(
    db: Session,
    annonce: Annonce,
    vendeur: Utilisateur,
) -> HistoriqueModeration:
    """
    Enregistre la soumission d'une annonce.
    """

    return creer_historique(

        db=db,

        annonce_id=annonce.id,

        acteur_id=vendeur.id,

        action=ACTION_SOUMISE,

        ancien_statut=None,

        nouveau_statut=STATUT_EN_ATTENTE,
    )


# ============================================================
# CRÉER HISTORIQUE D'APPROBATION
# ============================================================

def enregistrer_approbation(
    db: Session,
    annonce: Annonce,
    moderateur: Utilisateur,
) -> HistoriqueModeration:
    """
    Enregistre l'approbation d'une annonce.
    """

    return creer_historique(

        db=db,

        annonce_id=annonce.id,

        acteur_id=moderateur.id,

        action=ACTION_APPROUVEE,

        ancien_statut=STATUT_EN_ATTENTE,

        nouveau_statut=STATUT_PUBLIEE,
    )


# ============================================================
# CRÉER HISTORIQUE DE REFUS
# ============================================================

def enregistrer_refus(
    db: Session,
    annonce: Annonce,
    moderateur: Utilisateur,
    motif: str | None = None,
) -> HistoriqueModeration:
    """
    Enregistre le refus d'une annonce.
    """

    return creer_historique(

        db=db,

        annonce_id=annonce.id,

        acteur_id=moderateur.id,

        action=ACTION_REFUSEE,

        ancien_statut=STATUT_EN_ATTENTE,

        nouveau_statut=STATUT_REFUSEE,

        motif=motif,
    )


# ============================================================
# CRÉER HISTORIQUE REMISE EN MODÉRATION
# ============================================================

def enregistrer_remise_en_moderation(
    db: Session,
    annonce: Annonce,
    acteur: Utilisateur,
    ancien_statut: str,
    motif: str | None = None,
) -> HistoriqueModeration:
    """
    Enregistre la remise d'une annonce
    en modération.
    """

    ancien_statut_valeur = (
        valider_statut(
            ancien_statut
        )
    )

    return creer_historique(

        db=db,

        annonce_id=annonce.id,

        acteur_id=acteur.id,

        action=ACTION_REMISE_EN_MODERATION,

        ancien_statut=(
            ancien_statut_valeur
        ),

        nouveau_statut=STATUT_EN_ATTENTE,

        motif=motif,
    )


# ============================================================
# OBTENIR HISTORIQUE
# ============================================================

def obtenir_historique(
    db: Session,
    historique_id: int,
) -> HistoriqueModeration:
    """
    Retourne une entrée historique précise.
    """

    historique = (
        db.query(
            HistoriqueModeration
        )
        .options(
            selectinload(
                HistoriqueModeration.acteur
            ),
            selectinload(
                HistoriqueModeration.annonce
            ),
        )
        .filter(
            HistoriqueModeration.id
            == historique_id
        )
        .first()
    )

    if historique is None:

        raise HistoriqueNotFoundError(
            "Historique introuvable."
        )

    return historique


# ============================================================
# HISTORIQUE D'UNE ANNONCE
# ============================================================

def historique_par_annonce(
    db: Session,
    annonce_id: int,
) -> list[HistoriqueModeration]:
    """
    Retourne toutes les actions réalisées
    sur une annonce.
    """

    obtenir_annonce(
        db,
        annonce_id,
    )

    return (
        db.query(
            HistoriqueModeration
        )
        .options(
            selectinload(
                HistoriqueModeration.acteur
            )
        )
        .filter(
            HistoriqueModeration.annonce_id
            == annonce_id
        )
        .order_by(
            HistoriqueModeration.date_action.asc(),
            HistoriqueModeration.id.asc(),
        )
        .all()
    )


# ============================================================
# HISTORIQUE D'UN ACTEUR
# ============================================================

def historique_par_acteur(
    db: Session,
    acteur_id: int,
) -> list[HistoriqueModeration]:
    """
    Retourne toutes les actions réalisées
    par un acteur.
    """

    obtenir_acteur(
        db,
        acteur_id,
    )

    return (
        db.query(
            HistoriqueModeration
        )
        .options(
            selectinload(
                HistoriqueModeration.acteur
            ),
            selectinload(
                HistoriqueModeration.annonce
            ),
        )
        .filter(
            HistoriqueModeration.acteur_id
            == acteur_id
        )
        .order_by(
            HistoriqueModeration.date_action.desc(),
            HistoriqueModeration.id.desc(),
        )
        .all()
    )


# ============================================================
# FILTRER HISTORIQUE
# ============================================================

def rechercher_historique(
    db: Session,
    annonce_id: int | None = None,
    acteur_id: int | None = None,
    action: Any = None,
) -> list[HistoriqueModeration]:
    """
    Recherche flexible dans les historiques.
    """

    query = (
        db.query(
            HistoriqueModeration
        )
        .options(
            selectinload(
                HistoriqueModeration.acteur
            ),
            selectinload(
                HistoriqueModeration.annonce
            ),
        )
    )

    if annonce_id is not None:

        query = query.filter(
            HistoriqueModeration.annonce_id
            == annonce_id
        )

    if acteur_id is not None:

        query = query.filter(
            HistoriqueModeration.acteur_id
            == acteur_id
        )

    if action is not None:

        action_valeur = valider_action(
            action
        )

        query = query.filter(
            HistoriqueModeration.action
            == action_valeur
        )

    return (
        query
        .order_by(
            HistoriqueModeration.date_action.desc(),
            HistoriqueModeration.id.desc(),
        )
        .all()
    )


# ============================================================
# PAGINATION
# ============================================================

def paginer_historique(
    historiques: list[HistoriqueModeration],
    page: int,
    limit: int,
) -> dict[str, Any]:
    """
    Applique une pagination à une liste d'historiques.
    """

    if page < 1:

        raise HistoriqueValidationError(
            "La page doit être supérieure "
            "ou égale à 1."
        )

    if limit < 1:

        raise HistoriqueValidationError(
            "La limite doit être supérieure "
            "ou égale à 1."
        )

    total = len(
        historiques
    )

    pages = (
        ceil(
            total / limit
        )
        if total
        else 0
    )

    debut = (
        (page - 1)
        * limit
    )

    fin = (
        debut + limit
    )

    return {

        "historiques":
            historiques[
                debut:fin
            ],

        "total":
            total,

        "page":
            page,

        "limit":
            limit,

        "pages":
            pages,
    }


# ============================================================
# STATISTIQUES HISTORIQUE
# ============================================================

def statistiques_historique(
    db: Session,
    annonce_id: int | None = None,
    acteur_id: int | None = None,
) -> dict[str, int]:
    """
    Retourne les statistiques de modération.
    """

    query_base = db.query(
        HistoriqueModeration
    )

    if annonce_id is not None:

        query_base = query_base.filter(
            HistoriqueModeration.annonce_id
            == annonce_id
        )

    if acteur_id is not None:

        query_base = query_base.filter(
            HistoriqueModeration.acteur_id
            == acteur_id
        )

    total = (
        query_base
        .with_entities(
            func.count(
                HistoriqueModeration.id
            )
        )
        .scalar()
        or 0
    )

    def compter(
        action: str,
    ) -> int:

        query = db.query(
            func.count(
                HistoriqueModeration.id
            )
        )

        if annonce_id is not None:

            query = query.filter(
                HistoriqueModeration.annonce_id
                == annonce_id
            )

        if acteur_id is not None:

            query = query.filter(
                HistoriqueModeration.acteur_id
                == acteur_id
            )

        return (
            query
            .filter(
                HistoriqueModeration.action
                == action
            )
            .scalar()
            or 0
        )

    return {

        "total_actions":
            int(total),

        "soumissions":
            int(
                compter(
                    ACTION_SOUMISE
                )
            ),

        "approbations":
            int(
                compter(
                    ACTION_APPROUVEE
                )
            ),

        "refus":
            int(
                compter(
                    ACTION_REFUSEE
                )
            ),

        "remises_en_moderation":
            int(
                compter(
                    ACTION_REMISE_EN_MODERATION
                )
            ),
    }


# ============================================================
# DERNIÈRE ACTION D'UNE ANNONCE
# ============================================================

def derniere_action_annonce(
    db: Session,
    annonce_id: int,
) -> HistoriqueModeration | None:
    """
    Retourne la dernière action connue
    sur une annonce.
    """

    obtenir_annonce(
        db,
        annonce_id,
    )

    return (
        db.query(
            HistoriqueModeration
        )
        .options(
            selectinload(
                HistoriqueModeration.acteur
            )
        )
        .filter(
            HistoriqueModeration.annonce_id
            == annonce_id
        )
        .order_by(
            HistoriqueModeration.date_action.desc(),
            HistoriqueModeration.id.desc(),
        )
        .first()
    )


# ============================================================
# VÉRIFIER COHÉRENCE HISTORIQUE
# ============================================================

def verifier_coherence_historique(
    db: Session,
    annonce_id: int,
) -> dict[str, Any]:
    """
    Vérifie la cohérence entre l'état actuel
    de l'annonce et sa dernière entrée historique.

    Cette fonction est utile pour l'administration
    et le diagnostic.
    """

    annonce = obtenir_annonce(
        db,
        annonce_id,
    )

    derniere = (
        derniere_action_annonce(
            db,
            annonce_id,
        )
    )

    if derniere is None:

        return {

            "annonce_id":
                annonce_id,

            "statut_annonce":
                annonce.statut,

            "historique_existant":
                False,

            "coherent":
                False,

            "message":
                (
                    "Aucun historique trouvé "
                    "pour cette annonce."
                ),
        }

    coherent = (
        derniere.nouveau_statut
        == annonce.statut
    )

    return {

        "annonce_id":
            annonce_id,

        "statut_annonce":
            annonce.statut,

        "derniere_action":
            derniere.action,

        "dernier_statut":
            derniere.nouveau_statut,

        "historique_existant":
            True,

        "coherent":
            coherent,

        "message":
            (
                "Historique cohérent."
                if coherent
                else
                "Incohérence détectée entre "
                "l'annonce et son historique."
            ),
    }


# ============================================================
# NETTOYAGE / PURGE
# ============================================================

def supprimer_historique_annonce(
    db: Session,
    annonce_id: int,
) -> int:
    """
    Supprime les historiques d'une annonce.

    Fonction réservée à des opérations administratives
    exceptionnelles.

    En pratique, l'historique devrait normalement
    être conservé pour l'audit.
    """

    historiques = (
        db.query(
            HistoriqueModeration
        )
        .filter(
            HistoriqueModeration.annonce_id
            == annonce_id
        )
        .all()
    )

    nombre = len(
        historiques
    )

    for historique in historiques:

        db.delete(
            historique
        )

    db.flush()

    return nombre