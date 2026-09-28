
# ============================================================
# AGROMARKET BURKINA
# MODELS
# Version professionnelle complète et stabilisée
#
# Fonctionnalités :
# - Utilisateurs
# - Authentification locale / Google
# - Vérification email / téléphone
# - Mot de passe oublié / réinitialisation sécurisée
# - Familles
# - Catégories
# - Produits
# - Secteurs de produits
# - Annonces
# - Géolocalisation utilisateurs / annonces
# - Sécurité de localisation
# - Images
# - Commandes
# - Demandes vendeur
# - Notifications
# - Historique de modération
# - Avis utilisateurs
# - Avis plateforme
# - Messagerie acheteur / vendeur
# - Consentement à la politique de confidentialité
#
# Secteurs :
# - agricole
# - elevage
# - materiel_agricole
# - engrais
# - phytosanitaire
#
# Catalogue :
#
# Produit agricole
#     ├── Brut
#     └── Transformé
#
# Élevage
#     ├── Brut
#     └── Transformé
#
# Matériel agricole
#     └── Aucun type
#
# Engrais
#     └── Aucun type
#
# Produits phytosanitaires
#     └── Aucun type
#
# Localisation annonce :
#
# type_localisation :
#     ├── domicile
#     ├── point_vente
#     └── point_rencontre
#
# visibilite_localisation :
#     ├── privee
#     └── publique
#
# Règle de sécurité :
# - domicile => toujours privee
# - point_vente => privee ou publique
# - point_rencontre => privee ou publique
#
# Messagerie :
# - Conversation acheteur / vendeur
# - Conversation liée à une annonce
# - Messages privés
# - Messages lus / non lus
#
# Confidentialité :
# - Consentement explicite
# - Date d'acceptation
# - Version de la politique acceptée
# ============================================================


from datetime import datetime


from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)

from sqlalchemy.orm import relationship

from database import Base


# ============================================================
# UTILITAIRE DATE
# ============================================================


def utc_now():
    """
    Retourne la date UTC actuelle.

    Le projet utilise actuellement des DateTime sans timezone.
    """

    return datetime.utcnow()


# ============================================================
# FAMILLE
# ============================================================


class Famille(Base):

    __tablename__ = "familles"

    # --------------------------------------------------------
    # IDENTIFIANT
    # --------------------------------------------------------

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # --------------------------------------------------------
    # NOM
    # --------------------------------------------------------

    nom = Column(
        String(100),
        nullable=False,
        unique=True,
        index=True,
    )

    # --------------------------------------------------------
    # DESCRIPTION
    # --------------------------------------------------------

    description = Column(
        Text,
        nullable=True,
    )

    # --------------------------------------------------------
    # CATÉGORIES
    # --------------------------------------------------------

    categories = relationship(
        "Categorie",
        back_populates="famille",
        cascade="all, delete-orphan",
    )

    # --------------------------------------------------------
    # CONTRAINTES
    # --------------------------------------------------------

    __table_args__ = (

        CheckConstraint(
            "length(trim(nom)) >= 2",
            name="ck_famille_nom_min",
        ),

    )


# ============================================================
# CATÉGORIE
# ============================================================


class Categorie(Base):

    __tablename__ = "categories"

    # --------------------------------------------------------
    # IDENTIFIANT
    # --------------------------------------------------------

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # --------------------------------------------------------
    # NOM
    # --------------------------------------------------------

    nom = Column(
        String(100),
        nullable=False,
        index=True,
    )

    # --------------------------------------------------------
    # DESCRIPTION
    # --------------------------------------------------------

    description = Column(
        Text,
        nullable=True,
    )

    # --------------------------------------------------------
    # FAMILLE
    # --------------------------------------------------------

    famille_id = Column(
        Integer,
        ForeignKey(
            "familles.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    famille = relationship(
        "Famille",
        back_populates="categories",
    )

    # --------------------------------------------------------
    # PRODUITS
    # --------------------------------------------------------

    produits = relationship(
        "Produit",
        back_populates="categorie",
        passive_deletes=True,
    )

    # --------------------------------------------------------
    # CONTRAINTES
    # --------------------------------------------------------

    __table_args__ = (

        UniqueConstraint(
            "famille_id",
            "nom",
            name="uq_categorie_famille_nom",
        ),

        CheckConstraint(
            "length(trim(nom)) >= 2",
            name="ck_categorie_nom_min",
        ),

        Index(
            "ix_categories_famille_nom",
            "famille_id",
            "nom",
        ),

    )


# ============================================================
# UTILISATEUR
# ============================================================


class Utilisateur(Base):

    __tablename__ = "utilisateurs"

    # --------------------------------------------------------
    # IDENTIFIANT
    # --------------------------------------------------------

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # --------------------------------------------------------
    # NOM
    # --------------------------------------------------------

    nom = Column(
        String(100),
        nullable=False,
    )

    # --------------------------------------------------------
    # TÉLÉPHONE
    # --------------------------------------------------------

    telephone = Column(
        String(20),
        nullable=True,
        unique=True,
        index=True,
    )

    # --------------------------------------------------------
    # EMAIL
    # --------------------------------------------------------

    email = Column(
        String(150),
        nullable=True,
        unique=True,
        index=True,
    )

    # --------------------------------------------------------
    # VÉRIFICATION EMAIL
    # --------------------------------------------------------

    email_verifie = Column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    # --------------------------------------------------------
    # VÉRIFICATION TÉLÉPHONE
    # --------------------------------------------------------

    telephone_verifie = Column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    # ========================================================
    # GOOGLE
    # ========================================================

    google_id = Column(
        String(255),
        nullable=True,
        unique=True,
        index=True,
    )

    # --------------------------------------------------------
    # MÉTHODE D'AUTHENTIFICATION
    # --------------------------------------------------------

    methode_authentification = Column(
        String(20),
        nullable=False,
        default="local",
        index=True,
    )

    # --------------------------------------------------------
    # PHOTO
    # --------------------------------------------------------

    photo_profil = Column(
        String(500),
        nullable=True,
    )

    # --------------------------------------------------------
    # MOT DE PASSE
    # --------------------------------------------------------

    mot_de_passe_hash = Column(
        String(255),
        nullable=True,
    )

    # ========================================================
    # ADRESSE
    # ========================================================

    adresse = Column(
        String(255),
        nullable=True,
    )

    # --------------------------------------------------------
    # DESCRIPTION
    # --------------------------------------------------------

    description = Column(
        Text,
        nullable=True,
    )

    # ========================================================
    # GÉOLOCALISATION UTILISATEUR
    # ========================================================

    latitude = Column(
        Float,
        nullable=True,
    )

    longitude = Column(
        Float,
        nullable=True,
    )

    localisation_source = Column(
        String(20),
        nullable=False,
        default="inconnue",
    )

    # ========================================================
    # RÔLE
    # ========================================================

    role = Column(
        String(30),
        nullable=False,
        default="acheteur",
        index=True,
    )

    # Valeurs :
    #
    # acheteur
    # vendeur
    # admin
    # administrateur
    # moderateur

    # ========================================================
    # STATUT COMPTE
    # ========================================================

    statut_compte = Column(
        String(30),
        nullable=False,
        default="actif",
        index=True,
    )

    # Valeurs :
    #
    # actif
    # en_attente
    # bloque
    # suspendu

    # ========================================================
    # CONSENTEMENT — CONFIDENTIALITÉ
    # ========================================================
    #
    # Ces champs permettent de conserver la preuve technique
    # du consentement donné par l'utilisateur.
    #
    # confidentialite_acceptee :
    #     indique si l'utilisateur a accepté la politique.
    #
    # date_acceptation_confidentialite :
    #     date et heure de l'acceptation.
    #
    # version_confidentialite :
    #     version exacte de la politique acceptée.
    #
    # Exemple :
    #
    # confidentialite_acceptee = True
    # date_acceptation_confidentialite = 2026-09-13 14:30:00
    # version_confidentialite = "1.0"
    #
    # ========================================================

    confidentialite_acceptee = Column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    date_acceptation_confidentialite = Column(
        DateTime,
        nullable=True,
    )

    version_confidentialite = Column(
        String(20),
        nullable=True,
    )

    # ========================================================
    # DATE DE CRÉATION
    # ========================================================

    date_creation = Column(
        DateTime,
        nullable=False,
        default=utc_now,
        index=True,
    )

    # ========================================================
    # DATE DE MODIFICATION
    # ========================================================

    date_modification = Column(
        DateTime,
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
        index=True,
    )

    # ========================================================
    # DERNIÈRE CONNEXION
    # ========================================================

    dernier_login = Column(
        DateTime,
        nullable=True,
        index=True,
    )

    # ========================================================
    # ANNONCES
    # ========================================================

    annonces = relationship(
        "Annonce",
        back_populates="vendeur",
    )

    # ========================================================
    # DEMANDES VENDEUR
    # ========================================================

    demandes_vendeur = relationship(
        "DemandeVendeur",
        back_populates="utilisateur",
        cascade="all, delete-orphan",
    )

    # ========================================================
    # COMMANDES ACHETEUR
    # ========================================================

    commandes_acheteur = relationship(
        "Commande",
        back_populates="acheteur",
        foreign_keys="Commande.acheteur_id",
        cascade="all, delete-orphan",
    )

    # ========================================================
    # NOTIFICATIONS
    # ========================================================

    notifications = relationship(
        "Notification",
        back_populates="utilisateur",
        foreign_keys="Notification.utilisateur_id",
        cascade="all, delete-orphan",
    )

    # ========================================================
    # AVIS
    # ========================================================

    avis = relationship(
        "Avis",
        back_populates="utilisateur",
        foreign_keys="Avis.utilisateur_id",
        cascade="all, delete-orphan",
    )

    # ========================================================
    # AVIS SUR LA PLATEFORME
    # ========================================================

    avis_plateforme = relationship(
        "AvisPlateforme",
        back_populates="utilisateur",
        foreign_keys="AvisPlateforme.utilisateur_id",
        cascade="all, delete-orphan",
    )

    # ========================================================
    # HISTORIQUE DE MODÉRATION
    # ========================================================

    historiques_moderation = relationship(
        "HistoriqueModeration",
        back_populates="acteur",
        foreign_keys="HistoriqueModeration.acteur_id",
    )

    # ========================================================
    # TOKENS DE RÉINITIALISATION DU MOT DE PASSE
    # ========================================================

    password_reset_tokens = relationship(
        "PasswordResetToken",
        back_populates="utilisateur",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    # ========================================================
    # MESSAGERIE — VENDEUR
    # ========================================================

    conversations_vendeur = relationship(
        "Conversation",
        foreign_keys="Conversation.vendeur_id",
        back_populates="vendeur",
        cascade="all, delete-orphan",
    )

    # ========================================================
    # MESSAGERIE — ACHETEUR
    # ========================================================

    conversations_acheteur = relationship(
        "Conversation",
        foreign_keys="Conversation.acheteur_id",
        back_populates="acheteur",
        cascade="all, delete-orphan",
    )

    # ========================================================
    # MESSAGERIE — MESSAGES ENVOYÉS
    # ========================================================

    messages_envoyes = relationship(
        "Message",
        foreign_keys="Message.expediteur_id",
        back_populates="expediteur",
        cascade="all, delete-orphan",
    )

    # --------------------------------------------------------
    # CONTRAINTES
    # --------------------------------------------------------

    __table_args__ = (

        CheckConstraint(
            """
            role IN (
                'acheteur',
                'vendeur',
                'admin',
                'administrateur',
                'moderateur'
            )
            """,
            name="ck_utilisateur_role",
        ),

        CheckConstraint(
            """
            statut_compte IN (
                'actif',
                'en_attente',
                'bloque',
                'suspendu'
            )
            """,
            name="ck_utilisateur_statut",
        ),

        CheckConstraint(
            """
            methode_authentification IN (
                'local',
                'google',
                'hybride'
            )
            """,
            name="ck_utilisateur_auth_method",
        ),

        CheckConstraint(
            """
            latitude IS NULL
            OR (
                latitude >= -90
                AND latitude <= 90
            )
            """,
            name="ck_utilisateur_latitude",
        ),

        CheckConstraint(
            """
            longitude IS NULL
            OR (
                longitude >= -180
                AND longitude <= 180
            )
            """,
            name="ck_utilisateur_longitude",
        ),

        CheckConstraint(
            """
            localisation_source IN (
                'gps',
                'manuelle',
                'inconnue'
            )
            """,
            name="ck_utilisateur_localisation_source",
        ),

        Index(
            "ix_utilisateurs_role_statut",
            "role",
            "statut_compte",
        ),

        Index(
            "ix_utilisateurs_auth_method",
            "methode_authentification",
        ),

        Index(
            "ix_utilisateurs_verification",
            "email_verifie",
            "telephone_verifie",
        ),

    )


# ============================================================
# TOKEN DE RÉINITIALISATION DU MOT DE PASSE
# ============================================================


class PasswordResetToken(Base):

    __tablename__ = "password_reset_tokens"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    utilisateur_id = Column(
        Integer,
        ForeignKey(
            "utilisateurs.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    token_hash = Column(
        String(128),
        nullable=False,
        unique=True,
        index=True,
    )

    expires_at = Column(
        DateTime,
        nullable=False,
        index=True,
    )

    used_at = Column(
        DateTime,
        nullable=True,
        index=True,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=utc_now,
        index=True,
    )

    utilisateur = relationship(
        "Utilisateur",
        back_populates="password_reset_tokens",
    )

    __table_args__ = (

        Index(
            "ix_password_reset_user_expiration",
            "utilisateur_id",
            "expires_at",
        ),

        Index(
            "ix_password_reset_user_used",
            "utilisateur_id",
            "used_at",
        ),

        Index(
            "ix_password_reset_expiration_used",
            "expires_at",
            "used_at",
        ),

    )


# ============================================================
# PRODUIT
# ============================================================


class Produit(Base):

    __tablename__ = "produits"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    nom = Column(
        String(150),
        nullable=False,
        index=True,
    )

    description = Column(
        Text,
        nullable=True,
    )

    categorie_id = Column(
        Integer,
        ForeignKey(
            "categories.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    categorie = relationship(
        "Categorie",
        back_populates="produits",
    )

    secteur = Column(
        String(40),
        nullable=False,
        default="agricole",
        index=True,
    )

    type_produit = Column(
        String(30),
        nullable=True,
        default=None,
        index=True,
    )

    est_valide = Column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    @property
    def statut_produit(self):

        return (
            "valide"
            if self.est_valide
            else "en_attente"
        )

    annonces = relationship(
        "Annonce",
        back_populates="produit",
    )

    __table_args__ = (

        CheckConstraint(
            "length(trim(nom)) >= 2",
            name="ck_produit_nom_min",
        ),

        CheckConstraint(
            """
            secteur IN (
                'agricole',
                'elevage',
                'materiel_agricole',
                'engrais',
                'phytosanitaire'
            )
            """,
            name="ck_produit_secteur",
        ),

        CheckConstraint(
            """
            (
                secteur IN (
                    'agricole',
                    'elevage'
                )
                AND type_produit IN (
                    'brut',
                    'transforme'
                )
            )
            OR
            (
                secteur IN (
                    'materiel_agricole',
                    'engrais',
                    'phytosanitaire'
                )
                AND type_produit IS NULL
            )
            """,
            name="ck_produit_secteur_type",
        ),

        Index(
            "ix_produits_categorie_secteur",
            "categorie_id",
            "secteur",
        ),

        Index(
            "ix_produits_secteur_type",
            "secteur",
            "type_produit",
        ),

        Index(
            "ix_produits_valide_type",
            "est_valide",
            "type_produit",
        ),

    )


# ============================================================
# ANNONCE
# ============================================================


class Annonce(Base):

    __tablename__ = "annonces"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ========================================================
    # PRODUIT
    # ========================================================

    produit_id = Column(
        Integer,
        ForeignKey(
            "produits.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    produit = relationship(
        "Produit",
        back_populates="annonces",
    )

    # ========================================================
    # VENDEUR
    # ========================================================

    vendeur_id = Column(
        Integer,
        ForeignKey(
            "utilisateurs.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    vendeur = relationship(
        "Utilisateur",
        back_populates="annonces",
    )

    # ========================================================
    # PRIX
    # ========================================================

    prix = Column(
        Float,
        nullable=False,
    )

    # ========================================================
    # QUANTITÉ
    # ========================================================

    quantite = Column(
        Float,
        nullable=False,
    )

    # ========================================================
    # UNITÉ
    # ========================================================

    unite = Column(
        String(30),
        nullable=False,
    )

    # ========================================================
    # LOCALISATION ADMINISTRATIVE
    # ========================================================

    region = Column(
        String(100),
        nullable=False,
        index=True,
    )

    province = Column(
        String(100),
        nullable=True,
        index=True,
    )

    commune = Column(
        String(100),
        nullable=True,
        index=True,
    )

    # ========================================================
    # GÉOLOCALISATION GPS
    # ========================================================

    latitude = Column(
        Float,
        nullable=True,
        index=True,
    )

    longitude = Column(
        Float,
        nullable=True,
        index=True,
    )

    localisation_source = Column(
        String(20),
        nullable=False,
        default="inconnue",
        index=True,
    )

    # ========================================================
    # TYPE DE LOCALISATION
    # ========================================================

    type_localisation = Column(
        String(30),
        nullable=False,
        default="domicile",
        index=True,
    )

    # ========================================================
    # VISIBILITÉ DE LA LOCALISATION
    # ========================================================

    visibilite_localisation = Column(
        String(20),
        nullable=False,
        default="privee",
        index=True,
    )

    # ========================================================
    # STATUT
    # ========================================================

    statut = Column(
        String(30),
        nullable=False,
        default="en_attente",
        index=True,
    )

    # ========================================================
    # DATE
    # ========================================================

    date_publication = Column(
        DateTime,
        nullable=False,
        default=utc_now,
        index=True,
    )

    # ========================================================
    # IMAGES
    # ========================================================

    images = relationship(
        "ImageAnnonce",
        back_populates="annonce",
        cascade="all, delete-orphan",
    )

    # ========================================================
    # COMMANDES
    # ========================================================

    commandes = relationship(
        "Commande",
        back_populates="annonce",
    )

    # ========================================================
    # HISTORIQUE
    # ========================================================

    historiques_moderation = relationship(
        "HistoriqueModeration",
        back_populates="annonce",
        cascade="all, delete-orphan",
    )

    # ========================================================
    # AVIS
    # ========================================================

    avis = relationship(
        "Avis",
        back_populates="annonce",
        cascade="all, delete-orphan",
    )

    # ========================================================
    # MESSAGERIE
    # ========================================================

    conversations = relationship(
        "Conversation",
        back_populates="annonce",
        cascade="all, delete-orphan",
    )

    # --------------------------------------------------------
    # CONTRAINTES
    # --------------------------------------------------------

    __table_args__ = (

        CheckConstraint(
            "prix > 0",
            name="ck_annonce_prix_positif",
        ),

        CheckConstraint(
            "quantite > 0",
            name="ck_annonce_quantite_non_negative",
        ),

        CheckConstraint(
            "length(trim(unite)) >= 1",
            name="ck_annonce_unite_min",
        ),

        CheckConstraint(
            "length(trim(region)) >= 2",
            name="ck_annonce_region_min",
        ),

        CheckConstraint(
            """
            statut IN (
                'en_attente',
                'publiee',
                'refusee'
            )
            """,
            name="ck_annonce_statut",
        ),

        CheckConstraint(
            """
            latitude IS NULL
            OR (
                latitude >= -90
                AND latitude <= 90
            )
            """,
            name="ck_annonce_latitude",
        ),

        CheckConstraint(
            """
            longitude IS NULL
            OR (
                longitude >= -180
                AND longitude <= 180
            )
            """,
            name="ck_annonce_longitude",
        ),

        CheckConstraint(
            """
            localisation_source IN (
                'gps',
                'manuelle',
                'inconnue'
            )
            """,
            name="ck_annonce_localisation_source",
        ),

        CheckConstraint(
            """
            type_localisation IN (
                'domicile',
                'point_vente',
                'point_rencontre'
            )
            """,
            name="ck_annonce_type_localisation",
        ),

        CheckConstraint(
            """
            visibilite_localisation IN (
                'privee',
                'publique'
            )
            """,
            name="ck_annonce_visibilite_localisation",
        ),

        CheckConstraint(
            """
            type_localisation <> 'domicile'
            OR visibilite_localisation = 'privee'
            """,
            name="ck_annonce_domicile_prive",
        ),

        CheckConstraint(
            """
            (
                latitude IS NULL
                AND longitude IS NULL
            )
            OR
            (
                latitude IS NOT NULL
                AND longitude IS NOT NULL
            )
            """,
            name="ck_annonce_coordonnees_complete",
        ),

        Index(
            "ix_annonces_statut_date",
            "statut",
            "date_publication",
        ),

        Index(
            "ix_annonces_region_statut",
            "region",
            "statut",
        ),

        Index(
            "ix_annonces_vendeur_statut",
            "vendeur_id",
            "statut",
        ),

        Index(
            "ix_annonces_geolocalisation",
            "latitude",
            "longitude",
        ),

        Index(
            "ix_annonces_type_localisation",
            "type_localisation",
        ),

        Index(
            "ix_annonces_visibilite_localisation",
            "visibilite_localisation",
        ),

        Index(
            "ix_annonces_localisation_statut",
            "type_localisation",
            "visibilite_localisation",
            "statut",
        ),

    )


# ============================================================
# IMAGE D'UNE ANNONCE
# ============================================================


class ImageAnnonce(Base):

    __tablename__ = "images_annonces"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    annonce_id = Column(
        Integer,
        ForeignKey(
            "annonces.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    url = Column(
        String(500),
        nullable=False,
    )

    date_creation = Column(
        DateTime,
        nullable=False,
        default=utc_now,
        index=True,
    )

    annonce = relationship(
        "Annonce",
        back_populates="images",
    )


# ============================================================
# COMMANDE
# ============================================================


class Commande(Base):

    __tablename__ = "commandes"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ========================================================
    # ACHETEUR
    # ========================================================

    acheteur_id = Column(
        Integer,
        ForeignKey(
            "utilisateurs.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    acheteur = relationship(
        "Utilisateur",
        back_populates="commandes_acheteur",
        foreign_keys=[acheteur_id],
    )

    # ========================================================
    # ANNONCE
    # ========================================================

    annonce_id = Column(
        Integer,
        ForeignKey(
            "annonces.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    annonce = relationship(
        "Annonce",
        back_populates="commandes",
    )

    # ========================================================
    # QUANTITÉ
    # ========================================================

    quantite = Column(
        Float,
        nullable=False,
    )

    # ========================================================
    # PRIX UNITAIRE
    # ========================================================

    prix_unitaire = Column(
        Float,
        nullable=False,
    )

    # ========================================================
    # PRIX TOTAL
    # ========================================================

    prix_total = Column(
        Float,
        nullable=False,
    )

    # ========================================================
    # STATUT
    # ========================================================

    statut = Column(
        String(30),
        nullable=False,
        default="en_attente",
        index=True,
    )

    # ========================================================
    # DATE
    # ========================================================

    date_commande = Column(
        DateTime,
        nullable=False,
        default=utc_now,
        index=True,
    )

    # ========================================================
    # AVIS
    # ========================================================

    avis = relationship(
        "Avis",
        back_populates="commande",
        uselist=False,
    )

    __table_args__ = (

        CheckConstraint(
            "quantite > 0",
            name="ck_commande_quantite_positive",
        ),

        CheckConstraint(
            "prix_unitaire > 0",
            name="ck_commande_prix_unitaire_positif",
        ),

        CheckConstraint(
            "prix_total > 0",
            name="ck_commande_prix_total_positif",
        ),

        CheckConstraint(
            """
            statut IN (
                'en_attente',
                'confirmee',
                'preparee',
                'livree',
                'annulee'
            )
            """,
            name="ck_commande_statut",
        ),

        Index(
            "ix_commandes_acheteur_statut",
            "acheteur_id",
            "statut",
        ),

        Index(
            "ix_commandes_annonce_statut",
            "annonce_id",
            "statut",
        ),

        Index(
            "ix_commandes_statut_date",
            "statut",
            "date_commande",
        ),

    )


# ============================================================
# DEMANDE VENDEUR
# ============================================================


class DemandeVendeur(Base):

    __tablename__ = "demandes_vendeur"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    utilisateur_id = Column(
        Integer,
        ForeignKey(
            "utilisateurs.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    utilisateur = relationship(
        "Utilisateur",
        back_populates="demandes_vendeur",
    )

    statut = Column(
        String(30),
        nullable=False,
        default="en_attente",
        index=True,
    )

    motif = Column(
        Text,
        nullable=True,
    )

    date_demande = Column(
        DateTime,
        nullable=False,
        default=utc_now,
        index=True,
    )

    date_traitement = Column(
        DateTime,
        nullable=True,
    )

    __table_args__ = (

        CheckConstraint(
            """
            statut IN (
                'en_attente',
                'acceptee',
                'refusee'
            )
            """,
            name="ck_demande_vendeur_statut",
        ),

        Index(
            "ix_demandes_vendeur_statut_date",
            "statut",
            "date_demande",
        ),

        Index(
            "ix_demandes_vendeur_utilisateur_statut",
            "utilisateur_id",
            "statut",
        ),

    )


# ============================================================
# NOTIFICATION
# ============================================================


class Notification(Base):

    __tablename__ = "notifications"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    utilisateur_id = Column(
        Integer,
        ForeignKey(
            "utilisateurs.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    utilisateur = relationship(
        "Utilisateur",
        back_populates="notifications",
        foreign_keys=[utilisateur_id],
    )

    type = Column(
        String(50),
        nullable=False,
        index=True,
    )

    titre = Column(
        String(200),
        nullable=False,
    )

    message = Column(
        Text,
        nullable=False,
    )

    est_lue = Column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    date_lecture = Column(
        DateTime,
        nullable=True,
    )

    lien = Column(
        String(500),
        nullable=True,
    )

    reference_id = Column(
        Integer,
        nullable=True,
        index=True,
    )

    date_creation = Column(
        DateTime,
        nullable=False,
        default=utc_now,
        index=True,
    )

    __table_args__ = (

        CheckConstraint(
            """
            type IN (
                'annonce_soumise',
                'annonce_approuvee',
                'annonce_refusee',
                'annonce_remise_en_moderation',
                'demande_vendeur',
                'demande_vendeur_acceptee',
                'demande_vendeur_refusee',
                'commande_nouvelle',
                'commande_confirmee',
                'commande_preparee',
                'commande_livree',
                'commande_annulee',
                'compte_bloque',
                'compte_suspendu',
                'compte_reactive',
                'systeme'
            )
            """,
            name="ck_notification_type",
        ),

        Index(
            "ix_notifications_utilisateur_lue",
            "utilisateur_id",
            "est_lue",
        ),

        Index(
            "ix_notifications_utilisateur_date",
            "utilisateur_id",
            "date_creation",
        ),

        Index(
            "ix_notifications_type_date",
            "type",
            "date_creation",
        ),

    )


# ============================================================
# HISTORIQUE DE MODÉRATION
# ============================================================


class HistoriqueModeration(Base):

    __tablename__ = "historiques_moderation"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    annonce_id = Column(
        Integer,
        ForeignKey(
            "annonces.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    annonce = relationship(
        "Annonce",
        back_populates="historiques_moderation",
    )

    acteur_id = Column(
        Integer,
        ForeignKey(
            "utilisateurs.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    acteur = relationship(
        "Utilisateur",
        back_populates="historiques_moderation",
        foreign_keys=[acteur_id],
    )

    action = Column(
        String(50),
        nullable=False,
        index=True,
    )

    ancien_statut = Column(
        String(30),
        nullable=True,
    )

    nouveau_statut = Column(
        String(30),
        nullable=True,
    )

    motif = Column(
        Text,
        nullable=True,
    )

    date_action = Column(
        DateTime,
        nullable=False,
        default=utc_now,
        index=True,
    )

    __table_args__ = (

        CheckConstraint(
            """
            action IN (
                'soumise',
                'approuvee',
                'refusee',
                'remise_en_moderation'
            )
            """,
            name="ck_historique_moderation_action",
        ),

        Index(
            "ix_historiques_moderation_annonce_date",
            "annonce_id",
            "date_action",
        ),

        Index(
            "ix_historiques_moderation_acteur_date",
            "acteur_id",
            "date_action",
        ),

        Index(
            "ix_historiques_moderation_action",
            "action",
        ),

    )


# ============================================================
# AVIS UTILISATEUR
# ============================================================


class Avis(Base):

    __tablename__ = "avis"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    utilisateur_id = Column(
        Integer,
        ForeignKey(
            "utilisateurs.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    utilisateur = relationship(
        "Utilisateur",
        back_populates="avis",
        foreign_keys=[utilisateur_id],
    )

    annonce_id = Column(
        Integer,
        ForeignKey(
            "annonces.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    annonce = relationship(
        "Annonce",
        back_populates="avis",
    )

    commande_id = Column(
        Integer,
        ForeignKey(
            "commandes.id",
            ondelete="RESTRICT",
        ),
        nullable=True,
        unique=True,
        index=True,
    )

    commande = relationship(
        "Commande",
        back_populates="avis",
    )

    note = Column(
        Integer,
        nullable=False,
    )

    commentaire = Column(
        Text,
        nullable=True,
    )

    est_visible = Column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )

    date_creation = Column(
        DateTime,
        nullable=False,
        default=utc_now,
        index=True,
    )

    date_modification = Column(
        DateTime,
        nullable=True,
    )

    __table_args__ = (

        CheckConstraint(
            "note >= 1 AND note <= 5",
            name="ck_avis_note",
        ),

        UniqueConstraint(
            "utilisateur_id",
            "annonce_id",
            name="uq_avis_utilisateur_annonce",
        ),

        Index(
            "ix_avis_annonce_visible",
            "annonce_id",
            "est_visible",
        ),

        Index(
            "ix_avis_utilisateur_date",
            "utilisateur_id",
            "date_creation",
        ),

    )


# ============================================================
# CONVERSATION
# ============================================================


class Conversation(Base):

    __tablename__ = "conversations"

    # --------------------------------------------------------
    # IDENTIFIANT
    # --------------------------------------------------------

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # --------------------------------------------------------
    # ANNONCE
    # --------------------------------------------------------

    annonce_id = Column(
        Integer,
        ForeignKey(
            "annonces.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    # --------------------------------------------------------
    # VENDEUR
    # --------------------------------------------------------

    vendeur_id = Column(
        Integer,
        ForeignKey(
            "utilisateurs.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # --------------------------------------------------------
    # ACHETEUR
    # --------------------------------------------------------

    acheteur_id = Column(
        Integer,
        ForeignKey(
            "utilisateurs.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # --------------------------------------------------------
    # DATE DE CRÉATION
    # --------------------------------------------------------

    date_creation = Column(
        DateTime,
        nullable=False,
        default=utc_now,
        index=True,
    )

    # --------------------------------------------------------
    # DATE DE MODIFICATION
    # --------------------------------------------------------

    date_modification = Column(
        DateTime,
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

    # --------------------------------------------------------
    # DERNIÈRE ACTIVITÉ
    # --------------------------------------------------------

    derniere_activite = Column(
        DateTime,
        nullable=False,
        default=utc_now,
        index=True,
    )

    # --------------------------------------------------------
    # STATUT
    # --------------------------------------------------------

    est_active = Column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )

    # ========================================================
    # RELATION ANNONCE
    # ========================================================

    annonce = relationship(
        "Annonce",
        back_populates="conversations",
    )

    # ========================================================
    # RELATION VENDEUR
    # ========================================================

    vendeur = relationship(
        "Utilisateur",
        foreign_keys=[vendeur_id],
        back_populates="conversations_vendeur",
    )

    # ========================================================
    # RELATION ACHETEUR
    # ========================================================

    acheteur = relationship(
        "Utilisateur",
        foreign_keys=[acheteur_id],
        back_populates="conversations_acheteur",
    )

    # ========================================================
    # MESSAGES
    # ========================================================

    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.date_creation",
    )

    # --------------------------------------------------------
    # CONTRAINTES / INDEX
    # --------------------------------------------------------

    __table_args__ = (

        UniqueConstraint(
            "annonce_id",
            "vendeur_id",
            "acheteur_id",
            name="uq_conversation_annonce_vendeur_acheteur",
        ),

        Index(
            "ix_conversations_vendeur_acheteur",
            "vendeur_id",
            "acheteur_id",
        ),

        Index(
            "ix_conversations_derniere_activite",
            "derniere_activite",
        ),

        Index(
            "ix_conversations_annonce",
            "annonce_id",
        ),

    )


# ============================================================
# MESSAGE
# ============================================================


class Message(Base):

    __tablename__ = "messages"

    # --------------------------------------------------------
    # IDENTIFIANT
    # --------------------------------------------------------

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # --------------------------------------------------------
    # CONVERSATION
    # --------------------------------------------------------

    conversation_id = Column(
        Integer,
        ForeignKey(
            "conversations.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # --------------------------------------------------------
    # EXPÉDITEUR
    # --------------------------------------------------------

    expediteur_id = Column(
        Integer,
        ForeignKey(
            "utilisateurs.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    # --------------------------------------------------------
    # CONTENU
    # --------------------------------------------------------

    contenu = Column(
        Text,
        nullable=False,
    )

    # --------------------------------------------------------
    # LECTURE
    # --------------------------------------------------------

    est_lu = Column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    # --------------------------------------------------------
    # DATE DE LECTURE
    # --------------------------------------------------------

    date_lecture = Column(
        DateTime,
        nullable=True,
    )

    # --------------------------------------------------------
    # DATE DE CRÉATION
    # --------------------------------------------------------

    date_creation = Column(
        DateTime,
        nullable=False,
        default=utc_now,
        index=True,
    )

    # ========================================================
    # RELATION CONVERSATION
    # ========================================================

    conversation = relationship(
        "Conversation",
        back_populates="messages",
    )

    # ========================================================
    # RELATION EXPÉDITEUR
    # ========================================================

    expediteur = relationship(
        "Utilisateur",
        foreign_keys=[expediteur_id],
        back_populates="messages_envoyes",
    )

    # --------------------------------------------------------
    # CONTRAINTES / INDEX
    # --------------------------------------------------------

    __table_args__ = (

        CheckConstraint(
            "length(trim(contenu)) >= 1",
            name="ck_message_contenu_min",
        ),

        Index(
            "ix_messages_conversation_date",
            "conversation_id",
            "date_creation",
        ),

        Index(
            "ix_messages_expediteur_date",
            "expediteur_id",
            "date_creation",
        ),

        Index(
            "ix_messages_conversation_lu",
            "conversation_id",
            "est_lu",
        ),

    )
