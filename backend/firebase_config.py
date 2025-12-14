import firebase_admin
from firebase_admin import credentials, firestore, storage, auth
from config import get_settings
import os

settings = get_settings()

# Initialize Firebase Admin SDK
def initialize_firebase():
    """Initialize Firebase Admin SDK with credentials"""
    if not firebase_admin._apps:
        # Check if credentials file exists
        if os.path.exists(settings.firebase_credentials_path):
            print(f"Loading Firebase credentials from: {settings.firebase_credentials_path}")
            cred = credentials.Certificate(settings.firebase_credentials_path)
            firebase_admin.initialize_app(cred, {
                'projectId': 'tacitsns',
                'storageBucket': settings.firebase_storage_bucket,
                'databaseURL': 'https://tacitsns.firebaseio.com'
            })
            print(f"✓ Firebase initialized successfully")
            print(f"  Project ID: {cred.project_id}")
            print(f"  Storage Bucket: {settings.firebase_storage_bucket}")
        else:
            print(f"✗ Warning: Firebase credentials file not found at {settings.firebase_credentials_path}")
            print("Please download your Firebase service account key and save it as firebase-credentials.json")

# Initialize Firebase on import
initialize_firebase()

# Firestore client
def get_firestore_client():
    """Get Firestore client instance"""
    # Get client for default database
    return firestore.client()

# Storage client
def get_storage_bucket():
    """Get Firebase Storage bucket instance"""
    return storage.bucket()

# Auth client - for verifying tokens
def verify_firebase_token(id_token: str):
    """Verify Firebase ID token"""
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"Error verifying token: {e}")
        return None
