"""ajout dates utilisateur

Revision ID: fe12e0e69b98
Revises: 91cdef44d8a1
Create Date: 2026-09-29
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "fe12e0e69b98"
down_revision: Union[str, Sequence[str], None] = "91cdef44d8a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Ajouter les dates utilisateur manquantes."""

    op.add_column(
        "utilisateurs",
        sa.Column(
            "date_modification",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )

    op.add_column(
        "utilisateurs",
        sa.Column(
            "dernier_login",
            sa.DateTime(),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Supprimer les dates utilisateur."""

    op.drop_column(
        "utilisateurs",
        "dernier_login",
    )

    op.drop_column(
        "utilisateurs",
        "date_modification",
    )