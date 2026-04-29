import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Avatar } from '../../components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import api from '../../lib/axios';
import { formatDate } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import type { ClassRoom, User, Attendance, Quiz } from '../../types';
import {
  BookOpen,
  ArrowLeft,
  GraduationCap,
  Users,
  ClipboardCheck,
  FileQuestion,
  Calendar,
  Mail,
  Loader2,
  FileX,
  Trash2,
  UserPlus,
} from 'lucide-react';

const ClassDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [classRoom, setClassRoom] = useState<ClassRoom | null>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  // Assign dialog state
  const [showAssignTeacher, setShowAssignTeacher] = useState(false);
  const [showAssignStudent, setShowAssignStudent] = useState(false);
  const [availableTeachers, setAvailableTeachers] = useState<User[]>([]);
  const [availableStudents, setAvailableStudents] = useState<User[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherSubject, setTeacherSubject] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchClassDetail = useCallback(async () => {
    setLoading(true);
    try {
      const [classRes, attendanceRes, quizzesRes] = await Promise.allSettled([
        api.get(`/classes/${id}`),
        api.get(`/attendances`, { params: { class_id: id } }),
        api.get(`/quizzes`, { params: { class_id: id } }),
      ]);

      if (classRes.status === 'fulfilled') {
        const data = classRes.value.data.data;
        setClassRoom(data);
        setStudents(data.students || []);
        setTeachers(data.teachers || []);
      }
      if (attendanceRes.status === 'fulfilled') {
        const data = attendanceRes.value.data.data;
        setAttendance(Array.isArray(data) ? data : []);
      }
      if (quizzesRes.status === 'fulfilled') {
        const data = quizzesRes.value.data.data;
        setQuizzes(Array.isArray(data) ? data : []);
      }
    } catch {
      // handled individually
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClassDetail();
  }, [fetchClassDetail]);

  // --- Assign dialog openers ---
  const openAssignTeacher = async () => {
    try {
      const res = await api.get('/teachers');
      const allTeachers = res.data.data || [];
      const assignedIds = teachers.map((t) => t.id);
      setAvailableTeachers(allTeachers.filter((t: User) => !assignedIds.includes(t.id)));
    } catch {
      /* ignore */
    }
    setSelectedTeacherId('');
    setTeacherSubject('');
    setShowAssignTeacher(true);
  };

  const openAssignStudent = async () => {
    try {
      const res = await api.get('/students');
      const allStudents = res.data.data || [];
      const assignedIds = students.map((s) => s.id);
      setAvailableStudents(allStudents.filter((s: User) => !assignedIds.includes(s.id)));
    } catch {
      /* ignore */
    }
    setSelectedStudentId('');
    setShowAssignStudent(true);
  };

  // --- Assign/Remove handlers ---
  const handleAssignTeacher = async () => {
    if (!selectedTeacherId || !classRoom) return;
    setAssigning(true);
    try {
      await api.post(`/classes/${id}/assign-teacher`, {
        teacher_id: Number(selectedTeacherId),
        subject: teacherSubject || null,
      });
      toast.success('Teacher assigned successfully');
      setShowAssignTeacher(false);
      setSelectedTeacherId('');
      setTeacherSubject('');
      fetchClassDetail();
    } catch (error: any) {
      if (!error.response || ![403, 422, 500].includes(error.response.status)) {
        toast.error('Failed to assign teacher');
      }
    } finally {
      setAssigning(false);
    }
  };

  const handleAssignStudent = async () => {
    if (!selectedStudentId || !classRoom) return;
    setAssigning(true);
    try {
      await api.post(`/classes/${id}/assign-student`, {
        student_id: Number(selectedStudentId),
      });
      toast.success('Student assigned successfully');
      setShowAssignStudent(false);
      setSelectedStudentId('');
      fetchClassDetail();
    } catch (error: any) {
      if (!error.response || ![403, 422, 500].includes(error.response.status)) {
        toast.error('Failed to assign student');
      }
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveTeacher = async (teacherId: number) => {
    if (!confirm('Remove this teacher from the class?')) return;
    try {
      await api.delete(`/classes/${id}/remove-teacher/${teacherId}`);
      toast.success('Teacher removed');
      fetchClassDetail();
    } catch {
      toast.error('Failed to remove teacher');
    }
  };

  const handleRemoveStudent = async (studentId: number) => {
    if (!confirm('Remove this student from the class?')) return;
    try {
      await api.delete(`/classes/${id}/remove-student/${studentId}`);
      toast.success('Student removed');
      fetchClassDetail();
    } catch {
      toast.error('Failed to remove student');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!classRoom) {
    return (
      <>
        <Header title="Class Not Found" />
        <div className="page-container">
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileX className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-lg font-medium">Class not found</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/classes')}>
              Back to Classes
            </Button>
          </div>
        </div>
      </>
    );
  }

  const statusBadgeVariant: Record<string, 'success' | 'destructive' | 'warning' | 'info'> = {
    present: 'success',
    absent: 'destructive',
    late: 'warning',
    excused: 'info',
  };

  return (
    <>
      <Header title={classRoom.name} description={`${classRoom.grade_level} - ${classRoom.academic_year}`} />
      <div className="page-container">
        <Button variant="ghost" onClick={() => navigate('/classes')} className="mb-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Classes
        </Button>

        {/* Class Info Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                <BookOpen className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">{classRoom.name}</h2>
                <p className="text-gray-500 mt-0.5">{classRoom.description || classRoom.grade_level}</p>
              </div>
              <div className="flex gap-3">
                <div className="text-center px-4 py-2 bg-gray-50 rounded-lg">
                  <p className="text-xl font-bold text-gray-900">{students.length}</p>
                  <p className="text-xs text-gray-500">Students</p>
                </div>
                <div className="text-center px-4 py-2 bg-gray-50 rounded-lg">
                  <p className="text-xl font-bold text-gray-900">{teachers.length}</p>
                  <p className="text-xs text-gray-500">Teachers</p>
                </div>
                <div className="text-center px-4 py-2 bg-gray-50 rounded-lg">
                  <p className="text-xl font-bold text-gray-900">{quizzes.length}</p>
                  <p className="text-xs text-gray-500">Quizzes</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="students">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="students">
              <GraduationCap className="h-4 w-4 mr-1.5" />
              Students
            </TabsTrigger>
            <TabsTrigger value="teachers">
              <Users className="h-4 w-4 mr-1.5" />
              Teachers
            </TabsTrigger>
            <TabsTrigger value="attendance">
              <ClipboardCheck className="h-4 w-4 mr-1.5" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="quizzes">
              <FileQuestion className="h-4 w-4 mr-1.5" />
              Quizzes
            </TabsTrigger>
          </TabsList>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Students ({students.length})</CardTitle>
                {isAdmin && (
                  <Button size="sm" onClick={openAssignStudent}>
                    <UserPlus className="h-4 w-4" />
                    Add Student
                  </Button>
                )}
              </CardHeader>
              {students.length === 0 ? (
                <EmptyState icon={<GraduationCap />} message="No students enrolled" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Joined</TableHead>
                      {isAdmin && <TableHead className="w-16">Action</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student, index) => (
                      <TableRow key={student.id}>
                        <TableCell className="text-gray-400">{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar name={student.name} size="sm" />
                            <span className="font-medium text-gray-900">{student.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Mail className="h-3.5 w-3.5" />
                            {student.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(student.created_at)}
                          </div>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveStudent(student.id)}>
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* Teachers Tab */}
          <TabsContent value="teachers">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Teachers ({teachers.length})</CardTitle>
                {isAdmin && (
                  <Button size="sm" onClick={openAssignTeacher}>
                    <UserPlus className="h-4 w-4" />
                    Add Teacher
                  </Button>
                )}
              </CardHeader>
              {teachers.length === 0 ? (
                <EmptyState icon={<Users />} message="No teachers assigned" />
              ) : (
                <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <Avatar name={teacher.name} size="lg" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{teacher.name}</p>
                        <p className="text-sm text-gray-500">{teacher.email}</p>
                        {teacher.phone && (
                          <p className="text-xs text-gray-400 mt-0.5">{teacher.phone}</p>
                        )}
                      </div>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveTeacher(teacher.id)}>
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle>Recent Attendance</CardTitle>
              </CardHeader>
              {attendance.length === 0 ? (
                <EmptyState icon={<ClipboardCheck />} message="No attendance records" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.slice(0, 20).map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar name={record.user?.name || ''} size="sm" />
                            <span className="font-medium text-gray-900">{record.user?.name || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{formatDate(record.date)}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant[record.status]} className="capitalize">
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{record.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* Quizzes Tab */}
          <TabsContent value="quizzes">
            <Card>
              <CardHeader>
                <CardTitle>Quizzes ({quizzes.length})</CardTitle>
              </CardHeader>
              {quizzes.length === 0 ? (
                <EmptyState icon={<FileQuestion />} message="No quizzes for this class" />
              ) : (
                <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/quizzes/${quiz.id}/results`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{quiz.title}</h4>
                        <Badge variant={quiz.is_active ? 'success' : 'secondary'}>
                          {quiz.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mb-2 line-clamp-1">{quiz.description}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{quiz.duration_minutes} min</span>
                        <span>{quiz.questions_count || 0} questions</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Assign Teacher Dialog */}
        <Dialog open={showAssignTeacher} onOpenChange={() => setShowAssignTeacher(false)}>
          <DialogContent onClose={() => setShowAssignTeacher(false)}>
            <DialogHeader>
              <DialogTitle>Assign Teacher to {classRoom.name}</DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Select Teacher</label>
                {availableTeachers.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">All teachers are already assigned to this class.</p>
                ) : (
                  <Select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    options={availableTeachers.map((t) => ({ value: String(t.id), label: t.name }))}
                    placeholder="Choose a teacher..."
                  />
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Subject (optional)</label>
                <Input
                  value={teacherSubject}
                  onChange={(e) => setTeacherSubject(e.target.value)}
                  placeholder="e.g., Matematika"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignTeacher(false)}>Cancel</Button>
              <Button onClick={handleAssignTeacher} isLoading={assigning} disabled={!selectedTeacherId}>
                Assign Teacher
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Student Dialog */}
        <Dialog open={showAssignStudent} onOpenChange={() => setShowAssignStudent(false)}>
          <DialogContent onClose={() => setShowAssignStudent(false)}>
            <DialogHeader>
              <DialogTitle>Add Student to {classRoom.name}</DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Select Student</label>
                {availableStudents.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">All students are already enrolled in this class.</p>
                ) : (
                  <Select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    options={availableStudents.map((s) => ({ value: String(s.id), label: s.name }))}
                    placeholder="Choose a student..."
                  />
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignStudent(false)}>Cancel</Button>
              <Button onClick={handleAssignStudent} isLoading={assigning} disabled={!selectedStudentId}>
                Add Student
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

const EmptyState: React.FC<{ icon: React.ReactNode; message: string }> = ({ icon, message }) => (
  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
    <div className="h-10 w-10 mb-2 opacity-50">{icon}</div>
    <p className="text-sm">{message}</p>
  </div>
);

export default ClassDetail;
