import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/axios';
import toast from 'react-hot-toast';
import { formatDateTime } from '../../lib/utils';
import type { Quiz, ClassRoom } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  FileQuestion,
  Plus,
  Search,
  Clock,
  BookOpen,
  Users,
  Play,
  BarChart3,
  Trash2,
  Edit,
  Loader2,
  FileX,
  AlertTriangle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Shield,
  Hash,
} from 'lucide-react';

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const QuizList: React.FC = () => {
  const { isTeacher, isAdmin, isStudent } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PaginationMeta>({ current_page: 1, last_page: 1, per_page: 15, total: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);

  // Delete state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce ref
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchQuizzes = useCallback(async (currentPage: number = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: currentPage, per_page: 12 };
      if (search.trim()) params.search = search.trim();
      if (selectedClass) params.class_id = selectedClass;
      if (selectedStatus) params.is_active = selectedStatus;

      const response = await api.get('/quizzes', { params });
      setQuizzes(response.data.data || []);
      if (response.data.meta) setMeta(response.data.meta);
    } catch {
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }, [search, selectedClass, selectedStatus]);

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

  // Fetch when dropdown filters change
  useEffect(() => {
    setPage(1);
    fetchQuizzes(1);
  }, [selectedClass, selectedStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setPage(1);
      fetchQuizzes(1);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch when page changes
  useEffect(() => {
    fetchQuizzes(page);
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
    setPage(1);
  };

  const hasActiveFilters = !!(search || selectedClass || selectedStatus);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/quizzes/${deleteId}`);
      toast.success('Quiz deleted successfully');
      fetchQuizzes(page);
    } catch (error: any) {
      if (!error.response || ![403, 419, 422, 500].includes(error.response.status)) {
        toast.error('Failed to delete quiz');
      }
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

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
        title="Quizzes"
        description={isStudent ? 'View and take available quizzes' : 'Manage your quizzes'}
      />
      <div className="page-container">
        {/* Filters */}
        <Card>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by title or description..."
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
                placeholder="All Classes"
              />
              {/* Status filter + Create button */}
              <div className="flex gap-2">
                <Select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  options={[
                    { value: 'true', label: 'Active' },
                    { value: 'false', label: 'Inactive' },
                  ]}
                  placeholder="All Status"
                  className="flex-1"
                />
                {(isTeacher || isAdmin) && (
                  <Button onClick={() => navigate('/quizzes/create')} className="flex-shrink-0">
                    <Plus className="h-4 w-4" />
                    Create
                  </Button>
                )}
              </div>
              {/* Clear filters */}
              {hasActiveFilters && (
                <div className="flex items-end lg:col-span-4">
                  <Button variant="outline" size="sm" onClick={clearFilters} className="w-full sm:w-auto">
                    <Filter className="h-4 w-4" />
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results info */}
        {!loading && meta.total > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(meta.current_page - 1) * meta.per_page + 1} to{' '}
              {Math.min(meta.current_page * meta.per_page, meta.total)} of {meta.total} quizzes
            </p>
          </div>
        )}

        {/* Quiz Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : quizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileX className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">No quizzes found</p>
            <p className="text-sm mt-1">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : isTeacher || isAdmin
                ? 'Create your first quiz to get started'
                : 'No quizzes available yet'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map((quiz) => (
                <Card key={quiz.id} className="hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600">
                        <FileQuestion className="h-5 w-5" />
                      </div>
                      <Badge variant={quiz.is_active ? 'success' : 'secondary'}>
                        {quiz.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 line-clamp-1">{quiz.title}</h3>
                    {quiz.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{quiz.description}</p>
                    )}

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{quiz.class_room?.name || 'No class'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{quiz.duration_minutes} minutes</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Users className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{quiz.questions_count || 0} questions</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        {quiz.max_attempts === 0 ? (
                          <>
                            <Repeat className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>Unlimited attempts</span>
                          </>
                        ) : quiz.max_attempts === 1 ? (
                          <>
                            <Shield className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>Single attempt</span>
                          </>
                        ) : (
                          <>
                            <Hash className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{quiz.max_attempts} attempts</span>
                          </>
                        )}
                      </div>
                      {quiz.start_time && (
                        <div className="text-xs text-gray-400">
                          Starts: {formatDateTime(quiz.start_time)}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {isStudent && quiz.is_active && (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/quizzes/${quiz.id}/take`)}
                        >
                          <Play className="h-3.5 w-3.5" />
                          Take Quiz
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/quizzes/${quiz.id}/results`)}
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        Results
                      </Button>
                      {(isTeacher || isAdmin) && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/quizzes/create?edit=${quiz.id}`)}
                          >
                            <Edit className="h-4 w-4 text-gray-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(quiz.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {meta.last_page > 1 && (
              <div className="flex items-center justify-center gap-1">
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
                    <span key={`dots-${i}`} className="px-2 text-gray-400">...</span>
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
            )}
          </>
        )}

                {/* Delete Confirmation Dialog */}
        <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
          <DialogContent onClose={() => setDeleteId(null)}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Delete Quiz
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this quiz? This action cannot be undone. All student
                attempts and results will also be deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} isLoading={deleting}>
                Delete Quiz
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default QuizList;