# Google OAuth Setup

1. Create OAuth credentials in Google Cloud Console:
   - Go to https://console.cloud.google.com/apis/credentials
   - Create an OAuth 2.0 Client ID (Web application)
   - Set **Authorized JavaScript origins** to your frontend origin, e.g. `http://localhost:5173`
   - Set **Authorized redirect URIs** to your backend callback, e.g. `http://localhost:5000/api/auth/google/callback`

2. Set environment variables:
   - On the backend (copy `backend/.env.example` to `.env`) set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
   - Optionally set `GOOGLE_CALLBACK_URL` if your backend runs on a different domain.
   - On the frontend (copy `frontend/.env.local.example`) set `VITE_API_BASE_URL` if different.

3. Important notes:
   - Ensure `CLIENT_URL` in the backend matches your frontend origin so CORS and redirect behavior work.
   - In production, use HTTPS and set cookie `secure=true` (server already sets this when NODE_ENV=production).
   - If Google OAuth credentials are not present, the server falls back to a demo Google user for local demos.

4. Testing locally:
   - Start backend: `cd backend && npm install && npm run dev`
   - Start frontend: `cd frontend && npm install && npm run dev`
   - Open `http://localhost:5173/login` and click "Continue with Google".
