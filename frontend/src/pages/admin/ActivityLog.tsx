import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Avatar } from '../../components/ui/avatar';
import api from '../../lib/axios';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import { useTranslation } from '../../hooks/useTranslation';
import {
  Activity,
  Search,
  Download,
  Filter,
  Loader2,
  FileX,
  Plus,
  Pencil,
  Trash2,
  LogIn,
  LogOut,
  UserPlus,
  UserMinus,
  Upload,
  Send,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Shield,
  BookOpen,
  FileQuestion,
  Users,
  Tag,
} from 'lucide-react';

interface ActivityLogEntry {
  id: number;
  user_id: number | null;
  user_name: string;
  user_role: string;
  user_avatar: string | null;
  action: string;
  target_type: string;
  target_name: string;
  target_id: number | null;
  description: string;
  details: any;
  ip_address: string | null;
  created_at: string;
}

interface Stats {
  today: number;
  this_week: number;
  total: number;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const actionConfig: Record<string, { color: string; bgColor: string; icon: React.ReactNode }> = {
  create:  { color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', icon: <Plus className="h-3.5 w-3.5" /> },
  update:  { color: 'text-blue-600',    bgColor: 'bg-blue-100 dark:bg-blue-900/30',    icon: <Pencil className="h-3.5 w-3.5" /> },
  delete:  { color: 'text-red-600',     bgColor: 'bg-red-100 dark:bg-red-900/30',     icon: <Trash2 className="h-3.5 w-3.5" /> },
  login:   { color: 'text-gray-600',    bgColor: 'bg-gray-100 dark:bg-gray-700',      icon: <LogIn className="h-3.5 w-3.5" /> },
  logout:  { color: 'text-gray-500',    bgColor: 'bg-gray-100 dark:bg-gray-700',      icon: <LogOut className="h-3.5 w-3.5" /> },
  assign:  { color: 'text-amber-600',   bgColor: 'bg-amber-100 dark:bg-amber-900/30', icon: <UserPlus className="h-3.5 w-3.5" /> },
  remove:  { color: 'text-orange-600',  bgColor: 'bg-orange-100 dark:bg-orange-900/30', icon: <UserMinus className="h-3.5 w-3.5" /> },
  upload:  { color: 'text-purple-600',  bgColor: 'bg-purple-100 dark:bg-purple-900/30', icon: <Upload className="h-3.5 w-3.5" /> },
  submit:  { color: 'text-indigo-600',  bgColor: 'bg-indigo-100 dark:bg-indigo-900/30', icon: <Send className="h-3.5 w-3.5" /> },
  record:  { color: 'text-teal-600',    bgColor: 'bg-teal-100 dark:bg-teal-900/30',   icon: <ClipboardCheck className="h-3.5 w-3.5" /> },
};

const targetTypeIcon: Record<string, React.ReactNode> = {
  user:       <Users className="h-3 w-3" />,
  class:      <BookOpen className="h-3 w-3" />,
  quiz:       <FileQuestion className="h-3 w-3" />,
  attendance: <ClipboardCheck className="h-3 w-3" />,
  material:   <Upload className="h-3 w-3" />,
  library:    <BookOpen className="h-3 w-3" />,
  subject:    <Tag className="h-3 w-3" />,
  auth:       <Shield className="h-3 w-3" />,
};

const roleBadgeVariant: Record<string, 'destructive' | 'info' | 'success'> = {
  admin: 'destructive',
  teacher: 'info',
  student: 'success',
};

const timeAgo = (dateStr: string, justNowLabel: string): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return justNowLabel;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

const ActivityLog: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ today: 0, this_week: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PaginationMeta>({ current_page: 1, last_page: 1, per_page: 20, total: 0 });
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterTargetType, setFilterTargetType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLogs = useCallback(async (currentPage = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: currentPage, per_page: 20 };
      if (search.trim()) params.search = search.trim();
      if (filterAction) params.action = filterAction;
      if (filterTargetType) params.target_type = filterTargetType;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await api.get('/activity-logs', { params });
      setLogs(res.data.data || []);
      if (res.data.meta) setMeta(res.data.meta);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [search, filterAction, filterTargetType, dateFrom, dateTo]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/activity-logs/stats');
      setStats(res.data.data || { today: 0, this_week: 0, total: 0 });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchLogs(1);
  }, [filterAction, filterTargetType, dateFrom, dateTo]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setPage(1);
      fetchLogs(1);
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [search]);

  useEffect(() => { fetchLogs(page); }, [page]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleExport = async () => {
    try {
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      if (filterAction) params.action = filterAction;
      if (filterTargetType) params.target_type = filterTargetType;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await api.get('/activity-logs/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `activity-logs-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded!');
    } catch {
      toast.error('Failed to export.');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setFilterAction('');
    setFilterTargetType('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasActiveFilters = !!(search || filterAction || filterTargetType || dateFrom || dateTo);

  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    const { current_page, last_page } = meta;
    if (last_page <= 7) {
      for (let i = 1; i <= last_page; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current_page > 3) pages.push('...');
      const start = Math.max(2, current_page - 1);
      const end = Math.min(last_page - 1, current_page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current_page < last_page - 2) pages.push('...');
      pages.push(last_page);
    }
    return pages;
  };

  return (
    <>
      <Header title={(t as any).activityLog.title} description={(t as any).activityLog.subtitle} />
      <div className="page-container">

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.today}</p>
                <p className="text-xs text-gray-500">{(t as any).activityLog.today}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.this_week}</p>
                <p className="text-xs text-gray-500">{(t as any).activityLog.thisWeek}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
                <p className="text-xs text-gray-500">{(t as any).activityLog.total}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={(t as any).activityLog.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                options={[
                  { value: 'create', label: (t as any).activityLog.actionCreate },
                  { value: 'update', label: (t as any).activityLog.actionUpdate },
                  { value: 'delete', label: (t as any).activityLog.actionDelete },
                  { value: 'login', label: (t as any).activityLog.actionLogin },
                  { value: 'logout', label: (t as any).activityLog.actionLogout },
                  { value: 'assign', label: (t as any).activityLog.actionAssign },
                  { value: 'remove', label: (t as any).activityLog.actionRemove },
                  { value: 'upload', label: (t as any).activityLog.actionUpload },
                  { value: 'submit', label: (t as any).activityLog.actionSubmit },
                  { value: 'record', label: (t as any).activityLog.actionRecord },
                ]}
                placeholder={(t as any).activityLog.allActions}
              />
              <Select
                value={filterTargetType}
                onChange={(e) => setFilterTargetType(e.target.value)}
                options={[
                  { value: 'user', label: (t as any).activityLog.typeUser },
                  { value: 'class', label: (t as any).activityLog.typeClass },
                  { value: 'quiz', label: (t as any).activityLog.typeQuiz },
                  { value: 'attendance', label: (t as any).activityLog.typeAttendance },
                  { value: 'material', label: (t as any).activityLog.typeMaterial },
                  { value: 'library', label: (t as any).activityLog.typeLibrary },
                  { value: 'subject', label: (t as any).activityLog.typeSubject },
                  { value: 'auth', label: (t as any).activityLog.typeAuth },
                ]}
                placeholder={(t as any).activityLog.allTypes}
              />
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 sm:flex-none">
                  <Download className="h-4 w-4" />
                  {(t as any).activityLog.exportCsv}
                </Button>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters} className="flex-1 sm:flex-none">
                    <Filter className="h-4 w-4" />
                    {t.common.clearFilters}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {!loading && meta.total > 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {(meta.current_page - 1) * meta.per_page + 1}–{Math.min(meta.current_page * meta.per_page, meta.total)} of {meta.total} logs
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileX className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">{(t as any).activityLog.noLogs}</p>
            <p className="text-sm mt-1">{(t as any).activityLog.noLogsHint}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const config = actionConfig[log.action] || actionConfig.create;
              return (
                <Card key={log.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('p-2 rounded-lg shrink-0 mt-0.5', config.bgColor)}>
                        <span className={config.color}>{config.icon}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Avatar name={log.user_name} src={log.user_avatar || undefined} size="sm" />
                          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{log.user_name}</span>
                          <Badge variant={roleBadgeVariant[log.user_role] || 'secondary'} className="text-xs capitalize">
                            {log.user_role}
                          </Badge>
                          <Badge variant="outline" className={cn('text-xs capitalize', config.color)}>
                            {log.action}
                          </Badge>
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            {targetTypeIcon[log.target_type]}
                            {log.target_type}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-300">{log.description}</p>

                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-400">
                          <span>🎯 {log.target_name}</span>
                          {log.ip_address && <span>🌐 {log.ip_address}</span>}
                          <span>🕐 {timeAgo(log.created_at, (t.notifications as any).justNow)}</span>
                          <span className="hidden sm:inline">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {meta.last_page > 1 && (
          <div className="flex items-center justify-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {getPageNumbers().map((p, i) =>
              p === '...' ? (
                <span key={`dots-${i}`} className="px-2 text-gray-400">...</span>
              ) : (
                <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" onClick={() => setPage(p)} className="min-w-[36px]">
                  {p}
                </Button>
              )
            )}
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page >= meta.last_page}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default ActivityLog;
