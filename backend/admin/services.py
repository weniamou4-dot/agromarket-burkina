from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

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

from admin.schemas import (
    AdminAnnoncesStats,
    AdminAuthentificationStats,
    AdminAvisStats,
    AdminCatalogueStats,
    AdminComptesStats,
    AdminCommandesStats,
    AdminDashboardStats,
    AdminDemandesVendeurStats,
    AdminGeolocalisationStats,
    AdminModerationStats,
    AdminNotificationsStats,
    AdminUtilisateursStats,
)


# ============================================================
# OUTIL COMPTEUR
# ============================================================

def compter(
    db: Session,
    modele,
    *conditions,
) -> int:
    """
    Compte les lignes correspondant aux conditions fournies.
    """

    query = db.query(
        func.count(modele.id)
    )

    if conditions:
        query = query.filter(*conditions)

    return int(
        query.scalar() or 0
    )


# ============================================================
# STATISTIQUES UTILISATEURS
# ============================================================

def statistiques_utilisateurs(
    db: Session,
) -> AdminUtilisateursStats:

    total = compter(
        db,
        Utilisateur,
    )

    acheteurs = compter(
        db,
        Utilisateur,
        Utilisateur.role == "acheteur",
    )

    vendeurs = compter(
        db,
        Utilisateur,
        Utilisateur.role == "vendeur",
    )

    administrateurs = compter(
        db,
        Utilisateur,
        Utilisateur.role.in_(
            [
                "admin",
                "administrateur",
            ]
        ),
    )

    moderateurs = compter(
        db,
        Utilisateur,
        Utilisateur.role == "moderateur",
    )

    return AdminUtilisateursStats(
        total=total,
        acheteurs=acheteurs,
        vendeurs=vendeurs,
        administrateurs=administrateurs,
        moderateurs=moderateurs,
    )


# ============================================================
# STATISTIQUES COMPTES
# ============================================================

def statistiques_comptes(
    db: Session,
) -> AdminComptesStats:

    return AdminComptesStats(
        actifs=compter(
            db,
            Utilisateur,
            Utilisateur.statut_compte == "actif",
        ),
        en_attente=compter(
            db,
            Utilisateur,
            Utilisateur.statut_compte == "en_attente",
        ),
        bloques=compter(
            db,
            Utilisateur,
            Utilisateur.statut_compte == "bloque",
        ),
        suspendus=compter(
            db,
            Utilisateur,
            Utilisateur.statut_compte == "suspendu",
        ),
    )


# ============================================================
# STATISTIQUES AUTHENTIFICATION
# ============================================================

def statistiques_authentification(
    db: Session,
) -> AdminAuthentificationStats:

    total = compter(
        db,
        Utilisateur,
    )

    locaux = compter(
        db,
        Utilisateur,
        Utilisateur.methode_authentification == "local",
    )

    google = compter(
        db,
        Utilisateur,
        Utilisateur.methode_authentification == "google",
    )

    hybrides = compter(
        db,
        Utilisateur,
        Utilisateur.methode_authentification == "hybride",
    )

    return AdminAuthentificationStats(
        total=total,
        comptes_locaux=locaux,
        comptes_google=google,
        comptes_hybrides=hybrides,
        emails_verifies=0,
        telephones_verifies=0,
    )


# ============================================================
# STATISTIQUES CATALOGUE
# ============================================================

def statistiques_catalogue(
    db: Session,
) -> AdminCatalogueStats:

    produits_bruts = compter(
        db,
        Produit,
        Produit.type_produit == "brut",
    )

    produits_transformes = compter(
        db,
        Produit,
        Produit.type_produit == "transforme",
    )

    return AdminCatalogueStats(
        familles=compter(
            db,
            Famille,
        ),
        categories=compter(
            db,
            Categorie,
        ),
        produits=compter(
            db,
            Produit,
        ),
        produits_bruts=produits_bruts,
        produits_transformes=produits_transformes,
    )


# ============================================================
# STATISTIQUES ANNONCES
# ============================================================

def statistiques_annonces(
    db: Session,
) -> AdminAnnoncesStats:

    return AdminAnnoncesStats(
        total=compter(
            db,
            Annonce,
        ),
        publiees=compter(
            db,
            Annonce,
            Annonce.statut == "publiee",
        ),
        en_attente=compter(
            db,
            Annonce,
            Annonce.statut == "en_attente",
        ),
        refusees=compter(
            db,
            Annonce,
            Annonce.statut == "refusee",
        ),
    )


# ============================================================
# STATISTIQUES COMMANDES
# ============================================================

def statistiques_commandes(
    db: Session,
) -> AdminCommandesStats:

    chiffre_total = (
        db.query(
            func.coalesce(
                func.sum(Commande.prix_total),
                0,
            )
        )
        .scalar()
        or 0
    )

    return AdminCommandesStats(
        total=compter(
            db,
            Commande,
        ),
        en_attente=compter(
            db,
            Commande,
            Commande.statut == "en_attente",
        ),
        confirmees=compter(
            db,
            Commande,
            Commande.statut == "confirmee",
        ),
        preparees=compter(
            db,
            Commande,
            Commande.statut == "preparee",
        ),
        livrees=compter(
            db,
            Commande,
            Commande.statut == "livree",
        ),
        annulees=compter(
            db,
            Commande,
            Commande.statut == "annulee",
        ),
        chiffre_total=float(
            chiffre_total
        ),
    )


# ============================================================
# STATISTIQUES DEMANDES VENDEUR
# ============================================================

def statistiques_demandes_vendeur(
    db: Session,
) -> AdminDemandesVendeurStats:

    return AdminDemandesVendeurStats(
        total=compter(
            db,
            DemandeVendeur,
        ),
        en_attente=compter(
            db,
            DemandeVendeur,
            DemandeVendeur.statut == "en_attente",
        ),
        acceptees=compter(
            db,
            DemandeVendeur,
            DemandeVendeur.statut == "acceptee",
        ),
        refusees=compter(
            db,
            DemandeVendeur,
            DemandeVendeur.statut == "refusee",
        ),
    )


# ============================================================
# STATISTIQUES NOTIFICATIONS
# ============================================================

def statistiques_notifications(
    db: Session,
) -> AdminNotificationsStats:

    total = compter(
        db,
        Notification,
    )

    non_lues = compter(
        db,
        Notification,
        Notification.est_lue.is_(False),
    )

    lues = compter(
        db,
        Notification,
        Notification.est_lue.is_(True),
    )

    return AdminNotificationsStats(
        total=total,
        non_lues=non_lues,
        lues=lues,
    )


# ============================================================
# STATISTIQUES AVIS
# ============================================================

def statistiques_avis(
    db: Session,
) -> AdminAvisStats:

    total = compter(
        db,
        Avis,
    )

    visibles = compter(
        db,
        Avis,
        Avis.est_visible.is_(True),
    )

    invisibles = compter(
        db,
        Avis,
        Avis.est_visible.is_(False),
    )

    moyenne = (
        db.query(
            func.coalesce(
                func.avg(Avis.note),
                0,
            )
        )
        .scalar()
        or 0
    )

    return AdminAvisStats(
        total=total,
        visibles=visibles,
        invisibles=invisibles,
        achats_verifies=0,
        moyenne=round(
            float(moyenne),
            2,
        ),
    )


# ============================================================
# STATISTIQUES MODÉRATION
# ============================================================

def statistiques_moderation(
    db: Session,
) -> AdminModerationStats:

    return AdminModerationStats(
        total_actions=compter(
            db,
            HistoriqueModeration,
        ),
        soumissions=compter(
            db,
            HistoriqueModeration,
            HistoriqueModeration.action == "soumise",
        ),
        approbations=compter(
            db,
            HistoriqueModeration,
            HistoriqueModeration.action == "approuvee",
        ),
        refus=compter(
            db,
            HistoriqueModeration,
            HistoriqueModeration.action == "refusee",
        ),
        remises_en_moderation=compter(
            db,
            HistoriqueModeration,
            HistoriqueModeration.action
            == "remise_en_moderation",
        ),
    )


# ============================================================
# STATISTIQUES GÉOLOCALISATION
# ============================================================

def statistiques_geolocalisation(
    db: Session,
) -> AdminGeolocalisationStats:

    utilisateurs_localises = (
        db.query(
            func.count(Utilisateur.id)
        )
        .filter(
            Utilisateur.latitude.isnot(None),
            Utilisateur.longitude.isnot(None),
        )
        .scalar()
        or 0
    )

    utilisateurs_gps = compter(
        db,
        Utilisateur,
        Utilisateur.localisation_source == "gps",
    )

    annonces_localisees = (
        db.query(
            func.count(Annonce.id)
        )
        .filter(
            Annonce.latitude.isnot(None),
            Annonce.longitude.isnot(None),
        )
        .scalar()
        or 0
    )

    annonces_gps = compter(
        db,
        Annonce,
        Annonce.localisation_source == "gps",
    )

    return AdminGeolocalisationStats(
        utilisateurs_localises=int(
            utilisateurs_localises
        ),
        utilisateurs_gps=int(
            utilisateurs_gps
        ),
        annonces_localisees=int(
            annonces_localisees
        ),
        annonces_gps=int(
            annonces_gps
        ),
    )


# ============================================================
# DASHBOARD ADMINISTRATEUR
# ============================================================

def obtenir_dashboard_admin(
    db: Session,
) -> AdminDashboardStats:
    """
    Construit l'ensemble des statistiques
    du tableau de bord administrateur.
    """

    return AdminDashboardStats(
        utilisateurs=statistiques_utilisateurs(
            db
        ),
        comptes=statistiques_comptes(
            db
        ),
        authentification=statistiques_authentification(
            db
        ),
        catalogue=statistiques_catalogue(
            db
        ),
        annonces=statistiques_annonces(
            db
        ),
        commandes=statistiques_commandes(
            db
        ),
        demandes_vendeur=statistiques_demandes_vendeur(
            db
        ),
        notifications=statistiques_notifications(
            db
        ),
        avis=statistiques_avis(
            db
        ),
        moderation=statistiques_moderation(
            db
        ),
        geolocalisation=statistiques_geolocalisation(
            db
        ),
    )