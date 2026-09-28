import os
import smtplib

from dotenv import load_dotenv


load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")


print("=" * 50)
print("TEST SMTP GMAIL")
print("=" * 50)

print("Serveur :", SMTP_HOST)
print("Port :", SMTP_PORT)
print("Compte :", SMTP_USERNAME)
print("Mot de passe configuré :", bool(SMTP_PASSWORD))
print("Longueur du mot de passe :", len(SMTP_PASSWORD or ""))

try:
    print("\nConnexion à Gmail...")

    with smtplib.SMTP(
        SMTP_HOST,
        SMTP_PORT,
        timeout=20,
    ) as serveur:

        serveur.ehlo()
        print("Connexion SMTP : OK")

        serveur.starttls()
        print("STARTTLS : OK")

        serveur.ehlo()

        serveur.login(
            SMTP_USERNAME,
            SMTP_PASSWORD,
        )

        print("AUTHENTIFICATION GMAIL : OK")

    print("\n✅ TEST SMTP RÉUSSI")

except smtplib.SMTPAuthenticationError as erreur:
    print("\n❌ AUTHENTIFICATION GMAIL REFUSÉE")
    print("Code :", erreur.smtp_code)
    print("Message :", erreur.smtp_error)

except Exception as erreur:
    print("\n❌ ERREUR SMTP")
    print(type(erreur).__name__, ":", erreur)