import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Bell,
  BriefcaseBusiness,
  Camera,
  Calendar,
  Globe,
  Loader2,
  LogOut,
  Mail,
  Palette,
  Save,
  Shield,
  Sparkles,
  Upload,
  User,
  type LucideIcon,
} from 'lucide-react';
import { getInitials } from '../lib/utils';
import { userService } from '../services';
import { useAuthStore } from '../store/authStore';

export default function Profile() {
  const { user, logout, getCurrentUser } = useAuthStore();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    department: '',
    jobTitle: '',
    phoneNumber: '',
    bio: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      department: user?.department || '',
      jobTitle: user?.jobTitle || '',
      phoneNumber: user?.phoneNumber || '',
      bio: user?.bio || '',
    });
  }, [user]);

  const profileStats = useMemo(
    () => [
      { icon: Calendar, label: 'Member since', value: '2026' },
      { icon: Globe, label: 'Workspace', value: 'Zidio AI' },
      { icon: Sparkles, label: 'AI engine', value: 'Active' },
    ],
    []
  );

  const updateField = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?._id) return;

    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      await userService.updateProfile(user._id, form);
      await getCurrentUser();
      setMessage('Profile saved successfully.');
    } catch {
      setError('Profile could not be saved. Check your backend connection and permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?._id) return;

    setIsUploading(true);
    setError('');
    setMessage('');

    try {
      await userService.uploadAvatar(user._id, file);
      await getCurrentUser();
      setMessage('Avatar uploaded to Cloudinary.');
    } catch {
      setError('Avatar upload failed. Configure Cloudinary variables on the backend first.');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="im-page-title">Profile & Security</h1>
        <p className="im-page-subtitle">Manage identity, avatar, notifications, and workspace preferences.</p>
      </div>

      {message && <div className="im-alert im-alert-success">{message}</div>}
      {error && <div className="im-alert im-alert-error">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="im-card p-6 text-center">
            <div className="relative mx-auto h-28 w-28">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="h-28 w-28 rounded-full object-cover shadow-lg ring-4 ring-white"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-[--color-primary] to-[--color-secondary] text-3xl font-black text-white shadow-lg ring-4 ring-white">
                  {getInitials(user?.firstName || 'I', user?.lastName || 'M')}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-[--color-primary] text-white shadow-md transition hover:bg-[--color-primary-hover]"
                title="Upload avatar"
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            <h2 className="mt-4 text-lg font-black text-[--color-foreground]">
              {user?.firstName} {user?.lastName}
            </h2>
            <span className="im-badge im-badge-blue mt-2 capitalize">
              {user?.role === 'user' ? 'Member' : user?.role}
            </span>
            <p className="mt-2 break-all text-sm text-[--color-text-muted]">{user?.email}</p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="im-btn im-btn-outline mt-5 w-full"
            >
              <Upload className="h-4 w-4" />
              Upload avatar
            </button>

            <div className="mt-5 space-y-2 border-t border-[--color-border] pt-4 text-left">
              {profileStats.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 shrink-0 text-[--color-text-muted]" />
                  <span className="flex-1 text-[--color-text-muted]">{label}</span>
                  <span className="font-bold text-[--color-foreground]">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="im-card p-4">
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-red-600">Account</p>
            <button type="button" onClick={() => void logout()} className="im-btn im-btn-danger w-full">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>

        <main className="space-y-5">
          <form onSubmit={handleSave} className="im-card p-6">
            <div className="mb-5 flex items-center gap-2 border-b border-[--color-border] pb-4">
              <User className="h-5 w-5 text-[--color-primary]" />
              <h2 className="font-bold text-[--color-foreground]">Personal Information</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileInput label="First name" name="firstName" value={form.firstName} onChange={updateField} />
              <ProfileInput label="Last name" name="lastName" value={form.lastName} onChange={updateField} />
              <ProfileInput label="Department" name="department" value={form.department} onChange={updateField} icon={BriefcaseBusiness} />
              <ProfileInput label="Job title" name="jobTitle" value={form.jobTitle} onChange={updateField} icon={BriefcaseBusiness} />
              <ProfileInput label="Phone number" name="phoneNumber" value={form.phoneNumber} onChange={updateField} />

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[--color-text-secondary]">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--color-text-muted]" />
                  <input className="im-input pl-9" value={user?.email || ''} disabled />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-[--color-text-secondary]">
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={form.bio}
                  onChange={updateField}
                  rows={3}
                  className="im-input resize-none"
                  placeholder="Short professional introduction"
                />
              </div>
            </div>

            <button type="submit" disabled={isSaving} className="im-btn im-btn-primary mt-5">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </button>
          </form>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="im-card p-6">
              <div className="mb-5 flex items-center gap-2 border-b border-[--color-border] pb-4">
                <Shield className="h-5 w-5 text-[--color-secondary]" />
                <h2 className="font-bold text-[--color-foreground]">Security Extras</h2>
              </div>
              <div className="space-y-3">
                <SecurityRow title="JWT + refresh token session" status="Enabled" />
                <SecurityRow title="Google OAuth2 login" status="Ready" />
                <SecurityRow title="Meeting password protection" status="Enabled" />
                <SecurityRow title="Waiting room admission" status="Enabled" />
              </div>
            </section>

            <section className="im-card p-6">
              <div className="mb-5 flex items-center gap-2 border-b border-[--color-border] pb-4">
                <Bell className="h-5 w-5 text-[--color-accent]" />
                <h2 className="font-bold text-[--color-foreground]">Delivery Preferences</h2>
              </div>
              <div className="space-y-4">
                {[
                  ['Meeting invitations', 'Notify when invited to a room'],
                  ['AI summaries ready', 'Send email when reports finish'],
                  ['Task assignments', 'Notify when action items are assigned'],
                  ['Chat mentions', 'Alert for @mentions in workspace chat'],
                ].map(([label, desc]) => (
                  <ToggleRow key={label} label={label} desc={desc} />
                ))}
              </div>
            </section>
          </div>

          <section className="im-card p-6">
            <div className="mb-4 flex items-center gap-2 border-b border-[--color-border] pb-4">
              <Palette className="h-5 w-5 text-[--color-warning]" />
              <h2 className="font-bold text-[--color-foreground]">Appearance</h2>
            </div>
            <p className="mb-4 text-sm text-[--color-text-secondary]">
              The project is tuned around a professional white theme, with dark mode available from the header.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border-2 border-[--color-primary] bg-white p-4 text-sm font-bold text-[--color-foreground]">
                Light theme active
              </div>
              <div className="rounded-xl border border-[--color-border] bg-[--color-surface-2] p-4 text-sm font-semibold text-[--color-text-secondary]">
                Dark toggle supported
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function ProfileInput({
  label,
  name,
  value,
  onChange,
  icon: Icon,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  icon?: LucideIcon;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[--color-text-secondary]">{label}</label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--color-text-muted]" />}
        <input name={name} value={value} onChange={onChange} className={`im-input ${Icon ? 'pl-9' : ''}`} />
      </div>
    </div>
  );
}

function SecurityRow({ title, status }: { title: string; status: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[--color-border] bg-[--color-surface-2] px-3 py-2.5">
      <span className="text-sm font-semibold text-[--color-foreground]">{title}</span>
      <span className="im-badge im-badge-green text-[11px]">{status}</span>
    </div>
  );
}

function ToggleRow({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-[--color-foreground]">{label}</p>
        <p className="mt-0.5 text-xs text-[--color-text-muted]">{desc}</p>
      </div>
      <label className="relative inline-flex cursor-pointer items-center">
        <input type="checkbox" defaultChecked className="peer sr-only" />
        <span className="h-5 w-9 rounded-full bg-[--color-border] transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition-transform after:content-[''] peer-checked:bg-[--color-primary] peer-checked:after:translate-x-4" />
      </label>
    </div>
  );
}
