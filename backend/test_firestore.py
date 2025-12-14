#!/usr/bin/env python3
"""Test Firestore connection"""

from firebase_config import get_firestore_client

try:
    print("Getting Firestore client...")
    db = get_firestore_client()

    print("Attempting to list collections...")
    collections = db.collections()

    print("Collections found:")
    for collection in collections:
        print(f"  - {collection.id}")

    print("\n✓ Firestore connection successful!")

except Exception as e:
    print(f"\n✗ Error: {e}")
    import traceback
    traceback.print_exc()
