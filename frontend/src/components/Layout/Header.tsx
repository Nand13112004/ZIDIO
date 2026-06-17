import { Bell, Search, ShieldCheck, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getInitials } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

export default function Header() {
  const { user } = useAuthStore();
  const { notifications } = useUIStore();

  return (
    <header
      className="flex items-center gap-3 border-b border-[--color-border] bg-white/90 backdrop-blur px-4 py-3 sm:px-6"
      style={{ boxShadow: '0 1px 0 var(--color-border)' }}
    >
      {/* Search */}
      <div className="relative hidden min-w-0 max-w-lg flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--color-text-muted]" />
        <input
          type="text"
          id="global-search"
          placeholder="Search meetings, tasks, teams, summaries…"
          className="im-input h-10 pl-9 pr-4 text-sm"
        />
      </div>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-2">
        {/* Secure tag */}
        <span className="im-badge im-badge-blue hidden lg:inline-flex">
          <ShieldCheck className="h-3.5 w-3.5" />
          Secure workspace
        </span>

        {/* Quick meet */}
        <Link
          to="/meeting/new"
          id="header-new-meeting"
          className="im-btn im-btn-primary h-10 px-3 text-sm"
          title="Start a meeting"
        >
          <Video className="h-4 w-4" />
          <span className="hidden sm:inline">Meet</span>
        </Link>

        {/* Notifications */}
        <button
          type="button"
          id="header-notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[--color-border] bg-white text-[--color-text-secondary] hover:bg-[--color-surface-2] transition-colors"
          title="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          {notifications.length > 0 && (
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          )}
        </button>

        {/* User */}
        <div className="ml-1 hidden items-center gap-3 border-l border-[--color-border] pl-4 sm:flex">
          <div className="text-right">
            <p className="text-sm font-bold text-[--color-foreground] leading-tight">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs font-medium text-[--color-text-muted] capitalize">
              {user?.role === 'user' ? 'Member' : user?.role}
            </p>
          </div>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
            style={{ background: 'linear-gradient(135deg, #2563EB, #7c3aed)' }}
          >
            {getInitials(user?.firstName || 'I', user?.lastName || 'M')}
          </div>
        </div>
      </div>
    </header>
  );
}
