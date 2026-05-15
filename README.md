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

</div>

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
