from database import SessionLocal
from models import Utilisateur
from auth.security import hash_password


def creer_admin():
    db = SessionLocal()

    try:
        telephone = input("TON NUM : ").strip()
        nom = input("TON NOM: ").strip()
        email = input("TONgmail.com: ").strip()
        mot_de_passe = input("ton mots de passe: ")

        # Vérifier si le téléphone existe déjà
        utilisateur_existant = (
            db.query(Utilisateur)
            .filter(Utilisateur.telephone == telephone)
            .first()
        )

        if utilisateur_existant:
            print("❌ Ce numéro existe déjà.")
            return

        # Vérifier si l'email existe déjà
        if email:
            email_existant = (
                db.query(Utilisateur)
                .filter(Utilisateur.email == email)
                .first()
            )

            if email_existant:
                print("❌ Cet email existe déjà.")
                return

        # Création de l'administrateur
        admin = Utilisateur(
            nom=nom,
            telephone=telephone,
            email=email if email else None,
            mot_de_passe_hash=hash_password(mot_de_passe),
            photo_profil=None,
            role="admin",
            statut_compte="actif"
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print()
        print("===================================")
        print("✅ ADMINISTRATEUR CRÉÉ")
        print("===================================")
        print(f"ID       : {admin.id}")
        print(f"Nom      : {admin.nom}")
        print(f"Téléphone: {admin.telephone}")
        print(f"Email    : {admin.email}")
        print(f"Rôle     : {admin.role}")
        print(f"Statut   : {admin.statut_compte}")
        print("===================================")

    except Exception as e:
        db.rollback()
        print("❌ Erreur :", e)

    finally:
        db.close()


if __name__ == "__main__":
    creer_admin()