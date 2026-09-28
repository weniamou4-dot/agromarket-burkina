
"""ajout messagerie conversations messages

Revision ID: 6d87108bab1e
Revises: 9b8983d30749
Create Date: 2026-09-16 00:27:44.252273

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# ============================================================
# REVISION IDENTIFIERS
# ============================================================

revision: str = "6d87108bab1e"
down_revision: Union[str, Sequence[str], None] = "9b8983d30749"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ============================================================
# UPGRADE
# ============================================================

def upgrade() -> None:
    """
    Création des tables de messagerie :

    - conversations
    - messages

    Les conversations dépendent des utilisateurs et éventuellement
    d'une annonce.
    Les messages dépendent des conversations et des utilisateurs.
    """

    # --------------------------------------------------------
    # TABLE : conversations
    # --------------------------------------------------------

    op.create_table(
        "conversations",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            nullable=False,
        ),

        sa.Column(
            "annonce_id",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "vendeur_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "acheteur_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "date_creation",
            sa.DateTime(),
            nullable=False,
        ),

        sa.Column(
            "date_modification",
            sa.DateTime(),
            nullable=False,
        ),

        sa.Column(
            "derniere_activite",
            sa.DateTime(),
            nullable=False,
        ),

        sa.Column(
            "est_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),

        sa.ForeignKeyConstraint(
            ["annonce_id"],
            ["annonces.id"],
            name="fk_conversations_annonce_id_annonces",
            ondelete="SET NULL",
        ),

        sa.ForeignKeyConstraint(
            ["vendeur_id"],
            ["utilisateurs.id"],
            name="fk_conversations_vendeur_id_utilisateurs",
            ondelete="CASCADE",
        ),

        sa.ForeignKeyConstraint(
            ["acheteur_id"],
            ["utilisateurs.id"],
            name="fk_conversations_acheteur_id_utilisateurs",
            ondelete="CASCADE",
        ),

        sa.UniqueConstraint(
            "annonce_id",
            "vendeur_id",
            "acheteur_id",
            name="uq_conversations_annonce_vendeur_acheteur",
        ),
    )

    # --------------------------------------------------------
    # INDEX CONVERSATIONS
    # --------------------------------------------------------

    op.create_index(
        "ix_conversations_annonce_id",
        "conversations",
        ["annonce_id"],
        unique=False,
    )

    op.create_index(
        "ix_conversations_vendeur_acheteur",
        "conversations",
        ["vendeur_id", "acheteur_id"],
        unique=False,
    )

    op.create_index(
        "ix_conversations_derniere_activite",
        "conversations",
        ["derniere_activite"],
        unique=False,
    )

    # --------------------------------------------------------
    # TABLE : messages
    # --------------------------------------------------------

    op.create_table(
        "messages",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            nullable=False,
        ),

        sa.Column(
            "conversation_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "expediteur_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "contenu",
            sa.Text(),
            nullable=False,
        ),

        sa.Column(
            "est_lu",
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
            "date_creation",
            sa.DateTime(),
            nullable=False,
        ),

        sa.ForeignKeyConstraint(
            ["conversation_id"],
            ["conversations.id"],
            name="fk_messages_conversation_id_conversations",
            ondelete="CASCADE",
        ),

        sa.ForeignKeyConstraint(
            ["expediteur_id"],
            ["utilisateurs.id"],
            name="fk_messages_expediteur_id_utilisateurs",
            ondelete="CASCADE",
        ),
    )

    # --------------------------------------------------------
    # INDEX MESSAGES
    # --------------------------------------------------------

    op.create_index(
        "ix_messages_conversation_date",
        "messages",
        ["conversation_id", "date_creation"],
        unique=False,
    )

    op.create_index(
        "ix_messages_expediteur_date",
        "messages",
        ["expediteur_id", "date_creation"],
        unique=False,
    )

    op.create_index(
        "ix_messages_conversation_lu",
        "messages",
        ["conversation_id", "est_lu"],
        unique=False,
    )


# ============================================================
# DOWNGRADE
# ============================================================

def downgrade() -> None:
    """
    Suppression propre des tables de messagerie.
    """

    # Les messages dépendent des conversations.
    op.drop_index(
        "ix_messages_conversation_lu",
        table_name="messages",
    )

    op.drop_index(
        "ix_messages_expediteur_date",
        table_name="messages",
    )

    op.drop_index(
        "ix_messages_conversation_date",
        table_name="messages",
    )

    op.drop_table("messages")

    op.drop_index(
        "ix_conversations_derniere_activite",
        table_name="conversations",
    )

    op.drop_index(
        "ix_conversations_vendeur_acheteur",
        table_name="conversations",
    )

    op.drop_index(
        "ix_conversations_annonce_id",
        table_name="conversations",
    )

    op.drop_table("conversations")
