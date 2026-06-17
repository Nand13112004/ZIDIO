import apiClient, { API_ORIGIN } from './api';

// Auth Service
export const authService = {
  register: (data: { firstName: string; lastName: string; email: string; password: string; confirmPassword: string }) =>
    apiClient.post('/auth/register', data),

  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),

  logout: () =>
    apiClient.post('/auth/logout'),

  getCurrentUser: () =>
    apiClient.get('/auth/me'),

  refreshToken: (refreshToken: string) =>
    apiClient.post('/auth/refresh-token', { refreshToken }),

  getGoogleLoginUrl: () => `${API_ORIGIN}/api/auth/google`,

  setPassword: (password: string) =>
    apiClient.post('/auth/set-password', { password }),
};

// User Service
export const userService = {
  getAllUsers: (page = 1, limit = 10, search = '') =>
    apiClient.get('/users', { params: { page, limit, search } }),

  getUserById: (userId: string) =>
    apiClient.get(`/users/${userId}`),

  searchUsers: (query: string, limit = 10) =>
    apiClient.get('/users/search', { params: { query, limit } }),

  updateProfile: (userId: string, data: any) =>
    apiClient.put(`/users/${userId}`, data),

  uploadAvatar: (userId: string, file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiClient.put(`/users/${userId}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },


  updatePreferences: (userId: string, preferences: any) =>
    apiClient.put(`/users/${userId}/preferences`, preferences),

  updateStatus: (userId: string, status: string) =>
    apiClient.put(`/users/${userId}/status`, { status }),

  getUserStats: (userId: string) =>
    apiClient.get(`/users/${userId}/stats`),

  deactivateAccount: (userId: string, password: string) =>
    apiClient.delete(`/users/${userId}`, { data: { password } }),
};

// Team Service
export const teamService = {
  createTeam: (data: { name: string; description?: string }) =>
    apiClient.post('/teams', data),

  getTeams: () =>
    apiClient.get('/teams'),

  getTeamById: (teamId: string) =>
    apiClient.get(`/teams/${teamId}`),

  updateTeam: (teamId: string, data: any) =>
    apiClient.put(`/teams/${teamId}`, data),

  addMember: (teamId: string, userId: string, role = 'member') =>
    apiClient.post(`/teams/${teamId}/members`, { userId, role }),

  removeMember: (teamId: string, memberId: string) =>
    apiClient.delete(`/teams/${teamId}/members/${memberId}`),

  inviteByEmail: (teamId: string, email: string, role = 'member') =>
    apiClient.post(`/teams/${teamId}/invite`, { email, role }),

  acceptInvite: (token: string, teamId: string) =>
    apiClient.post('/teams/accept-invite', { token, teamId }),

  deleteTeam: (teamId: string) =>
    apiClient.delete(`/teams/${teamId}`),
};

// Meeting Service
export const meetingService = {
  createMeeting: (data: {
    title: string;
    description?: string;
    scheduledAt?: string;
    team?: string;
    settings?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }) =>
    apiClient.post('/meetings', data),

  getMeetings: (status = 'completed', page = 1, limit = 10) =>
    apiClient.get('/meetings', { params: { status, page, limit } }),

  getMeetingById: (meetingId: string) =>
    apiClient.get(`/meetings/${meetingId}`),

  joinMeeting: (meetingId: string, password?: string) =>
    apiClient.post(`/meetings/${meetingId}/join`, { password }),

  leaveMeeting: (meetingId: string) =>
    apiClient.post(`/meetings/${meetingId}/leave`),

  endMeeting: (meetingId: string) =>
    apiClient.post(`/meetings/${meetingId}/end`),

  updateMeeting: (meetingId: string, data: any) =>
    apiClient.put(`/meetings/${meetingId}`, data),

  getMeetingMessages: (meetingId: string, page = 1, limit = 50) =>
    apiClient.get(`/meetings/${meetingId}/messages`, { params: { page, limit } }),

  getMeetingSummary: (meetingId: string) =>
    apiClient.get(`/meetings/${meetingId}/summary`),

  generateMeetingIntelligence: (meetingId: string, transcript: string) =>
    apiClient.post(`/meetings/${meetingId}/intelligence`, { transcript }),
};

// Message Service
export const messageService = {
  sendMessage: (data: {
    content: string;
    roomId?: string;
    meetingId?: string;
    teamId?: string;
    recipientId?: string;
    messageType?: string;
    attachments?: any[];
  }) =>
    apiClient.post('/messages', data),

  getMessages: (params: any) =>
    apiClient.get('/messages', { params }),

  editMessage: (messageId: string, content: string) =>
    apiClient.put(`/messages/${messageId}`, { content }),

  deleteMessage: (messageId: string) =>
    apiClient.delete(`/messages/${messageId}`),

  addReaction: (messageId: string, emoji: string) =>
    apiClient.post(`/messages/${messageId}/reactions`, { emoji }),

  markAsRead: (messageIds: string[]) =>
    apiClient.post('/messages/mark-as-read', { messageIds }),
};

// Task Service
export const taskService = {
  createTask: (data: any) =>
    apiClient.post('/tasks', data),

  getTasks: (params: any) =>
    apiClient.get('/tasks', { params }),

  getTaskById: (taskId: string) =>
    apiClient.get(`/tasks/${taskId}`),

  updateTask: (taskId: string, data: any) =>
    apiClient.put(`/tasks/${taskId}`, data),

  completeTask: (taskId: string) =>
    apiClient.patch(`/tasks/${taskId}/complete`),

  addSubtask: (taskId: string, title: string) =>
    apiClient.post(`/tasks/${taskId}/subtasks`, { title }),

  completeSubtask: (taskId: string, subtaskIndex: number) =>
    apiClient.patch(`/tasks/${taskId}/subtasks/${subtaskIndex}/complete`),

  addWatcher: (taskId: string, userId: string) =>
    apiClient.post(`/tasks/${taskId}/watchers`, { userId }),

  deleteTask: (taskId: string) =>
    apiClient.delete(`/tasks/${taskId}`),
};
