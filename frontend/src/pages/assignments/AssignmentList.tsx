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
import { useAssignments, useClasses, useSubjects } from '../../hooks/useApi';
import { formatDateTime, cn } from '../../lib/utils';
import type { Assignment } from '../../types';
import {
  ClipboardList,
  Plus,
  Search,
  Clock,
  BookOpen,
  Users,
  FileText,
  AlertTriangle,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Calendar,
  Tag,
} from 'lucide-react';

const AssignmentList: React.FC = () => {
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

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch assignments using React Query
  const { data: assignmentsData, isLoading: loading } = useAssignments({
    page,
    per_page: 12,
    ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
    ...(selectedClass && { class_id: selectedClass }),
    ...(selectedSubject && { subject_id: selectedSubject }),
    ...(selectedStatus && { status: selectedStatus }),
  });

  const assignments = assignmentsData?.data || [];
  const meta = assignmentsData?.meta || { current_page: 1, last_page: 1, per_page: 12, total: 0 };

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

  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    const { current_page, last_page } = meta;
    if (last_page <= 7) {
      for (let i = 1; i <= last_page; i++) pages.push(i);
    } else {
      if (current_page <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(last_page);
      } else if (current_page >= last_page - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = last_page - 4; i <= last_page; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = current_page - 1; i <= current_page + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(last_page);
      }
    }
    return pages;
  };

  const getDueDateBadge = (assignment: Assignment) => {
    if (assignment.is_overdue) {
      const days = Math.abs(assignment.days_until_due);
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          {days === 1 ? t.assignments.dayOverdue : t.assignments.daysOverdue.replace('{days}', days.toString())}
        </Badge>
      );
    }
    
    if (assignment.days_until_due === 0) {
      return (
        <Badge variant="warning" className="gap-1">
          <Clock className="h-3 w-3" />
          {t.assignments.dueToday}
        </Badge>
      );
    }
    
    if (assignment.days_until_due === 1) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          {t.assignments.dayUntilDue}
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" />
        {t.assignments.daysUntilDue.replace('{days}', assignment.days_until_due.toString())}
      </Badge>
    );
  };

  const getSubmissionBadge = (assignment: Assignment) => {
    if (isStudent) {
      if (assignment.my_submission) {
        if (assignment.my_submission.is_graded) {
          return (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {t.assignments.graded} ({assignment.my_submission.score}/{assignment.max_score})
            </Badge>
          );
        }
        return (
          <Badge variant="secondary" className="gap-1">
            <FileText className="h-3 w-3" />
            {t.assignments.submitted}
          </Badge>
        );
      }
      return (
        <Badge variant="outline" className="gap-1">
          <XCircle className="h-3 w-3" />
          {t.assignments.notSubmitted}
        </Badge>
      );
    }
    
    // Teacher/Admin view
    return (
      <Badge variant="secondary" className="gap-1">
        <Users className="h-3 w-3" />
        {t.assignments.submissionCount.replace('{count}', assignment.submission_count.toString())}
      </Badge>
    );
  };

  return (
    <>
      <Header
        title={t.assignments.title}
        description={t.assignments.subtitle}
        action={
          (isTeacher || isAdmin) && (
            <Button onClick={() => navigate('/assignments/create')} className="gap-2">
              <Plus className="h-4 w-4" />
              {t.assignments.createAssignment}
            </Button>
          )
        }
      />
      <div className="page-container">

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder={t.assignments.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Class Filter */}
            <Select
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
              options={classes.map((cls) => ({ value: cls.id.toString(), label: cls.name }))}
              placeholder={t.assignments.filterByClass}
            />

            {/* Subject Filter */}
            <Select
              value={selectedSubject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              options={subjects?.map((subject) => ({ value: subject.id.toString(), label: subject.name })) || []}
              placeholder={t.assignments.filterBySubject}
            />

            {/* Status Filter */}
            <Select
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              options={[
                { value: 'all', label: t.assignments.allAssignments },
                { value: 'active', label: t.assignments.activeAssignments },
                { value: 'overdue', label: t.assignments.overdueAssignments },
                ...(isStudent ? [{ value: 'completed', label: t.assignments.completedAssignments }] : []),
              ]}
              placeholder={t.assignments.filterByStatus}
            />
          </div>

          {/* Action Button and Clear Filters */}
          <div className="mt-4 flex items-center justify-between">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                <Filter className="h-4 w-4" />
                {t.common.clearFilters}
              </Button>
            )}
            {(isTeacher || isAdmin) && (
              <Button onClick={() => navigate('/assignments/create')} className="gap-2 ml-auto">
                <Plus className="h-4 w-4" />
                {t.assignments.createAssignment}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Grid */}
      {loading ? (
        <CardGridSkeleton count={6} />
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-zinc-400 mb-4" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
              {t.assignments.noAssignments}
            </h3>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="mt-2">
                {t.common.clearFilters}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignments.map((assignment) => (
              <Card
                key={assignment.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/assignments/${assignment.id}`)}
              >
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-zinc-900 dark:text-white mb-1 line-clamp-2">
                        {assignment.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <BookOpen className="h-4 w-4" />
                        <span>{assignment.class_name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Subject */}
                  {assignment.subject_name && (
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {assignment.subject_name}
                      </span>
                    </div>
                  )}

                  {/* Due Date */}
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-4 w-4 text-zinc-400" />
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {formatDateTime(assignment.due_date)}
                    </span>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {getDueDateBadge(assignment)}
                    {getSubmissionBadge(assignment)}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-700">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      Max Score: {assignment.max_score}
                    </div>
                    {(isTeacher || isAdmin) && (
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        {t.assignments.gradedCount
                          .replace('{graded}', assignment.graded_count.toString())
                          .replace('{total}', assignment.submission_count.toString())}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {meta.last_page > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(meta.current_page - 1)}
                disabled={meta.current_page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {getPageNumbers().map((pageNum, idx) =>
                pageNum === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-zinc-400">
                    ...
                  </span>
                ) : (
                  <Button
                    key={pageNum}
                    variant={pageNum === meta.current_page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(pageNum as number)}
                  >
                    {pageNum}
                  </Button>
                )
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(meta.current_page + 1)}
                disabled={meta.current_page === meta.last_page}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
      </div>
    </>
  );
};

export default AssignmentList;
