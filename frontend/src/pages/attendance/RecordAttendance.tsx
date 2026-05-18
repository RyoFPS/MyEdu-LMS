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
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../lib/utils';
import api from '../../lib/axios';
import toast from 'react-hot-toast';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../hooks/useAuth';
import { useClasses, useClass } from '../../hooks/useApi';
import type { ClassRoom, User, AttendanceRecord } from '../../types';
import {
  ClipboardCheck,
  Calendar,
  Users,
  Save,
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
  t: any;
}> = ({ user, index, record, onUpdateRecord, bgVariant, t }) => (
  <div
    className={cn(
      'grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_160px] items-center gap-3 sm:gap-4 p-4 rounded-lg border transition-colors',
      bgVariant === 'blue'
        ? 'border-blue-100 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10 hover:bg-blue-50/50 dark:hover:bg-blue-900/20'
        : index % 2 === 0
          ? 'border-zinc-100 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50'
          : 'border-zinc-100 dark:border-zinc-700 bg-zinc-50/30 dark:bg-zinc-800/30 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50'
    )}
  >
    <div className="flex items-center gap-3 min-w-0">
      <span className="text-xs text-zinc-400 w-6 text-right flex-shrink-0">{index + 1}.</span>
      <Avatar name={user.name} src={user.avatar} size="sm" />
      <div className="min-w-0">
        <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{user.name}</p>
        <p className="text-xs text-zinc-400 truncate">{user.email}</p>
      </div>
    </div>
    <div className="w-full sm:w-[320px] flex-shrink-0">
      <RadioGroup
        value={record?.status || 'present'}
        onValueChange={(val) => onUpdateRecord(user.id, 'status', val)}
        className="grid grid-cols-4 gap-1"
      >
        <RadioGroupItem value="present" label={t.attendance.present} id={`present-${user.id}`} />
        <RadioGroupItem value="absent" label={t.attendance.absent} id={`absent-${user.id}`} />
        <RadioGroupItem value="late" label={t.attendance.late} id={`late-${user.id}`} />
        <RadioGroupItem value="excused" label={t.attendance.excused} id={`excused-${user.id}`} />
      </RadioGroup>
    </div>
    <Input
      placeholder={t.attendance.notes + '...'}
      value={record?.notes || ''}
      onChange={(e) => onUpdateRecord(user.id, 'notes', e.target.value)}
      className="w-full sm:w-[160px] text-xs"
    />
  </div>
);

const RecordAttendance: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<Record<number, AttendanceRecord>>({});
  const [submitting, setSubmitting] = useState(false);

  const { data: classesResponse, isLoading: loading } = useClasses();
  const classes = Array.isArray(classesResponse) ? classesResponse : classesResponse?.data || [];
  const { data: classData, isLoading: loadingStudents } = useClass(selectedClass, { enabled: !!selectedClass });
  const students = classData?.students || [];
  const teachers = classData?.teachers || [];

  useEffect(() => {
    if (selectedClass && classData) {
      initializeRecords(classData.students || [], classData.teachers || []);
    } else {
      setRecords({});
    }
  }, [selectedClass, classData]);

  const initializeRecords = (studentList: User[], teacherList: User[]) => {
    const filteredTeacherList = isAdmin
      ? teacherList
      : teacherList.filter((teacher) => teacher.id === user?.id);

    const initialRecords: Record<number, AttendanceRecord> = {};
    filteredTeacherList.forEach((teacher: User) => {
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
      <Header title={t.attendance.recordAttendance} description="Mark attendance for your class" />
      <div className="page-container max-w-4xl mx-auto">
        {/* Class & Date Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary-500" />
              {t.attendance.selectClass}
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
                  placeholder={t.attendance.selectAClass}
                />
              </div>
              <div className="space-y-2">
                <Label required>{t.common.date}</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
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
                  {t.attendance.title} ({teachers.length + students.length})
                </CardTitle>
                {(teachers.length + students.length) > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{t.attendance.setAll}:</span>
                    <Button variant="outline" size="sm" onClick={() => setAllStatus('present')}>
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      {t.attendance.present}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setAllStatus('absent')}>
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                      {t.attendance.absent}
                    </Button>
                  </div>
                )}
              </div>
              {(teachers.length + students.length) > 0 && (
                <div className="flex gap-2 mt-2">
                  <Badge variant="success">{statusCounts.present || 0} {t.attendance.present}</Badge>
                  <Badge variant="destructive">{statusCounts.absent || 0} {t.attendance.absent}</Badge>
                  <Badge variant="warning">{statusCounts.late || 0} {t.attendance.late}</Badge>
                  <Badge variant="info">{statusCounts.excused || 0} {t.attendance.excused}</Badge>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loadingStudents ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-8 w-64" />
                      <Skeleton className="h-8 w-32" />
                    </div>
                  ))}
                </div>
              ) : (teachers.length + students.length) === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                  <UserX className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-lg font-medium">{t.attendance.noMembers}</p>
                  <p className="text-sm mt-1">{t.attendance.noMembersHint}</p>
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
                        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{t.sidebar.teachers} ({teachers.length})</h3>
                      </div>
                      <div className="space-y-3">
                        {/* Column headers */}
                        <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_auto_160px] items-center gap-4 px-4 pb-1">
                          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{t.sidebar.teachers}</span>
                          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider text-center w-[320px]">{t.common.status}</span>
                          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">{t.attendance.notes}</span>
                        </div>
                        {teachers.map((teacher, index) => (
                          <AttendanceRow
                            key={teacher.id}
                            user={teacher}
                            index={index}
                            record={records[teacher.id]}
                            onUpdateRecord={updateRecord}
                            bgVariant="blue"
                            t={t}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Divider */}
                  {teachers.length > 0 && students.length > 0 && (
                    <div className="border-t border-zinc-200 dark:border-zinc-700" />
                  )}

                  {/* Students Section */}
                  {students.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 px-4">
                        <div className="p-1 rounded bg-green-100 dark:bg-green-900/30">
                          <GraduationCap className="h-4 w-4 text-green-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{t.sidebar.students} ({students.length})</h3>
                      </div>
                      <div className="space-y-3">
                        {/* Column headers */}
                        <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_auto_160px] items-center gap-4 px-4 pb-1">
                          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{t.sidebar.students}</span>
                          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider text-center w-[320px]">{t.common.status}</span>
                          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">{t.attendance.notes}</span>
                        </div>
                        {students.map((student, index) => (
                          <AttendanceRow
                            key={student.id}
                            user={student}
                            index={index}
                            record={records[student.id]}
                            onUpdateRecord={updateRecord}
                            t={t}
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
          <div className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700 shadow-sm sticky bottom-4">
            {/* Status badges — centered row */}
            <div className="flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {statusCounts.present || 0} {t.attendance.present}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                <XCircle className="h-3.5 w-3.5" />
                {statusCounts.absent || 0} {t.attendance.absent}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                <Clock className="h-3.5 w-3.5" />
                {statusCounts.late || 0} {t.attendance.late}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                <AlertCircle className="h-3.5 w-3.5" />
                {statusCounts.excused || 0} {t.attendance.excused}
              </span>
            </div>
            {/* Action buttons — full width below */}
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={() => navigate('/attendance')} className="flex-1">
                {t.common.cancel}
              </Button>
              <Button onClick={handleSubmit} isLoading={submitting} className="flex-1">
                <Save className="h-4 w-4" />
                {t.attendance.submitAttendance}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RecordAttendance;
