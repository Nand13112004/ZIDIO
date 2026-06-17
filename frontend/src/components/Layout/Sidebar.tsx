import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  CheckSquare,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Sparkles,
  Users,
  Video,
  X,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { getInitials } from '../../lib/utils';

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { logout, user } = useAuthStore();
  const location = useLocation();

  const menuItems = [
    { icon: Home,         label: 'Dashboard', href: '/',         id: 'dashboard' },
    { icon: Video,        label: 'Meetings',  href: '/meeting/new?mode=create', id: 'meetings' },
    { icon: Users,        label: 'Teams',     href: '/teams',    id: 'teams' },
    { icon: CheckSquare,  label: 'Tasks',     href: '/tasks',    id: 'tasks' },
    { icon: MessageSquare,label: 'Messages',  href: '/messages', id: 'messages' },
  ];

  const isActive = (href: string, id: string) =>
    id === 'meetings'
      ? location.pathname.startsWith('/meeting')
      : href === '/'
        ? location.pathname === '/' || location.pathname === '/dashboard'
        : location.pathname.startsWith(href);

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={toggleSidebar}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-[--color-border] bg-white shadow-sm text-[--color-text-secondary] hover:bg-[--color-surface-2] transition-colors lg:hidden"
        title="Toggle navigation"
        id="sidebar-toggle"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-[--color-border] bg-white transition-transform duration-300 lg:static lg:translate-x-0`}
        style={{ boxShadow: sidebarOpen ? '4px 0 24px rgba(15,23,42,0.08)' : 'none' }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-[--color-border]">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
            style={{ background: 'linear-gradient(135deg, #2563EB, #7c3aed)' }}
          >
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-base font-800 text-[--color-foreground] tracking-tight font-extrabold">IntellMeet</p>
            <p className="text-[11px] font-semibold text-[--color-text-muted] uppercase tracking-widest">Zidio Workspace</p>
          </div>
        </div>

        {/* AI status pill */}
        <div className="mx-4 my-4 flex items-center gap-2.5 rounded-xl border border-[--color-border] bg-[--color-surface-2] px-4 py-3">
          <Zap className="h-4 w-4 text-[--color-primary] shrink-0" />
          <div>
            <p className="text-xs font-700 text-[--color-foreground] font-bold">AI Engine Active</p>
            <p className="text-[11px] text-[--color-text-muted] leading-relaxed mt-0.5">Transcription · Summaries · Actions</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto scrollbar-none">
          <p className="px-3 pt-1 pb-2 text-[10px] font-700 uppercase tracking-widest text-[--color-text-muted] font-bold">Main</p>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.id);
            return (
              <Link
                key={item.id}
                to={item.href}
                id={`nav-${item.id}`}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-600 transition-all duration-150 font-semibold ${
                  active
                    ? 'bg-[--color-primary] text-white shadow-sm'
                    : 'text-[--color-text-secondary] hover:bg-[--color-surface-2] hover:text-[--color-foreground]'
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/70" />}
              </Link>
            );
          })}

          <p className="px-3 pt-4 pb-2 text-[10px] font-bold uppercase tracking-widest text-[--color-text-muted]">Analytics</p>
          <Link
            to="/"
            id="nav-analytics"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[--color-text-secondary] hover:bg-[--color-surface-2] hover:text-[--color-foreground] transition-all"
          >
            <BarChart3 className="h-[18px] w-[18px] shrink-0" />
            Insights
          </Link>
        </nav>

        {/* Bottom section */}
        <div className="border-t border-[--color-border] p-3 space-y-0.5">
          <Link
            to="/profile"
            id="nav-profile"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
              location.pathname === '/profile'
                ? 'bg-[--color-primary] text-white'
                : 'text-[--color-text-secondary] hover:bg-[--color-surface-2] hover:text-[--color-foreground]'
            }`}
          >
            <Settings className="h-[18px] w-[18px] shrink-0" />
            Settings
          </Link>

          {/* User card */}
          {user && (
            <div className="mt-2 flex items-center gap-3 rounded-xl bg-[--color-surface-2] px-3 py-2.5">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #2563EB, #7c3aed)' }}
              >
                {getInitials(user.firstName || 'I', user.lastName || 'M')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[--color-foreground] truncate">{user.firstName} {user.lastName}</p>
                <p className="text-[11px] text-[--color-text-muted] truncate capitalize">{user.role === 'user' ? 'Member' : user.role}</p>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                id="btn-logout"
                className="rounded-lg p-1.5 text-[--color-text-muted] hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
          aria-label="Close navigation"
        />
      )}
    </>
  );
}
