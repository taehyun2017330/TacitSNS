# TacitSNS Backend

FastAPI backend for the active CHI prototype branch.

## Current Active Scope

The running backend supports the current prototype path only:
- in-memory brand session endpoints
- autocomplete endpoints for brand-description writing
- post generation, edit, caption, and persona-summary endpoints
- Firebase-backed image storage and Gemini/OpenAI integrations

Legacy CRUD/auth/theme/logo scaffolding has been removed from the active path so the prototype can evolve from a smaller, clearer backend surface.

## Quick Start

### 1. Create and activate a virtual environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Set at least:

```bash
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
FIREBASE_CREDENTIALS_PATH=firebase-credentials.json
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

### 4. Run the server

```bash
python main_simple.py
```

The active local API runs on `http://localhost:8001`.

## Active Endpoints

- `POST /brand/create`
- `GET /brand/current`
- `POST /api/suggestions`
- `POST /api/annotate`
- `POST /api/generate-post-images`
- `POST /api/edit-image`
- `POST /api/generate-captions`
- `POST /api/generate-captions-old`
- `POST /api/summarize-persona`
- `GET /health`

## Active Backend Structure

- `main_simple.py`: thin server entrypoint
- `app_factory.py`: FastAPI app creation and router mounting
- `api_models.py`: shared Pydantic request models
- `routers/`: HTTP routing layer for the active prototype path
- `services/`: brand session, autocomplete, image generation, and post workflow logic

## Notes

- The frontend currently talks to this backend on port `8001`.
- Firebase initialization still happens at startup because generated images may be uploaded through the active image path.
- Some API behavior remains key-dependent and should be verified against real Gemini/OpenAI credentials after structural refactors.
