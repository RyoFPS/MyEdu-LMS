import React, { useEffect, useState } from 'react';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Avatar } from '../../components/ui/avatar';
import { TableSkeleton } from '../../components/skeletons';
import { useTranslation } from '../../hooks/useTranslation';
import { useStudents, useClasses } from '../../hooks/useApi';
import { formatDate } from '../../lib/utils';
import type { User } from '../../types';
import {
  Search,
  Mail,
  Calendar,
  GraduationCap,
  FileX,
} from 'lucide-react';

const StudentList: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch students with React Query
  const { data: studentsData, isLoading: loading } = useStudents({
    search: debouncedSearch,
    class_id: selectedClass,
  });

  // Fetch classes for filter dropdown
  const { data: classesData } = useClasses();

  const students = studentsData?.data || [];
  const classes = classesData?.data || [];

  return (
    <>
      <Header title={t.sidebar.students} description={`${t.common.view} ${t.sidebar.students.toLowerCase()}`} />
      <div className="page-container">
        {/* Filters */}
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap className="h-6 w-6 text-primary-500" />
          <h2 className="text-lg font-semibold">{t.sidebar.students}</h2>
          <Badge variant="secondary">{students.length}</Badge>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder={t.common.search + '...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
            placeholder={t.quizzes.allClasses}
            className="w-full sm:w-48"
          />
        </div>

        {/* Table */}
        <Card>
          {loading ? (
            <TableSkeleton rows={8} columns={5} />
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <FileX className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-lg font-medium">{t.common.noData}</p>
              <p className="text-sm mt-1">{t.library.adjustFilters}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t.sidebar.students}</TableHead>
                  <TableHead>{t.common.email}</TableHead>
                  <TableHead>{t.common.phone}</TableHead>
                  <TableHead>{t.users.joined}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student, index) => (
                  <TableRow key={student.id}>
                    <TableCell className="text-zinc-400">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar name={student.name} src={student.avatar} size="sm" previewable />
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">{student.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                        <Mail className="h-3.5 w-3.5" />
                        {student.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">{student.phone || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(student.created_at)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
};

export default StudentList;
