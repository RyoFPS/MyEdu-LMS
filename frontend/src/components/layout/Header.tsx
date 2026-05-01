import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../ui/avatar';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { Bell, User, LogOut, Settings } from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';

interface HeaderProps {
  title: string;
  description?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, description }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16">
        {/* Title */}
        <div className="pl-11 lg:pl-0 min-w-0 flex-1 mr-2 sm:mr-3">
          <h1 className="text-base sm:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">{title}</h1>
          {description && (
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate hidden sm:block">{description}</p>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          <ThemeToggle />

          {/* Notifications — hide on very small screens */}
          <button className="relative p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>

          {/* User Menu */}
          <DropdownMenu
            trigger={
              <div className="flex items-center gap-2 p-1 sm:p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                <Avatar name={user?.name || ''} src={user?.avatar} size="sm" />
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[120px] truncate">{user?.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
                </div>
              </div>
            }
          >
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} destructive>
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
