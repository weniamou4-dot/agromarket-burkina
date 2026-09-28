from pydantic import BaseModel, ConfigDict


# ============================================================
# STATISTIQUES UTILISATEURS
# ============================================================

class AdminUtilisateursStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total: int = 0
    acheteurs: int = 0
    vendeurs: int = 0
    administrateurs: int = 0
    moderateurs: int = 0


# ============================================================
# STATISTIQUES COMPTES
# ============================================================

class AdminComptesStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    actifs: int = 0
    en_attente: int = 0
    bloques: int = 0
    suspendus: int = 0


# ============================================================
# AUTHENTIFICATION
# ============================================================

class AdminAuthentificationStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total: int = 0
    comptes_locaux: int = 0
    comptes_google: int = 0
    comptes_hybrides: int = 0
    emails_verifies: int = 0
    telephones_verifies: int = 0


# ============================================================
# CATALOGUE
# ============================================================

class AdminCatalogueStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    familles: int = 0
    categories: int = 0
    produits: int = 0
    produits_bruts: int = 0
    produits_transformes: int = 0


# ============================================================
# ANNONCES
# ============================================================

class AdminAnnoncesStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total: int = 0
    publiees: int = 0
    en_attente: int = 0
    refusees: int = 0


# ============================================================
# COMMANDES
# ============================================================

class AdminCommandesStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total: int = 0
    en_attente: int = 0
    confirmees: int = 0
    preparees: int = 0
    livrees: int = 0
    annulees: int = 0
    chiffre_total: float = 0.0


# ============================================================
# DEMANDES VENDEUR
# ============================================================

class AdminDemandesVendeurStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total: int = 0
    en_attente: int = 0
    acceptees: int = 0
    refusees: int = 0


# ============================================================
# NOTIFICATIONS
# ============================================================

class AdminNotificationsStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total: int = 0
    non_lues: int = 0
    lues: int = 0


# ============================================================
# AVIS
# ============================================================

class AdminAvisStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total: int = 0
    visibles: int = 0
    invisibles: int = 0
    achats_verifies: int = 0
    moyenne: float = 0.0


# ============================================================
# MODÉRATION
# ============================================================

class AdminModerationStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_actions: int = 0
    soumissions: int = 0
    approbations: int = 0
    refus: int = 0
    remises_en_moderation: int = 0


# ============================================================
# GÉOLOCALISATION
# ============================================================

class AdminGeolocalisationStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    utilisateurs_localises: int = 0
    utilisateurs_gps: int = 0
    annonces_localisees: int = 0
    annonces_gps: int = 0


# ============================================================
# DASHBOARD COMPLET
# ============================================================

class AdminDashboardStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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