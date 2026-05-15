import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { Bell, Moon, Sun } from 'lucide-react';
import { getInitials } from '../../lib/utils';

export default function Header() {
  const { user } = useAuthStore();
  const { isDarkMode, toggleDarkMode, notifications } = useUIStore();

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
      {/* Search Bar */}
      <div className="flex-1 max-w-md">
        <input
          type="text"
          placeholder="Search meetings, tasks, teams..."
          className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm placeholder-gray-600 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Notifications */}
        <button className="relative p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
          <Bell size={20} />
          {notifications.length > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          )}
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-800">
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{user?.role}</p>
          </div>
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {getInitials(user?.firstName || '', user?.lastName || '')}
          </div>
        </div>
      </div>
    </header>
  );
}
