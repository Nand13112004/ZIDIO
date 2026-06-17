import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services';
import { Lock, AlertCircle, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

export default function SetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isGoogle = searchParams.get('isGoogle') === 'true';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await authService.setPassword(password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[--color-background] p-4">
      <div className="w-full max-w-md animate-scale-in">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #2563EB, #7c3aed)' }}
          >
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-[--color-foreground] tracking-tight">
            Secure Your Account
          </h1>
          <p className="mt-2 text-[--color-text-secondary] text-sm">
            {isGoogle 
              ? 'Set a password if you want to also log in with email and password in the future.'
              : 'Configure your login password.'
            }
          </p>
        </div>

        <div className="im-card-lg p-8">
          {success ? (
            <div className="text-center py-6 animate-fade-in">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[--color-foreground]">Password configured!</h3>
              <p className="text-sm text-[--color-text-secondary] mt-1">
                You can now log in using either Google or your email &amp; password.
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="im-alert im-alert-error mb-6 animate-fade-in">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-[--color-foreground] mb-2" htmlFor="set-password">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[--color-text-muted]" style={{ width: '18px', height: '18px' }} />
                    <input
                      id="set-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="im-input pl-10"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[--color-foreground] mb-2" htmlFor="confirm-set-password">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[--color-text-muted]" style={{ width: '18px', height: '18px' }} />
                    <input
                      id="confirm-set-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="im-input pl-10"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="im-btn im-btn-primary im-btn-lg w-full mt-2"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isLoading ? 'Configuring…' : 'Set Password'}
                </button>

                {isGoogle && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={isLoading}
                    className="im-btn im-btn-outline im-btn-lg w-full"
                  >
                    Skip &amp; Continue
                  </button>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
