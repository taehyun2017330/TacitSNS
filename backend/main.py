from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="TacitSNS API",
    description="Backend API for TacitSNS",
    version="1.0.0"
)

# CORS middleware - configure this based on your frontend URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "http://localhost:5173",  # Vite default port
        "https://tacitsns.web.app",  # Production frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers
from routers import llm, example, auth, brands, themes

@app.get("/")
async def root():
    return {"message": "Welcome to TacitSNS API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Register routers
app.include_router(llm.router, prefix="/api/llm", tags=["llm"])
app.include_router(example.router, prefix="/api/example", tags=["example"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(brands.router, prefix="/api/brands", tags=["brands"])
app.include_router(themes.router, prefix="/api/themes", tags=["themes"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
