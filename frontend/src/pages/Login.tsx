import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { validateEmail } from '../lib/utils';
import { Mail, Lock, AlertCircle, Loader2, Sparkles, ShieldCheck, Zap, Users, UserCheck } from 'lucide-react';
import { authService, teamService } from '../services';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const from = location.state?.from?.pathname || '/';

  // Read invite params from URL
  const inviteToken  = searchParams.get('teamInvite') || '';
  const inviteTeamId = searchParams.get('teamId')     || '';
  const inviteEmail  = searchParams.get('email')      || '';

  // Pre-fill email from invite link
  useEffect(() => {
    if (inviteEmail) setEmail(inviteEmail);
  }, [inviteEmail]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) { setError('Please fill in all fields'); return; }
    if (!validateEmail(email)) { setError('Please enter a valid email'); return; }

    try {
      await login(email, password);
      // Accept team invite if present in URL
      if (inviteToken && inviteTeamId) {
        try {
          const res = await teamService.acceptInvite(inviteToken, inviteTeamId);
          setInviteMsg(`✅ Joined "${res.data.data.teamName}"! Redirecting…`);
        } catch {
          // Non-fatal
        }
        navigate('/teams', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = authService.getGoogleLoginUrl();
  };

  return (
    <div className="min-h-screen flex bg-[--color-background]">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex lg:w-[520px] flex-col justify-between p-12"
        style={{ background: 'linear-gradient(145deg, #1e40af 0%, #2563EB 45%, #7c3aed 100%)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-extrabold text-white tracking-tight">IntellMeet</span>
        </div>

        {/* Feature pills */}
        <div className="space-y-8">
          <div>
            <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
              Meetings that<br />think for you.
            </h2>
            <p className="mt-4 text-blue-100/80 text-lg leading-relaxed">
              AI transcription, smart summaries, and action item extraction — all in one workspace.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Zap,        label: 'Live AI Transcription', desc: 'Powered by OpenAI Whisper' },
              { icon: ShieldCheck, label: 'End-to-End Secure',    desc: 'Encrypted meetings & data' },
              { icon: Users,       label: '50+ Participants',      desc: 'WebRTC video conferencing' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-4 rounded-2xl bg-white/10 px-5 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-700 text-white font-bold text-sm">{label}</p>
                  <p className="text-blue-100/70 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-blue-200/60 text-xs">© 2026 IntellMeet — Zidio Technology</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md animate-scale-in">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: 'linear-gradient(135deg, #2563EB, #7c3aed)' }}
            >
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-extrabold text-[--color-foreground] tracking-tight">IntellMeet</span>
          </div>

          <h1 className="text-3xl font-extrabold text-[--color-foreground] tracking-tight">
            {inviteToken ? 'Sign in to accept invite' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-[--color-text-secondary] text-sm">
            {inviteToken ? 'Sign in and you\'ll be added to the team automatically' : 'Sign in to your workspace'}
          </p>

          {/* Invite banner */}
          {inviteToken && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 animate-fade-in">
              <UserCheck className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Team Invitation</p>
                <p className="text-xs text-blue-600 mt-0.5">Sign in below — you'll be joined to the team instantly.</p>
              </div>
            </div>
          )}

          {/* Invite success */}
          {inviteMsg && (
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 animate-fade-in">
              <UserCheck className="h-5 w-5 shrink-0 text-green-600" />
              <span className="text-sm font-semibold text-green-800">{inviteMsg}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="im-alert im-alert-error mt-6 animate-fade-in">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="im-btn im-btn-outline im-btn-lg mt-8 w-full"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm font-black text-blue-600 shadow-sm">
              G
            </span>
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3">
            <hr className="im-divider flex-1" />
            <span className="text-xs font-bold uppercase tracking-widest text-[--color-text-muted]">or</span>
            <hr className="im-divider flex-1" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[--color-foreground] mb-2" htmlFor="login-email">
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[--color-text-muted]" style={{ width: '18px', height: '18px' }} />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="im-input pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-[--color-foreground]" htmlFor="login-password">
                  Password
                </label>
                <button type="button" className="text-xs font-semibold text-[--color-primary] hover:underline">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[--color-text-muted]" style={{ width: '18px', height: '18px' }} />
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="im-input pl-10"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              id="btn-login"
              type="submit"
              disabled={isLoading}
              className="im-btn im-btn-primary im-btn-lg w-full mt-2"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[--color-text-secondary]">
            Don't have an account?{' '}
            <Link to="/register" state={{ from: location.state?.from }} className="font-semibold text-[--color-primary] hover:underline">
              Create account
            </Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-6 rounded-2xl border border-[--color-border] bg-[--color-surface-2] p-4">
            <p className="text-xs font-bold text-[--color-foreground] mb-2">🎯 Demo Credentials</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-[--color-text-secondary]">
              <div>
                <span className="font-medium">Email:</span>
                <p className="font-mono text-[--color-foreground] mt-0.5">admin@intellmeet.com</p>
              </div>
              <div>
                <span className="font-medium">Password:</span>
                <p className="font-mono text-[--color-foreground] mt-0.5">AdminPassword123!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
