# ============================================================
# AGROMARKET BURKINA
# SERVICE D'ENVOI D'EMAILS
# ============================================================
#
# Responsabilités :
# - Envoi des emails transactionnels
# - Email de réinitialisation du mot de passe
# - Configuration SMTP via variables d'environnement
# - Aucun mot de passe SMTP en dur dans le code
#
# ============================================================

from __future__ import annotations

import logging
import os
import smtplib
from email.message import EmailMessage
from urllib.parse import urlencode


# ============================================================
# LOGGING
# ============================================================

logger = logging.getLogger(__name__)


# ============================================================
# CONFIGURATION SMTP
# ============================================================

SMTP_HOST = os.getenv(
    "SMTP_HOST",
    "smtp.gmail.com",
)

SMTP_PORT = int(
    os.getenv(
        "SMTP_PORT",
        "587",
    )
)

SMTP_USERNAME = os.getenv(
    "SMTP_USERNAME",
    "",
)

SMTP_PASSWORD = os.getenv(
    "SMTP_PASSWORD",
    "",
)

SMTP_FROM_EMAIL = os.getenv(
    "SMTP_FROM_EMAIL",
    SMTP_USERNAME,
)

SMTP_FROM_NAME = os.getenv(
    "SMTP_FROM_NAME",
    "AgroMarket Burkina",
)

FRONTEND_RESET_PASSWORD_URL = os.getenv(
    "FRONTEND_RESET_PASSWORD_URL",
    "http://localhost:5173/reset-password",
)

SMTP_TIMEOUT = int(
    os.getenv(
        "SMTP_TIMEOUT",
        "20",
    )
)


# ============================================================
# DIAGNOSTIC TEMPORAIRE
# ============================================================
#
# Ces informations permettent de vérifier que le fichier .env
# est correctement chargé.
#
# IMPORTANT :
# - Le mot de passe lui-même n'est JAMAIS affiché.
# - Ce bloc pourra être supprimé après les tests.
#
# ============================================================

print("========================================")
print("CONFIGURATION EMAIL AGROMARKET")
print("========================================")
print("SMTP_HOST :", SMTP_HOST)
print("SMTP_PORT :", SMTP_PORT)
print("SMTP_USERNAME :", SMTP_USERNAME)
print(
    "SMTP_PASSWORD configuré :",
    bool(SMTP_PASSWORD),
)
print("SMTP_FROM_EMAIL :", SMTP_FROM_EMAIL)
print("SMTP_FROM_NAME :", SMTP_FROM_NAME)
print(
    "FRONTEND_RESET_PASSWORD_URL :",
    FRONTEND_RESET_PASSWORD_URL,
)
print("========================================")


# ============================================================
# EXCEPTION PERSONNALISÉE
# ============================================================

class EmailServiceError(Exception):
    """
    Exception levée lorsqu'un email ne peut pas être envoyé.
    """

    pass


# ============================================================
# VALIDATION DE LA CONFIGURATION
# ============================================================

def verifier_configuration_email() -> None:
    """
    Vérifie que les paramètres SMTP essentiels sont présents.
    """

    configuration_manquante = []

    if not SMTP_HOST:
        configuration_manquante.append(
            "SMTP_HOST"
        )

    if not SMTP_PORT:
        configuration_manquante.append(
            "SMTP_PORT"
        )

    if not SMTP_USERNAME:
        configuration_manquante.append(
            "SMTP_USERNAME"
        )

    if not SMTP_PASSWORD:
        configuration_manquante.append(
            "SMTP_PASSWORD"
        )

    if not SMTP_FROM_EMAIL:
        configuration_manquante.append(
            "SMTP_FROM_EMAIL"
        )

    if configuration_manquante:
        raise EmailServiceError(
            "Configuration SMTP incomplète. "
            "Variables manquantes : "
            + ", ".join(configuration_manquante)
        )


# ============================================================
# CONSTRUCTION DU LIEN DE RÉINITIALISATION
# ============================================================

def construire_lien_reinitialisation(
    token: str,
) -> str:
    """
    Construit l'URL frontend permettant de réinitialiser
    le mot de passe.

    Le token brut est uniquement placé dans le lien envoyé
    à l'utilisateur. Il n'est jamais enregistré en clair
    dans la base de données.
    """

    if not token:
        raise EmailServiceError(
            "Le token de réinitialisation est obligatoire."
        )

    params = urlencode(
        {
            "token": token,
        }
    )

    separateur = (
        "&"
        if "?" in FRONTEND_RESET_PASSWORD_URL
        else "?"
    )

    return (
        f"{FRONTEND_RESET_PASSWORD_URL}"
        f"{separateur}"
        f"{params}"
    )


# ============================================================
# CONSTRUCTION DE L'EMAIL
# ============================================================

def construire_email_reinitialisation(
    destinataire: str,
    lien_reinitialisation: str,
) -> EmailMessage:
    """
    Construit l'email HTML et texte pour la
    réinitialisation du mot de passe.
    """

    if not destinataire:
        raise EmailServiceError(
            "L'adresse email du destinataire est obligatoire."
        )

    if not lien_reinitialisation:
        raise EmailServiceError(
            "Le lien de réinitialisation est obligatoire."
        )

    message = EmailMessage()

    # --------------------------------------------------------
    # EN-TÊTES
    # --------------------------------------------------------

    message["Subject"] = (
        "Réinitialisation de votre mot de passe "
        "– AgroMarket Burkina"
    )

    message["From"] = (
        f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
    )

    message["To"] = destinataire

    # --------------------------------------------------------
    # VERSION TEXTE
    # --------------------------------------------------------

    contenu_texte = f"""
Bonjour,

Vous avez demandé la réinitialisation de votre mot de passe
sur AgroMarket Burkina.

Cliquez sur le lien suivant pour définir un nouveau mot de passe :

{lien_reinitialisation}

Ce lien est valable pendant une durée limitée.

Si vous n'êtes pas à l'origine de cette demande, vous pouvez
simplement ignorer cet email.

Pour votre sécurité, ne communiquez jamais ce lien à une autre
personne.

Cordialement,

L'équipe AgroMarket Burkina
"""

    message.set_content(
        contenu_texte.strip()
    )

    # --------------------------------------------------------
    # VERSION HTML
    # --------------------------------------------------------

    contenu_html = f"""
<!DOCTYPE html>

<html lang="fr">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        Réinitialisation du mot de passe
    </title>

</head>

<body
    style="
        margin: 0;
        padding: 0;
        background-color: #f5f7fa;
        font-family: Arial, Helvetica, sans-serif;
    "
>

    <div
        style="
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        "
    >

        <!-- EN-TÊTE -->

        <div
            style="
                padding: 30px;
                text-align: center;
                background-color: #ffffff;
                border-bottom: 1px solid #eeeeee;
            "
        >

            <h1
                style="
                    margin: 0;
                    font-size: 26px;
                    color: #1f2937;
                "
            >
                AgroMarket Burkina
            </h1>

            <p
                style="
                    margin-top: 8px;
                    margin-bottom: 0;
                    color: #6b7280;
                    font-size: 14px;
                "
            >
                La plateforme agricole burkinabè
            </p>

        </div>


        <!-- CONTENU -->

        <div
            style="
                padding: 35px 30px;
                color: #374151;
            "
        >

            <h2
                style="
                    margin-top: 0;
                    color: #111827;
                    font-size: 22px;
                "
            >
                Réinitialisation du mot de passe
            </h2>

            <p
                style="
                    font-size: 15px;
                    line-height: 1.7;
                "
            >
                Bonjour,
            </p>

            <p
                style="
                    font-size: 15px;
                    line-height: 1.7;
                "
            >
                Vous avez demandé la réinitialisation de votre
                mot de passe sur
                <strong>AgroMarket Burkina</strong>.
            </p>

            <p
                style="
                    font-size: 15px;
                    line-height: 1.7;
                "
            >
                Cliquez sur le bouton ci-dessous pour définir
                un nouveau mot de passe :
            </p>


            <!-- BOUTON -->

            <div
                style="
                    text-align: center;
                    margin: 30px 0;
                "
            >

                <a
                    href="{lien_reinitialisation}"
                    style="
                        display: inline-block;
                        padding: 14px 28px;
                        background-color: #16a34a;
                        color: #ffffff;
                        text-decoration: none;
                        border-radius: 8px;
                        font-size: 15px;
                        font-weight: bold;
                    "
                >
                    Réinitialiser mon mot de passe
                </a>

            </div>


            <!-- LIEN DE SECOURS -->

            <p
                style="
                    font-size: 13px;
                    line-height: 1.6;
                    color: #6b7280;
                "
            >
                Si le bouton ne fonctionne pas, vous pouvez
                copier et coller le lien suivant dans votre
                navigateur :
            </p>

            <p
                style="
                    font-size: 12px;
                    line-height: 1.6;
                    word-break: break-all;
                    color: #2563eb;
                "
            >
                {lien_reinitialisation}
            </p>


            <!-- SÉCURITÉ -->

            <div
                style="
                    margin-top: 25px;
                    padding: 15px;
                    background-color: #f9fafb;
                    border-radius: 8px;
                    border: 1px solid #e5e7eb;
                "
            >

                <p
                    style="
                        margin: 0;
                        font-size: 13px;
                        line-height: 1.6;
                        color: #6b7280;
                    "
                >
                    Pour votre sécurité, ne communiquez jamais
                    votre lien de réinitialisation à une autre
                    personne.
                </p>

            </div>

        </div>


        <!-- PIED DE PAGE -->

        <div
            style="
                padding: 20px 30px;
                background-color: #f9fafb;
                text-align: center;
                border-top: 1px solid #eeeeee;
            "
        >

            <p
                style="
                    margin: 0;
                    font-size: 12px;
                    color: #9ca3af;
                "
            >
                © AgroMarket Burkina
            </p>

            <p
                style="
                    margin: 6px 0 0;
                    font-size: 12px;
                    color: #9ca3af;
                "
            >
                La plateforme agricole burkinabè
            </p>

        </div>

    </div>

</body>

</html>
"""

    message.add_alternative(
        contenu_html,
        subtype="html",
    )

    return message


# ============================================================
# ENVOI D'UN EMAIL
# ============================================================

def envoyer_email(
    message: EmailMessage,
) -> None:
    """
    Envoie un email via SMTP avec STARTTLS.
    """

    verifier_configuration_email()

    try:

        print("========================================")
        print("📧 CONNEXION AU SERVEUR SMTP")
        print("========================================")
        print("Serveur :", SMTP_HOST)
        print("Port :", SMTP_PORT)
        print("Compte SMTP :", SMTP_USERNAME)
        print("Destinataire :", message["To"])

        with smtplib.SMTP(
            SMTP_HOST,
            SMTP_PORT,
            timeout=SMTP_TIMEOUT,
        ) as serveur:

            # ------------------------------------------------
            # IDENTIFICATION SMTP
            # ------------------------------------------------

            serveur.ehlo()

            print("✅ Connexion SMTP établie.")

            # ------------------------------------------------
            # CHIFFREMENT STARTTLS
            # ------------------------------------------------

            serveur.starttls()

            serveur.ehlo()

            print("✅ STARTTLS activé.")

            # ------------------------------------------------
            # AUTHENTIFICATION
            # ------------------------------------------------

            serveur.login(
                SMTP_USERNAME,
                SMTP_PASSWORD,
            )

            print("✅ Authentification SMTP réussie.")

            # ------------------------------------------------
            # ENVOI
            # ------------------------------------------------

            print(
                "📧 Tentative d'envoi vers :",
                message["To"],
            )

            serveur.send_message(
                message
            )

            print(
                "✅ Email envoyé avec succès à :",
                message["To"],
            )

        print("========================================")

    except smtplib.SMTPAuthenticationError as erreur:

        logger.error(
            "Échec de l'authentification SMTP."
        )

        print(
            "❌ ERREUR AUTHENTIFICATION SMTP :",
            erreur,
        )

        raise EmailServiceError(
            "Impossible de s'authentifier "
            "auprès du serveur SMTP."
        ) from erreur

    except smtplib.SMTPException as erreur:

        logger.error(
            "Erreur SMTP lors de l'envoi de l'email : %s",
            type(erreur).__name__,
        )

        print(
            "❌ ERREUR SMTP :",
            erreur,
        )

        raise EmailServiceError(
            "Impossible d'envoyer l'email."
        ) from erreur

    except OSError as erreur:

        logger.error(
            "Erreur réseau SMTP : %s",
            type(erreur).__name__,
        )

        print(
            "❌ ERREUR RÉSEAU SMTP :",
            erreur,
        )

        raise EmailServiceError(
            "Le serveur SMTP est inaccessible."
        ) from erreur


# ============================================================
# EMAIL DE RÉINITIALISATION
# ============================================================

def envoyer_email_reinitialisation_mot_de_passe(
    destinataire: str,
    token: str,
) -> None:
    """
    Envoie à l'utilisateur son lien de réinitialisation
    de mot de passe.
    """

    if not destinataire:
        raise EmailServiceError(
            "L'adresse email du destinataire est obligatoire."
        )

    if not token:
        raise EmailServiceError(
            "Le token de réinitialisation est obligatoire."
        )

    # --------------------------------------------------------
    # CONSTRUCTION DU LIEN
    # --------------------------------------------------------

    lien = construire_lien_reinitialisation(
        token
    )

    print(
        "🔗 Lien de réinitialisation construit."
    )

    # --------------------------------------------------------
    # CONSTRUCTION DU MESSAGE
    # --------------------------------------------------------

    message = construire_email_reinitialisation(
        destinataire=destinataire,
        lien_reinitialisation=lien,
    )

    print(
        "✉️ Email de réinitialisation préparé."
    )

    # --------------------------------------------------------
    # ENVOI
    # --------------------------------------------------------

    envoyer_email(
        message
    )

    logger.info(
        "Email de réinitialisation envoyé."
    )