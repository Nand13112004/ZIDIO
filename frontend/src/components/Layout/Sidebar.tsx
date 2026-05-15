import { Link, useLocation } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import {
  Home,
  Video,
  Users,
  CheckSquare,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { logout } = useAuthStore();
  const location = useLocation();

  const menuItems = [
    { icon: Home, label: 'Dashboard', href: '/', id: 'dashboard' },
    { icon: Video, label: 'Meetings', href: '/meeting/new', id: 'meetings' },
    { icon: Users, label: 'Teams', href: '/teams', id: 'teams' },
    { icon: CheckSquare, label: 'Tasks', href: '/tasks', id: 'tasks' },
    { icon: MessageSquare, label: 'Messages', href: '/messages', id: 'messages' },
  ];

  const isActive = (href: string, id: string) =>
    id === 'meetings'
      ? location.pathname.startsWith('/meeting')
      : location.pathname === href || location.pathname.startsWith(href);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-white dark:bg-gray-900 rounded-lg"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed lg:static inset-y-0 left-0 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-6 transition-transform duration-300 lg:translate-x-0 z-40 flex flex-col`}
      >
        {/* Logo */}
        <div className="mb-8 mt-4 lg:mt-0">
          <h1 className="text-2xl font-black text-primary">IntellMeet</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400">Enterprise Platform</p>
        </div>

        {/* Navigation */}
        <nav className="space-y-2 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.id);
            return (
              <Link
                key={item.id}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  active
                    ? 'bg-primary text-white'
                    : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon size={20} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="space-y-2 border-t border-gray-200 dark:border-gray-800 pt-4">
          <Link
            to="/profile"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Settings size={20} />
            <span className="text-sm font-medium">Settings</span>
          </Link>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-700 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
          >
            <LogOut size={20} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
}
