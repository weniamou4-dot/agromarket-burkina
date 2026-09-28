# ============================================================
# AGROMARKET BURKINA
# ORDERS / SERVICES
# Version professionnelle stabilisée
#
# Responsabilités :
# - création des commandes
# - contrôle des annonces
# - contrôle des quantités
# - calcul des montants
# - gestion des statuts
# - annulation
# - notifications
# - statistiques
# - pagination
#
# IMPORTANT :
# - aucun APIRouter ici
# - aucun Depends ici
# - aucune logique HTTP ici
# - les routes utilisent ces services
# - les commits sont contrôlés par les routes
# ============================================================

from __future__ import annotations

from math import ceil
from typing import Any

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from models import (
    Annonce,
    Commande,
    Notification,
    Produit,
    Utilisateur,
)

from orders.schemas import (
    CommandeCreate,
    CommandeUpdate,
    StatutCommande,
)


# ============================================================
# EXCEPTIONS MÉTIER
# ============================================================

class OrderServiceError(Exception):
    """
    Exception générale du module commandes.
    """


class OrderNotFoundError(OrderServiceError):
    """
    Commande introuvable.
    """


class OrderAnnouncementNotFoundError(OrderServiceError):
    """
    Annonce introuvable.
    """


class OrderPermissionError(OrderServiceError):
    """
    Opération non autorisée.
    """


class OrderValidationError(OrderServiceError):
    """
    Données de commande invalides.
    """


class OrderStatusError(OrderServiceError):
    """
    Transition de statut interdite.
    """


class OrderQuantityError(OrderServiceError):
    """
    Quantité insuffisante ou incorrecte.
    """


class OrderConflictError(OrderServiceError):
    """
    Conflit métier.
    """


# ============================================================
# CONSTANTES
# ============================================================

STATUT_EN_ATTENTE = "en_attente"
STATUT_CONFIRMEE = "confirmee"
STATUT_PREPAREE = "preparee"
STATUT_LIVREE = "livree"
STATUT_ANNULEE = "annulee"

STATUTS_VALIDES = {
    STATUT_EN_ATTENTE,
    STATUT_CONFIRMEE,
    STATUT_PREPAREE,
    STATUT_LIVREE,
    STATUT_ANNULEE,
}


ROLE_ADMIN = {
    "admin",
    "administrateur",
}


# ============================================================
# TRANSITIONS AUTORISÉES
# ============================================================

TRANSITIONS_COMMANDE = {
    STATUT_EN_ATTENTE: {
        STATUT_CONFIRMEE,
        STATUT_ANNULEE,
    },

    STATUT_CONFIRMEE: {
        STATUT_PREPAREE,
        STATUT_ANNULEE,
    },

    STATUT_PREPAREE: {
        STATUT_LIVREE,
        STATUT_ANNULEE,
    },

    STATUT_LIVREE: set(),

    STATUT_ANNULEE: set(),
}


# ============================================================
# TYPES NOTIFICATIONS
# ============================================================

NOTIFICATION_COMMANDE_NOUVELLE = (
    "commande_nouvelle"
)

NOTIFICATION_COMMANDE_CONFIRMEE = (
    "commande_confirmee"
)

NOTIFICATION_COMMANDE_PREPAREE = (
    "commande_preparee"
)

NOTIFICATION_COMMANDE_LIVREE = (
    "commande_livree"
)

NOTIFICATION_COMMANDE_ANNULEE = (
    "commande_annulee"
)


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
# OBTENIR COMMANDE
# ============================================================

def obtenir_commande(
    db: Session,
    commande_id: int,
) -> Commande:
    """
    Récupère une commande avec ses relations.
    """

    commande = (
        db.query(Commande)
        .options(
            selectinload(
                Commande.acheteur
            ),

            selectinload(
                Commande.annonce
            ).selectinload(
                Annonce.produit
            ),

            selectinload(
                Commande.annonce
            ).selectinload(
                Annonce.vendeur
            ),
        )
        .filter(
            Commande.id
            == commande_id
        )
        .first()
    )

    if commande is None:

        raise OrderNotFoundError(
            "Commande introuvable."
        )

    return commande


# ============================================================
# OBTENIR ANNONCE POUR COMMANDE
# ============================================================

def obtenir_annonce_commandable(
    db: Session,
    annonce_id: int,
) -> Annonce:
    """
    Récupère une annonce pouvant recevoir
    une nouvelle commande.

    Conditions :
    - annonce publiée ;
    - produit validé ;
    - stock strictement supérieur à zéro ;
    - vendeur existant ;
    - produit existant.

    Le verrouillage FOR UPDATE permet d'éviter qu'une même
    quantité disponible soit réservée simultanément par
    plusieurs commandes.
    """

    annonce = (
        db.query(Annonce)
        .options(
            selectinload(
                Annonce.produit
            ),
            selectinload(
                Annonce.vendeur
            ),
        )
        .join(
            Produit,
            Annonce.produit_id == Produit.id,
        )
        .filter(
            Annonce.id == annonce_id,

            Annonce.statut == "publiee",

            Annonce.quantite > 0,

            Produit.est_valide.is_(True),
        )
        .with_for_update()
        .first()
    )

    if annonce is None:
        raise OrderAnnouncementNotFoundError(
            "Annonce introuvable ou "
            "non disponible à la commande."
        )

    if annonce.vendeur is None:
        raise OrderConflictError(
            "Le vendeur associé à l'annonce "
            "est introuvable."
        )

    if annonce.produit is None:
        raise OrderConflictError(
            "Le produit associé à l'annonce "
            "est introuvable."
        )

    return annonce


# ============================================================
# VÉRIFIER QUANTITÉ
# ============================================================

def verifier_quantite_disponible(
    annonce: Annonce,
    quantite: float,
) -> None:
    """
    Vérifie que la quantité demandée est disponible.
    """

    if quantite <= 0:

        raise OrderQuantityError(
            "La quantité doit être "
            "supérieure à zéro."
        )

    if annonce.quantite <= 0:

        raise OrderQuantityError(
            "Cette annonce n'a plus "
            "de quantité disponible."
        )

    if quantite > annonce.quantite:

        raise OrderQuantityError(
            "La quantité demandée dépasse "
            "la quantité disponible."
        )


# ============================================================
# CALCUL PRIX
# ============================================================

def calculer_prix_total(
    prix_unitaire: float,
    quantite: float,
) -> float:
    """
    Calcule le montant total côté serveur.
    """

    if prix_unitaire <= 0:

        raise OrderValidationError(
            "Le prix unitaire doit être "
            "supérieur à zéro."
        )

    if quantite <= 0:

        raise OrderValidationError(
            "La quantité doit être "
            "supérieure à zéro."
        )

    total = (
        float(prix_unitaire)
        * float(quantite)
    )

    if total <= 0:

        raise OrderValidationError(
            "Le montant total calculé "
            "est invalide."
        )

    return round(
        total,
        2,
    )


# ============================================================
# AJOUTER NOTIFICATION
# ============================================================

def ajouter_notification(
    db: Session,
    utilisateur_id: int,
    type_notification: str,
    titre: str,
    message: str,
    lien: str | None = None,
    reference_id: int | None = None,
) -> Notification:
    """
    Ajoute une notification sans commit.
    """

    notification = Notification(
        utilisateur_id=utilisateur_id,

        type=type_notification,

        titre=titre.strip(),

        message=message.strip(),

        est_lue=False,

        date_lecture=None,

        lien=(
            lien.strip()
            if lien
            else None
        ),

        reference_id=reference_id,
    )

    db.add(
        notification
    )

    db.flush()

    return notification


# ============================================================
# NOTIFICATION NOUVELLE COMMANDE
# ============================================================

def notifier_nouvelle_commande(
    db: Session,
    commande: Commande,
) -> Notification:
    """
    Notifie le vendeur lorsqu'une commande est créée.
    """

    annonce = commande.annonce

    if annonce is None:

        raise OrderConflictError(
            "Annonce introuvable pour "
            "la notification."
        )

    return ajouter_notification(

        db=db,

        utilisateur_id=annonce.vendeur_id,

        type_notification=(
            NOTIFICATION_COMMANDE_NOUVELLE
        ),

        titre="Nouvelle commande",

        message=(
            f"Vous avez reçu une nouvelle commande "
            f"pour « {annonce.produit.nom} »."
        ),

        lien=f"/commandes/{commande.id}",

        reference_id=commande.id,
    )


# ============================================================
# NOTIFICATION CHANGEMENT STATUT
# ============================================================

def notifier_changement_statut(
    db: Session,
    commande: Commande,
    ancien_statut: str,
    nouveau_statut: str,
    motif: str | None = None,
) -> list[Notification]:
    """
    Notifie les personnes concernées
    par le changement de statut.
    """

    notifications = []

    annonce = commande.annonce

    if annonce is None:

        raise OrderConflictError(
            "Annonce introuvable."
        )

    acheteur_id = commande.acheteur_id

    vendeur_id = annonce.vendeur_id

    # ========================================================
    # CONFIRMATION
    # ========================================================

    if nouveau_statut == STATUT_CONFIRMEE:

        notifications.append(

            ajouter_notification(

                db=db,

                utilisateur_id=acheteur_id,

                type_notification=(
                    NOTIFICATION_COMMANDE_CONFIRMEE
                ),

                titre="Commande confirmée",

                message=(
                    f"Votre commande #{commande.id} "
                    f"a été confirmée par le vendeur."
                ),

                lien=f"/commandes/{commande.id}",

                reference_id=commande.id,
            )
        )

    # ========================================================
    # PRÉPARATION
    # ========================================================

    elif nouveau_statut == STATUT_PREPAREE:

        notifications.append(

            ajouter_notification(

                db=db,

                utilisateur_id=acheteur_id,

                type_notification=(
                    NOTIFICATION_COMMANDE_PREPAREE
                ),

                titre="Commande préparée",

                message=(
                    f"Votre commande #{commande.id} "
                    f"est prête."
                ),

                lien=f"/commandes/{commande.id}",

                reference_id=commande.id,
            )
        )

    # ========================================================
    # LIVRAISON
    # ========================================================

    elif nouveau_statut == STATUT_LIVREE:

        notifications.append(

            ajouter_notification(

                db=db,

                utilisateur_id=acheteur_id,

                type_notification=(
                    NOTIFICATION_COMMANDE_LIVREE
                ),

                titre="Commande livrée",

                message=(
                    f"Votre commande #{commande.id} "
                    f"a été livrée."
                ),

                lien=f"/commandes/{commande.id}",

                reference_id=commande.id,
            )
        )

    # ========================================================
    # ANNULATION
    # ========================================================

    elif nouveau_statut == STATUT_ANNULEE:

        message = (
            f"La commande #{commande.id} "
            f"a été annulée."
        )

        motif_nettoye = nettoyer_texte(
            motif
        )

        if motif_nettoye:

            message += (
                f" Motif : {motif_nettoye}"
            )

        # ----------------------------------------------------
        # Acheteur
        # ----------------------------------------------------

        notifications.append(

            ajouter_notification(

                db=db,

                utilisateur_id=acheteur_id,

                type_notification=(
                    NOTIFICATION_COMMANDE_ANNULEE
                ),

                titre="Commande annulée",

                message=message,

                lien=f"/commandes/{commande.id}",

                reference_id=commande.id,
            )
        )

        # ----------------------------------------------------
        # Vendeur
        # ----------------------------------------------------

        if vendeur_id != acheteur_id:

            notifications.append(

                ajouter_notification(

                    db=db,

                    utilisateur_id=vendeur_id,

                    type_notification=(
                        NOTIFICATION_COMMANDE_ANNULEE
                    ),

                    titre="Commande annulée",

                    message=message,

                    lien=f"/commandes/{commande.id}",

                    reference_id=commande.id,
                )
            )

    return notifications


# ============================================================
# CRÉER COMMANDE
# ============================================================

def creer_commande(
    db: Session,
    acheteur: Utilisateur,
    data: CommandeCreate,
) -> Commande:
    """
    Crée une commande.

    Le client fournit uniquement :
    - annonce_id
    - quantite

    Le serveur détermine :
    - prix unitaire
    - prix total
    - acheteur
    - statut
    - date
    """

    if acheteur.id is None:

        raise OrderPermissionError(
            "Utilisateur non authentifié."
        )

    if acheteur.role not in {
        "acheteur",
        "vendeur",
    }:

        raise OrderPermissionError(
            "Ce compte ne peut pas effectuer "
            "une commande."
        )

    annonce = (
        obtenir_annonce_commandable(
            db,
            data.annonce_id,
        )
    )

    # --------------------------------------------------------
    # EMPÊCHER L'ACHAT DE SA PROPRE ANNONCE
    # --------------------------------------------------------

    if (
        annonce.vendeur_id
        == acheteur.id
    ):

        raise OrderPermissionError(
            "Vous ne pouvez pas commander "
            "votre propre annonce."
        )

    # --------------------------------------------------------
    # QUANTITÉ
    # --------------------------------------------------------

    quantite = float(
        data.quantite
    )

    verifier_quantite_disponible(
        annonce,
        quantite,
    )

    # --------------------------------------------------------
    # PRIX
    # --------------------------------------------------------

    prix_unitaire = float(
        annonce.prix
    )

    prix_total = (
        calculer_prix_total(
            prix_unitaire,
            quantite,
        )
    )

    # --------------------------------------------------------
    # CRÉATION
    # --------------------------------------------------------

    commande = Commande(

        acheteur_id=acheteur.id,

        annonce_id=annonce.id,

        quantite=quantite,

        prix_unitaire=prix_unitaire,

        prix_total=prix_total,

        statut=STATUT_EN_ATTENTE,
    )

    db.add(
        commande
    )

    db.flush()

    # --------------------------------------------------------
    # RÉSERVATION DE QUANTITÉ
    # --------------------------------------------------------
    #
    # La quantité est diminuée dès la création
    # de la commande.
    #
    # Si la commande est annulée, la quantité
    # sera restaurée.
    #
    # Cela évite qu'une même quantité soit commandée
    # simultanément plusieurs fois.
    #
    # --------------------------------------------------------

    annonce.quantite = (
        float(annonce.quantite)
        - quantite
    )

    # --------------------------------------------------------
    # NOTIFICATION
    # --------------------------------------------------------

    notifier_nouvelle_commande(
        db,
        commande,
    )

    return commande


# ============================================================
# VÉRIFIER PROPRIÉTAIRE COMMANDE
# ============================================================

def verifier_acces_commande(
    commande: Commande,
    utilisateur: Utilisateur,
) -> None:
    """
    Vérifie si l'utilisateur peut consulter
    une commande.
    """

    acheteur_autorise = (
        commande.acheteur_id
        == utilisateur.id
    )

    vendeur_autorise = (
        commande.annonce is not None
        and commande.annonce.vendeur_id
        == utilisateur.id
    )

    admin_autorise = (
        utilisateur.role
        in ROLE_ADMIN
    )

    if not (
        acheteur_autorise
        or vendeur_autorise
        or admin_autorise
    ):

        raise OrderPermissionError(
            "Vous n'êtes pas autorisé "
            "à accéder à cette commande."
        )


# ============================================================
# MODIFIER QUANTITÉ COMMANDE
# ============================================================

def modifier_commande(
    db: Session,
    commande_id: int,
    utilisateur: Utilisateur,
    data: CommandeUpdate,
) -> Commande:
    """
    Modifie la quantité d'une commande
    tant qu'elle est encore en attente.

    Seul l'acheteur propriétaire peut modifier
    la quantité.
    """

    commande = obtenir_commande(
        db,
        commande_id,
    )

    if (
        commande.acheteur_id
        != utilisateur.id
    ):

        raise OrderPermissionError(
            "Seul l'acheteur ayant créé "
            "la commande peut la modifier."
        )

    if (
        commande.statut
        != STATUT_EN_ATTENTE
    ):

        raise OrderStatusError(
            "Une commande ne peut être modifiée "
            "que lorsqu'elle est en attente."
        )

    fields_set = getattr(
        data,
        "model_fields_set",
        set(),
    )

    if "quantite" not in fields_set:

        return commande

    if data.quantite is None:

        raise OrderQuantityError(
            "La quantité est obligatoire."
        )

    nouvelle_quantite = float(
        data.quantite
    )

    if nouvelle_quantite <= 0:

        raise OrderQuantityError(
            "La quantité doit être "
            "supérieure à zéro."
        )

    ancienne_quantite = float(
        commande.quantite
    )

    difference = (
        nouvelle_quantite
        - ancienne_quantite
    )

    annonce = (
        commande.annonce
    )

    if annonce is None:

        raise OrderConflictError(
            "Annonce introuvable."
        )

    # --------------------------------------------------------
    # AUGMENTATION
    # --------------------------------------------------------

    if difference > 0:

        verifier_quantite_disponible(
            annonce,
            difference,
        )

        annonce.quantite = (
            float(annonce.quantite)
            - difference
        )

    # --------------------------------------------------------
    # DIMINUTION
    # --------------------------------------------------------

    elif difference < 0:

        annonce.quantite = (
            float(annonce.quantite)
            + abs(difference)
        )

    commande.quantite = (
        nouvelle_quantite
    )

    commande.prix_unitaire = (
        float(annonce.prix)
    )

    commande.prix_total = (
        calculer_prix_total(
            commande.prix_unitaire,
            commande.quantite,
        )
    )

    return commande


# ============================================================
# VÉRIFIER TRANSITION STATUT
# ============================================================

def verifier_transition_statut(
    ancien_statut: str,
    nouveau_statut: str,
) -> None:
    """
    Vérifie que la transition demandée
    respecte le cycle de vie d'une commande.
    """

    if (
        nouveau_statut
        not in STATUTS_VALIDES
    ):

        raise OrderStatusError(
            "Statut de commande invalide."
        )

    if (
        nouveau_statut
        == ancien_statut
    ):

        raise OrderStatusError(
            "La commande possède déjà "
            "ce statut."
        )

    autorises = (
        TRANSITIONS_COMMANDE.get(
            ancien_statut,
            set(),
        )
    )

    if (
        nouveau_statut
        not in autorises
    ):

        raise OrderStatusError(
            f"Transition impossible : "
            f"{ancien_statut} → "
            f"{nouveau_statut}."
        )


# ============================================================
# CHANGER STATUT
# ============================================================

def changer_statut_commande(
    db: Session,
    commande_id: int,
    utilisateur: Utilisateur,
    nouveau_statut: str,
    motif: str | None = None,
) -> Commande:
    """
    Change le statut d'une commande.

    Règles :

    Acheteur :
        peut annuler sa commande
        lorsqu'elle est encore annulable.

    Vendeur :
        en_attente -> confirmee
        confirmee  -> preparee
        preparee   -> livree
        peut annuler selon le cycle.

    Admin :
        contrôle administratif.
    """

    commande = obtenir_commande(
        db,
        commande_id,
    )

    ancien_statut = (
        commande.statut
    )

    nouveau_statut = valeur_enum(
        nouveau_statut
    )

    if nouveau_statut is None:

        raise OrderStatusError(
            "Nouveau statut obligatoire."
        )

    # ========================================================
    # ACCÈS
    # ========================================================

    est_acheteur = (
        commande.acheteur_id
        == utilisateur.id
    )

    est_vendeur = (
        commande.annonce is not None
        and commande.annonce.vendeur_id
        == utilisateur.id
    )

    est_admin = (
        utilisateur.role
        in ROLE_ADMIN
    )

    if not (
        est_acheteur
        or est_vendeur
        or est_admin
    ):

        raise OrderPermissionError(
            "Vous n'êtes pas autorisé "
            "à modifier cette commande."
        )

    # ========================================================
    # RÈGLES ACHETEUR
    # ========================================================

    if est_acheteur and not est_admin:

        if (
            nouveau_statut
            != STATUT_ANNULEE
        ):

            raise OrderPermissionError(
                "L'acheteur peut uniquement "
                "annuler sa commande."
            )

    # ========================================================
    # RÈGLES VENDEUR
    # ========================================================

    if (
        est_vendeur
        and not est_admin
        and not est_acheteur
    ):

        transitions_vendeur = {
            STATUT_EN_ATTENTE: {
                STATUT_CONFIRMEE,
                STATUT_ANNULEE,
            },

            STATUT_CONFIRMEE: {
                STATUT_PREPAREE,
                STATUT_ANNULEE,
            },

            STATUT_PREPAREE: {
                STATUT_LIVREE,
                STATUT_ANNULEE,
            },
        }

        autorises = (
            transitions_vendeur.get(
                ancien_statut,
                set(),
            )
        )

        if (
            nouveau_statut
            not in autorises
        ):

            raise OrderStatusError(
                "Le vendeur n'est pas autorisé "
                "à effectuer cette transition."
            )

    # ========================================================
    # TRANSITION
    # ========================================================

    verifier_transition_statut(
        ancien_statut,
        nouveau_statut,
    )

    # ========================================================
    # ANNULATION
    # ========================================================

    if (
        nouveau_statut
        == STATUT_ANNULEE
    ):

        annonce = (
            commande.annonce
        )

        if annonce is None:

            raise OrderConflictError(
                "Annonce introuvable."
            )

        # ----------------------------------------------------
        # RESTAURATION QUANTITÉ
        # ----------------------------------------------------

        annonce.quantite = (
            float(annonce.quantite)
            + float(commande.quantite)
        )

    # ========================================================
    # APPLICATION
    # ========================================================

    commande.statut = (
        nouveau_statut
    )

    # ========================================================
    # NOTIFICATION
    # ========================================================

    notifier_changement_statut(

        db=db,

        commande=commande,

        ancien_statut=ancien_statut,

        nouveau_statut=nouveau_statut,

        motif=motif,
    )

    return commande


# ============================================================
# ANNULER COMMANDE
# ============================================================

def annuler_commande(
    db: Session,
    commande_id: int,
    utilisateur: Utilisateur,
    motif: str | None = None,
) -> Commande:
    """
    Annule une commande via le service
    de changement de statut.
    """

    return changer_statut_commande(

        db=db,

        commande_id=commande_id,

        utilisateur=utilisateur,

        nouveau_statut=STATUT_ANNULEE,

        motif=motif,
    )


# ============================================================
# COMMANDES ACHETEUR
# ============================================================

def lister_commandes_acheteur(
    db: Session,
    acheteur_id: int,
    statut: str | None = None,
) -> list[Commande]:
    """
    Retourne les commandes d'un acheteur.
    """

    query = (
        db.query(Commande)
        .options(
            selectinload(
                Commande.annonce
            ).selectinload(
                Annonce.produit
            )
        )
        .filter(
            Commande.acheteur_id
            == acheteur_id
        )
    )

    if statut:

        statut_valeur = valeur_enum(
            statut
        )

        if (
            statut_valeur
            not in STATUTS_VALIDES
        ):

            raise OrderStatusError(
                "Statut invalide."
            )

        query = query.filter(
            Commande.statut
            == statut_valeur
        )

    return (
        query
        .order_by(
            Commande.date_commande.desc(),
            Commande.id.desc(),
        )
        .all()
    )


# ============================================================
# COMMANDES VENDEUR
# ============================================================

def lister_commandes_vendeur(
    db: Session,
    vendeur_id: int,
    statut: str | None = None,
) -> list[Commande]:
    """
    Retourne les commandes reçues par un vendeur.
    """

    query = (
        db.query(Commande)
        .join(
            Annonce,
            Commande.annonce_id
            == Annonce.id,
        )
        .filter(
            Annonce.vendeur_id
            == vendeur_id
        )
        .options(
            selectinload(
                Commande.acheteur
            ),

            selectinload(
                Commande.annonce
            ).selectinload(
                Annonce.produit
            ),

            selectinload(
                Commande.annonce
            ).selectinload(
                Annonce.vendeur
            ),
        )
    )

    if statut:
        statut_valeur = valeur_enum(
            statut
        )

        if (
            statut_valeur
            not in STATUTS_VALIDES
        ):
            raise OrderStatusError(
                "Statut invalide."
            )

        query = query.filter(
            Commande.statut
            == statut_valeur
        )

    return (
        query
        .order_by(
            Commande.date_commande.desc(),
            Commande.id.desc(),
        )
        .all()
    )

# ============================================================
# COMMANDES ADMIN
# ============================================================

def lister_commandes_admin(
    db: Session,
    statut: str | None = None,
) -> list[Commande]:
    """
    Retourne toutes les commandes.
    """

    query = (
        db.query(Commande)
        .options(
            selectinload(
                Commande.acheteur
            ),

            selectinload(
                Commande.annonce
            ).selectinload(
                Annonce.produit
            ),

            selectinload(
                Commande.annonce
            ).selectinload(
                Annonce.vendeur
            ),
        )
    )

    if statut:

        statut_valeur = valeur_enum(
            statut
        )

        if (
            statut_valeur
            not in STATUTS_VALIDES
        ):

            raise OrderStatusError(
                "Statut invalide."
            )

        query = query.filter(
            Commande.statut
            == statut_valeur
        )

    return (
        query
        .order_by(
            Commande.date_commande.desc(),
            Commande.id.desc(),
        )
        .all()
    )


# ============================================================
# STATISTIQUES COMMANDES
# ============================================================

def statistiques_commandes(
    db: Session,
    acheteur_id: int | None = None,
    vendeur_id: int | None = None,
) -> dict[str, float | int]:
    """
    Calcule les statistiques des commandes.
    """

    base = db.query(
        Commande
    )

    if acheteur_id is not None:

        base = base.filter(
            Commande.acheteur_id
            == acheteur_id
        )

    if vendeur_id is not None:

        base = (
            base.join(
                Annonce,
                Commande.annonce_id
                == Annonce.id,
            )
            .filter(
                Annonce.vendeur_id
                == vendeur_id
            )
        )

    total = (
        base.with_entities(
            func.count(
                Commande.id
            )
        )
        .scalar()
        or 0
    )

    def compter_statut(
        statut: str,
    ) -> int:

        query = db.query(
            func.count(
                Commande.id
            )
        )

        if acheteur_id is not None:

            query = query.filter(
                Commande.acheteur_id
                == acheteur_id
            )

        if vendeur_id is not None:

            query = (
                query.join(
                    Annonce,
                    Commande.annonce_id
                    == Annonce.id,
                )
                .filter(
                    Annonce.vendeur_id
                    == vendeur_id
                )
            )

        return (
            query
            .filter(
                Commande.statut
                == statut
            )
            .scalar()
            or 0
        )

    chiffre_total_query = db.query(
        func.coalesce(
            func.sum(
                Commande.prix_total
            ),
            0,
        )
    )

    if acheteur_id is not None:

        chiffre_total_query = (
            chiffre_total_query.filter(
                Commande.acheteur_id
                == acheteur_id
            )
        )

    if vendeur_id is not None:

        chiffre_total_query = (
            chiffre_total_query
            .join(
                Annonce,
                Commande.annonce_id
                == Annonce.id,
            )
            .filter(
                Annonce.vendeur_id
                == vendeur_id
            )
        )

    chiffre_total = (
        chiffre_total_query
        .scalar()
        or 0
    )

    return {

        "total":
            int(total),

        "en_attente":
            int(
                compter_statut(
                    STATUT_EN_ATTENTE
                )
            ),

        "confirmees":
            int(
                compter_statut(
                    STATUT_CONFIRMEE
                )
            ),

        "preparees":
            int(
                compter_statut(
                    STATUT_PREPAREE
                )
            ),

        "livrees":
            int(
                compter_statut(
                    STATUT_LIVREE
                )
            ),

        "annulees":
            int(
                compter_statut(
                    STATUT_ANNULEE
                )
            ),

        "chiffre_total":
            float(
                chiffre_total
            ),
    }


# ============================================================
# PAGINATION
# ============================================================

def paginer_commandes(
    commandes: list[Commande],
    page: int,
    limit: int,
) -> dict[str, Any]:
    """
    Applique une pagination en mémoire
    sur une liste déjà filtrée.
    """

    if page < 1:

        raise OrderValidationError(
            "La page doit être supérieure "
            "ou égale à 1."
        )

    if limit < 1:

        raise OrderValidationError(
            "La limite doit être supérieure "
            "ou égale à 1."
        )

    total = len(
        commandes
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

        "commandes":
            commandes[
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
# VÉRIFICATION DISPONIBILITÉ AVANT COMMANDE
# ============================================================

def verifier_annonce_avant_commande(
    db: Session,
    annonce_id: int,
) -> dict[str, Any]:
    """
    Retourne un résumé de disponibilité
    avant création d'une commande.
    """

    annonce = (
        obtenir_annonce_commandable(
            db,
            annonce_id,
        )
    )

    return {

        "annonce_id":
            annonce.id,

        "produit_id":
            annonce.produit_id,

        "produit_nom":
            annonce.produit.nom,

        "vendeur_id":
            annonce.vendeur_id,

        "prix_unitaire":
            float(
                annonce.prix
            ),

        "quantite_disponible":
            float(
                annonce.quantite
            ),

        "unite":
            annonce.unite,

        "region":
            annonce.region,

        "province":
            annonce.province,

        "commune":
            annonce.commune,
    }


# ============================================================
# RÉSUMÉ COMMANDE
# ============================================================

def construire_resume_commande(
    commande: Commande,
) -> dict[str, Any]:
    """
    Construit une représentation simple d'une commande.

    Utile pour les routes ou réponses personnalisées.
    """

    annonce = (
        commande.annonce
    )

    produit = (
        annonce.produit
        if annonce is not None
        else None
    )

    vendeur = (
        annonce.vendeur
        if annonce is not None
        else None
    )

    return {

        "id":
            commande.id,

        "acheteur_id":
            commande.acheteur_id,

        "annonce_id":
            commande.annonce_id,

        "quantite":
            float(
                commande.quantite
            ),

        "prix_unitaire":
            float(
                commande.prix_unitaire
            ),

        "prix_total":
            float(
                commande.prix_total
            ),

        "statut":
            commande.statut,

        "date_commande":
            commande.date_commande,

        "annonce":
            (
                {
                    "id":
                        annonce.id,

                    "produit_nom":
                        produit.nom
                        if produit
                        else "Produit",

                    "vendeur_nom":
                        vendeur.nom
                        if vendeur
                        else "Vendeur",

                    "prix_unitaire":
                        float(
                            annonce.prix
                        ),

                    "unite":
                        annonce.unite,

                    "region":
                        annonce.region,
                }
                if annonce is not None
                else None
            ),
    }