import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { validateEmail, validatePassword } from '../lib/utils';
import { Mail, Lock, AlertCircle, Loader2, Sparkles, User, UserCheck } from 'lucide-react';
import { authService, teamService } from '../services';

export default function Register() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const from = location.state?.from?.pathname || '/';

  // Read invite params from URL
  const inviteToken = searchParams.get('teamInvite') || '';
  const inviteTeamId = searchParams.get('teamId') || '';
  const inviteEmail  = searchParams.get('email')  || '';

  // Pre-fill email from invite link
  useEffect(() => {
    if (inviteEmail) {
      setFormData((prev) => ({ ...prev, email: inviteEmail }));
    }
  }, [inviteEmail]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError('Please fill in all fields'); return;
    }
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email'); return;
    }
    if (!validatePassword(formData.password)) {
      setError('Password must be at least 6 characters'); return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match'); return;
    }

    try {
      await register(formData);
      // If the user arrived via an invite link, accept the invite immediately
      if (inviteToken && inviteTeamId) {
        try {
          const res = await teamService.acceptInvite(inviteToken, inviteTeamId);
          setInviteMsg(`✅ You've joined "${res.data.data.teamName}"! Redirecting…`);
        } catch {
          // Non-fatal — user can manually join later
        }
      }
      navigate(inviteTeamId ? '/teams' : from, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = authService.getGoogleLoginUrl();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[--color-background] p-4">
      <div className="w-full max-w-lg animate-scale-in">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #2563EB, #7c3aed)' }}
          >
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-[--color-foreground] tracking-tight">
            {inviteToken ? 'Accept your invitation' : 'Create your account'}
          </h1>
          <p className="mt-2 text-[--color-text-secondary] text-sm">
            {inviteToken ? 'Create your account to join the team' : 'Join the AI-powered meeting platform'}
          </p>
        </div>

        <div className="im-card-lg p-8">
          {/* Invite banner */}
          {inviteToken && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 animate-fade-in">
              <UserCheck className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Team Invitation</p>
                <p className="text-xs text-blue-600 mt-0.5">Create your account below to automatically join the team.</p>
              </div>
            </div>
          )}

          {/* Invite success message */}
          {inviteMsg && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 animate-fade-in">
              <UserCheck className="h-5 w-5 shrink-0 text-green-600" />
              <span className="text-sm font-semibold text-green-800">{inviteMsg}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="im-alert im-alert-error mb-6 animate-fade-in">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="im-btn im-btn-outline im-btn-lg mb-6 w-full"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-black text-blue-600 shadow-sm">
              G
            </span>
            Sign up with Google
          </button>

          <div className="mb-6 flex items-center gap-3">
            <hr className="im-divider flex-1" />
            <span className="text-xs font-bold uppercase tracking-widest text-[--color-text-muted]">or</span>
            <hr className="im-divider flex-1" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[--color-foreground] mb-2" htmlFor="reg-firstName">
                  First name
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[--color-text-muted]" style={{ width: '18px', height: '18px' }} />
                  <input
                    id="reg-firstName"
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="John"
                    className="im-input pl-10"
                    autoComplete="given-name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[--color-foreground] mb-2" htmlFor="reg-lastName">
                  Last name
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[--color-text-muted]" style={{ width: '18px', height: '18px' }} />
                  <input
                    id="reg-lastName"
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Doe"
                    className="im-input pl-10"
                    autoComplete="family-name"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-[--color-foreground] mb-2" htmlFor="reg-email">
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[--color-text-muted]" style={{ width: '18px', height: '18px' }} />
                <input
                  id="reg-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@company.com"
                  className="im-input pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-[--color-foreground] mb-2" htmlFor="reg-password">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[--color-text-muted]" style={{ width: '18px', height: '18px' }} />
                <input
                  id="reg-password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  className="im-input pl-10"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-[--color-foreground] mb-2" htmlFor="reg-confirmPassword">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[--color-text-muted]" style={{ width: '18px', height: '18px' }} />
                <input
                  id="reg-confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="im-input pl-10"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              id="btn-register"
              type="submit"
              disabled={isLoading}
              className="im-btn im-btn-primary im-btn-lg w-full mt-2"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <hr className="im-divider my-6" />

          <p className="text-center text-sm text-[--color-text-secondary]">
            Already have an account?{' '}
            <Link to="/login" state={{ from: location.state?.from }} className="font-semibold text-[--color-primary] hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-[--color-text-muted]">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
