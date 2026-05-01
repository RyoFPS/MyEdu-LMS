import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../ui/avatar';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ClipboardCheck,
  FileQuestion,
  BookOpen,
  BookMarked,
  UserCircle,
  Tag,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ['admin', 'teacher', 'student'],
  },
  {
    label: 'Users',
    path: '/users',
    icon: <Users className="h-5 w-5" />,
    roles: ['admin'],
  },
  {
    label: 'Classes',
    path: '/classes',
    icon: <BookOpen className="h-5 w-5" />,
    roles: ['admin', 'teacher', 'student'],
  },
  {
    label: 'Subjects',
    path: '/subjects',
    icon: <Tag className="h-5 w-5" />,
    roles: ['admin'],
  },
  {
    label: 'Library',
    path: '/library',
    icon: <BookMarked className="h-5 w-5" />,
    roles: ['admin', 'teacher', 'student'],
  },
  {
    label: 'Attendance',
    path: '/attendance',
    icon: <ClipboardCheck className="h-5 w-5" />,
    roles: ['admin', 'teacher', 'student'],
  },
  {
    label: 'Quizzes',
    path: '/quizzes',
    icon: <FileQuestion className="h-5 w-5" />,
    roles: ['admin', 'teacher', 'student'],
  },
  {
    label: 'Teachers',
    path: '/teachers',
    icon: <UserCircle className="h-5 w-5" />,
    roles: ['student'],
  },
  {
    label: 'Students',
    path: '/students',
    icon: <GraduationCap className="h-5 w-5" />,
    roles: ['teacher'],
  },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredItems = navItems.filter((item) => user && item.roles.includes(user.role));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary-500 text-white shrink-0">
          <GraduationCap className="h-6 w-6" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="text-lg font-bold text-white tracking-tight">MyEdu</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Learning Management</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white',
                collapsed && 'justify-center px-2'
              )
            }
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User Info */}
      <div className="border-t border-white/10 p-3">
        <NavLink
          to="/profile"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-white/5',
            collapsed && 'justify-center px-2'
          )}
        >
          <Avatar name={user?.name || ''} size="sm" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
          )}
        </NavLink>
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors mt-1',
            collapsed && 'justify-center px-2'
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse Toggle (Desktop) */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center py-3 border-t border-white/10 text-gray-400 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-sidebar text-white shadow-lg"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 rounded-md text-gray-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 bg-sidebar transition-all duration-300',
          collapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
