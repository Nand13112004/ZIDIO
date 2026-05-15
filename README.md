# IntellMeet – AI-Powered Enterprise Meeting & Collaboration Platform

A full-stack MERN web application combining features of Zoom + Slack + Notion + Trello with AI-powered meeting intelligence.

## 🚀 Project Overview

**IntellMeet** is a production-ready collaboration platform designed for enterprises. It features:

- 🎥 **Real-time Video Conferencing** with WebRTC + Socket.io
- 💬 **Instant Messaging** with rich formatting, reactions, and read receipts
- 👥 **Team Management** with role-based access control
- ✅ **Task Management** with project tracking and watchers
- 🤖 **AI Meeting Intelligence** - Transcription, summaries, and action item extraction using OpenAI
- 📊 **Meeting Analytics** with sentiment analysis and participant metrics
- 🔐 **Enterprise-Grade Security** with JWT, rate limiting, and encryption

## 📂 Project Structure

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

---

**Built with ❤️ by Zidio Development Team**

**Last Updated**: 2024

## Docker Quick Start

The repository includes production-oriented containers for the React frontend and Express backend, plus MongoDB, Redis, Prometheus, and Grafana.

```bash
docker compose up --build
```

Local container URLs:

- Frontend: http://localhost:8080
- Backend API: http://localhost:5000/api
- Metrics: http://localhost:5000/api/metrics
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (`admin` / `admin`)

For production, replace the compose JWT secrets, set Cloudinary/OpenAI/Sentry values through environment variables, and use MongoDB Atlas instead of the local `mongo` service.

## CI/CD

GitHub Actions workflow: `.github/workflows/ci.yml`

Pipeline stages:

- Backend install and lint
- Frontend install, lint, and production build
- Docker Compose image build validation

Recommended deployment targets:

- Frontend: Vercel or the provided Nginx Docker image
- Backend: Render, Railway, Fly.io, or the provided Node Docker image
- Database: MongoDB Atlas
- Monitoring: Prometheus and Grafana from `docker-compose.yml`
#   Z I D I O  
 