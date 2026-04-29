import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

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

function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
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
      </Route>

      {/* Redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
