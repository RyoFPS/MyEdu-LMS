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
} from 'lucide-react';

const RecordAttendance: React.FC = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<User[]>([]);
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
      fetchStudents(selectedClass);
    } else {
      setStudents([]);
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

  const fetchStudents = async (classId: string) => {
    setLoadingStudents(true);
    try {
      const response = await api.get(`/classes/${classId}`);
      const classData = response.data.data;
      const studentList: User[] = classData.students || [];
      setStudents(studentList);
      // Initialize records
      const initialRecords: Record<number, AttendanceRecord> = {};
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

    if (students.length === 0) {
      toast.error('No students in this class');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/attendances/bulk', {
        class_id: Number(selectedClass),
        date,
        records: Object.values(records),
      });
      toast.success('Attendance recorded successfully!');
      navigate('/attendance');
    } catch {
      toast.error('Failed to record attendance');
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

        {/* Students List */}
        {selectedClass && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary-500" />
                  Students ({students.length})
                </CardTitle>
                {students.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Set all:</span>
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
              {students.length > 0 && (
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
              ) : students.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <UserX className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-lg font-medium">No students found</p>
                  <p className="text-sm mt-1">This class has no enrolled students</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {students.map((student, index) => (
                    <div
                      key={student.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-lg border border-gray-100 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs text-gray-400 w-6 text-right">{index + 1}.</span>
                        <Avatar name={student.name} size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{student.name}</p>
                          <p className="text-xs text-gray-400">{student.email}</p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                        <RadioGroup
                          value={records[student.id]?.status || 'present'}
                          onValueChange={(value) => updateRecord(student.id, 'status', value)}
                          className="flex flex-wrap gap-3"
                        >
                          <RadioGroupItem value="present" label="Present" id={`present-${student.id}`} />
                          <RadioGroupItem value="absent" label="Absent" id={`absent-${student.id}`} />
                          <RadioGroupItem value="late" label="Late" id={`late-${student.id}`} />
                          <RadioGroupItem value="excused" label="Excused" id={`excused-${student.id}`} />
                        </RadioGroup>

                        <Input
                          placeholder="Notes (optional)"
                          value={records[student.id]?.notes || ''}
                          onChange={(e) => updateRecord(student.id, 'notes', e.target.value)}
                          className="w-full sm:w-40 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        {students.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm sticky bottom-4">
            <div className="flex items-center gap-4 text-sm text-gray-500">
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
