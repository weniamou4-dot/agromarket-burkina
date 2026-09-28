from __future__ import annotations

from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Categorie, Famille, Produit


# ============================================================
# AGROMARKET BURKINA
# CATEGORIES / SERVICES
# ============================================================


# ============================================================
# EXCEPTIONS
# ============================================================

class CategoryServiceError(Exception):
    """Erreur générale du service."""


class CategoryNotFoundError(CategoryServiceError):
    """Catégorie introuvable."""


class FamilleNotFoundError(CategoryServiceError):
    """Famille introuvable."""


class CategoryConflictError(CategoryServiceError):
    """Conflit lors de la création ou modification."""


class CategoryValidationError(CategoryServiceError):
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
        raise CategoryValidationError(
            "Le nom est obligatoire."
        )

    return nom


# ============================================================
# FAMILLE
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


def creer_famille(
    db: Session,
    nom: str,
    description: str | None = None,
) -> Famille:

    nom = normaliser_nom(nom)

    existante = (
        db.query(Famille)
        .filter(
            func.lower(
                Famille.nom
            ) == nom.lower()
        )
        .first()
    )

    if existante:
        raise CategoryConflictError(
            "Cette famille existe déjà."
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

        autre = (
            db.query(Famille)
            .filter(
                func.lower(
                    Famille.nom
                ) == nom.lower(),
                Famille.id != famille_id,
            )
            .first()
        )

        if autre:
            raise CategoryConflictError(
                "Une autre famille possède déjà ce nom."
            )

        famille.nom = nom

    if description is not None:
        famille.description = (
            nettoyer_texte(description)
        )

    db.flush()

    return famille


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
        raise CategoryConflictError(
            "Impossible de supprimer cette famille "
            "car elle contient des catégories."
        )

    db.delete(famille)
    db.flush()


# ============================================================
# CATÉGORIE
# ============================================================

def obtenir_categorie(
    db: Session,
    categorie_id: int,
) -> Categorie:

    categorie = (
        db.query(Categorie)
        .filter(
            Categorie.id == categorie_id
        )
        .first()
    )

    if categorie is None:
        raise CategoryNotFoundError(
            "Catégorie introuvable."
        )

    return categorie


def lister_categories(
    db: Session,
    famille_id: int | None = None,
) -> list[Categorie]:

    query = db.query(Categorie)

    if famille_id is not None:

        obtenir_famille(
            db,
            famille_id,
        )

        query = query.filter(
            Categorie.famille_id
            == famille_id
        )

    return (
        query
        .order_by(
            Categorie.nom.asc()
        )
        .all()
    )


def creer_categorie(
    db: Session,
    nom: str,
    famille_id: int,
    description: str | None = None,
) -> Categorie:

    nom = normaliser_nom(nom)

    famille = obtenir_famille(
        db,
        famille_id,
    )

    existante = (
        db.query(Categorie)
        .filter(
            Categorie.famille_id
            == famille.id,
            func.lower(
                Categorie.nom
            ) == nom.lower(),
        )
        .first()
    )

    if existante:
        raise CategoryConflictError(
            "Cette catégorie existe déjà dans cette famille."
        )

    categorie = Categorie(
        nom=nom,
        description=nettoyer_texte(
            description
        ),
        famille_id=famille.id,
    )

    db.add(categorie)
    db.flush()

    return categorie


def modifier_categorie(
    db: Session,
    categorie_id: int,
    nom: str | None = None,
    description: str | None = None,
    famille_id: int | None = None,
) -> Categorie:

    categorie = obtenir_categorie(
        db,
        categorie_id,
    )

    nouvelle_famille_id = (
        famille_id
        if famille_id is not None
        else categorie.famille_id
    )

    obtenir_famille(
        db,
        nouvelle_famille_id,
    )

    if nom is not None:

        nom = normaliser_nom(nom)

        autre = (
            db.query(Categorie)
            .filter(
                Categorie.famille_id
                == nouvelle_famille_id,
                func.lower(
                    Categorie.nom
                ) == nom.lower(),
                Categorie.id != categorie_id,
            )
            .first()
        )

        if autre:
            raise CategoryConflictError(
                "Une catégorie portant ce nom existe déjà dans cette famille."
            )

        categorie.nom = nom

    if description is not None:
        categorie.description = (
            nettoyer_texte(description)
        )

    categorie.famille_id = nouvelle_famille_id

    db.flush()

    return categorie


def supprimer_categorie(
    db: Session,
    categorie_id: int,
) -> None:

    categorie = obtenir_categorie(
        db,
        categorie_id,
    )

    nombre_produits = (
        db.query(Produit)
        .filter(
            Produit.categorie_id
            == categorie_id
        )
        .count()
    )

    if nombre_produits > 0:
        raise CategoryConflictError(
            "Impossible de supprimer cette catégorie "
            "car elle contient des produits."
        )

    db.delete(categorie)
    db.flush()


# ============================================================
# STATISTIQUES
# ============================================================

def statistiques_categorie(
    db: Session,
    categorie_id: int,
) -> dict:

    categorie = obtenir_categorie(
        db,
        categorie_id,
    )

    nombre_produits = (
        db.query(Produit)
        .filter(
            Produit.categorie_id
            == categorie.id
        )
        .count()
    )

    return {
        "id": categorie.id,
        "nom": categorie.nom,
        "famille_id": categorie.famille_id,
        "nombre_produits": nombre_produits,
    }


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
            == famille.id
        )
        .count()
    )

    return {
        "id": famille.id,
        "nom": famille.nom,
        "nombre_categories": nombre_categories,
    }