import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Avatar } from '../../components/ui/avatar';
import { useAuth } from '../../hooks/useAuth';
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
} from 'lucide-react';

const statusBadgeVariant: Record<string, 'success' | 'destructive' | 'warning' | 'info'> = {
  present: 'success',
  absent: 'destructive',
  late: 'warning',
  excused: 'info',
};

const AttendanceList: React.FC = () => {
  const { isTeacher, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedClass) params.class_id = selectedClass;
      if (selectedStatus) params.status = selectedStatus;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await api.get('/attendances', { params });
      const data = response.data.data || response.data;
      setAttendance(Array.isArray(data) ? data : data.data || []);
    } catch {
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedStatus, dateFrom, dateTo]);

  const fetchClasses = useCallback(async () => {
    try {
      const response = await api.get('/classes');
      const data = response.data.data || response.data;
      setClasses(Array.isArray(data) ? data : data.data || []);
    } catch {
      setClasses([]);
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
    fetchClasses();
  }, [fetchAttendance, fetchClasses]);

  const filteredAttendance = attendance.filter((record) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      record.user?.name?.toLowerCase().includes(searchLower) ||
      record.class_room?.name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      <Header
        title="Attendance"
        description={isTeacher || isAdmin ? 'Manage and view attendance records' : 'View your attendance history'}
      />
      <div className="page-container">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary-500" />
            <h2 className="text-lg font-semibold">Attendance Records</h2>
          </div>
          {(isTeacher || isAdmin) && (
            <Button onClick={() => navigate('/attendance/record')}>
              <Plus className="h-4 w-4" />
              Record Attendance
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by student or class..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
                placeholder="All Classes"
                className="w-full md:w-48"
              />
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                options={[
                  { value: 'present', label: 'Present' },
                  { value: 'absent', label: 'Absent' },
                  { value: 'late', label: 'Late' },
                  { value: 'excused', label: 'Excused' },
                ]}
                placeholder="All Status"
                className="w-full md:w-40"
              />
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full md:w-40"
                  placeholder="From"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full md:w-40"
                  placeholder="To"
                />
              </div>
              {(selectedClass || selectedStatus || dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedClass('');
                    setSelectedStatus('');
                    setDateFrom('');
                    setDateTo('');
                  }}
                >
                  <Filter className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            </div>
          ) : filteredAttendance.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileX className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-lg font-medium">No attendance records found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendance.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar name={record.user?.name || ''} size="sm" />
                        <div>
                          <p className="font-medium text-gray-900">{record.user?.name || 'N/A'}</p>
                          <p className="text-xs text-gray-400">{record.user?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-700">{record.class_room?.name || 'N/A'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(record.date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant[record.status]} className="capitalize">
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">{record.notes || '-'}</span>
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

export default AttendanceList;
