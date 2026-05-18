import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Avatar } from '../../components/ui/avatar';
import { TableSkeleton } from '../../components/skeletons';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import api from '../../lib/axios';
import { formatDate } from '../../lib/utils';
import type { Attendance, ClassRoom } from '../../types';
import {
  ClipboardCheck,
  Search,
  Filter,
  Calendar,
  Plus,
  Loader2,
  FileX,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';

const statusBadgeVariant: Record<string, 'success' | 'destructive' | 'warning' | 'info'> = {
  present: 'success',
  absent: 'destructive',
  late: 'warning',
  excused: 'info',
};

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const AttendanceList: React.FC = () => {
  const { isTeacher, isAdmin } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PaginationMeta>({ current_page: 1, last_page: 1, per_page: 15, total: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // Debounce ref
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAttendance = useCallback(async (currentPage: number = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: currentPage, per_page: 15 };
      if (search.trim()) params.search = search.trim();
      if (selectedClass) params.class_id = selectedClass;
      if (selectedStatus) params.status = selectedStatus;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await api.get('/attendances', { params });
      setAttendance(response.data.data || []);
      if (response.data.meta) setMeta(response.data.meta);
    } catch {
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }, [search, selectedClass, selectedStatus, dateFrom, dateTo]);

  // Fetch classes for filter dropdown (once)
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const response = await api.get('/classes', { params: { per_page: 100 } });
        const data = response.data.data || [];
        setClasses(Array.isArray(data) ? data : []);
      } catch {
        setClasses([]);
      }
    };
    loadClasses();
  }, []);

  // Fetch when dropdown/date filters change (reset to page 1)
  useEffect(() => {
    setPage(1);
    fetchAttendance(1);
  }, [selectedClass, selectedStatus, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setPage(1);
      fetchAttendance(1);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch when page changes
  useEffect(() => {
    fetchAttendance(page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= meta.last_page) {
      setPage(newPage);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedClass('');
    setSelectedStatus('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleExportAttendance = async () => {
    if (!selectedClass) {
      toast.error(t.attendance.exportRequiresClass);
      return;
    }
    try {
      const params: Record<string, string> = { class_id: selectedClass };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await api.get('/attendances/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-export-${selectedClass}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded!');
    } catch {
      toast.error('Failed to export.');
    }
  };

  const hasActiveFilters = !!(search || selectedClass || selectedStatus || dateFrom || dateTo);

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
      <Header
        title={t.attendance.title}
        description={isTeacher || isAdmin ? t.attendance.subtitleAdmin : t.attendance.subtitleStudent}
      />
      <div className="page-container">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary-500" />
            <h2 className="text-lg font-semibold">{t.attendance.title}</h2>
            {meta.total > 0 && (
              <Badge variant="secondary" className="ml-1">{meta.total} records</Badge>
            )}
          </div>
          {(isTeacher || isAdmin) && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportAttendance} disabled={!selectedClass}>
                <Download className="h-4 w-4" />
                {t.common.exportCsv}
              </Button>
              <Button onClick={() => navigate('/attendance/record')}>
                <Plus className="h-4 w-4" />
                {t.attendance.recordAttendance}
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder={t.common.search + '...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {/* Class filter */}
              <Select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
                placeholder={t.quizzes.allClasses}
              />
              {/* Status filter */}
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                options={[
                  { value: 'present', label: t.attendance.present },
                  { value: 'absent', label: t.attendance.absent },
                  { value: 'late', label: t.attendance.late },
                  { value: 'excused', label: t.attendance.excused },
                ]}
                placeholder={t.quizzes.allStatus}
              />
              {/* Date From */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-10"
                  placeholder="From date"
                />
              </div>
              {/* Date To */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-10"
                  placeholder="To date"
                />
              </div>
              {/* Clear filters */}
              {hasActiveFilters && (
                <div className="flex items-end md:col-span-2">
                  <Button variant="outline" size="sm" onClick={clearFilters} className="w-full sm:w-auto">
                    <Filter className="h-4 w-4" />
                    {t.common.clearFilters}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          {loading ? (
            <CardContent className="p-0">
              <TableSkeleton rows={8} columns={6} />
            </CardContent>
          ) : attendance.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <FileX className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-lg font-medium">{t.common.noData}</p>
              <p className="text-sm mt-1">{t.library.adjustFilters}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t.sidebar.students}</TableHead>
                    <TableHead>{t.sidebar.classes}</TableHead>
                    <TableHead>{t.common.date}</TableHead>
                    <TableHead>{t.common.status}</TableHead>
                    <TableHead>{t.attendance.notes}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((record, index) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-zinc-400">
                        {(meta.current_page - 1) * meta.per_page + index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={record.user?.name || ''} src={record.user?.avatar} size="sm" />
                          <div className="min-w-0">
                            <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{record.user?.name || 'N/A'}</p>
                            <p className="text-xs text-zinc-400 truncate">{record.user?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">{record.class_room?.name || 'N/A'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                          {formatDate(record.date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant[record.status]} className="capitalize">
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-zinc-500 dark:text-zinc-400 truncate block max-w-[200px]">{record.notes || '-'}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {meta.last_page > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-zinc-100 dark:border-zinc-700">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Showing {(meta.current_page - 1) * meta.per_page + 1} to{' '}
                    {Math.min(meta.current_page * meta.per_page, meta.total)} of {meta.total} records
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {getPageNumbers().map((p, i) =>
                      p === '...' ? (
                        <span key={`dots-${i}`} className="px-2 text-zinc-400">...</span>
                      ) : (
                        <Button
                          key={p}
                          variant={p === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(p)}
                          className="min-w-[36px]"
                        >
                          {p}
                        </Button>
                      )
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= meta.last_page}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </>
  );
};

export default AttendanceList;
