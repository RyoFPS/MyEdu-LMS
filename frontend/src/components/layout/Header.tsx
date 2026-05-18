import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { Avatar } from '../ui/avatar';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { Bell, User, LogOut, Settings, CheckCheck, FileQuestion, ClipboardCheck, BookOpen, Users as UsersIcon } from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { cn } from '../../lib/utils';
import api from '../../lib/axios';

interface HeaderProps {
  title: string;
  description?: string;
}

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  data: any;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'quiz': return <FileQuestion className="h-4 w-4 text-indigo-500" />;
    case 'attendance': return <ClipboardCheck className="h-4 w-4 text-emerald-500" />;
    case 'material': return <BookOpen className="h-4 w-4 text-blue-500" />;
    case 'library': return <BookOpen className="h-4 w-4 text-purple-500" />;
    case 'class': return <UsersIcon className="h-4 w-4 text-amber-500" />;
    default: return <Bell className="h-4 w-4 text-zinc-500" />;
  }
};

export const Header: React.FC<HeaderProps> = ({ title, description }) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const timeAgo = (dateStr: string): string => {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return (t.notifications as any).justNow || 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  // Translate notification title and message
  const translateNotif = (notif: NotificationItem): { title: string; message: string } => {
    const data = notif.data || {};
    const key = notif.title; // e.g., 'notif.quiz_created'

    // Helper to interpolate {var} in template strings
    const interpolate = (template: string, vars: Record<string, string>): string => {
      return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] || k);
    };

    // Translate attendance status
    const translateStatus = (status: string): string => {
      const statusMap: Record<string, string> = {
        present: (t.notifications as any).status_present || 'Present',
        absent: (t.notifications as any).status_absent || 'Absent',
        late: (t.notifications as any).status_late || 'Late',
        excused: (t.notifications as any).status_excused || 'Excused',
      };
      return statusMap[status] || status;
    };

    const n = t.notifications as any;

    switch (key) {
      case 'notif.quiz_created':
        return {
          title: n.quiz_created_title || 'New Quiz',
          message: interpolate(n.quiz_created_msg || notif.message, { quiz_title: data.quiz_title || '', class_name: data.class_name || '' }),
        };
      case 'notif.quiz_submitted':
        return {
          title: n.quiz_submitted_title || 'Quiz Submitted',
          message: interpolate(n.quiz_submitted_msg || notif.message, { student_name: data.student_name || '', quiz_title: data.quiz_title || '' }),
        };
      case 'notif.attendance_recorded':
        return {
          title: n.attendance_recorded_title || 'Attendance Recorded',
          message: interpolate(n.attendance_recorded_msg || notif.message, { date: data.date || '', status: translateStatus(data.status || '') }),
        };
      case 'notif.material_uploaded':
        return {
          title: n.material_uploaded_title || 'New Material',
          message: interpolate(n.material_uploaded_msg || notif.message, { material_title: data.material_title || '', class_name: data.class_name || '' }),
        };
      case 'notif.added_to_class':
        return {
          title: n.added_to_class_title || 'Added to Class',
          message: interpolate(n.added_to_class_msg || notif.message, { class_name: data.class_name || '' }),
        };
      default: {
        const oldTitleMap: Record<string, string> = {
          'Kuis Baru': n.quiz_created_title || 'New Quiz',
          'Kuis Dikumpulkan': n.quiz_submitted_title || 'Quiz Submitted',
          'Absensi Dicatat': n.attendance_recorded_title || 'Attendance Recorded',
          'Materi Baru': n.material_uploaded_title || 'New Material',
          'Ditambahkan ke Kelas': n.added_to_class_title || 'Added to Class',
          'New Quiz': n.quiz_created_title || 'New Quiz',
          'Quiz Submitted': n.quiz_submitted_title || 'Quiz Submitted',
          'Attendance Recorded': n.attendance_recorded_title || 'Attendance Recorded',
          'New Material': n.material_uploaded_title || 'New Material',
          'Added to Class': n.added_to_class_title || 'Added to Class',
        };

        const translatedTitle = oldTitleMap[notif.title] || notif.title;

        let translatedMessage = '';

        if (notif.type === 'quiz') {
          if (data.quiz_title && (notif.title === 'Kuis Baru' || notif.title === 'New Quiz' || notif.title === 'notif.quiz_created')) {
            translatedMessage = interpolate(n.quiz_created_msg || '', {
              quiz_title: data.quiz_title,
              class_name: data.class_name || '',
            });
          } else if (data.quiz_title && data.student_name) {
            translatedMessage = interpolate(n.quiz_submitted_msg || '', {
              student_name: data.student_name,
              quiz_title: data.quiz_title,
            });
          } else {
            translatedMessage = translatedTitle;
          }
        } else if (notif.type === 'attendance') {
          if (data.status) {
            translatedMessage = interpolate(n.attendance_recorded_msg || '', {
              date: data.date || '',
              status: translateStatus(data.status),
            });
          } else {
            translatedMessage = translatedTitle;
          }
        } else if (notif.type === 'material') {
          if (data.material_title) {
            translatedMessage = interpolate(n.material_uploaded_msg || '', {
              material_title: data.material_title,
              class_name: data.class_name || '',
            });
          } else {
            translatedMessage = translatedTitle;
          }
        } else if (notif.type === 'class') {
          if (data.class_name) {
            translatedMessage = interpolate(n.added_to_class_msg || '', {
              class_name: data.class_name,
            });
          } else {
            translatedMessage = translatedTitle;
          }
        } else {
          translatedMessage = notif.message;
        }

        if (!translatedMessage) {
          translatedMessage = translatedTitle;
        }

        return { title: translatedTitle, message: translatedMessage };
      }
    }
  };

  // Notification state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications', { params: { limit: 15 } });
      setNotifications(res.data.data || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch {
      // ignore
    }
  }, []);

  // Fetch on mount and every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Open notification dropdown
  const handleBellClick = () => {
    setNotifOpen(!notifOpen);
    if (!notifOpen) {
      fetchNotifications(); // refresh when opening
    }
  };

  // Click a notification
  const handleNotifClick = async (notif: NotificationItem) => {
    // Mark as read
    if (!notif.is_read) {
      try {
        await api.post(`/notifications/${notif.id}/read`);
        setNotifications(prev =>
          prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch { /* ignore */ }
    }

    // Navigate if link exists
    if (notif.link) {
      navigate(notif.link);
      setNotifOpen(false);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-700">
      <div className="flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16">
        {/* Title */}
        <div className="pl-11 lg:pl-0 min-w-0 flex-1 mr-2 sm:mr-3">
          <h1 className="text-base sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate">{title}</h1>
          {description && (
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 truncate hidden sm:block">{description}</p>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          <ThemeToggle />
          <LanguageSwitcher />

          {/* Notifications Dropdown */}
          <div ref={notifRef} className="relative">
            <button
              onClick={handleBellClick}
              className="relative p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 sm:top-0.5 sm:right-0.5 flex items-center justify-center h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[70vh] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-xl z-50 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-700">
                  <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{t.notifications.title}</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      {t.notifications.markAllRead}
                    </button>
                  )}
                </div>

                {/* Notification list */}
                <div className="overflow-y-auto max-h-[calc(70vh-52px)]">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
                      <Bell className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">{t.notifications.noNotifications}</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        className={cn(
                          'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-zinc-50 dark:border-zinc-700/50 last:border-0',
                          notif.is_read
                            ? 'hover:bg-zinc-50 dark:hover:bg-zinc-700/30'
                            : 'bg-primary-50/50 dark:bg-primary-900/10 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                        )}
                      >
                        {/* Icon */}
                        <div className="shrink-0 mt-0.5 p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-700">
                          {getNotificationIcon(notif.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={cn(
                              'text-sm truncate',
                              notif.is_read
                                ? 'text-zinc-700 dark:text-zinc-300'
                                : 'font-semibold text-zinc-900 dark:text-zinc-100'
                            )}>
                              {translateNotif(notif).title}
                            </p>
                            {!notif.is_read && (
                              <span className="shrink-0 h-2 w-2 rounded-full bg-primary-500" />
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                            {translateNotif(notif).message}
                          </p>
                          <p className="text-[10px] text-zinc-400 mt-1">
                            {timeAgo(notif.created_at)}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <DropdownMenu
            trigger={
              <div className="flex items-center gap-2 p-1 sm:p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer">
                <Avatar name={user?.name || ''} src={user?.avatar} size="sm" />
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200 max-w-[120px] truncate">{user?.name}</p>
                  <p className="text-xs text-zinc-400 capitalize">{user?.role}</p>
                </div>
              </div>
            }
          >
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="h-4 w-4" />
              {t.profile.title}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} destructive>
              <LogOut className="h-4 w-4" />
              {t.auth.logout}
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
