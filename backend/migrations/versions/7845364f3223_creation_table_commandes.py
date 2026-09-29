"""creation table commandes

Revision ID: 7845364f3223
Revises: ba85eff4ae30
Create Date: 2026-09-29
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7845364f3223"
down_revision: Union[str, Sequence[str], None] = "ba85eff4ae30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Créer la table commandes."""

    op.create_table(
        "commandes",
        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "acheteur_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "annonce_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "quantite",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "prix_unitaire",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "prix_total",
            sa.Float(),
            nullable=False,
        ),
        sa.Column(
            "statut",
            sa.String(length=30),
            nullable=False,
        ),
        sa.Column(
            "date_commande",
            sa.DateTime(),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["acheteur_id"],
            ["utilisateurs.id"],
            name="commandes_acheteur_id_fkey",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["annonce_id"],
            ["annonces.id"],
            name="commandes_annonce_id_fkey",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    """Supprimer la table commandes."""

    op.drop_table("commandes")