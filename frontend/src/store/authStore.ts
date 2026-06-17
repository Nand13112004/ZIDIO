import { create } from 'zustand';
import { authService } from '../services/index';
import { socketService } from '../services/socket';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: string;
  teams: any[];
  status: string;
  department?: string;
  jobTitle?: string;
  phoneNumber?: string;
  bio?: string;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  hydrateSession: (accessToken: string, refreshToken?: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authService.login(email, password);
      const { user, accessToken, refreshToken } = response.data.data;

      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      set({ user, isAuthenticated: true });

      // Connect socket after login
      socketService.connect(accessToken);
      socketService.setOnline(user._id);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data: any) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authService.register(data);
      const { user, accessToken, refreshToken } = response.data.data;

      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      set({ user, isAuthenticated: true });

      socketService.connect(accessToken);
      socketService.setOnline(user._id);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true });
      await authService.logout();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      socketService.disconnect();
      set({ user: null, isAuthenticated: false });
    } catch (error: any) {
      console.error('Logout error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  getCurrentUser: async () => {
    try {
      set({ isLoading: true });
      const response = await authService.getCurrentUser();
      const { user } = response.data.data;
      set({ user, isAuthenticated: true });
    } catch {
      set({ isAuthenticated: false, user: null });
    } finally {
      set({ isLoading: false });
    }
  },

  hydrateSession: async (accessToken: string, refreshToken?: string) => {
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }

    socketService.connect(accessToken);

    try {
      set({ isLoading: true, error: null });
      const response = await authService.getCurrentUser();
      const { user } = response.data.data;
      set({ user, isAuthenticated: true });
      socketService.setOnline(user._id);
    } catch (error: any) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ isAuthenticated: false, user: null, error: error.response?.data?.message || 'OAuth login failed' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
