from __future__ import annotations

from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Categorie, Famille


# ============================================================
# AGROMARKET BURKINA
# FAMILLES / SERVICES
# ============================================================


# ============================================================
# EXCEPTIONS
# ============================================================

class FamilleServiceError(Exception):
    """Erreur générale du service familles."""


class FamilleNotFoundError(FamilleServiceError):
    """Famille introuvable."""


class FamilleConflictError(FamilleServiceError):
    """Conflit métier."""


class FamilleValidationError(FamilleServiceError):
    """Erreur de validation."""


# ============================================================
# OUTILS
# ============================================================

def nettoyer_texte(
    valeur: Optional[str],
) -> Optional[str]:

    if valeur is None:
        return None

    valeur = " ".join(
        valeur.strip().split()
    )

    return valeur or None


def normaliser_nom(
    nom: str,
) -> str:

    nom = nettoyer_texte(nom)

    if not nom:
        raise FamilleValidationError(
            "Le nom de la famille est obligatoire."
        )

    return nom


# ============================================================
# OBTENIR UNE FAMILLE
# ============================================================

def obtenir_famille(
    db: Session,
    famille_id: int,
) -> Famille:

    famille = (
        db.query(Famille)
        .filter(
            Famille.id == famille_id
        )
        .first()
    )

    if famille is None:
        raise FamilleNotFoundError(
            "Famille introuvable."
        )

    return famille


# ============================================================
# LISTER LES FAMILLES
# ============================================================

def lister_familles(
    db: Session,
) -> list[Famille]:

    return (
        db.query(Famille)
        .order_by(
            Famille.nom.asc()
        )
        .all()
    )


# ============================================================
# RECHERCHER UNE FAMILLE
# ============================================================

def rechercher_familles(
    db: Session,
    recherche: str,
) -> list[Famille]:

    recherche = nettoyer_texte(
        recherche
    )

    if not recherche:
        return lister_familles(db)

    motif = f"%{recherche}%"

    return (
        db.query(Famille)
        .filter(
            func.lower(
                Famille.nom
            ).like(
                motif.lower()
            )
        )
        .order_by(
            Famille.nom.asc()
        )
        .all()
    )


# ============================================================
# CRÉER UNE FAMILLE
# ============================================================

def creer_famille(
    db: Session,
    nom: str,
    description: str | None = None,
) -> Famille:

    nom = normaliser_nom(nom)

    famille_existante = (
        db.query(Famille)
        .filter(
            func.lower(
                Famille.nom
            ) == nom.lower()
        )
        .first()
    )

    if famille_existante:
        raise FamilleConflictError(
            "Une famille portant ce nom existe déjà."
        )

    famille = Famille(
        nom=nom,
        description=nettoyer_texte(
            description
        ),
    )

    db.add(famille)
    db.flush()

    return famille


# ============================================================
# MODIFIER UNE FAMILLE
# ============================================================

def modifier_famille(
    db: Session,
    famille_id: int,
    nom: str | None = None,
    description: str | None = None,
) -> Famille:

    famille = obtenir_famille(
        db,
        famille_id,
    )

    if nom is not None:

        nom = normaliser_nom(nom)

        autre_famille = (
            db.query(Famille)
            .filter(
                func.lower(
                    Famille.nom
                ) == nom.lower(),
                Famille.id != famille_id,
            )
            .first()
        )

        if autre_famille:
            raise FamilleConflictError(
                "Une autre famille possède déjà ce nom."
            )

        famille.nom = nom

    if description is not None:
        famille.description = (
            nettoyer_texte(
                description
            )
        )

    db.flush()

    return famille


# ============================================================
# SUPPRIMER UNE FAMILLE
# ============================================================

def supprimer_famille(
    db: Session,
    famille_id: int,
) -> None:

    famille = obtenir_famille(
        db,
        famille_id,
    )

    nombre_categories = (
        db.query(Categorie)
        .filter(
            Categorie.famille_id
            == famille_id
        )
        .count()
    )

    if nombre_categories > 0:
        raise FamilleConflictError(
            "Impossible de supprimer cette famille "
            "car elle contient encore des catégories."
        )

    db.delete(famille)
    db.flush()


# ============================================================
# STATISTIQUES
# ============================================================

def statistiques_famille(
    db: Session,
    famille_id: int,
) -> dict:

    famille = obtenir_famille(
        db,
        famille_id,
    )

    nombre_categories = (
        db.query(Categorie)
        .filter(
            Categorie.famille_id
            == famille_id
        )
        .count()
    )

    return {
        "id": famille.id,
        "nom": famille.nom,
        "description": famille.description,
        "nombre_categories": nombre_categories,
    }