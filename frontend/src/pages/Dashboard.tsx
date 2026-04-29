import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/axios';
import type { DashboardStats } from '../types';
import {
  Users,
  BookOpen,
  ClipboardCheck,
  FileQuestion,
  TrendingUp,
  Calendar,
  Clock,
  ArrowRight,
  GraduationCap,
  UserCheck,
  BarChart3,
  Loader2,
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, isAdmin, isTeacher, isStudent } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard');
        setStats(response.data.data || response.data);
      } catch {
        // Use fallback stats
        setStats({
          total_users: 0,
          total_classes: 0,
          total_students: 0,
          total_teachers: 0,
          today_attendance_rate: 0,
          active_quizzes: 0,
          my_classes: 0,
          my_attendance_rate: 0,
          upcoming_quizzes: 0,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <>
      <Header
        title={`Welcome back, ${user?.name?.split(' ')[0]}!`}
        description={`Here's what's happening today`}
      />
      <div className="page-container">
        {/* Stats Cards */}
        {isAdmin && <AdminDashboard stats={stats} navigate={navigate} />}
        {isTeacher && <TeacherDashboard stats={stats} navigate={navigate} />}
        {isStudent && <StudentDashboard stats={stats} navigate={navigate} />}
      </div>
    </>
  );
};

// Admin Dashboard
const AdminDashboard: React.FC<{ stats: DashboardStats | null; navigate: ReturnType<typeof useNavigate> }> = ({
  stats,
  navigate,
}) => (
  <>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Users"
        value={stats?.total_users ?? 0}
        icon={<Users className="h-5 w-5" />}
        color="blue"
        trend="+12%"
      />
      <StatCard
        title="Total Classes"
        value={stats?.total_classes ?? 0}
        icon={<BookOpen className="h-5 w-5" />}
        color="indigo"
      />
      <StatCard
        title="Today's Attendance"
        value={`${stats?.today_attendance_rate ?? 0}%`}
        icon={<ClipboardCheck className="h-5 w-5" />}
        color="emerald"
        trend="+5%"
      />
      <StatCard
        title="Active Quizzes"
        value={stats?.active_quizzes ?? 0}
        icon={<FileQuestion className="h-5 w-5" />}
        color="amber"
      />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Quick Actions */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary-500" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/users')}>
            <Users className="h-4 w-4" />
            Manage Users
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/classes')}>
            <BookOpen className="h-4 w-4" />
            Manage Classes
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/attendance')}>
            <ClipboardCheck className="h-4 w-4" />
            View Attendance
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/quizzes')}>
            <FileQuestion className="h-4 w-4" />
            View Quizzes
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
        </CardContent>
      </Card>

      {/* Overview */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary-500" />
            System Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Students</span>
              <span className="font-semibold">{stats?.total_students ?? 0}</span>
            </div>
            <Progress value={stats?.total_students ?? 0} max={Math.max(stats?.total_users ?? 1, 1)} variant="default" size="md" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Teachers</span>
              <span className="font-semibold">{stats?.total_teachers ?? 0}</span>
            </div>
            <Progress value={stats?.total_teachers ?? 0} max={Math.max(stats?.total_users ?? 1, 1)} variant="success" size="md" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Attendance Rate</span>
              <span className="font-semibold">{stats?.today_attendance_rate ?? 0}%</span>
            </div>
            <Progress value={stats?.today_attendance_rate ?? 0} variant="warning" size="md" />
          </div>
        </CardContent>
      </Card>
    </div>
  </>
);

// Teacher Dashboard
const TeacherDashboard: React.FC<{ stats: DashboardStats | null; navigate: ReturnType<typeof useNavigate> }> = ({
  stats,
  navigate,
}) => (
  <>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="My Classes"
        value={stats?.my_classes ?? 0}
        icon={<BookOpen className="h-5 w-5" />}
        color="blue"
      />
      <StatCard
        title="Today's Attendance"
        value={`${stats?.today_attendance_rate ?? 0}%`}
        icon={<UserCheck className="h-5 w-5" />}
        color="emerald"
      />
      <StatCard
        title="My Quizzes"
        value={stats?.active_quizzes ?? 0}
        icon={<FileQuestion className="h-5 w-5" />}
        color="indigo"
      />
      <StatCard
        title="Total Students"
        value={stats?.total_students ?? 0}
        icon={<GraduationCap className="h-5 w-5" />}
        color="amber"
      />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary-500" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/attendance/record')}>
            <ClipboardCheck className="h-4 w-4" />
            Record Attendance
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/quizzes/create')}>
            <FileQuestion className="h-4 w-4" />
            Create Quiz
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/classes')}>
            <BookOpen className="h-4 w-4" />
            View My Classes
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/students')}>
            <GraduationCap className="h-4 w-4" />
            View Students
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary-500" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.recent_activity && stats.recent_activity.length > 0 ? (
              stats.recent_activity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-primary-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-gray-700">{activity.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{activity.created_at}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  </>
);

// Student Dashboard
const StudentDashboard: React.FC<{ stats: DashboardStats | null; navigate: ReturnType<typeof useNavigate> }> = ({
  stats,
  navigate,
}) => (
  <>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="My Classes"
        value={stats?.my_classes ?? 0}
        icon={<BookOpen className="h-5 w-5" />}
        color="blue"
      />
      <StatCard
        title="Attendance Rate"
        value={`${stats?.my_attendance_rate ?? 0}%`}
        icon={<UserCheck className="h-5 w-5" />}
        color="emerald"
      />
      <StatCard
        title="Upcoming Quizzes"
        value={stats?.upcoming_quizzes ?? 0}
        icon={<FileQuestion className="h-5 w-5" />}
        color="amber"
      />
      <StatCard
        title="Active Quizzes"
        value={stats?.active_quizzes ?? 0}
        icon={<Clock className="h-5 w-5" />}
        color="indigo"
      />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary-500" />
            My Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Attendance Rate</span>
              <span className="font-semibold">{stats?.my_attendance_rate ?? 0}%</span>
            </div>
            <Progress
              value={stats?.my_attendance_rate ?? 0}
              variant={(stats?.my_attendance_rate ?? 0) >= 80 ? 'success' : (stats?.my_attendance_rate ?? 0) >= 60 ? 'warning' : 'destructive'}
              size="md"
            />
          </div>
          {stats?.recent_scores && stats.recent_scores.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-3">Recent Quiz Scores</p>
              <div className="flex gap-2">
                {stats.recent_scores.map((score, i) => (
                  <Badge key={i} variant={score >= 80 ? 'success' : score >= 60 ? 'warning' : 'destructive'}>
                    {score}%
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary-500" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/classes')}>
            <BookOpen className="h-4 w-4" />
            My Classes
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/attendance')}>
            <ClipboardCheck className="h-4 w-4" />
            My Attendance
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/quizzes')}>
            <FileQuestion className="h-4 w-4" />
            Available Quizzes
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate('/teachers')}>
            <Users className="h-4 w-4" />
            My Teachers
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
        </CardContent>
      </Card>
    </div>
  </>
);

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'indigo' | 'emerald' | 'amber' | 'red' | 'purple';
  trend?: string;
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600',
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend }) => (
  <Card className="hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-500">{trend}</span>
              <span className="text-xs text-gray-400">vs last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorMap[color]}`}>{icon}</div>
      </div>
    </CardContent>
  </Card>
);

export default Dashboard;
