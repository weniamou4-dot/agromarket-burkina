"""
stabilisation models google geolocalisation notifications avis historique

Revision ID: 91cdef44d8a1
Revises: 10105f54ddb3
Create Date: 2026-09-03 19:11:12.126506
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# ============================================================
# REVISION IDENTIFIERS
# ============================================================

revision: str = "91cdef44d8a1"

down_revision: Union[
    str,
    Sequence[str],
    None,
] = "10105f54ddb3"

branch_labels: Union[
    str,
    Sequence[str],
    None,
] = None

depends_on: Union[
    str,
    Sequence[str],
    None,
] = None


# ============================================================
# UPGRADE
# ============================================================

def upgrade() -> None:
    """
    Application de la migration :

    - géolocalisation des annonces ;
    - géolocalisation des utilisateurs ;
    - authentification Google/local ;
    - contraintes métier ;
    - index supplémentaires ;
    - sécurisation des anciennes données.
    """

    # ========================================================
    # ANNONCES
    # ========================================================

    op.add_column(
        "annonces",
        sa.Column(
            "latitude",
            sa.Float(),
            nullable=True,
        ),
    )

    op.add_column(
        "annonces",
        sa.Column(
            "longitude",
            sa.Float(),
            nullable=True,
        ),
    )

    # Anciennes annonces :
    # localisation inconnue par défaut.
    op.add_column(
        "annonces",
        sa.Column(
            "localisation_source",
            sa.String(length=20),
            nullable=False,
            server_default="inconnue",
        ),
    )

    # --------------------------------------------------------
    # ANCIENNES DATES NULL
    # --------------------------------------------------------

    op.execute(
        """
        UPDATE annonces
        SET date_publication = CURRENT_TIMESTAMP
        WHERE date_publication IS NULL
        """
    )

    # --------------------------------------------------------
    # DATE
    # --------------------------------------------------------

    op.alter_column(
        "annonces",
        "date_publication",
        existing_type=postgresql.TIMESTAMP(),
        nullable=False,
    )

    # --------------------------------------------------------
    # INDEX
    # --------------------------------------------------------

    op.create_index(
        op.f("ix_annonces_commune"),
        "annonces",
        ["commune"],
        unique=False,
    )

    op.create_index(
        op.f("ix_annonces_date_publication"),
        "annonces",
        ["date_publication"],
        unique=False,
    )

    op.create_index(
        "ix_annonces_geolocalisation",
        "annonces",
        ["latitude", "longitude"],
        unique=False,
    )

    op.create_index(
        op.f("ix_annonces_latitude"),
        "annonces",
        ["latitude"],
        unique=False,
    )

    op.create_index(
        op.f("ix_annonces_longitude"),
        "annonces",
        ["longitude"],
        unique=False,
    )

    op.create_index(
        op.f("ix_annonces_produit_id"),
        "annonces",
        ["produit_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_annonces_province"),
        "annonces",
        ["province"],
        unique=False,
    )

    op.create_index(
        op.f("ix_annonces_region"),
        "annonces",
        ["region"],
        unique=False,
    )

    op.create_index(
        "ix_annonces_region_statut",
        "annonces",
        ["region", "statut"],
        unique=False,
    )

    op.create_index(
        op.f("ix_annonces_statut"),
        "annonces",
        ["statut"],
        unique=False,
    )

    op.create_index(
        "ix_annonces_statut_date",
        "annonces",
        ["statut", "date_publication"],
        unique=False,
    )

    op.create_index(
        op.f("ix_annonces_vendeur_id"),
        "annonces",
        ["vendeur_id"],
        unique=False,
    )

    op.create_index(
        "ix_annonces_vendeur_statut",
        "annonces",
        ["vendeur_id", "statut"],
        unique=False,
    )

    # --------------------------------------------------------
    # CLÉS ÉTRANGÈRES
    # --------------------------------------------------------

    op.drop_constraint(
        op.f("annonces_vendeur_id_fkey"),
        "annonces",
        type_="foreignkey",
    )

    op.drop_constraint(
        op.f("annonces_produit_id_fkey"),
        "annonces",
        type_="foreignkey",
    )

    op.create_foreign_key(
        "annonces_vendeur_id_fkey",
        "annonces",
        "utilisateurs",
        ["vendeur_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.create_foreign_key(
        "annonces_produit_id_fkey",
        "annonces",
        "produits",
        ["produit_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    # --------------------------------------------------------
    # CONTRAINTES
    # --------------------------------------------------------

    op.create_check_constraint(
        "ck_annonce_latitude",
        "annonces",
        """
        latitude IS NULL
        OR (
            latitude >= -90
            AND latitude <= 90
        )
        """,
    )

    op.create_check_constraint(
        "ck_annonce_longitude",
        "annonces",
        """
        longitude IS NULL
        OR (
            longitude >= -180
            AND longitude <= 180
        )
        """,
    )

    op.create_check_constraint(
        "ck_annonce_localisation_source",
        "annonces",
        """
        localisation_source IN (
            'gps',
            'manuelle',
            'inconnue'
        )
        """,
    )

    op.create_check_constraint(
        "ck_annonce_prix_positif",
        "annonces",
        "prix > 0",
    )

    op.create_check_constraint(
        "ck_annonce_quantite_positive",
        "annonces",
        "quantite > 0",
    )

    op.create_check_constraint(
        "ck_annonce_region_min",
        "annonces",
        "length(trim(region)) >= 2",
    )

    op.create_check_constraint(
        "ck_annonce_unite_min",
        "annonces",
        "length(trim(unite)) >= 1",
    )

    op.create_check_constraint(
        "ck_annonce_statut",
        "annonces",
        """
        statut IN (
            'en_attente',
            'publiee',
            'refusee'
        )
        """,
    )

    # ========================================================
    # CATEGORIES
    # ========================================================

    op.create_index(
        op.f("ix_categories_famille_id"),
        "categories",
        ["famille_id"],
        unique=False,
    )

    op.create_index(
        "ix_categories_famille_nom",
        "categories",
        ["famille_id", "nom"],
        unique=False,
    )

    op.create_index(
        op.f("ix_categories_nom"),
        "categories",
        ["nom"],
        unique=False,
    )

    op.create_unique_constraint(
        "uq_categorie_famille_nom",
        "categories",
        ["famille_id", "nom"],
    )

    op.drop_constraint(
        op.f("categories_famille_id_fkey"),
        "categories",
        type_="foreignkey",
    )

    op.create_foreign_key(
        "categories_famille_id_fkey",
        "categories",
        "familles",
        ["famille_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.create_check_constraint(
        "ck_categorie_nom_min",
        "categories",
        "length(trim(nom)) >= 2",
    )

    # ========================================================
    # COMMANDES
    # ========================================================

    op.execute(
        """
        UPDATE commandes
        SET date_commande = CURRENT_TIMESTAMP
        WHERE date_commande IS NULL
        """
    )

    op.alter_column(
        "commandes",
        "date_commande",
        existing_type=postgresql.TIMESTAMP(),
        nullable=False,
    )

    op.create_index(
        op.f("ix_commandes_acheteur_id"),
        "commandes",
        ["acheteur_id"],
        unique=False,
    )

    op.create_index(
        "ix_commandes_acheteur_statut",
        "commandes",
        ["acheteur_id", "statut"],
        unique=False,
    )

    op.create_index(
        op.f("ix_commandes_annonce_id"),
        "commandes",
        ["annonce_id"],
        unique=False,
    )

    op.create_index(
        "ix_commandes_annonce_statut",
        "commandes",
        ["annonce_id", "statut"],
        unique=False,
    )

    op.create_index(
        op.f("ix_commandes_date_commande"),
        "commandes",
        ["date_commande"],
        unique=False,
    )

    op.create_index(
        op.f("ix_commandes_statut"),
        "commandes",
        ["statut"],
        unique=False,
    )

    op.create_index(
        "ix_commandes_statut_date",
        "commandes",
        ["statut", "date_commande"],
        unique=False,
    )

    op.drop_constraint(
        op.f("commandes_annonce_id_fkey"),
        "commandes",
        type_="foreignkey",
    )

    op.drop_constraint(
        op.f("commandes_acheteur_id_fkey"),
        "commandes",
        type_="foreignkey",
    )

    op.create_foreign_key(
        "commandes_acheteur_id_fkey",
        "commandes",
        "utilisateurs",
        ["acheteur_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.create_foreign_key(
        "commandes_annonce_id_fkey",
        "commandes",
        "annonces",
        ["annonce_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.create_check_constraint(
        "ck_commande_prix_total_positif",
        "commandes",
        "prix_total > 0",
    )

    op.create_check_constraint(
        "ck_commande_prix_unitaire_positif",
        "commandes",
        "prix_unitaire > 0",
    )

    op.create_check_constraint(
        "ck_commande_quantite_positive",
        "commandes",
        "quantite > 0",
    )

    op.create_check_constraint(
        "ck_commande_statut",
        "commandes",
        """
        statut IN (
            'en_attente',
            'confirmee',
            'preparee',
            'livree',
            'annulee'
        )
        """,
    )

    # ========================================================
    # DEMANDES VENDEUR
    # ========================================================

    op.execute(
        """
        UPDATE demandes_vendeur
        SET date_demande = CURRENT_TIMESTAMP
        WHERE date_demande IS NULL
        """
    )

    op.alter_column(
        "demandes_vendeur",
        "date_demande",
        existing_type=postgresql.TIMESTAMP(),
        nullable=False,
    )

    op.create_index(
        op.f("ix_demandes_vendeur_date_demande"),
        "demandes_vendeur",
        ["date_demande"],
        unique=False,
    )

    op.create_index(
        op.f("ix_demandes_vendeur_statut"),
        "demandes_vendeur",
        ["statut"],
        unique=False,
    )

    op.create_index(
        "ix_demandes_vendeur_statut_date",
        "demandes_vendeur",
        ["statut", "date_demande"],
        unique=False,
    )

    op.create_index(
        op.f("ix_demandes_vendeur_utilisateur_id"),
        "demandes_vendeur",
        ["utilisateur_id"],
        unique=False,
    )

    op.create_index(
        "ix_demandes_vendeur_utilisateur_statut",
        "demandes_vendeur",
        ["utilisateur_id", "statut"],
        unique=False,
    )

    op.drop_constraint(
        op.f("demandes_vendeur_utilisateur_id_fkey"),
        "demandes_vendeur",
        type_="foreignkey",
    )

    op.create_foreign_key(
        "demandes_vendeur_utilisateur_id_fkey",
        "demandes_vendeur",
        "utilisateurs",
        ["utilisateur_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.create_check_constraint(
        "ck_demande_vendeur_statut",
        "demandes_vendeur",
        """
        statut IN (
            'en_attente',
            'acceptee',
            'refusee'
        )
        """,
    )

    # ========================================================
    # FAMILLES
    # ========================================================

    op.drop_constraint(
        op.f("familles_nom_key"),
        "familles",
        type_="unique",
    )

    op.create_index(
        op.f("ix_familles_nom"),
        "familles",
        ["nom"],
        unique=True,
    )

    op.create_check_constraint(
        "ck_famille_nom_min",
        "familles",
        "length(trim(nom)) >= 2",
    )

    # ========================================================
    # HISTORIQUE MODERATION
    # ========================================================

    op.create_check_constraint(
        "ck_historique_moderation_action",
        "historiques_moderation",
        """
        action IN (
            'soumise',
            'approuvee',
            'refusee',
            'remise_en_moderation'
        )
        """,
    )

    # ========================================================
    # IMAGES
    # ========================================================

    op.execute(
        """
        UPDATE images_annonces
        SET date_creation = CURRENT_TIMESTAMP
        WHERE date_creation IS NULL
        """
    )

    op.alter_column(
        "images_annonces",
        "date_creation",
        existing_type=postgresql.TIMESTAMP(),
        nullable=False,
    )

    op.create_index(
        op.f("ix_images_annonces_annonce_id"),
        "images_annonces",
        ["annonce_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_images_annonces_date_creation"),
        "images_annonces",
        ["date_creation"],
        unique=False,
    )

    op.drop_constraint(
        op.f("images_annonces_annonce_id_fkey"),
        "images_annonces",
        type_="foreignkey",
    )

    op.create_foreign_key(
        "images_annonces_annonce_id_fkey",
        "images_annonces",
        "annonces",
        ["annonce_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # ========================================================
    # NOTIFICATIONS
    # ========================================================

    op.create_check_constraint(
        "ck_notification_type",
        "notifications",
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
    )

    # ========================================================
    # PRODUITS
    # ========================================================

    op.create_index(
        op.f("ix_produits_categorie_id"),
        "produits",
        ["categorie_id"],
        unique=False,
    )

    op.create_index(
        "ix_produits_categorie_type",
        "produits",
        ["categorie_id", "type_produit"],
        unique=False,
    )

    op.create_index(
        op.f("ix_produits_nom"),
        "produits",
        ["nom"],
        unique=False,
    )

    op.create_index(
        op.f("ix_produits_type_produit"),
        "produits",
        ["type_produit"],
        unique=False,
    )

    op.create_index(
        "ix_produits_valide_type",
        "produits",
        ["est_valide", "type_produit"],
        unique=False,
    )

    op.drop_constraint(
        op.f("produits_categorie_id_fkey"),
        "produits",
        type_="foreignkey",
    )

    op.create_foreign_key(
        "produits_categorie_id_fkey",
        "produits",
        "categories",
        ["categorie_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.create_check_constraint(
        "ck_produit_nom_min",
        "produits",
        "length(trim(nom)) >= 2",
    )

    op.create_check_constraint(
        "ck_produit_type",
        "produits",
        """
        type_produit IN (
            'brut',
            'transforme'
        )
        """,
    )

    # ========================================================
    # UTILISATEURS
    # ========================================================

    # --------------------------------------------------------
    # AUTHENTIFICATION
    # --------------------------------------------------------

    op.add_column(
        "utilisateurs",
        sa.Column(
            "methode_authentification",
            sa.String(length=20),
            nullable=False,
            server_default="local",
        ),
    )

    # --------------------------------------------------------
    # GÉOLOCALISATION
    # --------------------------------------------------------

    op.add_column(
        "utilisateurs",
        sa.Column(
            "latitude",
            sa.Float(),
            nullable=True,
        ),
    )

    op.add_column(
        "utilisateurs",
        sa.Column(
            "longitude",
            sa.Float(),
            nullable=True,
        ),
    )

    op.add_column(
        "utilisateurs",
        sa.Column(
            "localisation_source",
            sa.String(length=20),
            nullable=False,
            server_default="inconnue",
        ),
    )

    # --------------------------------------------------------
    # TELEPHONE
    # --------------------------------------------------------

    op.alter_column(
        "utilisateurs",
        "telephone",
        existing_type=sa.VARCHAR(length=20),
        nullable=True,
    )

    # --------------------------------------------------------
    # MOT DE PASSE
    # --------------------------------------------------------

    op.alter_column(
        "utilisateurs",
        "mot_de_passe_hash",
        existing_type=sa.VARCHAR(length=255),
        nullable=True,
    )

    # --------------------------------------------------------
    # DATE CREATION
    # --------------------------------------------------------

    op.execute(
        """
        UPDATE utilisateurs
        SET date_creation = CURRENT_TIMESTAMP
        WHERE date_creation IS NULL
        """
    )

    op.alter_column(
        "utilisateurs",
        "date_creation",
        existing_type=postgresql.TIMESTAMP(),
        nullable=False,
    )

    # --------------------------------------------------------
    # UNIQUE EMAIL / TELEPHONE
    # --------------------------------------------------------

    op.drop_constraint(
        op.f("utilisateurs_email_key"),
        "utilisateurs",
        type_="unique",
    )

    op.drop_constraint(
        op.f("utilisateurs_telephone_key"),
        "utilisateurs",
        type_="unique",
    )

    # --------------------------------------------------------
    # INDEX
    # --------------------------------------------------------

    op.create_index(
        "ix_utilisateurs_auth_method",
        "utilisateurs",
        ["methode_authentification"],
        unique=False,
    )

    op.create_index(
        op.f("ix_utilisateurs_date_creation"),
        "utilisateurs",
        ["date_creation"],
        unique=False,
    )

    op.create_index(
        op.f("ix_utilisateurs_email"),
        "utilisateurs",
        ["email"],
        unique=True,
    )

    op.create_index(
        op.f("ix_utilisateurs_methode_authentification"),
        "utilisateurs",
        ["methode_authentification"],
        unique=False,
    )

    op.create_index(
        op.f("ix_utilisateurs_role"),
        "utilisateurs",
        ["role"],
        unique=False,
    )

    op.create_index(
        "ix_utilisateurs_role_statut",
        "utilisateurs",
        ["role", "statut_compte"],
        unique=False,
    )

    op.create_index(
        op.f("ix_utilisateurs_statut_compte"),
        "utilisateurs",
        ["statut_compte"],
        unique=False,
    )

    op.create_index(
        op.f("ix_utilisateurs_telephone"),
        "utilisateurs",
        ["telephone"],
        unique=True,
    )

    # --------------------------------------------------------
    # CONTRAINTES AUTHENTIFICATION
    # --------------------------------------------------------

    op.create_check_constraint(
        "ck_utilisateur_auth_method",
        "utilisateurs",
        """
        methode_authentification IN (
            'local',
            'google',
            'hybride'
        )
        """,
    )

    # --------------------------------------------------------
    # CONTRAINTE LATITUDE
    # --------------------------------------------------------

    op.create_check_constraint(
        "ck_utilisateur_latitude",
        "utilisateurs",
        """
        latitude IS NULL
        OR (
            latitude >= -90
            AND latitude <= 90
        )
        """,
    )

    # --------------------------------------------------------
    # SOURCE LOCALISATION
    # --------------------------------------------------------

    op.create_check_constraint(
        "ck_utilisateur_localisation_source",
        "utilisateurs",
        """
        localisation_source IN (
            'gps',
            'manuelle',
            'inconnue'
        )
        """,
    )

    # --------------------------------------------------------
    # CONTRAINTE LONGITUDE
    # --------------------------------------------------------

    op.create_check_constraint(
        "ck_utilisateur_longitude",
        "utilisateurs",
        """
        longitude IS NULL
        OR (
            longitude >= -180
            AND longitude <= 180
        )
        """,
    )

    # --------------------------------------------------------
    # RÔLE
    # --------------------------------------------------------

    op.create_check_constraint(
        "ck_utilisateur_role",
        "utilisateurs",
        """
        role IN (
            'acheteur',
            'vendeur',
            'admin',
            'administrateur',
            'moderateur'
        )
        """,
    )

    # --------------------------------------------------------
    # STATUT
    # --------------------------------------------------------

    op.create_check_constraint(
        "ck_utilisateur_statut",
        "utilisateurs",
        """
        statut_compte IN (
            'actif',
            'en_attente',
            'bloque',
            'suspendu'
        )
        """,
    )

    # ========================================================
    # SUPPRESSION DES DEFAULTS DE MIGRATION
    # ========================================================
    #
    # Les valeurs par défaut ont servi uniquement à initialiser
    # les anciennes lignes.
    #
    # Les valeurs par défaut métier restent définies dans
    # models.py avec SQLAlchemy.
    #
    # ========================================================

    op.alter_column(
        "annonces",
        "localisation_source",
        server_default=None,
    )

    op.alter_column(
        "utilisateurs",
        "methode_authentification",
        server_default=None,
    )

    op.alter_column(
        "utilisateurs",
        "localisation_source",
        server_default=None,
    )


# ============================================================
# DOWNGRADE
# ============================================================

def downgrade() -> None:
    """
    Retour arrière de la migration.
    """

    # ========================================================
    # UTILISATEURS
    # ========================================================

    op.drop_constraint(
        "ck_utilisateur_statut",
        "utilisateurs",
        type_="check",
    )

    op.drop_constraint(
        "ck_utilisateur_role",
        "utilisateurs",
        type_="check",
    )

    op.drop_constraint(
        "ck_utilisateur_longitude",
        "utilisateurs",
        type_="check",
    )

    op.drop_constraint(
        "ck_utilisateur_localisation_source",
        "utilisateurs",
        type_="check",
    )

    op.drop_constraint(
        "ck_utilisateur_latitude",
        "utilisateurs",
        type_="check",
    )

    op.drop_constraint(
        "ck_utilisateur_auth_method",
        "utilisateurs",
        type_="check",
    )

    op.drop_index(
        op.f("ix_utilisateurs_telephone"),
        table_name="utilisateurs",
    )

    op.drop_index(
        op.f("ix_utilisateurs_statut_compte"),
        table_name="utilisateurs",
    )

    op.drop_index(
        "ix_utilisateurs_role_statut",
        table_name="utilisateurs",
    )

    op.drop_index(
        op.f("ix_utilisateurs_role"),
        table_name="utilisateurs",
    )

    op.drop_index(
        op.f("ix_utilisateurs_methode_authentification"),
        table_name="utilisateurs",
    )

    op.drop_index(
        op.f("ix_utilisateurs_email"),
        table_name="utilisateurs",
    )

    op.drop_index(
        op.f("ix_utilisateurs_date_creation"),
        table_name="utilisateurs",
    )

    op.drop_index(
        "ix_utilisateurs_auth_method",
        table_name="utilisateurs",
    )

    op.create_unique_constraint(
        op.f("utilisateurs_telephone_key"),
        "utilisateurs",
        ["telephone"],
        postgresql_nulls_not_distinct=False,
    )

    op.create_unique_constraint(
        op.f("utilisateurs_email_key"),
        "utilisateurs",
        ["email"],
        postgresql_nulls_not_distinct=False,
    )

    op.alter_column(
        "utilisateurs",
        "date_creation",
        existing_type=postgresql.TIMESTAMP(),
        nullable=True,
    )

    op.alter_column(
        "utilisateurs",
        "mot_de_passe_hash",
        existing_type=sa.VARCHAR(length=255),
        nullable=False,
    )

    op.alter_column(
        "utilisateurs",
        "telephone",
        existing_type=sa.VARCHAR(length=20),
        nullable=False,
    )

    op.drop_column(
        "utilisateurs",
        "localisation_source",
    )

    op.drop_column(
        "utilisateurs",
        "longitude",
    )

    op.drop_column(
        "utilisateurs",
        "latitude",
    )

    op.drop_column(
        "utilisateurs",
        "methode_authentification",
    )

    # ========================================================
    # PRODUITS
    # ========================================================

    op.drop_constraint(
        "ck_produit_type",
        "produits",
        type_="check",
    )

    op.drop_constraint(
        "ck_produit_nom_min",
        "produits",
        type_="check",
    )

    op.drop_constraint(
        "produits_categorie_id_fkey",
        "produits",
        type_="foreignkey",
    )

    op.create_foreign_key(
        op.f("produits_categorie_id_fkey"),
        "produits",
        "categories",
        ["categorie_id"],
        ["id"],
    )

    op.drop_index(
        "ix_produits_valide_type",
        table_name="produits",
    )

    op.drop_index(
        op.f("ix_produits_type_produit"),
        table_name="produits",
    )

    op.drop_index(
        op.f("ix_produits_nom"),
        table_name="produits",
    )

    op.drop_index(
        "ix_produits_categorie_type",
        table_name="produits",
    )

    op.drop_index(
        op.f("ix_produits_categorie_id"),
        table_name="produits",
    )

    # ========================================================
    # NOTIFICATIONS
    # ========================================================

    op.drop_constraint(
        "ck_notification_type",
        "notifications",
        type_="check",
    )

    # ========================================================
    # IMAGES
    # ========================================================

    op.drop_constraint(
        "images_annonces_annonce_id_fkey",
        "images_annonces",
        type_="foreignkey",
    )

    op.create_foreign_key(
        op.f("images_annonces_annonce_id_fkey"),
        "images_annonces",
        "annonces",
        ["annonce_id"],
        ["id"],
    )

    op.drop_index(
        op.f("ix_images_annonces_date_creation"),
        table_name="images_annonces",
    )

    op.drop_index(
        op.f("ix_images_annonces_annonce_id"),
        table_name="images_annonces",
    )

    op.alter_column(
        "images_annonces",
        "date_creation",
        existing_type=postgresql.TIMESTAMP(),
        nullable=True,
    )

    # ========================================================
    # HISTORIQUE
    # ========================================================

    op.drop_constraint(
        "ck_historique_moderation_action",
        "historiques_moderation",
        type_="check",
    )

    # ========================================================
    # FAMILLES
    # ========================================================

    op.drop_constraint(
        "ck_famille_nom_min",
        "familles",
        type_="check",
    )

    op.drop_index(
        op.f("ix_familles_nom"),
        table_name="familles",
    )

    op.create_unique_constraint(
        op.f("familles_nom_key"),
        "familles",
        ["nom"],
        postgresql_nulls_not_distinct=False,
    )

    # ========================================================
    # DEMANDES VENDEUR
    # ========================================================

    op.drop_constraint(
        "ck_demande_vendeur_statut",
        "demandes_vendeur",
        type_="check",
    )

    op.drop_constraint(
        "demandes_vendeur_utilisateur_id_fkey",
        "demandes_vendeur",
        type_="foreignkey",
    )

    op.create_foreign_key(
        op.f("demandes_vendeur_utilisateur_id_fkey"),
        "demandes_vendeur",
        "utilisateurs",
        ["utilisateur_id"],
        ["id"],
    )

    op.drop_index(
        "ix_demandes_vendeur_utilisateur_statut",
        table_name="demandes_vendeur",
    )

    op.drop_index(
        op.f("ix_demandes_vendeur_utilisateur_id"),
        table_name="demandes_vendeur",
    )

    op.drop_index(
        "ix_demandes_vendeur_statut_date",
        table_name="demandes_vendeur",
    )

    op.drop_index(
        op.f("ix_demandes_vendeur_statut"),
        table_name="demandes_vendeur",
    )

    op.drop_index(
        op.f("ix_demandes_vendeur_date_demande"),
        table_name="demandes_vendeur",
    )

    op.alter_column(
        "demandes_vendeur",
        "date_demande",
        existing_type=postgresql.TIMESTAMP(),
        nullable=True,
    )

    # ========================================================
    # COMMANDES
    # ========================================================

    op.drop_constraint(
        "ck_commande_statut",
        "commandes",
        type_="check",
    )

    op.drop_constraint(
        "ck_commande_quantite_positive",
        "commandes",
        type_="check",
    )

    op.drop_constraint(
        "ck_commande_prix_unitaire_positif",
        "commandes",
        type_="check",
    )

    op.drop_constraint(
        "ck_commande_prix_total_positif",
        "commandes",
        type_="check",
    )

    op.drop_constraint(
        "commandes_acheteur_id_fkey",
        "commandes",
        type_="foreignkey",
    )

    op.drop_constraint(
        "commandes_annonce_id_fkey",
        "commandes",
        type_="foreignkey",
    )

    op.create_foreign_key(
        op.f("commandes_acheteur_id_fkey"),
        "commandes",
        "utilisateurs",
        ["acheteur_id"],
        ["id"],
    )

    op.create_foreign_key(
        op.f("commandes_annonce_id_fkey"),
        "commandes",
        "annonces",
        ["annonce_id"],
        ["id"],
    )

    op.drop_index(
        "ix_commandes_statut_date",
        table_name="commandes",
    )

    op.drop_index(
        op.f("ix_commandes_statut"),
        table_name="commandes",
    )

    op.drop_index(
        op.f("ix_commandes_date_commande"),
        table_name="commandes",
    )

    op.drop_index(
        "ix_commandes_annonce_statut",
        table_name="commandes",
    )

    op.drop_index(
        op.f("ix_commandes_annonce_id"),
        table_name="commandes",
    )

    op.drop_index(
        "ix_commandes_acheteur_statut",
        table_name="commandes",
    )

    op.drop_index(
        op.f("ix_commandes_acheteur_id"),
        table_name="commandes",
    )

    op.alter_column(
        "commandes",
        "date_commande",
        existing_type=postgresql.TIMESTAMP(),
        nullable=True,
    )

    # ========================================================
    # CATEGORIES
    # ========================================================

    op.drop_constraint(
        "ck_categorie_nom_min",
        "categories",
        type_="check",
    )

    op.drop_constraint(
        "categories_famille_id_fkey",
        "categories",
        type_="foreignkey",
    )

    op.create_foreign_key(
        op.f("categories_famille_id_fkey"),
        "categories",
        "familles",
        ["famille_id"],
        ["id"],
    )

    op.drop_constraint(
        "uq_categorie_famille_nom",
        "categories",
        type_="unique",
    )

    op.drop_index(
        op.f("ix_categories_nom"),
        table_name="categories",
    )

    op.drop_index(
        "ix_categories_famille_nom",
        table_name="categories",
    )

    op.drop_index(
        op.f("ix_categories_famille_id"),
        table_name="categories",
    )

    # ========================================================
    # ANNONCES
    # ========================================================

    op.drop_constraint(
        "ck_annonce_unite_min",
        "annonces",
        type_="check",
    )

    op.drop_constraint(
        "ck_annonce_statut",
        "annonces",
        type_="check",
    )

    op.drop_constraint(
        "ck_annonce_region_min",
        "annonces",
        type_="check",
    )

    op.drop_constraint(
        "ck_annonce_quantite_positive",
        "annonces",
        type_="check",
    )

    op.drop_constraint(
        "ck_annonce_prix_positif",
        "annonces",
        type_="check",
    )

    op.drop_constraint(
        "ck_annonce_longitude",
        "annonces",
        type_="check",
    )

    op.drop_constraint(
        "ck_annonce_localisation_source",
        "annonces",
        type_="check",
    )

    op.drop_constraint(
        "ck_annonce_latitude",
        "annonces",
        type_="check",
    )

    op.drop_constraint(
        "annonces_produit_id_fkey",
        "annonces",
        type_="foreignkey",
    )

    op.drop_constraint(
        "annonces_vendeur_id_fkey",
        "annonces",
        type_="foreignkey",
    )

    op.create_foreign_key(
        op.f("annonces_produit_id_fkey"),
        "annonces",
        "produits",
        ["produit_id"],
        ["id"],
    )

    op.create_foreign_key(
        op.f("annonces_vendeur_id_fkey"),
        "annonces",
        "utilisateurs",
        ["vendeur_id"],
        ["id"],
    )

    op.drop_index(
        "ix_annonces_vendeur_statut",
        table_name="annonces",
    )

    op.drop_index(
        op.f("ix_annonces_vendeur_id"),
        table_name="annonces",
    )

    op.drop_index(
        "ix_annonces_statut_date",
        table_name="annonces",
    )

    op.drop_index(
        op.f("ix_annonces_statut"),
        table_name="annonces",
    )

    op.drop_index(
        "ix_annonces_region_statut",
        table_name="annonces",
    )

    op.drop_index(
        op.f("ix_annonces_region"),
        table_name="annonces",
    )

    op.drop_index(
        op.f("ix_annonces_province"),
        table_name="annonces",
    )

    op.drop_index(
        op.f("ix_annonces_produit_id"),
        table_name="annonces",
    )

    op.drop_index(
        op.f("ix_annonces_longitude"),
        table_name="annonces",
    )

    op.drop_index(
        op.f("ix_annonces_latitude"),
        table_name="annonces",
    )

    op.drop_index(
        "ix_annonces_geolocalisation",
        table_name="annonces",
    )

    op.drop_index(
        op.f("ix_annonces_date_publication"),
        table_name="annonces",
    )

    op.drop_index(
        op.f("ix_annonces_commune"),
        table_name="annonces",
    )

    op.alter_column(
        "annonces",
        "date_publication",
        existing_type=postgresql.TIMESTAMP(),
        nullable=True,
    )

    op.drop_column(
        "annonces",
        "localisation_source",
    )

    op.drop_column(
        "annonces",
        "longitude",
    )

    op.drop_column(
        "annonces",
        "latitude",
    )