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
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers
from routers import llm, example

@app.get("/")
async def root():
    return {"message": "Welcome to TacitSNS API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Register routers
app.include_router(llm.router, prefix="/api/llm", tags=["llm"])
app.include_router(example.router, prefix="/api/example", tags=["example"])

# Add your custom routers here
# app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
# app.include_router(users.router, prefix="/api/users", tags=["users"])
# app.include_router(posts.router, prefix="/api/posts", tags=["posts"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
