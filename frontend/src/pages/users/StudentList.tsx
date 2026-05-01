import React, { useEffect, useState } from 'react';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Avatar } from '../../components/ui/avatar';
import api from '../../lib/axios';
import { formatDate } from '../../lib/utils';
import type { User, ClassRoom } from '../../types';
import {
  Search,
  Mail,
  Calendar,
  GraduationCap,
  Loader2,
  FileX,
} from 'lucide-react';

const StudentList: React.FC = () => {
  const [students, setStudents] = useState<User[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, [classFilter]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { role: 'student' };
      if (classFilter) params.class_id = classFilter;
      const response = await api.get('/users', { params });
      const data = response.data.data || response.data;
      setStudents(Array.isArray(data) ? data : data.data || []);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes');
      const data = response.data.data || response.data;
      setClasses(Array.isArray(data) ? data : data.data || []);
    } catch {
      setClasses([]);
    }
  };

  const filteredStudents = students.filter((student) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      student.name.toLowerCase().includes(searchLower) ||
      student.email.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      <Header title="Students" description="View and manage students" />
      <div className="page-container">
        {/* Filters */}
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap className="h-6 w-6 text-primary-500" />
          <h2 className="text-lg font-semibold">All Students</h2>
          <Badge variant="secondary">{students.length}</Badge>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
            placeholder="All Classes"
            className="w-full sm:w-48"
          />
        </div>

        {/* Table */}
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileX className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-lg font-medium">No students found</p>
              <p className="text-sm mt-1">Try adjusting your search or filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student, index) => (
                  <TableRow key={student.id}>
                    <TableCell className="text-gray-400">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar name={student.name} src={student.avatar} size="sm" previewable />
                        <span className="font-medium text-gray-900 dark:text-gray-100">{student.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                        <Mail className="h-3.5 w-3.5" />
                        {student.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{student.phone || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
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
