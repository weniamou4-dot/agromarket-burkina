"""
Création de la table avis_plateforme

Revision ID: 323avisplateforme
Revises: 322af15a6e5f
Create Date: 2026-09-29
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# ============================================================
# IDENTIFIANTS ALEMBIC
# ============================================================

revision: str = "323avisplateforme"
down_revision: Union[str, Sequence[str], None] = "322af15a6e5f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ============================================================
# UPGRADE
# ============================================================

def upgrade() -> None:
    """
    Crée la table avis_plateforme.
    """

    op.create_table(
        "avis_plateforme",

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

        sa.ForeignKeyConstraint(
            ["utilisateur_id"],
            ["utilisateurs.id"],
            ondelete="CASCADE",
        ),

        sa.PrimaryKeyConstraint(
            "id"
        ),

        sa.CheckConstraint(
            "note >= 1 AND note <= 5",
            name="ck_avis_plateforme_note",
        ),
    )

    # --------------------------------------------------------
    # INDEX
    # --------------------------------------------------------

    op.create_index(
        "ix_avis_plateforme_id",
        "avis_plateforme",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_avis_plateforme_utilisateur_id",
        "avis_plateforme",
        ["utilisateur_id"],
        unique=False,
    )

    op.create_index(
        "ix_avis_plateforme_est_visible",
        "avis_plateforme",
        ["est_visible"],
        unique=False,
    )

    op.create_index(
        "ix_avis_plateforme_date_creation",
        "avis_plateforme",
        ["date_creation"],
        unique=False,
    )


# ============================================================
# DOWNGRADE
# ============================================================

def downgrade() -> None:
    """
    Supprime la table avis_plateforme.
    """

    op.drop_index(
        "ix_avis_plateforme_date_creation",
        table_name="avis_plateforme",
    )

    op.drop_index(
        "ix_avis_plateforme_est_visible",
        table_name="avis_plateforme",
    )

    op.drop_index(
        "ix_avis_plateforme_utilisateur_id",
        table_name="avis_plateforme",
    )

    op.drop_index(
        "ix_avis_plateforme_id",
        table_name="avis_plateforme",
    )

    op.drop_table(
        "avis_plateforme"
    )