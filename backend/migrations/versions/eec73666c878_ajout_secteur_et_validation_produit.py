"""ajout secteur et validation produit

Revision ID: eec73666c878
Revises: 836e2728b23e
Create Date: 2026-09-29
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "eec73666c878"
down_revision: Union[str, Sequence[str], None] = "836e2728b23e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Ajouter les champs secteur et est_valide à produits."""

    op.add_column(
        "produits",
        sa.Column(
            "secteur",
            sa.String(length=40),
            nullable=False,
            server_default="agricole",
        ),
    )

    op.add_column(
        "produits",
        sa.Column(
            "est_valide",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    """Supprimer les champs secteur et est_valide."""

    op.drop_column("produits", "est_valide")
    op.drop_column("produits", "secteur")