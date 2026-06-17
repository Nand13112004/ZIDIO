import { useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';
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
import SetPassword from './pages/SetPassword';
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

function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hydrateSession } = useAuthStore();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken') || undefined;
    const isNewUser = searchParams.get('isNewUser') === 'true';

    if (!accessToken) {
      navigate('/login', { replace: true });
      return;
    }

    void hydrateSession(accessToken, refreshToken)
      .then(() => {
        if (isNewUser) {
          navigate('/set-password?isGoogle=true', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      })
      .catch(() => navigate('/login', { replace: true }));
  }, [hydrateSession, navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="app-card max-w-md p-8 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <h1 className="text-xl font-black text-gray-950 dark:text-white">Completing secure sign-in</h1>
        <p className="mt-2 text-sm text-gray-500">Your Google session is being connected to IntellMeet.</p>
      </div>
    </div>
  );
}

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
          <Route path="/oauth/callback" element={<OAuthCallback />} />
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
                    <Route path="/set-password" element={<SetPassword />} />
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
