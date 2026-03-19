from datetime import datetime

from fastapi import APIRouter

router = APIRouter(tags=["system"])


@router.get("/")
async def root():
    return {"message": "TacitSNS API - Local Development", "version": "1.0.0"}


@router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}
