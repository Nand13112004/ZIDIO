# IntellMeet

IntellMeet is a professional AI-powered meeting and collaboration platform built for the Zidio internship project. It combines real-time video meetings, workspace chat, shared notes, AI meeting intelligence, task tracking, teams, analytics-ready dashboards, and production deployment configuration.

## Highlights

- JWT signup/login with refresh tokens
- Google OAuth2 login flow (with a simulated demo fallback if OAuth credentials are not configured in `.env`)
- Role-aware users with profile and Cloudinary avatar upload
- WebRTC meeting rooms with camera, microphone, screen share, recording, and participant list
- Meeting password protection, waiting room approval, and E2EE status toggle
- Live emoji reactions and raise-hand controls
- In-meeting chat with typing indicators and reactions
- Shared meeting notes synced with Socket.io
- In-meeting task creation
- AI meeting intelligence with transcript summary, action items, and sentiment analysis
- Fallback meeting intelligence when OpenAI is not configured, so demos still work
- Team workspaces, member invitations, workspace chat, and Kanban task board
- Exportable AI reports as CSV or text
- Vercel frontend and Render backend deployment configuration

## Tech Stack

Frontend:
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- TanStack Query
- Socket.io Client
- Lucide React

Backend:
- Node.js
- Express
- MongoDB with Mongoose
- Socket.io
- JWT
- bcrypt
- Cloudinary
- OpenAI-compatible AI service hooks

## Project Structure

```text
IntellMeet/
  backend/
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
      services/
      socket/
      utils/
    server.js
    package.json
  frontend/
    src/
      components/
      pages/
      services/
      store/
      types/
      lib/
    vercel.json
    package.json
  render.yaml
  DEPLOYMENT.md
```

## Local Setup

Install dependencies:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Create `backend/.env`:

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
API_BASE_URL=http://localhost:5000
MONGODB_URI=mongodb://localhost:27017/intellmeet
JWT_SECRET=replace_with_long_secret
JWT_REFRESH_SECRET=replace_with_long_refresh_secret
JWT_EXPIRE=1h
JWT_REFRESH_EXPIRE=7d
OPENAI_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

Create `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_APP_NAME=IntellMeet
VITE_ENV=development
```

Run the app:

```bash
cd backend
npm run dev

cd ../frontend
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:5000`

## Deployment

Frontend deploys to Vercel from the `frontend` directory.

Backend deploys to Render using `render.yaml`.

Required production variables are documented in [DEPLOYMENT.md](./DEPLOYMENT.md).

## Verification

```bash
cd frontend
npm run lint
npm run build

cd ../backend
npm run lint
```

## Demo Focus

For the strongest internship evaluation demo:

1. Register or log in.
2. Create a meeting with password, waiting room, E2EE, and email summary enabled.
3. Join the room and show camera/mic controls, screen sharing, recording, reactions, raise hand, shared notes, and chat.
4. Paste transcript notes into the AI report generator.
5. Generate summary, action items, sentiment, and export the report.
6. Create a task from inside the meeting and show it on the Kanban board.
7. Show Teams, Messages, Profile avatar upload, and deployment configuration.
