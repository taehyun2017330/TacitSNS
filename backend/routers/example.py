from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from firebase_config import get_firestore_client, get_storage_bucket
from datetime import datetime

router = APIRouter()

# Example models
class UserActivity(BaseModel):
    user_id: str
    action: str
    timestamp: str = None

@router.post("/log-activity")
async def log_user_activity(activity: UserActivity):
    """
    Example endpoint: Log user activity to Firestore
    """
    try:
        db = get_firestore_client()

        # Add timestamp if not provided
        if not activity.timestamp:
            activity.timestamp = datetime.utcnow().isoformat()

        # Store in Firestore
        doc_ref = db.collection('user_activities').document()
        doc_ref.set({
            'user_id': activity.user_id,
            'action': activity.action,
            'timestamp': activity.timestamp
        })

        return {
            "message": "Activity logged successfully",
            "activity_id": doc_ref.id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activities/{user_id}")
async def get_user_activities(user_id: str, limit: int = 10):
    """
    Example endpoint: Get user activities from Firestore
    """
    try:
        db = get_firestore_client()

        # Query Firestore
        activities_ref = db.collection('user_activities')
        query = activities_ref.where('user_id', '==', user_id).limit(limit)

        # Get results
        activities = []
        for doc in query.stream():
            activity_data = doc.to_dict()
            activity_data['id'] = doc.id
            activities.append(activity_data)

        return {
            "user_id": user_id,
            "activities": activities
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
