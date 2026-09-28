from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from database import Base


def utc_now():
    """Retourne la date/heure UTC actuelle."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AvisPlateforme(Base):
    """
    Avis global d'un utilisateur sur la plateforme AgroMarket Burkina.

    Ce modèle est volontairement séparé du modèle `Avis` existant,
    qui concerne les avis liés aux annonces/commandes.
    """

    __tablename__ = "avis_plateforme"

    # ============================================================
    # IDENTIFIANT
    # ============================================================

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ============================================================
    # UTILISATEUR
    # ============================================================

    utilisateur_id = Column(
        Integer,
        ForeignKey(
            "utilisateurs.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    utilisateur = relationship(
        "Utilisateur",
        back_populates="avis_plateforme",
        foreign_keys=[utilisateur_id],
    )

    # ============================================================
    # ÉVALUATION
    # ============================================================

    note = Column(
        Integer,
        nullable=False,
    )

    # ============================================================
    # COMMENTAIRE
    # ============================================================

    commentaire = Column(
        Text,
        nullable=True,
    )

    # ============================================================
    # MODÉRATION / VISIBILITÉ
    # ============================================================

    est_visible = Column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )

    # ============================================================
    # DATES
    # ============================================================

    date_creation = Column(
        DateTime,
        nullable=False,
        default=utc_now,
        index=True,
    )

    date_modification = Column(
        DateTime,
        nullable=True,
    )

    # ============================================================
    # CONTRAINTES
    # ============================================================

    __table_args__ = (

        # Note obligatoire entre 1 et 5
        CheckConstraint(
            "note >= 1 AND note <= 5",
            name="ck_avis_plateforme_note",
        ),

        # Un utilisateur possède un seul avis actuel
        # sur la plateforme.
        UniqueConstraint(
            "utilisateur_id",
            name="uq_avis_plateforme_utilisateur",
        ),

        # Optimisation pour l'affichage public
        Index(
            "ix_avis_plateforme_visible_date",
            "est_visible",
            "date_creation",
        ),

    )