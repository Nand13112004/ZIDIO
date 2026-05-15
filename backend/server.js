require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const connectDB = require('./src/config/db');
const logger = require('./src/utils/logger');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
const { apiLimiter } = require('./src/middleware/rateLimiter');
const initializeSocket = require('./src/socket/socketHandler');

// ─── Route Imports ───────────────────────────────────────────────
const healthRoutes = require('./src/routes/health');
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const teamRoutes = require('./src/routes/teams');
const taskRoutes = require('./src/routes/tasks');
const meetingRoutes = require('./src/routes/meetings');
const messageRoutes = require('./src/routes/messages');
const metricsRoutes = require('./src/routes/metrics');

// ─── Ensure logs directory exists ────────────────────────────────
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// ─── App & HTTP Server ───────────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);

// ─── Socket.io Setup ─────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Initialize socket event handlers
initializeSocket(io);

// Make io available in routes via req.io
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ─── Security & Utility Middleware ───────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false, // Required for WebRTC
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logger (uses morgan stream → winston)
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.http(message.trim()) },
    skip: (req) => req.url === '/api/health', // skip health check spam
  })
);

// Apply general rate limiting to all API routes
app.use('/api/', apiLimiter);

// ─── API Routes ──────────────────────────────────────────────────
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/metrics', metricsRoutes);

// ─── Root route (API info) ───────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    name: 'IntellMeet API',
    version: '1.0.0',
    description: 'AI-Powered Enterprise Meeting & Collaboration Platform',
    documentation: '/api/health',
    author: 'Zidio Development',
  });
});

// ─── Error Handling ──────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    httpServer.listen(PORT, () => {
      logger.info('═══════════════════════════════════════════════');
      logger.info('   IntellMeet Backend Server Started');
      logger.info('═══════════════════════════════════════════════');
      logger.info(`   Environment : ${process.env.NODE_ENV}`);
      logger.info(`   Port        : ${PORT}`);
      logger.info(`   API URL     : http://localhost:${PORT}/api`);
      logger.info(`   Health      : http://localhost:${PORT}/api/health`);
      logger.info('═══════════════════════════════════════════════');
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// ─── Graceful Shutdown ───────────────────────────────────────────
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

startServer();
