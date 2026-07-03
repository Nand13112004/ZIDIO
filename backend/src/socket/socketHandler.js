const logger = require('../utils/logger');

/**
 * Socket.io server initialization
 * Handles real-time events for meetings, chat, and presence
 */
const initializeSocket = (io) => {
  // Track connected users: userId -> socketId
  const connectedUsers = new Map();
  const meetingRooms = new Map();
  const meetingStates = new Map();

  const getMeetingState = (meetingId) => {
    if (!meetingStates.has(meetingId)) {
      meetingStates.set(meetingId, {
        sharedNotes: '',
        raisedHands: {},
        settings: {},
      });
    }
    return meetingStates.get(meetingId);
  };

  const getMeetingParticipants = (meetingId) => {
    return Array.from(meetingRooms.get(meetingId)?.values() || []);
  };

  const emitMeetingParticipants = (meetingId) => {
    io.to(`meeting:${meetingId}`).emit('meeting:participants', {
      meetingId,
      participants: getMeetingParticipants(meetingId),
    });
  };

  const removeFromMeeting = (socket, meetingId) => {
    const room = meetingRooms.get(meetingId);
    if (!room) return;

    const participant = room.get(socket.id);
    room.delete(socket.id);

    if (room.size === 0) {
      meetingRooms.delete(meetingId);
    }

    socket.leave(`meeting:${meetingId}`);

    if (participant) {
      socket.to(`meeting:${meetingId}`).emit('meeting:user-left', {
        userId: participant.userId,
        socketId: socket.id,
      });
    }

    emitMeetingParticipants(meetingId);
  };

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // --------------- USER PRESENCE ---------------
    socket.on('user:online', ({ userId }) => {
      connectedUsers.set(userId, socket.id);
      socket.userId = userId;
      io.emit('user:status', { userId, status: 'online' });
      logger.debug(`User ${userId} is online`);
    });

    // --------------- MEETING ROOM ---------------
    socket.on('meeting:join', ({ meetingId, userId, userName }) => {
      if (socket.meetingId && socket.meetingId !== meetingId) {
        removeFromMeeting(socket, socket.meetingId);
      }

      socket.join(`meeting:${meetingId}`);
      socket.meetingId = meetingId;
      socket.userId = userId;
      socket.userName = userName;
      connectedUsers.set(userId, socket.id);

      if (!meetingRooms.has(meetingId)) {
        meetingRooms.set(meetingId, new Map());
      }
      const state = getMeetingState(meetingId);

      meetingRooms.get(meetingId).set(socket.id, {
        userId,
        userName,
        socketId: socket.id,
        status: 'joined',
      });

      socket.to(`meeting:${meetingId}`).emit('meeting:user-joined', {
        userId,
        userName,
        socketId: socket.id,
      });
      emitMeetingParticipants(meetingId);
      socket.emit('meeting:state', {
        meetingId,
        sharedNotes: state.sharedNotes,
        raisedHands: state.raisedHands,
        settings: state.settings,
      });
      logger.info(`User ${userName} joined meeting ${meetingId}`);
    });

    socket.on('meeting:leave', ({ meetingId, userId }) => {
      removeFromMeeting(socket, meetingId);
      if (socket.meetingId === meetingId) {
        socket.meetingId = null;
      }
      logger.info(`User ${userId} left meeting ${meetingId}`);
    });

    // --------------- WebRTC SIGNALING ---------------
    socket.on('webrtc:offer', ({ to, offer }) => {
      io.to(connectedUsers.get(to) || to).emit('webrtc:offer', {
        offer,
        from: socket.id,
      });
    });

    socket.on('webrtc:answer', ({ to, answer }) => {
      io.to(to).emit('webrtc:answer', { answer, from: socket.id });
    });

    socket.on('webrtc:ice-candidate', ({ to, candidate }) => {
      io.to(connectedUsers.get(to) || to).emit('webrtc:ice-candidate', {
        candidate,
        from: socket.id,
      });
    });

    // --------------- CHAT & MESSAGING ---------------
    socket.on('chat:message', ({ roomId, meetingId, message, sender }) => {
      if (roomId) {
        io.to(roomId).emit('chat:message', {
          ...message,
          sender,
          timestamp: new Date(),
        });
      } else if (meetingId) {
        io.to(`meeting:${meetingId}`).emit('chat:message', {
          ...message,
          sender,
          timestamp: new Date(),
        });
      }
      logger.debug(`Chat message from ${sender}`);
    });

    socket.on('chat:typing', ({ roomId, meetingId, userId, userName }) => {
      if (roomId) {
        socket.to(roomId).emit('chat:typing', { userId, userName });
      } else if (meetingId) {
        socket.to(`meeting:${meetingId}`).emit('chat:typing', { userId, userName });
      }
    });

    socket.on('chat:stop-typing', ({ roomId, meetingId, userId }) => {
      if (roomId) {
        socket.to(roomId).emit('chat:stop-typing', { userId });
      } else if (meetingId) {
        socket.to(`meeting:${meetingId}`).emit('chat:stop-typing', { userId });
      }
    });

    socket.on('chat:join', ({ roomId, teamId, meetingId }) => {
      if (roomId) {
        socket.join(roomId);
        logger.debug(`Socket ${socket.id} joined chat room ${roomId}`);
      }
      if (teamId) {
        socket.join(`team:${teamId}`);
        logger.debug(`Socket ${socket.id} joined team chat ${teamId}`);
      }
      if (meetingId) {
        socket.join(`meeting:${meetingId}`);
        logger.debug(`Socket ${socket.id} joined meeting chat ${meetingId}`);
      }
    });

    socket.on('chat:leave', ({ roomId, teamId, meetingId }) => {
      if (roomId) {
        socket.leave(roomId);
        logger.debug(`Socket ${socket.id} left chat room ${roomId}`);
      }
      if (teamId) {
        socket.leave(`team:${teamId}`);
        logger.debug(`Socket ${socket.id} left team chat ${teamId}`);
      }
      if (meetingId) {
        socket.leave(`meeting:${meetingId}`);
        logger.debug(`Socket ${socket.id} left meeting chat ${meetingId}`);
      }
    });

    // --------------- NOTIFICATIONS ---------------
    socket.on('notification:send', ({ recipientId, notification }) => {
      io.to(connectedUsers.get(recipientId) || recipientId).emit(
        'notification:received',
        notification
      );
    });

    socket.on('notification:read', ({ notificationId }) => {
      io.emit('notification:marked-read', { notificationId });
    });

    // --------------- PRESENCE & STATUS ---------------
    socket.on('user:idle', ({ userId }) => {
      io.emit('user:status', { userId, status: 'idle' });
    });

    socket.on('user:active', ({ userId }) => {
      io.emit('user:status', { userId, status: 'online' });
    });

    // --------------- MEETING EVENTS ---------------
    socket.on('meeting:participant-muted', ({ meetingId, userId }) => {
      io.to(`meeting:${meetingId}`).emit('meeting:participant-muted', { userId });
    });

    socket.on('meeting:participant-unmuted', ({ meetingId, userId }) => {
      io.to(`meeting:${meetingId}`).emit('meeting:participant-unmuted', { userId });
    });

    socket.on('meeting:screen-share-started', ({ meetingId, userId, userName }) => {
      io.to(`meeting:${meetingId}`).emit('meeting:screen-share-started', {
        userId,
        userName,
      });
    });

    socket.on('meeting:screen-share-stopped', ({ meetingId, userId }) => {
      io.to(`meeting:${meetingId}`).emit('meeting:screen-share-stopped', { userId });
    });

    socket.on('meeting:participant-video-on', ({ meetingId, userId }) => {
      io.to(`meeting:${meetingId}`).emit('meeting:participant-video-on', { userId });
    });

    socket.on('meeting:participant-video-off', ({ meetingId, userId }) => {
      io.to(`meeting:${meetingId}`).emit('meeting:participant-video-off', { userId });
    });

    socket.on('meeting:reaction', ({ meetingId, userId, userName, emoji }) => {
      io.to(`meeting:${meetingId}`).emit('meeting:reaction', {
        userId,
        userName,
        emoji,
        timestamp: new Date(),
      });
    });

    socket.on('meeting:raise-hand', ({ meetingId, userId, userName }) => {
      const state = getMeetingState(meetingId);
      state.raisedHands[userId] = {
        userId,
        userName,
        raisedAt: new Date(),
      };
      io.to(`meeting:${meetingId}`).emit('meeting:raised-hands', state.raisedHands);
    });

    socket.on('meeting:lower-hand', ({ meetingId, userId }) => {
      const state = getMeetingState(meetingId);
      delete state.raisedHands[userId];
      io.to(`meeting:${meetingId}`).emit('meeting:raised-hands', state.raisedHands);
    });

    socket.on('meeting:shared-notes-update', ({ meetingId, notes, userId, userName }) => {
      const state = getMeetingState(meetingId);
      state.sharedNotes = notes || '';
      socket.to(`meeting:${meetingId}`).emit('meeting:shared-notes-update', {
        notes: state.sharedNotes,
        userId,
        userName,
        updatedAt: new Date(),
      });
    });

    socket.on('meeting:task-create', ({ meetingId, task, userId, userName }) => {
      io.to(`meeting:${meetingId}`).emit('meeting:task-create', {
        task,
        userId,
        userName,
        createdAt: new Date(),
      });
    });

    socket.on('meeting:settings-update', ({ meetingId, settings, userId, userName }) => {
      const state = getMeetingState(meetingId);
      state.settings = {
        ...state.settings,
        ...settings,
      };
      io.to(`meeting:${meetingId}`).emit('meeting:settings-update', {
        settings: state.settings,
        userId,
        userName,
      });
    });

    socket.on('meeting:admission-request', ({ meetingId, userId, userName }) => {
      io.to(`meeting:${meetingId}`).emit('meeting:admission-request', {
        meetingId,
        userId,
        userName,
        socketId: socket.id,
        requestedAt: new Date(),
      });
    });

    socket.on('meeting:admission-approved', ({ meetingId, userId, socketId }) => {
      io.to(socketId).emit('meeting:admission-approved', {
        meetingId,
        userId,
      });
    });

    // --------------- TASK UPDATES ---------------
    socket.on('task:updated', ({ taskId, updates }) => {
      io.emit('task:updated', { taskId, updates, timestamp: new Date() });
    });

    socket.on('task:assigned', ({ taskId, assignee, assigner }) => {
      io.to(connectedUsers.get(assignee) || assignee).emit('task:assigned', {
        taskId,
        assigner,
      });
    });

    // --------------- TEAM UPDATES ---------------
    socket.on('team:member-joined', ({ teamId, member }) => {
      io.to(`team:${teamId}`).emit('team:member-joined', { member });
    });

    socket.on('team:member-left', ({ teamId, memberId }) => {
      io.to(`team:${teamId}`).emit('team:member-left', { memberId });
    });

    // --------------- DISCONNECT ---------------
    socket.on('disconnect', () => {
      if (socket.userId) {
        connectedUsers.delete(socket.userId);
        io.emit('user:status', { userId: socket.userId, status: 'offline' });

        // Notify meeting room if user was in one
        if (socket.meetingId) {
          removeFromMeeting(socket, socket.meetingId);
        }
      }
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

module.exports = initializeSocket;
