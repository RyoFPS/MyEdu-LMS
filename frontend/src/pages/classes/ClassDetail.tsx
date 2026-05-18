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
import { SearchableSelect } from '../../components/ui/searchable-select';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import api from '../../lib/axios';
import { formatDate } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import toast from 'react-hot-toast';
import SubjectMatterTab from './SubjectMatterTab';
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
  FileX,
  Trash2,
  UserPlus,
  BookMarked,
} from 'lucide-react';

const ClassDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { t } = useTranslation();
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
  const [subjects, setSubjects] = useState<{id: number; name: string; code: string; category: string | null}[]>([]);

  const fetchClassDetail = useCallback(async () => {
    setLoading(true);
    try {
      // Step 1: Fetch class detail (accepts slug)
      const classRes = await api.get(`/classes/${id}`);
      const classData = classRes.data.data;
      setClassRoom(classData);
      setStudents(classData.students || []);
      setTeachers(classData.teachers || []);

      // Step 2: Use the numeric class ID for related data
      const numericId = classData.id;
      const [attendanceRes, quizzesRes] = await Promise.allSettled([
        api.get('/attendances', { params: { class_id: numericId } }),
        api.get('/quizzes', { params: { class_id: numericId } }),
      ]);

      if (attendanceRes.status === 'fulfilled') {
        const data = attendanceRes.value.data.data;
        setAttendance(Array.isArray(data) ? data : []);
      }
      if (quizzesRes.status === 'fulfilled') {
        const data = quizzesRes.value.data.data;
        setQuizzes(Array.isArray(data) ? data : []);
      }
    } catch {
      // Class not found
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
      const [teachersRes, subjectsRes] = await Promise.allSettled([
        api.get('/teachers'),
        api.get('/subjects'),
      ]);

      if (teachersRes.status === 'fulfilled') {
        const allTeachers = teachersRes.value.data.data || [];
        const assignedIds = teachers.map((t) => t.id);
        setAvailableTeachers(allTeachers.filter((t: User) => !assignedIds.includes(t.id)));
      }

      if (subjectsRes.status === 'fulfilled') {
        setSubjects(subjectsRes.value.data.data || []);
      }
    } catch {
      /* ignore */
    }
    setSelectedTeacherId('');
    setTeacherSubject('');
    setShowAssignTeacher(true);
  };

  const openAssignStudent = async () => {
    try {
      const res = await api.get('/students', { params: { per_page: 200, unassigned: true } });
      const allStudents = res.data.data || [];
      setAvailableStudents(allStudents);
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
      if (error.response?.status === 422 && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (!error.response || ![403, 500].includes(error.response.status)) {
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
      <>
        <Header title={t.sidebar.classes} />
        <div className="page-container">
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-10 w-10 rounded-full mb-3" />
                  <Skeleton className="h-6 w-20 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <Skeleton className="h-10 w-full" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-4 border rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </>
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
              {t.common.back}
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
          {t.common.back}
        </Button>

        {/* Class Info Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600">
                <BookOpen className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{classRoom.name}</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-0.5">{classRoom.description || classRoom.grade_level}</p>
              </div>
              <div className="flex gap-3">
                <div className="text-center px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{students.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t.classes.studentsCount}</p>
                </div>
                <div className="text-center px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{teachers.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t.classes.teachersCount}</p>
                </div>
                <div className="text-center px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{quizzes.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t.sidebar.quizzes}</p>
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
              {t.sidebar.students}
            </TabsTrigger>
            <TabsTrigger value="teachers">
              <Users className="h-4 w-4 mr-1.5" />
              {t.sidebar.teachers}
            </TabsTrigger>
            <TabsTrigger value="attendance">
              <ClipboardCheck className="h-4 w-4 mr-1.5" />
              {t.sidebar.attendance}
            </TabsTrigger>
            <TabsTrigger value="quizzes">
              <FileQuestion className="h-4 w-4 mr-1.5" />
              {t.sidebar.quizzes}
            </TabsTrigger>
            <TabsTrigger value="materials">
              <BookMarked className="h-4 w-4 mr-1.5" />
              {t.materials.title}
            </TabsTrigger>
          </TabsList>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t.sidebar.students} ({students.length})</CardTitle>
                {isAdmin && (
                  <Button size="sm" onClick={openAssignStudent}>
                    <UserPlus className="h-4 w-4" />
                    {t.classes.assignStudent}
                  </Button>
                )}
              </CardHeader>
              {students.length === 0 ? (
                <EmptyState icon={<GraduationCap />} message={t.classes.noStudents} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{t.sidebar.students}</TableHead>
                      <TableHead>{t.common.email}</TableHead>
                      <TableHead>{t.users.joined}</TableHead>
                      {isAdmin && <TableHead className="w-16">{t.common.actions}</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student, index) => (
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
                          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
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
                <CardTitle>{t.sidebar.teachers} ({teachers.length})</CardTitle>
                {isAdmin && (
                  <Button size="sm" onClick={openAssignTeacher}>
                    <UserPlus className="h-4 w-4" />
                    {t.classes.assignTeacher}
                  </Button>
                )}
              </CardHeader>
              {teachers.length === 0 ? (
                <EmptyState icon={<Users />} message={t.classes.noTeachers} />
              ) : (
                <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Avatar name={teacher.name} src={teacher.avatar} size="lg" previewable />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{teacher.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{teacher.email}</p>
                        {teacher.phone && (
                          <p className="text-xs text-gray-400 mt-0.5">{teacher.phone}</p>
                        )}
                        {/* Teacher's subjects from their profile */}
                        {(teacher as any).subjects?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(teacher as any).subjects.map((s: any) => (
                              <Badge key={s.id} variant="outline" className="text-xs py-0">
                                {s.name}
                              </Badge>
                            ))}
                          </div>
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
                <CardTitle>{t.sidebar.attendance}</CardTitle>
              </CardHeader>
              {attendance.length === 0 ? (
                <EmptyState icon={<ClipboardCheck />} message={t.common.noData} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.sidebar.students}</TableHead>
                      <TableHead>{t.common.date}</TableHead>
                      <TableHead>{t.common.status}</TableHead>
                      <TableHead>{t.attendance.notes}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.slice(0, 20).map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar name={record.user?.name || ''} src={record.user?.avatar} size="sm" />
                            <span className="font-medium text-gray-900 dark:text-gray-100">{record.user?.name || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">{formatDate(record.date)}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant[record.status]} className="capitalize">
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 dark:text-gray-400">{record.notes || '-'}</TableCell>
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
                <CardTitle>{t.sidebar.quizzes} ({quizzes.length})</CardTitle>
              </CardHeader>
              {quizzes.length === 0 ? (
                <EmptyState icon={<FileQuestion />} message={t.quizzes.noQuizzes} />
              ) : (
                <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      onClick={() => navigate(`/quizzes/${quiz.id}/results`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">{quiz.title}</h4>
                        <Badge variant={quiz.is_active ? 'success' : 'secondary'}>
                          {quiz.is_active ? t.quizzes.active : t.quizzes.inactive}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-1">{quiz.description}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{quiz.duration_minutes} min</span>
                        <span>{quiz.questions_count || 0} {t.quizzes.questions}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Subject Matters Tab */}
          <TabsContent value="materials">
            <SubjectMatterTab classId={classRoom.id} />
          </TabsContent>
        </Tabs>

        {/* Assign Teacher Dialog */}
        <Dialog open={showAssignTeacher} onOpenChange={() => setShowAssignTeacher(false)}>
          <DialogContent onClose={() => setShowAssignTeacher(false)}>
            <DialogHeader>
              <DialogTitle>{t.classes.assignTeacher} - {classRoom.name}</DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.sidebar.teachers}</label>
                {availableTeachers.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">All teachers are already assigned to this class.</p>
                ) : (
                  <SearchableSelect
                    value={selectedTeacherId}
                    onChange={(val) => setSelectedTeacherId(val)}
                    options={availableTeachers.map((t) => ({ value: String(t.id), label: t.name, subtitle: t.email }))}
                    placeholder="Choose a teacher..."
                    searchPlaceholder={t.common.search + '...'}
                    emptyMessage="No teachers found."
                  />
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t.quizzes.subject} (optional)
                </label>
                <Select
                  value={teacherSubject}
                  onChange={(e) => setTeacherSubject(e.target.value)}
                  options={[
                    ...subjects.map((s) => ({
                      value: s.name,
                      label: `${s.name} (${s.code})${s.category ? ` — ${s.category}` : ''}`,
                    })),
                    { value: 'Other', label: 'Other (Versatile Teacher)' },
                  ]}
                  placeholder={`${t.quizzes.subject} (optional)`}
                />
                {selectedTeacherId && (() => {
                  const selectedTeacher = availableTeachers.find(t => String(t.id) === selectedTeacherId);
                  const teacherSubjects = (selectedTeacher as any)?.subjects;
                  if (teacherSubjects && teacherSubjects.length > 0) {
                    return (
                      <p className="text-xs text-gray-400">
                        This teacher teaches: {teacherSubjects.map((s: any) => s.name).join(', ')}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignTeacher(false)}>{t.common.cancel}</Button>
              <Button onClick={handleAssignTeacher} isLoading={assigning} disabled={!selectedTeacherId}>
                {t.classes.assignTeacher}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Student Dialog */}
        <Dialog open={showAssignStudent} onOpenChange={() => setShowAssignStudent(false)}>
          <DialogContent onClose={() => setShowAssignStudent(false)}>
            <DialogHeader>
              <DialogTitle>{t.classes.assignStudent} - {classRoom.name}</DialogTitle>
            </DialogHeader>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.sidebar.students}</label>
                {availableStudents.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">{t.classes.allStudentsAssigned}</p>
                ) : (
                  <SearchableSelect
                    value={selectedStudentId}
                    onChange={(val) => setSelectedStudentId(val)}
                    options={availableStudents.map((s) => ({ value: String(s.id), label: s.name, subtitle: s.email }))}
                    placeholder="Choose a student..."
                    searchPlaceholder={t.common.search + '...'}
                    emptyMessage="No students found."
                  />
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignStudent(false)}>{t.common.cancel}</Button>
              <Button onClick={handleAssignStudent} isLoading={assigning} disabled={!selectedStudentId}>
                {t.classes.assignStudent}
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
