"""ajout localisation annonce manquante

Revision ID: 322af15a6e5f
Revises: a1b2c3d4e5f6
Create Date: 2026-09-29
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = "322af15a6e5f"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _get_inspector():
    """Retourner l'inspecteur de la connexion courante."""
    return inspect(op.get_bind())


def _column_exists(inspector, table_name: str, column_name: str) -> bool:
    """Vérifier si une colonne existe."""
    columns = inspector.get_columns(table_name)
    return any(column["name"] == column_name for column in columns)


def _index_exists(inspector, table_name: str, index_name: str) -> bool:
    """Vérifier si un index existe."""
    indexes = inspector.get_indexes(table_name)
    return any(index["name"] == index_name for index in indexes)


def _check_constraint_exists(
    inspector,
    table_name: str,
    constraint_name: str,
) -> bool:
    """Vérifier si une contrainte CHECK existe."""
    constraints = inspector.get_check_constraints(table_name)
    return any(
        constraint.get("name") == constraint_name
        for constraint in constraints
    )


def upgrade() -> None:
    """Ajouter les informations de localisation manquantes aux annonces."""

    inspector = _get_inspector()

    # ========================================================
    # COLONNE TYPE DE LOCALISATION
    # ========================================================

    if not _column_exists(
        inspector,
        "annonces",
        "type_localisation",
    ):
        op.add_column(
            "annonces",
            sa.Column(
                "type_localisation",
                sa.String(length=30),
                nullable=False,
                server_default="domicile",
            ),
        )

    # ========================================================
    # COLONNE VISIBILITÉ DE LOCALISATION
    # ========================================================

    if not _column_exists(
        inspector,
        "annonces",
        "visibilite_localisation",
    ):
        op.add_column(
            "annonces",
            sa.Column(
                "visibilite_localisation",
                sa.String(length=20),
                nullable=False,
                server_default="privee",
            ),
        )

    # Rafraîchir l'inspecteur après l'ajout éventuel des colonnes.
    inspector = _get_inspector()

    # ========================================================
    # INDEX TYPE LOCALISATION
    # ========================================================

    if not _index_exists(
        inspector,
        "annonces",
        "ix_annonces_type_localisation",
    ):
        op.create_index(
            "ix_annonces_type_localisation",
            "annonces",
            ["type_localisation"],
            unique=False,
        )

    # ========================================================
    # INDEX VISIBILITÉ LOCALISATION
    # ========================================================

    if not _index_exists(
        inspector,
        "annonces",
        "ix_annonces_visibilite_localisation",
    ):
        op.create_index(
            "ix_annonces_visibilite_localisation",
            "annonces",
            ["visibilite_localisation"],
            unique=False,
        )

    # ========================================================
    # CONTRAINTE TYPE LOCALISATION
    # ========================================================

    inspector = _get_inspector()

    if not _check_constraint_exists(
        inspector,
        "annonces",
        "ck_annonce_type_localisation",
    ):
        op.create_check_constraint(
            "ck_annonce_type_localisation",
            "annonces",
            """
            type_localisation IN (
                'domicile',
                'point_vente',
                'point_rencontre'
            )
            """,
        )

    # ========================================================
    # CONTRAINTE VISIBILITÉ
    # ========================================================

    inspector = _get_inspector()

    if not _check_constraint_exists(
        inspector,
        "annonces",
        "ck_annonce_visibilite_localisation",
    ):
        op.create_check_constraint(
            "ck_annonce_visibilite_localisation",
            "annonces",
            """
            visibilite_localisation IN (
                'privee',
                'publique'
            )
            """,
        )

    # ========================================================
    # DOMICILE = LOCALISATION PRIVÉE
    # ========================================================

    inspector = _get_inspector()

    if not _check_constraint_exists(
        inspector,
        "annonces",
        "ck_annonce_domicile_prive",
    ):
        op.create_check_constraint(
            "ck_annonce_domicile_prive",
            "annonces",
            """
            type_localisation <> 'domicile'
            OR visibilite_localisation = 'privee'
            """,
        )

    # ========================================================
    # SUPPRESSION DES DEFAULTS SERVEUR
    # ========================================================

    op.alter_column(
        "annonces",
        "type_localisation",
        server_default=None,
    )

    op.alter_column(
        "annonces",
        "visibilite_localisation",
        server_default=None,
    )


def downgrade() -> None:
    """Supprimer les informations de localisation ajoutées."""

    inspector = _get_inspector()

    if _check_constraint_exists(
        inspector,
        "annonces",
        "ck_annonce_domicile_prive",
    ):
        op.drop_constraint(
            "ck_annonce_domicile_prive",
            "annonces",
            type_="check",
        )

    inspector = _get_inspector()

    if _check_constraint_exists(
        inspector,
        "annonces",
        "ck_annonce_visibilite_localisation",
    ):
        op.drop_constraint(
            "ck_annonce_visibilite_localisation",
            "annonces",
            type_="check",
        )

    inspector = _get_inspector()

    if _check_constraint_exists(
        inspector,
        "annonces",
        "ck_annonce_type_localisation",
    ):
        op.drop_constraint(
            "ck_annonce_type_localisation",
            "annonces",
            type_="check",
        )

    inspector = _get_inspector()

    if _index_exists(
        inspector,
        "annonces",
        "ix_annonces_visibilite_localisation",
    ):
        op.drop_index(
            "ix_annonces_visibilite_localisation",
            table_name="annonces",
        )

    inspector = _get_inspector()

    if _index_exists(
        inspector,
        "annonces",
        "ix_annonces_type_localisation",
    ):
        op.drop_index(
            "ix_annonces_type_localisation",
            table_name="annonces",
        )

    inspector = _get_inspector()

    if _column_exists(
        inspector,
        "annonces",
        "visibilite_localisation",
    ):
        op.drop_column(
            "annonces",
            "visibilite_localisation",
        )

    inspector = _get_inspector()

    if _column_exists(
        inspector,
        "annonces",
        "type_localisation",
    ):
        op.drop_column(
            "annonces",
            "type_localisation",
        )