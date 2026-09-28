
"""Autoriser le stock des annonces à zéro.

Revision ID: a1b2c3d4e5f6
Revises: 6d87108bab1e
Create Date: 2026-09-14
"""

from alembic import op


# ============================================================
# IDENTIFIANTS ALEMBIC
# ============================================================

revision = "a1b2c3d4e5f6"
down_revision = "6d87108bab1e"
branch_labels = None
depends_on = None


# ============================================================
# MIGRATION
# ============================================================

def upgrade():
    """
    Autorise une annonce à avoir un stock égal à zéro.

    Avant :
        quantite > 0

    Après :
        quantite >= 0

    La quantité d'une commande reste strictement positive.
    """

    op.drop_constraint(
        "ck_annonce_quantite_positive",
        "annonces",
        type_="check",
    )

    op.create_check_constraint(
        "ck_annonce_quantite_non_negative",
        "annonces",
        "quantite >= 0",
    )


def downgrade():
    """
    Restaure la contrainte précédente.

    Attention :
    si des annonces ont déjà quantite = 0, le downgrade
    échouera volontairement au niveau PostgreSQL.
    """

    op.drop_constraint(
        "ck_annonce_quantite_non_negative",
        "annonces",
        type_="check",
    )

    op.create_check_constraint(
        "ck_annonce_quantite_positive",
        "annonces",
        "quantite > 0",
    )
