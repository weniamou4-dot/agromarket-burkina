from database import SessionLocal
from models import Utilisateur
from auth.security import hash_password

db = SessionLocal()

telephone = "70000001"
nouveau_mot_de_passe = "Vendeur0123"

utilisateur = db.query(Utilisateur).filter(
    Utilisateur.telephone == telephone
).first()

if not utilisateur:
    print("❌ Vendeur introuvable.")
else:
    utilisateur.mot_de_passe_hash = hash_password(
        nouveau_mot_de_passe
    )

    db.commit()

    print("✅ Mot de passe réinitialisé.")
    print("Téléphone :", utilisateur.telephone)
    print("Rôle :", utilisateur.role)

db.close()