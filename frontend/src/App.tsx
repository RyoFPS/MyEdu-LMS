import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import AttendanceList from './pages/attendance/AttendanceList';
import RecordAttendance from './pages/attendance/RecordAttendance';
import QuizList from './pages/quiz/QuizList';
import QuizCreate from './pages/quiz/QuizCreate';
import QuizTake from './pages/quiz/QuizTake';
import QuizResults from './pages/quiz/QuizResults';
import ClassList from './pages/classes/ClassList';
import ClassDetail from './pages/classes/ClassDetail';
import UserList from './pages/users/UserList';
import TeacherList from './pages/users/TeacherList';
import StudentList from './pages/users/StudentList';
import SubjectList from './pages/subjects/SubjectList';
import Library from './pages/library/Library';
import ActivityLog from './pages/admin/ActivityLog';
import AssignmentList from './pages/assignments/AssignmentList';
import AssignmentCreate from './pages/assignments/AssignmentCreate';
import AssignmentDetail from './pages/assignments/AssignmentDetail';

function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
    <PWAInstallPrompt />
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />

        {/* Attendance */}
        <Route path="/attendance" element={<AttendanceList />} />
        <Route
          path="/attendance/record"
          element={
            <ProtectedRoute roles={['admin', 'teacher']}>
              <RecordAttendance />
            </ProtectedRoute>
          }
        />

        {/* Quizzes */}
        <Route path="/quizzes" element={<QuizList />} />
        <Route
          path="/quizzes/create"
          element={
            <ProtectedRoute roles={['admin', 'teacher']}>
              <QuizCreate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quizzes/:id/take"
          element={
            <ProtectedRoute roles={['student']}>
              <QuizTake />
            </ProtectedRoute>
          }
        />
        <Route path="/quizzes/:id/results" element={<QuizResults />} />

        {/* Assignments */}
        <Route path="/assignments" element={<AssignmentList />} />
        <Route
          path="/assignments/create"
          element={
            <ProtectedRoute roles={['admin', 'teacher']}>
              <AssignmentCreate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assignments/:id/edit"
          element={
            <ProtectedRoute roles={['admin', 'teacher']}>
              <AssignmentCreate />
            </ProtectedRoute>
          }
        />
        <Route path="/assignments/:id" element={<AssignmentDetail />} />

        {/* Classes */}
        <Route path="/classes" element={<ClassList />} />
        <Route path="/classes/:id" element={<ClassDetail />} />

        {/* Users */}
        <Route
          path="/users"
          element={
            <ProtectedRoute roles={['admin']}>
              <UserList />
            </ProtectedRoute>
          }
        />
        <Route path="/teachers" element={<TeacherList />} />
        <Route
          path="/students"
          element={
            <ProtectedRoute roles={['admin', 'teacher']}>
              <StudentList />
            </ProtectedRoute>
          }
        />

        {/* Subjects */}
        <Route
          path="/subjects"
          element={
            <ProtectedRoute roles={['admin']}>
              <SubjectList />
            </ProtectedRoute>
          }
        />

        {/* Library */}
        <Route path="/library" element={<Library />} />

        {/* Activity Log */}
        <Route
          path="/activity-log"
          element={
            <ProtectedRoute roles={['admin']}>
              <ActivityLog />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </>
  );
}

export default App;
