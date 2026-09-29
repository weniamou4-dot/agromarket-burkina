"""ajout notifications historique avis google

Revision ID: 10105f54ddb3
Revises: ba85eff4ae30
Create Date: 2026-09-03 01:56:51.415174

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# ============================================================
# IDENTIFIANTS ALEMBIC
# ============================================================

revision: str = "10105f54ddb3"

down_revision: Union[str, Sequence[str], None] = "7845364f3223"

branch_labels: Union[str, Sequence[str], None] = None

depends_on: Union[str, Sequence[str], None] = None


# ============================================================
# UPGRADE
# ============================================================

def upgrade() -> None:
    """
    Ajoute uniquement les nouvelles fonctionnalités :

    - notifications
    - historiques_moderation
    - avis

    Les tables existantes ne sont pas modifiées.
    """

    # ========================================================
    # NOTIFICATIONS
    # ========================================================

    op.create_table(
        "notifications",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "utilisateur_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "type",
            sa.String(length=50),
            nullable=False,
        ),

        sa.Column(
            "titre",
            sa.String(length=200),
            nullable=False,
        ),

        sa.Column(
            "message",
            sa.Text(),
            nullable=False,
        ),

        sa.Column(
            "est_lue",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),

        sa.Column(
            "date_lecture",
            sa.DateTime(),
            nullable=True,
        ),

        sa.Column(
            "lien",
            sa.String(length=500),
            nullable=True,
        ),

        sa.Column(
            "reference_id",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "date_creation",
            sa.DateTime(),
            nullable=False,
        ),

        sa.ForeignKeyConstraint(
            ["utilisateur_id"],
            ["utilisateurs.id"],
            ondelete="CASCADE",
        ),

        sa.PrimaryKeyConstraint(
            "id"
        ),
    )

    # --------------------------------------------------------
    # INDEX NOTIFICATIONS
    # --------------------------------------------------------

    op.create_index(
        "ix_notifications_id",
        "notifications",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_notifications_utilisateur_id",
        "notifications",
        ["utilisateur_id"],
        unique=False,
    )

    op.create_index(
        "ix_notifications_type",
        "notifications",
        ["type"],
        unique=False,
    )

    op.create_index(
        "ix_notifications_est_lue",
        "notifications",
        ["est_lue"],
        unique=False,
    )

    op.create_index(
        "ix_notifications_reference_id",
        "notifications",
        ["reference_id"],
        unique=False,
    )

    op.create_index(
        "ix_notifications_date_creation",
        "notifications",
        ["date_creation"],
        unique=False,
    )

    op.create_index(
        "ix_notifications_utilisateur_lue",
        "notifications",
        [
            "utilisateur_id",
            "est_lue",
        ],
        unique=False,
    )

    op.create_index(
        "ix_notifications_utilisateur_date",
        "notifications",
        [
            "utilisateur_id",
            "date_creation",
        ],
        unique=False,
    )

    op.create_index(
        "ix_notifications_type_date",
        "notifications",
        [
            "type",
            "date_creation",
        ],
        unique=False,
    )

    # ========================================================
    # HISTORIQUE DE MODÉRATION
    # ========================================================

    op.create_table(
        "historiques_moderation",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "annonce_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "acteur_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "action",
            sa.String(length=50),
            nullable=False,
        ),

        sa.Column(
            "ancien_statut",
            sa.String(length=30),
            nullable=True,
        ),

        sa.Column(
            "nouveau_statut",
            sa.String(length=30),
            nullable=True,
        ),

        sa.Column(
            "motif",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "date_action",
            sa.DateTime(),
            nullable=False,
        ),

        sa.ForeignKeyConstraint(
            ["annonce_id"],
            ["annonces.id"],
            ondelete="CASCADE",
        ),

        sa.ForeignKeyConstraint(
            ["acteur_id"],
            ["utilisateurs.id"],
            ondelete="RESTRICT",
        ),

        sa.PrimaryKeyConstraint(
            "id"
        ),
    )

    # --------------------------------------------------------
    # INDEX HISTORIQUE
    # --------------------------------------------------------

    op.create_index(
        "ix_historiques_moderation_id",
        "historiques_moderation",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_historiques_moderation_annonce_id",
        "historiques_moderation",
        ["annonce_id"],
        unique=False,
    )

    op.create_index(
        "ix_historiques_moderation_acteur_id",
        "historiques_moderation",
        ["acteur_id"],
        unique=False,
    )

    op.create_index(
        "ix_historiques_moderation_action",
        "historiques_moderation",
        ["action"],
        unique=False,
    )

    op.create_index(
        "ix_historiques_moderation_date_action",
        "historiques_moderation",
        ["date_action"],
        unique=False,
    )

    op.create_index(
        "ix_historiques_moderation_annonce_date",
        "historiques_moderation",
        [
            "annonce_id",
            "date_action",
        ],
        unique=False,
    )

    op.create_index(
        "ix_historiques_moderation_acteur_date",
        "historiques_moderation",
        [
            "acteur_id",
            "date_action",
        ],
        unique=False,
    )

    # ========================================================
    # AVIS
    # ========================================================

    op.create_table(
        "avis",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "utilisateur_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "annonce_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "commande_id",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "note",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "commentaire",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "est_visible",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),

        sa.Column(
            "date_creation",
            sa.DateTime(),
            nullable=False,
        ),

        sa.Column(
            "date_modification",
            sa.DateTime(),
            nullable=True,
        ),

        # ----------------------------------------------------
        # CONTRAINTE NOTE
        # ----------------------------------------------------

        sa.CheckConstraint(
            "note >= 1 AND note <= 5",
            name="ck_avis_note",
        ),

        # ----------------------------------------------------
        # UN AVIS PAR UTILISATEUR POUR UNE ANNONCE
        # ----------------------------------------------------

        sa.UniqueConstraint(
            "utilisateur_id",
            "annonce_id",
            name="uq_avis_utilisateur_annonce",
        ),

        # ----------------------------------------------------
        # RELATIONS
        # ----------------------------------------------------

        sa.ForeignKeyConstraint(
            ["utilisateur_id"],
            ["utilisateurs.id"],
            ondelete="CASCADE",
        ),

        sa.ForeignKeyConstraint(
            ["annonce_id"],
            ["annonces.id"],
            ondelete="CASCADE",
        ),

        sa.ForeignKeyConstraint(
            ["commande_id"],
            ["commandes.id"],
            ondelete="RESTRICT",
        ),

        sa.PrimaryKeyConstraint(
            "id"
        ),
    )

    # --------------------------------------------------------
    # INDEX AVIS
    # --------------------------------------------------------

    op.create_index(
        "ix_avis_id",
        "avis",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_avis_utilisateur_id",
        "avis",
        ["utilisateur_id"],
        unique=False,
    )

    op.create_index(
        "ix_avis_annonce_id",
        "avis",
        ["annonce_id"],
        unique=False,
    )

    op.create_index(
        "ix_avis_commande_id",
        "avis",
        ["commande_id"],
        unique=True,
    )

    op.create_index(
        "ix_avis_est_visible",
        "avis",
        ["est_visible"],
        unique=False,
    )

    op.create_index(
        "ix_avis_date_creation",
        "avis",
        ["date_creation"],
        unique=False,
    )

    op.create_index(
        "ix_avis_annonce_visible",
        "avis",
        [
            "annonce_id",
            "est_visible",
        ],
        unique=False,
    )

    op.create_index(
        "ix_avis_utilisateur_date",
        "avis",
        [
            "utilisateur_id",
            "date_creation",
        ],
        unique=False,
    )


# ============================================================
# DOWNGRADE
# ============================================================

def downgrade() -> None:
    """
    Supprime uniquement les trois nouvelles tables.
    """

    # ========================================================
    # AVIS
    # ========================================================

    op.drop_index(
        "ix_avis_utilisateur_date",
        table_name="avis",
    )

    op.drop_index(
        "ix_avis_annonce_visible",
        table_name="avis",
    )

    op.drop_index(
        "ix_avis_date_creation",
        table_name="avis",
    )

    op.drop_index(
        "ix_avis_est_visible",
        table_name="avis",
    )

    op.drop_index(
        "ix_avis_commande_id",
        table_name="avis",
    )

    op.drop_index(
        "ix_avis_annonce_id",
        table_name="avis",
    )

    op.drop_index(
        "ix_avis_utilisateur_id",
        table_name="avis",
    )

    op.drop_index(
        "ix_avis_id",
        table_name="avis",
    )

    op.drop_table(
        "avis"
    )

    # ========================================================
    # HISTORIQUE
    # ========================================================

    op.drop_index(
        "ix_historiques_moderation_acteur_date",
        table_name="historiques_moderation",
    )

    op.drop_index(
        "ix_historiques_moderation_annonce_date",
        table_name="historiques_moderation",
    )

    op.drop_index(
        "ix_historiques_moderation_date_action",
        table_name="historiques_moderation",
    )

    op.drop_index(
        "ix_historiques_moderation_action",
        table_name="historiques_moderation",
    )

    op.drop_index(
        "ix_historiques_moderation_acteur_id",
        table_name="historiques_moderation",
    )

    op.drop_index(
        "ix_historiques_moderation_annonce_id",
        table_name="historiques_moderation",
    )

    op.drop_index(
        "ix_historiques_moderation_id",
        table_name="historiques_moderation",
    )

    op.drop_table(
        "historiques_moderation"
    )

    # ========================================================
    # NOTIFICATIONS
    # ========================================================

    op.drop_index(
        "ix_notifications_type_date",
        table_name="notifications",
    )

    op.drop_index(
        "ix_notifications_utilisateur_date",
        table_name="notifications",
    )

    op.drop_index(
        "ix_notifications_utilisateur_lue",
        table_name="notifications",
    )

    op.drop_index(
        "ix_notifications_date_creation",
        table_name="notifications",
    )

    op.drop_index(
        "ix_notifications_reference_id",
        table_name="notifications",
    )

    op.drop_index(
        "ix_notifications_est_lue",
        table_name="notifications",
    )

    op.drop_index(
        "ix_notifications_type",
        table_name="notifications",
    )

    op.drop_index(
        "ix_notifications_utilisateur_id",
        table_name="notifications",
    )

    op.drop_index(
        "ix_notifications_id",
        table_name="notifications",
    )

    op.drop_table(
        "notifications"
    )