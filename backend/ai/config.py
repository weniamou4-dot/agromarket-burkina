# ============================================================
# AGROMARKET BURKINA
# AI / CONFIGURATION
# ============================================================

import os

from dotenv import load_dotenv


# ============================================================
# CHARGEMENT DES VARIABLES D'ENVIRONNEMENT
# ============================================================

load_dotenv()


# ============================================================
# CONFIGURATION OPENAI
# ============================================================

OPENAI_API_KEY = os.getenv(
    "OPENAI_API_KEY"
)

OPENAI_MODEL = os.getenv(
    "OPENAI_MODEL"
)


# ============================================================
# VÉRIFICATION
# ============================================================

if not OPENAI_API_KEY:
    print(
        "⚠️ OPENAI_API_KEY non configurée."
    )


if not OPENAI_MODEL:
    print(
        "⚠️ OPENAI_MODEL non configuré."
    )