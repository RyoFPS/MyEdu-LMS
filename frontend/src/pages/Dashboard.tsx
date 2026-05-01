import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import api from '../lib/axios';
import { formatDate, formatDateTime } from '../lib/utils';
import {
  Users,
  BookOpen,
  ClipboardCheck,
  FileQuestion,
  TrendingUp,
  Clock,
  ArrowRight,
  GraduationCap,
  UserCheck,
  BarChart3,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  FileText,
  Trophy,
  Timer,
  School,
  Layers,
} from 'lucide-react';

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'indigo' | 'emerald' | 'amber' | 'red' | 'purple';
  subtitle?: string;
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600',
  indigo: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600',
  emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600',
  amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600',
  red: 'bg-red-50 dark:bg-red-900/30 text-red-600',
  purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600',
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle }) => (
  <Card className="hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorMap[color]}`}>{icon}</div>
      </div>
    </CardContent>
  </Card>
);

// ─── Empty State ─────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ icon: React.ReactNode; message: string }> = ({ icon, message }) => (
  <div className="text-center py-8 text-gray-400">
    <div className="mx-auto mb-2 opacity-50 flex justify-center">{icon}</div>
    <p className="text-sm">{message}</p>
  </div>
);

// ─── Attendance Status Helpers ───────────────────────────────────────────────

const getAttendanceConfig = (t: any): Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'info'; icon: React.ReactNode }> => ({
  present: { label: t.dashboard.present, variant: 'success', icon: <CheckCircle2 className="h-5 w-5" /> },
  late: { label: t.dashboard.late, variant: 'warning', icon: <AlertTriangle className="h-5 w-5" /> },
  absent: { label: t.dashboard.absent, variant: 'destructive', icon: <XCircle className="h-5 w-5" /> },
  excused: { label: t.dashboard.excused, variant: 'info', icon: <AlertCircle className="h-5 w-5" /> },
});

// ─── Student Dashboard ───────────────────────────────────────────────────────

const StudentDashboard: React.FC<{ stats: any; navigate: ReturnType<typeof useNavigate>; t: any }> = ({
  stats,
  navigate,
  t,
}) => {
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const attendanceConfig = getAttendanceConfig(t);

  const handleSelfAttendance = async () => {
    setMarkingAttendance(true);
    try {
      await api.post('/attendances/self');
      toast.success('Attendance recorded! You are present today.');
      // Reload dashboard
      window.location.reload();
    } catch (error: any) {
      if (error.response?.status === 422 && error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (!error.response || ![403].includes(error.response.status)) {
        toast.error('Failed to record attendance.');
      }
    } finally {
      setMarkingAttendance(false);
    }
  };

  const todayAttendance = stats?.today_attendance;
  const classInfo = stats?.class_info;
  const attendance = stats?.attendance;
  const availableQuizzes: any[] = stats?.available_quizzes ?? [];
  const upcomingDeadlines: any[] = stats?.upcoming_deadlines ?? [];
  const recentResults: any[] = stats?.recent_results ?? [];
  const todayMaterials: any[] = stats?.today_materials ?? [];
  const latestScore = recentResults.length > 0 ? `${recentResults[0].percentage}%` : '-';

  const statusConfig = todayAttendance?.status ? attendanceConfig[todayAttendance.status] : null;

  return (
    <>
      {/* 1. Today's Status Banner */}
      <Card className={
        statusConfig
          ? statusConfig.variant === 'success'
            ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20'
            : statusConfig.variant === 'warning'
              ? 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-900/20'
              : statusConfig.variant === 'destructive'
                ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/20'
                : 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20'
          : 'border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50'
      }>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${
              statusConfig
                ? statusConfig.variant === 'success'
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'
                  : statusConfig.variant === 'warning'
                    ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400'
                    : statusConfig.variant === 'destructive'
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
                      : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'
                : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
            }`}>
              {statusConfig ? statusConfig.icon : <Clock className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t.dashboard.todayAttendance}</p>
              <div className="flex items-center gap-2 mt-1">
                {statusConfig ? (
                  <Badge variant={statusConfig.variant} className="text-sm px-3 py-1">
                    {statusConfig.label}
                  </Badge>
                ) : (
                  <>
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      {t.dashboard.notRecorded}
                    </Badge>
                    <Button
                      size="sm"
                      onClick={handleSelfAttendance}
                      disabled={markingAttendance}
                    >
                      {markingAttendance ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {markingAttendance ? t.common.loading : t.dashboard.markPresent}
                    </Button>
                  </>
                )}
                {todayAttendance?.notes && (
                  <span className="text-xs text-gray-400">- {todayAttendance.notes}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. My Class Info */}
      {classInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5 text-primary-500" />
              {t.dashboard.myClassInfo}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {classInfo.name}
                  </h3>
                  <Badge variant="info">Grade {classInfo.grade_level}</Badge>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {classInfo.students_count} {t.sidebar.students.toLowerCase()}
                </p>
              </div>
              {classInfo.teachers && classInfo.teachers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {classInfo.teachers.map((teacher: any) => (
                    <div key={teacher.id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                      <GraduationCap className="h-4 w-4 text-primary-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{teacher.name}</p>
                        <p className="text-xs text-gray-400">{teacher.subject}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t.dashboard.attendanceRate}
          value={`${attendance?.rate ?? 0}%`}
          icon={<UserCheck className="h-5 w-5" />}
          color="emerald"
          subtitle={`${attendance?.present ?? 0}/${attendance?.total ?? 0} days present`}
        />
        <StatCard
          title={t.dashboard.availableQuizzes}
          value={availableQuizzes.length}
          icon={<FileQuestion className="h-5 w-5" />}
          color="amber"
          subtitle="Ready to take"
        />
        <StatCard
          title={t.dashboard.totalClasses}
          value={stats?.total_classes ?? 0}
          icon={<BookOpen className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title={t.dashboard.recentScore}
          value={latestScore}
          icon={<Trophy className="h-5 w-5" />}
          color="purple"
          subtitle={recentResults.length > 0 ? recentResults[0].quiz_title : undefined}
        />
      </div>

      {/* 4. Today's Activities (2 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Quizzes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-amber-500" />
              {t.dashboard.availableQuizzes}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {availableQuizzes.length > 0 ? (
              <div className="space-y-3">
                {availableQuizzes.map((quiz: any) => (
                  <div
                    key={quiz.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors cursor-pointer"
                    onClick={() => navigate(`/quizzes/${quiz.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {quiz.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{quiz.class_name}</Badge>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          {quiz.duration_minutes} min
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<FileQuestion className="h-8 w-8" />}
                message={t.dashboard.noQuizzes}
              />
            )}
          </CardContent>
        </Card>

        {/* New Materials Today */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              {t.dashboard.newMaterialsToday}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayMaterials.length > 0 ? (
              <div className="space-y-3">
                {todayMaterials.map((material: any) => (
                  <div
                    key={material.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {material.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{material.class_name}</Badge>
                        <span className="text-xs text-gray-400">by {material.uploader}</span>
                      </div>
                    </div>
                    <Badge variant="outline">{material.type}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<FileText className="h-8 w-8" />}
                message={t.dashboard.noMaterials}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. Upcoming Deadlines */}
      {upcomingDeadlines.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              {t.dashboard.upcomingDeadlines}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcomingDeadlines.map((deadline: any) => (
                <div
                  key={deadline.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                  onClick={() => navigate(`/quizzes/${deadline.id}`)}
                >
                  <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {deadline.title}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Due: {formatDateTime(deadline.end_time)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6. Recent Results */}
      {recentResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-500" />
              {t.dashboard.recentResults}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentResults.slice(0, 5).map((result: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {result.quiz_title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {result.score}/{result.total_points} points &middot; {formatDate(result.completed_at)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      result.percentage >= 80
                        ? 'success'
                        : result.percentage >= 60
                          ? 'warning'
                          : 'destructive'
                    }
                    className="ml-2 shrink-0"
                  >
                    {result.percentage}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

// ─── Teacher Dashboard ───────────────────────────────────────────────────────

const TeacherDashboard: React.FC<{ stats: any; navigate: ReturnType<typeof useNavigate>; t: any }> = ({
  stats,
  navigate,
  t,
}) => {
  const attendanceConfig = getAttendanceConfig(t);
  const todayAttendance = stats?.today_attendance;
  const classes: any[] = stats?.classes ?? [];
  const activeQuizList: any[] = stats?.active_quiz_list ?? [];
  const recentAttempts: any[] = stats?.recent_attempts ?? [];
  const todayMaterials: any[] = stats?.today_materials ?? [];

  return (
    <>
      {/* 1. Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t.dashboard.myClasses}
          value={stats?.total_classes ?? 0}
          icon={<BookOpen className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title={t.dashboard.todayAttendance}
          value={`${todayAttendance?.rate ?? 0}%`}
          icon={<UserCheck className="h-5 w-5" />}
          color="emerald"
          subtitle={`${todayAttendance?.present ?? 0}/${todayAttendance?.total ?? 0} ${t.dashboard.present.toLowerCase()}`}
        />
        <StatCard
          title={t.dashboard.activeQuizzes}
          value={stats?.active_quizzes ?? 0}
          icon={<FileQuestion className="h-5 w-5" />}
          color="indigo"
          subtitle={`${stats?.total_quizzes ?? 0} total`}
        />
        <StatCard
          title={t.dashboard.totalStudents}
          value={stats?.total_students ?? 0}
          icon={<GraduationCap className="h-5 w-5" />}
          color="amber"
        />
      </div>

      {/* 2. My Classes Today */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary-500" />
            {t.dashboard.classesToday}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {classes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls: any) => (
                <div
                  key={cls.id}
                  className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate(`/classes/${cls.slug}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{cls.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{cls.subject}</p>
                    </div>
                    <Badge variant="secondary">{cls.students_count} {t.sidebar.students.toLowerCase()}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {cls.attendance_recorded ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600 dark:text-green-400">
                          {t.dashboard.recorded} ({cls.attendance_count} {t.sidebar.students.toLowerCase()})
                        </span>
                      </>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <span className="text-sm text-amber-600 dark:text-amber-400">{t.dashboard.notRecorded}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/attendance/record?class=${cls.id}`);
                          }}
                        >
                          {t.dashboard.recordNow}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<BookOpen className="h-8 w-8" />}
              message="No classes assigned"
            />
          )}
        </CardContent>
      </Card>

      {/* 3. Today's Activities (2 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Quizzes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-indigo-500" />
              {t.dashboard.activeQuizzes}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeQuizList.length > 0 ? (
              <div className="space-y-3">
                {activeQuizList.map((quiz: any) => (
                  <div
                    key={quiz.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors cursor-pointer"
                    onClick={() => navigate(`/quizzes/${quiz.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {quiz.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{quiz.class_name}</Badge>
                        <span className="text-xs text-gray-400">
                          {quiz.attempts_count} attempts
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-xs text-gray-400">
                        Ends {formatDateTime(quiz.end_time)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<FileQuestion className="h-8 w-8" />}
                message={t.dashboard.noQuizzes}
              />
            )}
          </CardContent>
        </Card>

        {/* Recent Quiz Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-500" />
              {t.dashboard.recentResults}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAttempts.length > 0 ? (
              <div className="space-y-3">
                {recentAttempts.map((attempt: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {attempt.student_name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {attempt.quiz_title} &middot; {attempt.score}/{attempt.total_points}
                      </p>
                    </div>
                    <Badge
                      variant={
                        attempt.percentage >= 80
                          ? 'success'
                          : attempt.percentage >= 60
                            ? 'warning'
                            : 'destructive'
                      }
                      className="ml-2 shrink-0"
                    >
                      {attempt.percentage}%
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Trophy className="h-8 w-8" />}
                message={t.dashboard.noRecentActivity}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. New Materials Today */}
      {todayMaterials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              {t.dashboard.newMaterialsToday}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {todayMaterials.map((material: any) => (
                <div
                  key={material.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {material.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary">{material.class_name}</Badge>
                      <Badge variant="outline">{material.type}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

// ─── Admin Dashboard ─────────────────────────────────────────────────────────

const AdminDashboard: React.FC<{ stats: any; navigate: ReturnType<typeof useNavigate>; t: any }> = ({
  stats,
  navigate,
  t,
}) => {
  const todayAttendance = stats?.today_attendance;
  const recentUsers: any[] = stats?.recent_users ?? [];
  const todayMaterials: any[] = stats?.today_materials ?? [];

  return (
    <>
      {/* 1. Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t.dashboard.totalUsers}
          value={stats?.total_users ?? 0}
          icon={<Users className="h-5 w-5" />}
          color="blue"
          subtitle={`${stats?.total_teachers ?? 0} ${t.sidebar.teachers.toLowerCase()}, ${stats?.total_students ?? 0} ${t.sidebar.students.toLowerCase()}`}
        />
        <StatCard
          title={t.dashboard.totalClasses}
          value={stats?.total_classes ?? 0}
          icon={<BookOpen className="h-5 w-5" />}
          color="indigo"
        />
        <StatCard
          title={t.dashboard.todayAttendance}
          value={`${todayAttendance?.rate ?? 0}%`}
          icon={<ClipboardCheck className="h-5 w-5" />}
          color="emerald"
          subtitle={`${todayAttendance?.present ?? 0}/${todayAttendance?.total ?? 0} ${t.dashboard.present.toLowerCase()}`}
        />
        <StatCard
          title={t.dashboard.activeQuizzes}
          value={stats?.active_quizzes ?? 0}
          icon={<FileQuestion className="h-5 w-5" />}
          color="amber"
          subtitle={`${stats?.total_quizzes ?? 0} total`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3. Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary-500" />
              {t.dashboard.quickActions}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/users')}>
              <Users className="h-4 w-4" />
              {t.dashboard.manageUsers}
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/classes')}>
              <BookOpen className="h-4 w-4" />
              {t.dashboard.manageClasses}
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/attendance')}>
              <ClipboardCheck className="h-4 w-4" />
              {t.dashboard.viewAttendance}
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/quizzes')}>
              <FileQuestion className="h-4 w-4" />
              {t.dashboard.viewQuizzes}
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/subjects')}>
              <Layers className="h-4 w-4" />
              {t.dashboard.manageSubjects}
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          </CardContent>
        </Card>

        {/* 2. System Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary-500" />
              {t.dashboard.systemOverview}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t.sidebar.students}</span>
                <span className="font-semibold">{stats?.total_students ?? 0}</span>
              </div>
              <Progress
                value={stats?.total_students ?? 0}
                max={Math.max(stats?.total_users ?? 1, 1)}
                variant="default"
                size="md"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t.sidebar.teachers}</span>
                <span className="font-semibold">{stats?.total_teachers ?? 0}</span>
              </div>
              <Progress
                value={stats?.total_teachers ?? 0}
                max={Math.max(stats?.total_users ?? 1, 1)}
                variant="success"
                size="md"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t.dashboard.attendanceRate}</span>
                <span className="font-semibold">{todayAttendance?.rate ?? 0}%</span>
              </div>
              <Progress
                value={todayAttendance?.rate ?? 0}
                variant={
                  (todayAttendance?.rate ?? 0) >= 80
                    ? 'success'
                    : (todayAttendance?.rate ?? 0) >= 60
                      ? 'warning'
                      : 'destructive'
                }
                size="md"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Users */}
      {recentUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              {t.dashboard.recentActivity}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentUsers.map((u: any, i: number) => (
                <div
                  key={u.id ?? i}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {u.name}
                    </p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                  <Badge variant={u.role === 'admin' ? 'destructive' : u.role === 'teacher' ? 'info' : 'secondary'}>
                    {u.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Today's Materials */}
      {todayMaterials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              {t.dashboard.newMaterialsToday}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {todayMaterials.map((material: any) => (
                <div
                  key={material.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {material.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary">{material.class_name}</Badge>
                      <Badge variant="outline">{material.type}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

// ─── Main Dashboard ──────────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const { user, isAdmin, isTeacher, isStudent } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard');
        setStats(response.data.data || response.data);
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500 mx-auto" />
          <p className="text-sm text-gray-400 mt-2">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        title={`${t.dashboard.welcomeBack}, ${user?.name?.split(' ')[0] ?? 'User'}!`}
        description={t.dashboard.whatsHappening}
      />
      <div className="page-container space-y-6">
        {isAdmin && <AdminDashboard stats={stats} navigate={navigate} t={t} />}
        {isTeacher && <TeacherDashboard stats={stats} navigate={navigate} t={t} />}
        {isStudent && <StudentDashboard stats={stats} navigate={navigate} t={t} />}

        {/* Fallback if no role matched */}
        {!isAdmin && !isTeacher && !isStudent && (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Dashboard Unavailable
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Your role could not be determined. Please contact an administrator.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default Dashboard;
