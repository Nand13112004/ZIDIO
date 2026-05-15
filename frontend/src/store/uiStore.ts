import { create } from 'zustand';

interface UIState {
  isDarkMode: boolean;
  sidebarOpen: boolean;
  notifications: any[];
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  addNotification: (notification: any) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isDarkMode: localStorage.getItem('isDarkMode') === 'true',
  sidebarOpen: true,
  notifications: [],

  toggleDarkMode: () => {
    set((state) => {
      const newMode = !state.isDarkMode;
      localStorage.setItem('isDarkMode', String(newMode));
      document.documentElement.classList.toggle('dark', newMode);
      return { isDarkMode: newMode };
    });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  addNotification: (notification: any) => {
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id: Date.now() }],
    }));

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== notification.id),
      }));
    }, 5000);
  },

  removeNotification: (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearNotifications: () => {
    set({ notifications: [] });
  },
}));
