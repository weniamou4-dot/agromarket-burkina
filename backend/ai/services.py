from __future__ import annotations

import os
import unicodedata
from typing import Any

from rapidfuzz import fuzz, process
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from models import Annonce, Categorie, Famille, Produit


# ============================================================
# CONFIGURATION OPENAI
# ============================================================

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

OPENAI_MODEL = os.getenv(
    "OPENAI_MODEL",
    "gpt-5.6-luna",
)


# ============================================================
# PROMPT AGROMARKET
# ============================================================

SYSTEM_PROMPT = """
Tu es l'assistant officiel d'AgroMarket Burkina.

AgroMarket Burkina est une plateforme burkinabè
de mise en relation autour des produits agricoles
et d'élevage.

Tes réponses doivent être :
- simples ;
- utiles ;
- professionnelles ;
- adaptées au contexte du Burkina Faso ;
- prudentes lorsque l'information n'est pas connue.

Tu peux aider l'utilisateur à :
- rechercher des produits ;
- comprendre les catégories agricoles ;
- préparer une annonce ;
- expliquer le fonctionnement de la plateforme ;
- donner des conseils généraux concernant
  la vente et l'achat de produits agricoles.

Ne présente jamais une information inventée
comme une donnée réelle de la plateforme.

Lorsque les données exactes d'AgroMarket ne sont pas
disponibles, indique clairement que tu ne disposes
pas de cette donnée.
"""


# ============================================================
# NORMALISATION
# ============================================================

def normaliser_texte(texte: str) -> str:
    """
    Normalise un texte pour faciliter la recherche.
    """

    texte = unicodedata.normalize(
        "NFKD",
        texte,
    )

    texte = "".join(
        caractere
        for caractere in texte
        if not unicodedata.combining(caractere)
    )

    return " ".join(
        texte.lower().strip().split()
    )


# ============================================================
# CLIENT OPENAI
# ============================================================

def obtenir_client_openai():
    """
    Initialise le client OpenAI uniquement lorsque
    le service IA est réellement utilisé.

    Cela évite de casser le démarrage de FastAPI
    si la clé API n'est pas configurée.
    """

    if not OPENAI_API_KEY:
        return None

    try:
        from openai import OpenAI

        return OpenAI(
            api_key=OPENAI_API_KEY
        )

    except Exception:
        return None


# ============================================================
# DISPONIBILITÉ IA
# ============================================================

def ai_est_disponible() -> bool:
    """
    Vérifie simplement si le client OpenAI peut être initialisé.
    """

    return obtenir_client_openai() is not None


# ============================================================
# ASSISTANT IA
# ============================================================

def envoyer_message_ia(
    message: str,
) -> dict[str, Any]:
    """
    Envoie un message à l'assistant AgroMarket.
    """

    texte = message.strip()

    if not texte:
        raise ValueError(
            "Le message ne peut pas être vide."
        )

    client = obtenir_client_openai()

    if client is None:
        raise RuntimeError(
            "Le service IA n'est pas configuré. "
            "Ajoutez OPENAI_API_KEY dans le fichier .env."
        )

    try:
        response = client.responses.create(
            model=OPENAI_MODEL,
            instructions=SYSTEM_PROMPT,
            input=texte,
        )

        contenu = getattr(
            response,
            "output_text",
            None,
        )

        if not contenu:
            raise RuntimeError(
                "L'API IA n'a retourné aucun contenu."
            )

        return {
            "success": True,
            "message": contenu.strip(),
            "model": OPENAI_MODEL,
        }

    except Exception as erreur:
        raise RuntimeError(
            f"Erreur du service IA : {erreur}"
        ) from erreur


# ============================================================
# RECHERCHE LOCALE DE PRODUITS
# ============================================================

def rechercher_produits_intelligemment(
    db: Session,
    recherche: str,
    region: str | None = None,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """
    Recherche des produits publics avec :

    1. filtrage SQL ;
    2. normalisation ;
    3. score RapidFuzz.

    Seuls les produits validés et liés à des annonces
    publiées sont pris en compte.
    """

    texte = recherche.strip()

    if not texte:
        return []

    texte_normalise = normaliser_texte(
        texte
    )

    query = (
        db.query(
            Produit
        )
        .join(
            Annonce,
            Annonce.produit_id == Produit.id,
        )
        .options(
            selectinload(
                Produit.categorie
            )
            .selectinload(
                Categorie.famille
            )
        )
        .filter(
            Produit.est_valide.is_(True),
            Annonce.statut == "publiee",
        )
    )

    if region:
        query = query.filter(
            Annonce.region.ilike(
                f"%{region.strip()}%"
            )
        )

    # --------------------------------------------------------
    # PRÉ-FILTRAGE SQL
    # --------------------------------------------------------

    termes = [
        terme
        for terme in texte_normalise.split()
        if terme
    ]

    if termes:
        conditions = []

        for terme in termes:
            motif = f"%{terme}%"

            conditions.extend(
                [
                    Produit.nom.ilike(motif),
                    Produit.description.ilike(motif),
                    Categorie.nom.ilike(motif),
                    Famille.nom.ilike(motif),
                ]
            )

        query = query.join(
            Categorie,
            Produit.categorie_id == Categorie.id,
        ).join(
            Famille,
            Categorie.famille_id == Famille.id,
        ).filter(
            or_(*conditions)
        )

    produits = (
        query
        .distinct()
        .limit(100)
        .all()
    )

    if not produits:
        return []

    # --------------------------------------------------------
    # SCORE RAPIDFUZZ
    # --------------------------------------------------------

    resultats = []

    for produit in produits:
        nom = produit.nom or ""

        score_nom = fuzz.token_set_ratio(
            texte_normalise,
            normaliser_texte(nom),
        )

        description = (
            produit.description
            or ""
        )

        score_description = fuzz.partial_ratio(
            texte_normalise,
            normaliser_texte(description),
        )

        score = (
            score_nom * 0.80
            + score_description * 0.20
        )

        resultats.append(
            {
                "id": produit.id,
                "nom": produit.nom,
                "categorie_id": produit.categorie_id,
                "type_produit": produit.type_produit,
                "score": round(
                    float(score),
                    2,
                ),
            }
        )

    resultats.sort(
        key=lambda item: item["score"],
        reverse=True,
    )

    return resultats[:limit]


# ============================================================
# SUGGESTIONS DE TERMES
# ============================================================

def suggerer_noms_produits(
    db: Session,
    recherche: str,
    limit: int = 5,
) -> list[str]:
    """
    Retourne des noms de produits proches
    de la recherche.
    """

    texte = recherche.strip()

    if not texte:
        return []

    produits = (
        db.query(
            Produit.nom
        )
        .join(
            Annonce,
            Annonce.produit_id == Produit.id,
        )
        .filter(
            Produit.est_valide.is_(True),
            Annonce.statut == "publiee",
        )
        .distinct()
        .all()
    )

    noms = [
        nom
        for (nom,) in produits
        if nom
    ]

    if not noms:
        return []

    correspondances = process.extract(
        texte,
        noms,
        scorer=fuzz.WRatio,
        limit=limit,
    )

    return [
        nom
        for nom, score, _ in correspondances
        if score >= 55
    ]