import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select } from '../../components/ui/select';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Avatar } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import api from '../../lib/axios';
import toast from 'react-hot-toast';
import type { ClassRoom, User, AttendanceRecord } from '../../types';
import {
  ClipboardCheck,
  Calendar,
  Users,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  UserX,
  Shield,
  GraduationCap,
} from 'lucide-react';

const AttendanceRow: React.FC<{
  user: User;
  index: number;
  record: AttendanceRecord;
  onUpdateRecord: (userId: number, field: keyof AttendanceRecord, value: string) => void;
  bgVariant?: 'blue' | 'default';
}> = ({ user, index, record, onUpdateRecord, bgVariant }) => (
  <div
    className={cn(
      'grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_160px] items-center gap-3 sm:gap-4 p-4 rounded-lg border transition-colors',
      bgVariant === 'blue'
        ? 'border-blue-100 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10 hover:bg-blue-50/50 dark:hover:bg-blue-900/20'
        : index % 2 === 0
          ? 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
          : 'border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/30 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
    )}
  >
    <div className="flex items-center gap-3 min-w-0">
      <span className="text-xs text-gray-400 w-6 text-right flex-shrink-0">{index + 1}.</span>
      <Avatar name={user.name} size="sm" />
      <div className="min-w-0">
        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
        <p className="text-xs text-gray-400 truncate">{user.email}</p>
      </div>
    </div>
    <div className="w-full sm:w-[320px] flex-shrink-0">
      <RadioGroup
        value={record?.status || 'present'}
        onValueChange={(val) => onUpdateRecord(user.id, 'status', val)}
        className="grid grid-cols-4 gap-1"
      >
        <RadioGroupItem value="present" label="Present" id={`present-${user.id}`} />
        <RadioGroupItem value="absent" label="Absent" id={`absent-${user.id}`} />
        <RadioGroupItem value="late" label="Late" id={`late-${user.id}`} />
        <RadioGroupItem value="excused" label="Excused" id={`excused-${user.id}`} />
      </RadioGroup>
    </div>
    <Input
      placeholder="Notes..."
      value={record?.notes || ''}
      onChange={(e) => onUpdateRecord(user.id, 'notes', e.target.value)}
      className="w-full sm:w-[160px] text-xs"
    />
  </div>
);

const RecordAttendance: React.FC = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<Record<number, AttendanceRecord>>({});
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchClassMembers(selectedClass);
    } else {
      setStudents([]);
      setTeachers([]);
      setRecords({});
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const response = await api.get('/classes');
      const data = response.data.data || response.data;
      setClasses(Array.isArray(data) ? data : data.data || []);
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassMembers = async (classId: string) => {
    setLoadingStudents(true);
    try {
      const response = await api.get(`/classes/${classId}`);
      const classData = response.data.data;
      const studentList: User[] = classData.students || [];
      const teacherList: User[] = classData.teachers || [];
      setStudents(studentList);
      setTeachers(teacherList);

      // Initialize records for both students and teachers
      const initialRecords: Record<number, AttendanceRecord> = {};
      teacherList.forEach((teacher: User) => {
        initialRecords[teacher.id] = {
          user_id: teacher.id,
          status: 'present',
          notes: '',
        };
      });
      studentList.forEach((student: User) => {
        initialRecords[student.id] = {
          user_id: student.id,
          status: 'present',
          notes: '',
        };
      });
      setRecords(initialRecords);
    } catch {
      setStudents([]);
      setTeachers([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const updateRecord = (userId: number, field: keyof AttendanceRecord, value: string) => {
    setRecords((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
      },
    }));
  };

  const setAllStatus = (status: AttendanceRecord['status']) => {
    setRecords((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        updated[Number(key)] = { ...updated[Number(key)], status };
      });
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!selectedClass || !date) {
      toast.error('Please select a class and date');
      return;
    }

    if (students.length === 0 && teachers.length === 0) {
      toast.error('No members in this class');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/attendances/bulk', {
        class_id: Number(selectedClass),
        date,
        attendances: Object.values(records),
      });
      toast.success('Attendance recorded successfully!');
      navigate('/attendance');
    } catch (error: any) {
      if (!error.response || ![403, 419, 422, 500].includes(error.response.status)) {
        toast.error('Failed to record attendance');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const statusCounts = Object.values(records).reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <>
      <Header title="Record Attendance" description="Mark attendance for your class" />
      <div className="page-container max-w-4xl mx-auto">
        {/* Class & Date Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary-500" />
              Select Class & Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label required>Class</Label>
                <Select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  options={classes.map((c) => ({ value: String(c.id), label: `${c.name} - ${c.grade_level}` }))}
                  placeholder="Select a class"
                />
              </div>
              <div className="space-y-2">
                <Label required>Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance List */}
        {selectedClass && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary-500" />
                  Attendance ({teachers.length + students.length})
                </CardTitle>
                {(teachers.length + students.length) > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Set all:</span>
                    <Button variant="outline" size="sm" onClick={() => setAllStatus('present')}>
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      Present
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setAllStatus('absent')}>
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                      Absent
                    </Button>
                  </div>
                )}
              </div>
              {(teachers.length + students.length) > 0 && (
                <div className="flex gap-2 mt-2">
                  <Badge variant="success">{statusCounts.present || 0} Present</Badge>
                  <Badge variant="destructive">{statusCounts.absent || 0} Absent</Badge>
                  <Badge variant="warning">{statusCounts.late || 0} Late</Badge>
                  <Badge variant="info">{statusCounts.excused || 0} Excused</Badge>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loadingStudents ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                </div>
              ) : (teachers.length + students.length) === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <UserX className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-lg font-medium">No members found</p>
                  <p className="text-sm mt-1">This class has no assigned teachers or enrolled students</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Teachers Section */}
                  {teachers.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 px-4">
                        <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/30">
                          <Shield className="h-4 w-4 text-blue-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Teachers ({teachers.length})</h3>
                      </div>
                      <div className="space-y-3">
                        {/* Column headers */}
                        <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_auto_160px] items-center gap-4 px-4 pb-1">
                          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Teacher</span>
                          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider text-center w-[320px]">Status</span>
                          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Notes</span>
                        </div>
                        {teachers.map((teacher, index) => (
                          <AttendanceRow
                            key={teacher.id}
                            user={teacher}
                            index={index}
                            record={records[teacher.id]}
                            onUpdateRecord={updateRecord}
                            bgVariant="blue"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Divider */}
                  {teachers.length > 0 && students.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700" />
                  )}

                  {/* Students Section */}
                  {students.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 px-4">
                        <div className="p-1 rounded bg-green-100 dark:bg-green-900/30">
                          <GraduationCap className="h-4 w-4 text-green-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Students ({students.length})</h3>
                      </div>
                      <div className="space-y-3">
                        {/* Column headers */}
                        <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_auto_160px] items-center gap-4 px-4 pb-1">
                          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Student</span>
                          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider text-center w-[320px]">Status</span>
                          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Notes</span>
                        </div>
                        {students.map((student, index) => (
                          <AttendanceRow
                            key={student.id}
                            user={student}
                            index={index}
                            record={records[student.id]}
                            onUpdateRecord={updateRecord}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        {(teachers.length + students.length) > 0 && (
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm sticky bottom-4">
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {statusCounts.present || 0}
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-500" />
                {statusCounts.absent || 0}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-yellow-500" />
                {statusCounts.late || 0}
              </span>
              <span className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                {statusCounts.excused || 0}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/attendance')}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} isLoading={submitting}>
                <Save className="h-4 w-4" />
                Submit Attendance
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RecordAttendance;
