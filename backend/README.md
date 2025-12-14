# TacitSNS Backend

FastAPI backend with Firebase Firestore integration.

## Quick Start

### 1. Navigate to backend directory

```bash
cd /Users/grace/TacitSNS/backend
```

### 2. Create and activate virtual environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate it (you'll see (venv) in your terminal)
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click the gear icon ⚙️ > **Project Settings**
4. Go to the **Service Accounts** tab
5. Click **"Generate New Private Key"**
6. Click **"Generate Key"** to download the JSON file
7. Move the downloaded file to `/Users/grace/TacitSNS/backend/` and rename it to `firebase-credentials.json`

**Get your Storage Bucket name:**
- In the Firebase Console sidebar, go to **Build** > **Storage**
- Click **"Get Started"** if not set up yet
- Your bucket name will be shown (e.g., `your-project-id.appspot.com`)

### 5. Environment Variables

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```bash
# LLM API Configuration
OPENAI_API_KEY=sk-your-actual-openai-key-here

# Firebase Configuration
FIREBASE_CREDENTIALS_PATH=firebase-credentials.json
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com

# Application Settings
DEBUG=True
```

### 6. Run the Server

```bash
python main.py
```

You should see:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Backend is now running at:** `http://localhost:8000`

### 7. Test the API

Open your browser and go to:
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Auth
- `POST /api/auth/login` - Simple username login (for HCI study)
- `GET /api/auth/me` - Get current user profile (protected)

### Brands
- `POST /api/brands/` - Create a brand
- `GET /api/brands/` - Get all user brands
- `GET /api/brands/{brand_id}` - Get specific brand
- `PUT /api/brands/{brand_id}` - Update brand
- `DELETE /api/brands/{brand_id}` - Delete brand

### Themes
- `POST /api/themes/` - Create a theme
- `GET /api/themes/?brand_id={brand_id}` - Get themes (optionally filter by brand)
- `GET /api/themes/{theme_id}` - Get specific theme
- `PUT /api/themes/{theme_id}` - Update theme
- `DELETE /api/themes/{theme_id}` - Delete theme

### LLM
- `POST /api/llm/chat` - Chat with LLM

## Architecture

**Clean Architecture Pattern:**
```
Frontend → Backend API (FastAPI)
              ↓
         Firestore Database
              ↓
         LLM APIs (OpenAI)
```

**For HCI Study (Current Implementation):**
- Frontend sends user ID in `X-User-ID` header with each request
- Backend validates and uses this for data access
- All data operations go through backend (single source of truth)

**For Production (Future):**
- Replace simple user ID auth with Firebase ID token verification
- Use the commented-out Firebase auth code in `dependencies/auth.py`
- Frontend already has Firebase Auth set up in the `firebase/` directory
