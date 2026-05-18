import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { CardGridSkeleton } from '../../components/skeletons';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useQuizzes, useClasses, useSubjects } from '../../hooks/useApi';
import api from '../../lib/axios';
import toast from 'react-hot-toast';
import { formatDateTime, cn } from '../../lib/utils';
import type { Quiz } from '../../types';
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
  Tag,
} from 'lucide-react';

const QuizList: React.FC = () => {
  const { isTeacher, isAdmin, isStudent } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);

  // Delete state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch quizzes using React Query
  const { data: quizzesData, isLoading: loading, refetch } = useQuizzes({
    page,
    per_page: 12,
    ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
    ...(selectedClass && { class_id: selectedClass }),
    ...(selectedSubject && { subject_id: selectedSubject }),
    ...(selectedStatus && { is_active: selectedStatus }),
  });

  const quizzes = quizzesData?.data || [];
  const meta = quizzesData?.meta || { current_page: 1, last_page: 1, per_page: 12, total: 0 };

  // Fetch classes for filter dropdown
  const { data: classesData } = useClasses({ per_page: 100 });
  const classes = classesData?.data || [];

  // Fetch subjects for filter dropdown
  const { data: subjectsData } = useSubjects();
  const subjects = subjectsData || [];

  // Filter change handlers that reset page
  const handleClassChange = (value: string) => {
    setSelectedClass(value);
    setPage(1);
  };

  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    setPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters = search.trim() !== '' || selectedClass !== '' || selectedSubject !== '' || selectedStatus !== '';

  // Clear all filters
  const clearFilters = () => {
    setSearch('');
    setSelectedClass('');
    setSelectedSubject('');
    setSelectedStatus('');
    setPage(1);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/quizzes/${deleteId}`);
      toast.success('Quiz deleted successfully');
      refetch();
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
        title={t.quizzes.title}
        description={isStudent ? t.quizzes.subtitleStudent : t.quizzes.subtitleTeacher}
      />
      <div className="page-container">
        {/* Filters */}
        <Card>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                onChange={(e) => handleClassChange(e.target.value)}
                options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
                placeholder={t.quizzes.allClasses}
              />
              {/* Subject filter */}
              <Select
                value={selectedSubject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                options={subjects.map((s) => ({ value: String(s.id), label: `${s.name} (${s.code})` }))}
                placeholder={t.quizzes.allSubjects}
              />
              {/* Status filter + Create button */}
              <div className="flex gap-2">
                <Select
                  value={selectedStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  options={[
                    { value: 'true', label: t.quizzes.active },
                    { value: 'false', label: t.quizzes.inactive },
                  ]}
                  placeholder={t.quizzes.allStatus}
                  className="flex-1"
                />
                {(isTeacher || isAdmin) && (
                  <Button onClick={() => navigate('/quizzes/create')} className="flex-shrink-0">
                    <Plus className="h-4 w-4" />
                    {t.common.create}
                  </Button>
                )}
              </div>
              {/* Clear filters */}
              {hasActiveFilters && (
                <div className="flex items-end lg:col-span-5">
                  <Button variant="outline" size="sm" onClick={clearFilters} className="w-full sm:w-auto">
                    <Filter className="h-4 w-4" />
                    {t.common.clearFilters}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results info */}
        {!loading && meta.total > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Showing {(meta.current_page - 1) * meta.per_page + 1} to{' '}
              {Math.min(meta.current_page * meta.per_page, meta.total)} of {meta.total} quizzes
            </p>
          </div>
        )}

        {/* Quiz Grid */}
        {loading ? (
          <CardGridSkeleton count={6} columns={3} />
        ) : quizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <FileX className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">{t.quizzes.noQuizzes}</p>
            <p className="text-sm mt-1">
              {hasActiveFilters
                ? t.library.adjustFilters
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
                      <Badge variant={quiz.is_expired ? 'destructive' : quiz.is_active ? 'success' : 'secondary'}>
                        {quiz.is_expired ? t.quizzes.expired : quiz.is_active ? t.quizzes.active : t.quizzes.inactive}
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1 line-clamp-1">{quiz.title}</h3>
                    {quiz.description && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 line-clamp-2">{quiz.description}</p>
                    )}

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                        <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{quiz.class_room?.name || 'No class'}</span>
                      </div>
                      {quiz.subject && (
                        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                          <Tag className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{quiz.subject.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{quiz.duration_minutes} {t.quizzes.minutes}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                        <Users className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{quiz.questions_count || 0} {t.quizzes.questions}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                        {quiz.max_attempts === 0 ? (
                          <>
                            <Repeat className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{t.quizzes.unlimited}</span>
                          </>
                        ) : quiz.max_attempts === 1 ? (
                          <>
                            <Shield className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{t.quizzes.singleAttempt}</span>
                          </>
                        ) : (
                          <>
                            <Hash className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{quiz.max_attempts} {t.quizzes.attempts}</span>
                          </>
                        )}
                      </div>
                      {quiz.start_time && (
                        <div className="text-xs text-zinc-400">
                          Starts: {formatDateTime(quiz.start_time)}
                        </div>
                      )}
                      {quiz.end_time && (
                        <div className={cn(
                          "text-xs",
                          quiz.is_expired ? "text-red-500 font-medium" : "text-zinc-400"
                        )}>
                          {quiz.is_expired ? `⚠️ ${t.quizzes.expired}: ` : `${t.quizzes.deadline}: `}{formatDateTime(quiz.end_time)}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {isStudent && quiz.is_active && !quiz.is_expired && (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/quizzes/${quiz.id}/take`)}
                        >
                          <Play className="h-3.5 w-3.5" />
                          {t.quizzes.takeQuiz}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/quizzes/${quiz.id}/results`)}
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        {t.quizzes.results}
                      </Button>
                      {(isTeacher || isAdmin) && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/quizzes/create?edit=${quiz.id}`)}
                          >
                            <Edit className="h-4 w-4 text-zinc-400" />
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
            )}
          </>
        )}

                {/* Delete Confirmation Dialog */}
        <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
          <DialogContent onClose={() => setDeleteId(null)}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                {t.quizzes.deleteQuiz}
              </DialogTitle>
              <DialogDescription>
                {t.quizzes.deleteConfirm}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                {t.common.cancel}
              </Button>
              <Button variant="destructive" onClick={handleDelete} isLoading={deleting}>
                {t.quizzes.deleteQuiz}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default QuizList;
