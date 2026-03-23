from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from firebase_config import initialize_firebase
from routers.autocomplete import router as autocomplete_router
from routers.business_goal_suggestions import router as business_goal_suggestions_router
from routers.brand_session import router as brand_session_router
from routers.post_goal_suggestions import router as post_goal_suggestions_router
from routers.post_workflow import router as post_workflow_router
from routers.system import router as system_router


LOCAL_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://localhost:8001",
]


def create_app() -> FastAPI:
    initialize_firebase()

    app = FastAPI(title="TacitSNS Local API", version="1.0.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=LOCAL_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(system_router)
    app.include_router(brand_session_router)
    app.include_router(autocomplete_router, tags=["autocomplete"])
    app.include_router(business_goal_suggestions_router)
    app.include_router(post_goal_suggestions_router)
    app.include_router(post_workflow_router, tags=["posts"])

    return app
