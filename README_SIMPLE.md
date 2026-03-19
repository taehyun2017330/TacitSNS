# TacitSNS - Simple Localhost Version

This is a simplified version of TacitSNS that runs locally without authentication.

## Features
- No login required - starts directly from the welcome screen
- Fixed user ID (`local-user`) for all operations
- All brand and theme creation features intact
- Logo Studio with AI-powered logo generation
- Brand proposal generation with confidence levels
- Theme and post generation

## Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the simplified backend server:
```bash
python main_simple.py
```

The backend will run on http://localhost:8001

## Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the simplified frontend:
```bash
npm run dev:simple
```

Or on Windows:
```bash
set VITE_SIMPLE_MODE=true && npm run dev
```

The frontend will run on http://localhost:5173

## Key Differences from Main Version

1. **No Authentication**:
   - No login/signup screens
   - Starts directly from welcome screen
   - Uses fixed user ID `local-user`

2. **Simplified Backend**:
   - `main_simple.py` instead of `main.py`
   - `auth_simple.py` provides a fixed user context
   - No JWT tokens or authentication middleware

3. **Simplified Frontend**:
   - `App_simple.tsx` instead of `App.tsx`
   - Removed auth-related state management
   - Direct navigation from welcome screen

## Environment Variables

Make sure your `.env` file has:
```
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_gemini_key
```

## Usage

1. Start the backend: `python backend/main_simple.py`
2. Start the frontend: `npm run dev:simple`
3. Open http://localhost:5173 in your browser
4. Click "Get Started" to begin creating your brand

All data will be associated with the `local-user` ID and stored locally.