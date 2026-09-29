"""creation tables demandes vendeur et images annonces

Revision ID: 836e2728b23e
Revises: 10105f54ddb3
Create Date: 2026-09-29
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "836e2728b23e"
down_revision: Union[str, Sequence[str], None] = "10105f54ddb3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Créer les tables demandes_vendeur et images_annonces."""

    # ========================================================
    # DEMANDES VENDEUR
    # ========================================================

    op.create_table(
        "demandes_vendeur",
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
            "statut",
            sa.String(length=30),
            nullable=False,
        ),
        sa.Column(
            "motif",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "date_demande",
            sa.DateTime(),
            nullable=True,
        ),
        sa.Column(
            "date_traitement",
            sa.DateTime(),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["utilisateur_id"],
            ["utilisateurs.id"],
            name="demandes_vendeur_utilisateur_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # ========================================================
    # IMAGES ANNONCES
    # ========================================================

    op.create_table(
        "images_annonces",
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
            "url",
            sa.String(length=500),
            nullable=False,
        ),
        sa.Column(
            "date_creation",
            sa.DateTime(),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["annonce_id"],
            ["annonces.id"],
            name="images_annonces_annonce_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    """Supprimer les tables images_annonces et demandes_vendeur."""

    op.drop_table("images_annonces")
    op.drop_table("demandes_vendeur")