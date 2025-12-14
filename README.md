# TacitSNS

Social networking app with React/TypeScript frontend and FastAPI backend.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Firebase SDK
- **Backend:** FastAPI, Python 3.10+, Firebase Admin SDK, OpenAI API
- **Database:** Firebase (Firestore, Auth, Storage)
- **Deployment:** EC2 (backend) + Firebase Hosting (frontend)

## Quick Start

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
# Add Firebase config to .env.local
npm run dev
```
Runs on `http://localhost:5173`

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Add API keys to .env
# Add firebase-credentials.json to backend/
python main.py
```
Runs on `http://localhost:8000` - API docs at `/docs`

## Firebase Setup

1. **Create Project:** [Firebase Console](https://console.firebase.google.com/) > Add Project
2. **Enable Services:**
   - Firestore Database (Native mode)
   - Authentication (Email/Password, Google)
   - Storage
3. **Backend Credentials:**
   - Project Settings > Service Accounts > Generate new private key
   - Save as `backend/firebase-credentials.json`
4. **Frontend Config:**
   - Project Settings > Your apps > Web app
   - Copy config values to `frontend/.env.local`

## Environment Variables

**`backend/.env`**
```
OPENAI_API_KEY=your_key
FIREBASE_CREDENTIALS_PATH=firebase-credentials.json
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

**`frontend/.env.local`**
```
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_id
VITE_FIREBASE_APP_ID=your_id
VITE_FIREBASE_MEASUREMENT_ID=your_id
VITE_API_URL=http://localhost:8000
```

## Frontend Utilities

**Auth:** `src/firebase/auth.ts`
- `signUp()`, `signIn()`, `signInWithGoogle()`, `logOut()`, `getCurrentUser()`, `getIdToken()`

**Firestore:** `src/firebase/firestore.ts`
- `createDocument()`, `getDocument()`, `updateDocument()`, `deleteDocument()`
- `listenToCollection()`, `listenToDocument()` - real-time listeners

**Storage:** `src/firebase/storage.ts`
- `uploadFile()`, `uploadProfileImage()`, `uploadPostImage()`, `deleteFile()`

**API Calls:** `src/utils/api.ts`
- `get()`, `post()`, `put()`, `del()` - auto-includes auth token
- `chatWithLLM()`, `logActivity()`

## Deployment

**Backend (EC2):**
```bash
# On EC2 instance
git clone <repo>
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Add .env and firebase-credentials.json
# Set up systemd/supervisor + nginx + SSL
```

**Frontend (Firebase Hosting):**
```bash
cd frontend
npm run build  # builds to frontend/build/
cd ..
npm install -g firebase-tools  # if not installed
firebase login
firebase deploy --only hosting
```
Your app deploys to `https://tacitsns.web.app`

Update CORS in `backend/main.py` with deployed URL.

## Architecture

- Frontend connects directly to Firebase for real-time data
- Backend (EC2) uses Firebase Admin SDK for server-side operations
- Both access same Firestore database - no conflict
- Backend handles LLM calls and sensitive operations
