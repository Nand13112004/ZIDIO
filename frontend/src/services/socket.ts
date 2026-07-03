import io from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  private socket: any = null;

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // User presence
  setOnline(userId: string) {
    this.emit('user:online', { userId });
  }

  setStatus(userId: string, status: string) {
    this.emit('user:status', { userId, status });
  }

  // Meeting events
  joinMeeting(meetingId: string, userId: string, userName: string) {
    this.emit('meeting:join', { meetingId, userId, userName });
  }

  leaveMeeting(meetingId: string, userId: string) {
    this.emit('meeting:leave', { meetingId, userId });
  }

  // Chat events
  sendMessage(data: any) {
    this.emit('chat:message', data);
  }

  startTyping(roomId: string, userId: string, userName: string) {
    this.emit('chat:typing', { roomId, userId, userName });
  }

  stopTyping(roomId: string, userId: string) {
    this.emit('chat:stop-typing', { roomId, userId });
  }

  joinChat(roomId?: string, teamId?: string, meetingId?: string) {
    this.emit('chat:join', { roomId, teamId, meetingId });
  }

  leaveChat(roomId?: string, teamId?: string, meetingId?: string) {
    this.emit('chat:leave', { roomId, teamId, meetingId });
  }

  // WebRTC signaling
  sendWebRTCOffer(to: string, offer: any) {
    this.emit('webrtc:offer', { to, offer });
  }

  sendWebRTCAnswer(to: string, answer: any) {
    this.emit('webrtc:answer', { to, answer });
  }

  sendICECandidate(to: string, candidate: any) {
    this.emit('webrtc:ice-candidate', { to, candidate });
  }
}

export const socketService = new SocketService();
