# 🚀 IntellMeet – AI-Powered Enterprise Meeting & Collaboration Platform

<div align="center">

![IntellMeet Banner](https://img.shields.io/badge/IntellMeet-AI%20Collaboration%20Platform-blueviolet?style=for-the-badge)

### 🎥 Real-Time Meetings • 🤖 AI Summaries • 💬 Team Collaboration • 📊 Analytics

A modern enterprise-grade collaboration platform combining the power of **Zoom + Slack + Notion + Trello** with intelligent AI-powered meeting features.

[![React](https://img.shields.io/badge/React-19-blue?logo=react)]()
[![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=node.js)]()
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-green?logo=mongodb)]()
[![Socket.io](https://img.shields.io/badge/Socket.io-RealTime-black?logo=socket.io)]()
[![WebRTC](https://img.shields.io/badge/WebRTC-Video-orange)]()
[![OpenAI](https://img.shields.io/badge/OpenAI-AI-black?logo=openai)]()

<<<<<<< HEAD
```
IntellMeet/
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── models/         # Mongoose schemas (10 models)
│   │   ├── controllers/    # Business logic (4 main + others)
│   │   ├── routes/         # API endpoints (7 routes)
│   │   ├── middleware/     # Auth, error handling, rate limiting
│   │   ├── services/       # OpenAI integration
│   │   ├── socket/         # Socket.io real-time events
│   │   ├── config/         # Database connection
│   │   └── utils/          # Helpers & logging
│   ├── logs/               # Application logs
│   ├── .env.example        # Environment template
│   └── package.json
│
└── frontend/               # React + TypeScript + Vite
    ├── src/
    │   ├── pages/          # Route pages
    │   ├── components/     # React components
    │   ├── store/          # Zustand state stores
    │   ├── services/       # API client & Socket.io
    │   ├── types/          # TypeScript interfaces
    │   ├── lib/            # Utilities
    │   ├── assets/         # Static files
    │   ├── App.tsx         # Main app component
    │   └── main.tsx        # Vite entry point
    ├── .env.local          # Environment variables
    ├── vite.config.ts      # Vite configuration
    └── package.json
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.19.2
- **Database**: MongoDB 8.4.1 + Mongoose
- **Real-time**: Socket.io 4.7.5
- **Authentication**: JWT + Refresh Tokens
- **Security**: Helmet, Rate Limiting, bcryptjs
- **Logging**: Winston + Morgan
- **AI**: OpenAI API (Whisper, GPT-3.5-turbo)
- **File Storage**: Cloudinary
- **Cache**: Redis 4.6.14

### Frontend
- **Framework**: React 19 + TypeScript 6.0.2
- **Build Tool**: Vite 8.0.12
- **State Management**: Zustand 5.0.13
- **Server State**: TanStack Query 5.100.10
- **Routing**: React Router DOM 7.15.1
- **HTTP Client**: Axios 1.16.1
- **Real-time**: Socket.io-client 4.8.3
- **UI Components**: shadcn/ui (Radix UI)
- **Styling**: Tailwind CSS 3.4.1
- **Icons**: Lucide React

## 📋 Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: v6.0.0 or higher (or MongoDB Atlas)
- **Redis**: v7.0.0 (optional, for caching)
- **OpenAI API Key**: For AI features

## 🔧 Installation & Setup

### 1. Clone Repository & Install Dependencies

```bash
# Backend setup
cd backend
npm install

# Frontend setup
cd ../frontend
npm install
```

### 2. Configure Environment Variables

#### Backend (.env)
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
# Server
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/intellmeet
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/intellmeet

# JWT
JWT_SECRET=your_jwt_secret_key_here_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_key_here_min_32_chars
JWT_EXPIRE=1h
JWT_REFRESH_EXPIRE=7d

# OpenAI (for AI features)
OPENAI_API_KEY=sk-your_openai_api_key_here

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Logging
LOG_LEVEL=debug
SENTRY_DSN=
```

#### Frontend (.env.local)
```bash
cd frontend
cat > .env.local << 'EOF'
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_APP_NAME=IntellMeet
VITE_APP_VERSION=1.0.0
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_SENTRY=false
VITE_ENV=development
EOF
```

### 3. Start MongoDB (if local)

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

### 4. Start Backend Server

```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

### 5. Start Frontend Dev Server (in new terminal)

```bash
cd frontend
npm run dev
# App runs on http://localhost:5173
```

## 🧪 Testing the Application

### Demo Credentials
After registration or using seed data:
- **Email**: admin@intellmeet.com
- **Password**: AdminPassword123!

### Key Features to Test
1. **Authentication**
   - Register new account
   - Login with credentials
   - Token refresh on page reload

2. **Meetings**
   - Create new meeting
   - Join meeting room
   - WebRTC video/audio (with camera/mic permissions)
   - Share screen
   - Meeting chat

3. **AI Features**
   - Start meeting → End → View auto-generated summary
   - Check action items extracted
   - View sentiment analysis

4. **Teams & Tasks**
   - Create team and invite members
   - Create tasks and assign
   - Track progress

5. **Real-time Features**
   - User presence status
   - Typing indicators
   - Message delivery

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Routes
```
POST   /auth/register              # User registration
POST   /auth/login                 # User login
POST   /auth/refresh-token         # Refresh JWT
GET    /auth/me                    # Get current user
POST   /auth/logout                # User logout
```

### User Routes
```
GET    /users                      # List all users (paginated)
GET    /users/search               # Search users
GET    /users/:userId              # Get user profile
PUT    /users/:userId              # Update profile
PUT    /users/:userId/preferences  # Update preferences
PUT    /users/:userId/status       # Update online status
DELETE /users/:userId              # Deactivate account
```

### Team Routes
```
POST   /teams                      # Create team
GET    /teams                      # Get user's teams
GET    /teams/:teamId              # Get team details
PUT    /teams/:teamId              # Update team
POST   /teams/:teamId/members      # Add member
DELETE /teams/:teamId/members/:id  # Remove member
DELETE /teams/:teamId              # Delete team
```

### Meeting Routes
```
POST   /meetings                   # Create meeting
GET    /meetings                   # List meetings (with status filter)
GET    /meetings/:meetingId        # Get meeting details
POST   /meetings/:meetingId/join   # Join meeting
POST   /meetings/:meetingId/leave  # Leave meeting
POST   /meetings/:meetingId/end    # End meeting (host only)
PUT    /meetings/:meetingId        # Update meeting
GET    /meetings/:meetingId/summary # Get AI summary
```

### Message Routes
```
POST   /messages                   # Send message
GET    /messages                   # Get messages (filtered)
PUT    /messages/:id               # Edit message
DELETE /messages/:id               # Delete message
POST   /messages/:id/reactions     # Add emoji reaction
POST   /messages/mark-as-read      # Mark as read
```

### Task Routes
```
POST   /tasks                      # Create task
GET    /tasks                      # List tasks (filtered)
GET    /tasks/:id                  # Get task details
PUT    /tasks/:id                  # Update task
PATCH  /tasks/:id/complete         # Complete task
POST   /tasks/:id/subtasks         # Add subtask
PATCH  /tasks/:id/subtasks/:idx/complete # Complete subtask
POST   /tasks/:id/watchers         # Add watcher
DELETE /tasks/:id                  # Delete task
```

## 🔌 Socket.io Events

### User Presence
```javascript
// Send
socket.emit('user:online', { userId })
socket.emit('user:idle', { userId })
socket.emit('user:active', { userId })

// Listen
socket.on('user:status', (data) => { status: 'online|idle|offline' })
```

### Meeting Events
```javascript
// Send
socket.emit('meeting:join', { meetingId, userId, userName })
socket.emit('meeting:leave', { meetingId, userId })

// Listen
socket.on('meeting:user-joined', (data))
socket.on('meeting:user-left', (data))
```

### Chat Events
```javascript
// Send
socket.emit('chat:message', { roomId|meetingId, message, sender })
socket.emit('chat:typing', { roomId|meetingId, userId, userName })

// Listen
socket.on('chat:message', (data))
socket.on('chat:typing', (data))
```

### WebRTC Signaling
```javascript
socket.emit('webrtc:offer', { to, offer, from })
socket.emit('webrtc:answer', { to, answer })
socket.emit('webrtc:ice-candidate', { to, candidate })
```

## 🚀 Build & Deployment

For a detailed step-by-step guide to deploying the frontend on **Vercel** and the backend on **Render**, please refer to the [Deployment Guide (DEPLOYMENT.md)](./DEPLOYMENT.md).

### Build Frontend
```bash
cd frontend
npm run build
# Output: dist/
```

### Build Backend (if using TypeScript)
```bash
cd backend
npm run build
```

### Production Environment Variables

**Backend (.env.production)**
- Set `NODE_ENV=production`
- Use strong, unique JWT secrets
- Configure MongoDB Atlas with credentials
- Add real OpenAI API key
- Configure Cloudinary for production
- Set up error tracking (Sentry)

**Frontend (.env.production)**
- Update API endpoints to production server
- Disable SENTRY_DSN if not using
- Set `VITE_ENV=production`

### Deploy Options
- **Backend**: Heroku, AWS, DigitalOcean, Railway
- **Frontend**: Vercel, Netlify, GitHub Pages, AWS S3 + CloudFront
- **Database**: MongoDB Atlas (cloud-hosted)

## 📊 Database Models

### User
```javascript
{
  firstName, lastName, email (unique), password (hashed),
  avatar, role (user|admin|moderator), status (online|offline|idle|dnd),
  teams, preferences, statistics, verificationToken, resetToken
}
```

### Meeting
```javascript
{
  title, description, meetingId (UUID), host, participants,
  team, status (scheduled|ongoing|completed|cancelled),
  recording, summary, createdAt, startedAt, endedAt
}
```

### Message
```javascript
{
  content, sender, senderName, senderAvatar,
  routing (roomId|meetingId|teamId|recipientId),
  messageType, attachments, reactions, mentions,
  isEdited, editHistory, isDeleted, readBy
}
```

### Team
```javascript
{
  name, description, icon, owner, members (with roles),
  channels, projects, settings, stats
}
```

### Task
```javascript
{
  title, description, status, priority, assignee, reporter,
  team, project, dueDate, completedAt,
  estimatedTime, actualTime, subtasks, attachments,
  tags, comments, watchers, activityLog
}
```

## 🔒 Security Features

✅ **Authentication**
- JWT with refresh token rotation
- Secure password hashing (bcryptjs)
- Token blacklisting on logout

✅ **Authorization**
- Role-based access control (RBAC)
- Resource ownership verification
- Middleware-based permission checks

✅ **Data Protection**
- HTTPS ready (use SSL in production)
- CORS configured for safety
- Helmet security headers
- Rate limiting (prevent DDoS)
- Input validation & sanitization

✅ **API Security**
- Consistent error responses (no leaks)
- Request size limits (10MB)
- CSRF protection ready

## 🎯 Next Steps / Roadmap

- [ ] Advanced WebRTC features (screen sharing, recording)
- [ ] Meeting recording storage & playback
- [ ] Advanced AI features (live captions, real-time translation)
- [ ] Mobile app (React Native)
- [ ] 2FA/MFA authentication
- [ ] Advanced analytics dashboard
- [ ] Integrations (Slack, Google Workspace, Microsoft Teams)
- [ ] Marketplace for plugins

## 📝 Development Guides

### Adding New Routes
1. Create controller in `backend/src/controllers/`
2. Create routes in `backend/src/routes/`
3. Register in `server.js`
4. Create frontend service methods in `frontend/src/services/index.ts`
5. Create API calls in components

### Adding New Models
1. Create schema in `backend/src/models/`
2. Export from model file
3. Create controller
4. Create routes
5. Update Socket.io handlers if needed

### Adding UI Components
1. Use shadcn/ui components when available
2. Create custom components in `frontend/src/components/`
3. Add TypeScript interfaces in `frontend/src/types/index.ts`
4. Style with Tailwind CSS
5. Add dark mode support

## 🐛 Troubleshooting

### Frontend won't connect to API
- Check `VITE_API_BASE_URL` in `.env.local`
- Ensure backend is running on port 5000
- Check CORS in backend `server.js`
- Clear browser cache

### WebSocket connection fails
- Verify Socket.io URL is correct
- Check firewall/proxy settings
- Ensure auth token is valid
- Check browser console for errors

### MongoDB connection error
- Verify MongoDB is running (`mongod` or cloud service)
- Check `MONGODB_URI` connection string
- Verify credentials if using MongoDB Atlas
- Check firewall/network access

### OpenAI API errors
- Verify `OPENAI_API_KEY` is valid
- Check API key has correct permissions
- Monitor rate limits
- Check token allowance

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/YourFeature`)
3. Commit changes (`git commit -m 'Add feature'`)
4. Push to branch (`git push origin feature/YourFeature`)
5. Open Pull Request

## 📧 Support

For issues, questions, or suggestions:
- GitHub Issues: [Create an issue]
- Email: support@intellmeet.com
- Documentation: [See /docs]
=======
</div>
>>>>>>> ca1b3c234c0db1acbb52b9c257f6679d3252ea4b

---

# 📌 Project Overview

**IntellMeet** is a production-ready MERN stack collaboration platform designed for remote and hybrid teams.
It enables organizations to conduct intelligent meetings with:

* 🎥 Real-time video conferencing
* 🤖 AI-powered meeting summaries
* 📝 Automatic action item extraction
* 💬 Real-time team collaboration
* 📊 Productivity analytics
* 🔐 Enterprise-grade security

The platform transforms meetings into actionable and trackable workflows.

---

# ✨ Key Features

## 🔐 Authentication & Security

* JWT Authentication
* Refresh Tokens
* Role-Based Access Control
* Secure Password Hashing (bcrypt)
* Protected Routes
* Rate Limiting
* Helmet Security
* Input Validation & Sanitization

---

## 🎥 Real-Time Video Meetings

* WebRTC Video Conferencing
* Audio/Video Controls
* Screen Sharing
* Participant Management
* Real-Time Presence
* Meeting Recording
* Meeting Lobby System

---

## 💬 Real-Time Chat & Collaboration

* Socket.io Real-Time Messaging
* Typing Indicators
* Emoji Reactions
* Read Receipts
* Team Channels
* Shared Notes

---

## 🤖 AI Meeting Intelligence

Powered by OpenAI APIs:

* Speech-to-Text Transcription
* AI Meeting Summaries
* Action Item Extraction
* Smart Task Assignment
* Sentiment Analysis

### Example:

Input:

```txt
"Nand will complete frontend dashboard by Friday."
```

AI Output:

```txt
Task: Complete frontend dashboard
Assignee: Nand
Deadline: Friday
```

---

## 📋 Team & Task Management

* Team Workspaces
* Kanban Boards
* Task Assignment
* Progress Tracking
* Watchers & Notifications
* Drag-and-Drop Task System

---

## 📊 Analytics Dashboard

* Meeting Statistics
* Team Productivity Metrics
* Engagement Reports
* Activity Monitoring
* Exportable Reports

---

# 🛠️ Tech Stack

## Frontend

| Technology       | Purpose            |
| ---------------- | ------------------ |
| React 19         | Frontend Framework |
| TypeScript       | Type Safety        |
| Vite             | Fast Build Tool    |
| Tailwind CSS     | Styling            |
| shadcn/ui        | UI Components      |
| Zustand          | State Management   |
| TanStack Query   | Server State       |
| React Router DOM | Routing            |
| Axios            | API Requests       |

---

## Backend

| Technology | Purpose                 |
| ---------- | ----------------------- |
| Node.js    | Runtime                 |
| Express.js | Backend Framework       |
| MongoDB    | Database                |
| Mongoose   | ODM                     |
| JWT        | Authentication          |
| bcrypt     | Password Hashing        |
| Socket.io  | Real-Time Communication |
| WebRTC     | Video Streaming         |
| Redis      | Caching                 |

---

## AI & Cloud

| Technology    | Purpose                      |
| ------------- | ---------------------------- |
| OpenAI API    | AI Summaries & Transcription |
| Cloudinary    | Media Storage                |
| MongoDB Atlas | Cloud Database               |

---

## DevOps & Deployment

| Technology     | Purpose             |
| -------------- | ------------------- |
| Docker         | Containerization    |
| GitHub Actions | CI/CD               |
| Vercel         | Frontend Deployment |
| Render/Railway | Backend Deployment  |
| Prometheus     | Monitoring          |
| Grafana        | Analytics           |
| Sentry         | Error Tracking      |

---

# 📂 Project Structure

```bash
IntellMeet/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── socket/
│   │   ├── utils/
│   │   └── server.js
│   │
│   ├── logs/
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── store/
│   │   ├── types/
│   │   └── utils/
│   │
│   ├── package.json
│   └── vite.config.ts
│
├── docker-compose.yml
├── README.md
└── .github/
    └── workflows/
```

---

# ⚙️ Installation & Setup

## 📋 Prerequisites

* Node.js v18+
* npm v9+
* MongoDB
* Redis (optional)
* OpenAI API Key

---

# 🔧 Backend Setup

```bash
cd backend
npm install
```

Create `.env`

```env
PORT=5000
NODE_ENV=development

MONGODB_URI=your_mongodb_uri

JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

OPENAI_API_KEY=your_openai_api_key

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Start backend server:

```bash
npm run dev
```

---

# 🎨 Frontend Setup

```bash
cd frontend
npm install
```

Create `.env.local`

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Run frontend:

```bash
npm run dev
```

---

# 🚀 Running the Application

## Start Backend

```bash
cd backend
npm run dev
```

## Start Frontend

```bash
cd frontend
npm run dev
```

Frontend:

```txt
http://localhost:5173
```

Backend:

```txt
http://localhost:5000
```

---

# 🔌 API Endpoints

## Authentication

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh-token
GET  /api/auth/me
POST /api/auth/logout
```

---

## Meetings

```http
POST /api/meetings
GET  /api/meetings
GET  /api/meetings/:id
POST /api/meetings/:id/join
POST /api/meetings/:id/end
```

---

## Tasks

```http
POST /api/tasks
GET  /api/tasks
PUT  /api/tasks/:id
DELETE /api/tasks/:id
```

---

# 🔄 Socket.io Events

## Chat Events

```javascript
socket.emit("chat:message")
socket.on("chat:message")
```

## Meeting Events

```javascript
socket.emit("meeting:join")
socket.on("meeting:user-joined")
```

## WebRTC Signaling

```javascript
socket.emit("webrtc:offer")
socket.emit("webrtc:answer")
socket.emit("webrtc:ice-candidate")
```

---

# 🐳 Docker Setup

## Run Full Application

```bash
docker compose up --build
```

### Services

| Service     | URL                   |
| ----------- | --------------------- |
| Frontend    | http://localhost:8080 |
| Backend API | http://localhost:5000 |
| Prometheus  | http://localhost:9090 |
| Grafana     | http://localhost:3001 |

---

# ⚡ CI/CD Pipeline

GitHub Actions Workflow Includes:

* Backend Linting
* Frontend Build
* Docker Validation
* Automated Deployment

Workflow File:

```bash
.github/workflows/ci.yml
```

---

# 🔒 Security Features

✅ JWT Authentication
✅ Refresh Token Rotation
✅ bcrypt Password Hashing
✅ Helmet Security Headers
✅ Rate Limiting
✅ Input Validation
✅ Secure Environment Variables
✅ OWASP Best Practices

---

# 📊 Database Models

* User
* Meeting
* Message
* Team
* Task
* Notification
* Recording
* Summary

---

# 📈 Future Improvements

* Mobile App (React Native)
* Live Captions
* AI Translation
* Advanced Analytics
* Multi-Factor Authentication
* Plugin Marketplace
* Slack/Google Integrations

---

# 🧪 Demo Credentials

```txt
Email: admin@intellmeet.com
Password: AdminPassword123!
```

---

# 📸 Screenshots

## Dashboard

(Add Screenshot Here)

## Video Meeting

(Add Screenshot Here)

## Kanban Board

(Add Screenshot Here)

## AI Summary Panel

(Add Screenshot Here)

---

# 🚀 Deployment

## Frontend

Deploy on:

* Vercel
* Netlify

## Backend

Deploy on:

* Render
* Railway
* Fly.io

## Database

* MongoDB Atlas

---

# 📝 GitHub Commit Convention

Use semantic commits:

```bash
feat: add JWT authentication
fix: resolve WebRTC connection issue
docs: update deployment guide
style: improve dashboard layout
refactor: optimize meeting service
```

---

# 🤝 Contributing

Contributions are welcome!

```bash
1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push changes
5. Create Pull Request
```

---

# 📄 License

MIT License © 2026 IntellMeet

---

# 👨‍💻 Author

### Nand Delvadiya

Full-Stack MERN Developer

---

# ❤️ Acknowledgements

* OpenAI
* Socket.io
* WebRTC
* MongoDB
* React
* Tailwind CSS
* shadcn/ui

---

<div align="center">

### ⭐ If you like this project, give it a star on GitHub ⭐

</div>
