import { useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useAuthStore } from './store/authStore';
import { useUIStore } from './store/uiStore';
import { socketService } from './services/socket';

import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Meeting from './pages/Meeting';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import Register from './pages/Register';
import Tasks from './pages/Tasks';
import Teams from './pages/Teams';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const { user, getCurrentUser, isAuthenticated } = useAuthStore();
  const { isDarkMode } = useUIStore();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      socketService.connect(token);
      if (!user) {
        void getCurrentUser();
      }
    }
  }, [getCurrentUser, user]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/meeting/:meetingId" element={<Meeting />} />
                    <Route path="/messages" element={<Messages />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/teams" element={<Teams />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
