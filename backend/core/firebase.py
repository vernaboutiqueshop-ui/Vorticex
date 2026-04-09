import os
import firebase_admin
from firebase_admin import credentials, firestore, auth

# Path relative to backend root
cred_path = os.path.join(os.path.dirname(__file__), "..", "vortice-firebase-adminsdk.json")

def init_firebase():
    if not firebase_admin._apps:
        try:
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                print("[FIREBASE] Firebase Admin Inicializado correctamente")
            else:
                print(f"[FIREBASE] CUIDADO: No se encontró {cred_path}. Firebase no se conectará.")
        except Exception as e:
            print(f"[FIREBASE] Error al inicializar Firebase: {e}")

init_firebase()

def get_db():
    try:
        return firestore.client()
    except Exception as e:
        print(f"Error getting Firestore client: {e}")
        return None

def verify_token(id_token):
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"Error validando token: {e}")
        return None
