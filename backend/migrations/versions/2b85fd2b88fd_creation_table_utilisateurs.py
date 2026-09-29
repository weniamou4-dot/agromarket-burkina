"""creation table utilisateurs

Revision ID: 2b85fd2b88fd
Revises:
Create Date: 2026-08-21 11:17:11.130954

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2b85fd2b88fd"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Créer la table initiale utilisateurs."""

    op.create_table(
        "utilisateurs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nom", sa.String(length=100), nullable=False),
        sa.Column("telephone", sa.String(length=20), nullable=False),
        sa.Column("google_id", sa.String(length=255), nullable=True),
        sa.Column("photo_profil", sa.String(length=255), nullable=True),
        sa.Column("role", sa.String(length=30), nullable=False),
        sa.Column("statut_compte", sa.String(length=30), nullable=False),
        sa.Column("email_verifie", sa.Boolean(), nullable=False),
        sa.Column("telephone_verifie", sa.Boolean(), nullable=False),
        sa.Column(
            "confidentialite_acceptee",
            sa.Boolean(),
            nullable=False,
        ),
        sa.Column(
            "date_acceptation_confidentialite",
            sa.DateTime(),
            nullable=True,
        ),
        sa.Column(
            "version_confidentialite",
            sa.String(length=20),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "telephone",
            name="utilisateurs_telephone_key",
        ),
        sa.UniqueConstraint(
            "google_id",
        ),
    )

    op.create_index(
        "ix_utilisateurs_id",
        "utilisateurs",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_utilisateurs_google_id",
        "utilisateurs",
        ["google_id"],
        unique=False,
    )

    op.create_index(
        "ix_utilisateurs_confidentialite_acceptee",
        "utilisateurs",
        ["confidentialite_acceptee"],
        unique=False,
    )


def downgrade() -> None:
    """Supprimer la table initiale utilisateurs."""

    op.drop_index(
        "ix_utilisateurs_confidentialite_acceptee",
        table_name="utilisateurs",
    )

    op.drop_index(
        "ix_utilisateurs_google_id",
        table_name="utilisateurs",
    )

    op.drop_index(
        "ix_utilisateurs_id",
        table_name="utilisateurs",
    )

    op.drop_table("utilisateurs")