import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import api from '../lib/axios';
import type {
  DashboardStats,
  ClassRoom,
  User,
  Subject,
  Quiz,
  Attendance,
  SubjectMatter,
  PaginatedResponse,
  ApiResponse,
  ActivityItem,
} from '../types';

// ============================================================================
// DASHBOARD HOOKS
// ============================================================================

/**
 * Fetches dashboard statistics and overview data
 * Cache duration: 1 minute - Dashboard data changes frequently
 */
export const useDashboard = (options?: Omit<UseQueryOptions<DashboardStats>, 'queryKey' | 'queryFn'>) =>
  useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((res) => res.data.data),
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });

// ============================================================================
// CLASS HOOKS
// ============================================================================

/**
 * Fetches paginated list of classes with optional filters
 * Cache duration: 5 minutes - Class list doesn't change very often
 * @param params - Query parameters for filtering and pagination
 */
export const useClasses = (
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<PaginatedResponse<ClassRoom>>, 'queryKey' | 'queryFn'>
) =>
  useQuery<PaginatedResponse<ClassRoom>>({
    queryKey: ['classes', params],
    queryFn: () => api.get('/classes', { params }).then((res) => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });

/**
 * Fetches a single class by ID with full details
 * Cache duration: 5 minutes - Individual class data is relatively stable
 * @param id - Class ID
 */
export const useClass = (
  id: string | number,
  options?: Omit<UseQueryOptions<ClassRoom>, 'queryKey' | 'queryFn'>
) =>
  useQuery<ClassRoom>({
    queryKey: ['classes', id],
    queryFn: () => api.get(`/classes/${id}`).then((res) => res.data.data),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });

/**
 * Fetches available grade levels for class creation/filtering
 * Cache duration: 30 minutes - Grade levels rarely change
 */
export const useGradeLevels = (options?: Omit<UseQueryOptions<string[]>, 'queryKey' | 'queryFn'>) =>
  useQuery<string[]>({
    queryKey: ['grade-levels'],
    queryFn: () => api.get('/classes/grade-levels').then((res) => res.data.data),
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });

/**
 * Fetches students enrolled in a specific class
 * Cache duration: 5 minutes - Student enrollment is relatively stable
 * @param classId - Class ID
 */
export const useClassStudents = (
  classId: string | number,
  options?: Omit<UseQueryOptions<User[]>, 'queryKey' | 'queryFn'>
) =>
  useQuery<User[]>({
    queryKey: ['classes', classId, 'students'],
    queryFn: () => api.get(`/classes/${classId}/students`).then((res) => res.data.data),
    enabled: !!classId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });

/**
 * Fetches teachers assigned to a specific class
 * Cache duration: 5 minutes - Teacher assignments are relatively stable
 * @param classId - Class ID
 */
export const useClassTeachers = (
  classId: string | number,
  options?: Omit<UseQueryOptions<User[]>, 'queryKey' | 'queryFn'>
) =>
  useQuery<User[]>({
    queryKey: ['classes', classId, 'teachers'],
    queryFn: () => api.get(`/classes/${classId}/teachers`).then((res) => res.data.data),
    enabled: !!classId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });

// ============================================================================
// USER HOOKS
// ============================================================================

/**
 * Fetches paginated list of all users with optional filters
 * Cache duration: 5 minutes - User list changes moderately
 * @param params - Query parameters for filtering and pagination
 */
export const useUsers = (
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<PaginatedResponse<User>>, 'queryKey' | 'queryFn'>
) =>
  useQuery<PaginatedResponse<User>>({
    queryKey: ['users', params],
    queryFn: () => api.get('/users', { params }).then((res) => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });

/**
 * Fetches a single user by ID
 * Cache duration: 5 minutes - Individual user data is relatively stable
 * @param id - User ID
 */
export const useUser = (
  id: string | number,
  options?: Omit<UseQueryOptions<User>, 'queryKey' | 'queryFn'>
) =>
  useQuery<User>({
    queryKey: ['users', id],
    queryFn: () => api.get(`/users/${id}`).then((res) => res.data.data),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });

/**
 * Fetches paginated list of teachers with optional filters
 * Cache duration: 5 minutes - Teacher list changes moderately
 * @param params - Query parameters for filtering and pagination
 */
export const useTeachers = (
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<PaginatedResponse<User>>, 'queryKey' | 'queryFn'>
) =>
  useQuery<PaginatedResponse<User>>({
    queryKey: ['teachers', params],
    queryFn: () => api.get('/teachers', { params }).then((res) => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });

/**
 * Fetches paginated list of students with optional filters
 * Cache duration: 5 minutes - Student list changes moderately
 * @param params - Query parameters for filtering and pagination
 */
export const useStudents = (
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<PaginatedResponse<User>>, 'queryKey' | 'queryFn'>
) =>
  useQuery<PaginatedResponse<User>>({
    queryKey: ['students', params],
    queryFn: () => api.get('/students', { params }).then((res) => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });

// ============================================================================
// SUBJECT HOOKS
// ============================================================================

/**
 * Fetches list of subjects with optional filters
 * Cache duration: 30 minutes - Subjects rarely change
 * @param params - Query parameters for filtering
 */
export const useSubjects = (
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<Subject[]>, 'queryKey' | 'queryFn'>
) =>
  useQuery<Subject[]>({
    queryKey: ['subjects', params],
    queryFn: () => api.get('/subjects', { params }).then((res) => res.data.data),
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });

/**
 * Fetches a single subject by ID
 * Cache duration: 30 minutes - Individual subject data rarely changes
 * @param id - Subject ID
 */
export const useSubject = (
  id: string | number,
  options?: Omit<UseQueryOptions<Subject>, 'queryKey' | 'queryFn'>
) =>
  useQuery<Subject>({
    queryKey: ['subjects', id],
    queryFn: () => api.get(`/subjects/${id}`).then((res) => res.data.data),
    enabled: !!id,
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });

/**
 * Fetches available subject categories
 * Cache duration: 30 minutes - Categories rarely change
 */
export const useSubjectCategories = (options?: Omit<UseQueryOptions<string[]>, 'queryKey' | 'queryFn'>) =>
  useQuery<string[]>({
    queryKey: ['subject-categories'],
    queryFn: () => api.get('/subjects/categories').then((res) => res.data.data),
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });

// ============================================================================
// QUIZ HOOKS
// ============================================================================

/**
 * Fetches paginated list of quizzes with optional filters
 * Cache duration: 2 minutes - Quiz list changes frequently (active status, etc.)
 * @param params - Query parameters for filtering and pagination
 */
export const useQuizzes = (
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<PaginatedResponse<Quiz>>, 'queryKey' | 'queryFn'>
) =>
  useQuery<PaginatedResponse<Quiz>>({
    queryKey: ['quizzes', params],
    queryFn: () => api.get('/quizzes', { params }).then((res) => res.data),
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });

/**
 * Fetches a single quiz by ID with full details including questions
 * Cache duration: 2 minutes - Quiz details may change (active status, questions)
 * @param id - Quiz ID
 */
export const useQuiz = (
  id: string | number,
  options?: Omit<UseQueryOptions<Quiz>, 'queryKey' | 'queryFn'>
) =>
  useQuery<Quiz>({
    queryKey: ['quizzes', id],
    queryFn: () => api.get(`/quizzes/${id}`).then((res) => res.data.data),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });

/**
 * Fetches quiz attempts for a specific quiz
 * Cache duration: 1 minute - Attempts change frequently as students submit
 * @param quizId - Quiz ID
 */
export const useQuizAttempts = (
  quizId: string | number,
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<PaginatedResponse<any>>, 'queryKey' | 'queryFn'>
) =>
  useQuery<PaginatedResponse<any>>({
    queryKey: ['quizzes', quizId, 'attempts', params],
    queryFn: () => api.get(`/quizzes/${quizId}/attempts`, { params }).then((res) => res.data),
    enabled: !!quizId,
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });

/**
 * Fetches student's own quiz attempts
 * Cache duration: 1 minute - Student attempts update frequently
 * @param params - Query parameters for filtering
 */
export const useMyQuizAttempts = (
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<PaginatedResponse<any>>, 'queryKey' | 'queryFn'>
) =>
  useQuery<PaginatedResponse<any>>({
    queryKey: ['my-quiz-attempts', params],
    queryFn: () => api.get('/my-quiz-attempts', { params }).then((res) => res.data),
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });

// ============================================================================
// ATTENDANCE HOOKS
// ============================================================================

/**
 * Fetches paginated list of attendance records with optional filters
 * Cache duration: 1 minute - Attendance data changes frequently throughout the day
 * @param params - Query parameters for filtering (date, class_id, user_id, etc.)
 */
export const useAttendances = (
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<PaginatedResponse<Attendance>>, 'queryKey' | 'queryFn'>
) =>
  useQuery<PaginatedResponse<Attendance>>({
    queryKey: ['attendances', params],
    queryFn: () => api.get('/attendances', { params }).then((res) => res.data),
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });

/**
 * Fetches attendance statistics for a specific class
 * Cache duration: 2 minutes - Stats update less frequently than individual records
 * @param classId - Class ID
 * @param params - Query parameters (date range, etc.)
 */
export const useClassAttendanceStats = (
  classId: string | number,
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) =>
  useQuery<any>({
    queryKey: ['classes', classId, 'attendance-stats', params],
    queryFn: () => api.get(`/classes/${classId}/attendance-stats`, { params }).then((res) => res.data.data),
    enabled: !!classId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });

/**
 * Fetches student's own attendance records
 * Cache duration: 1 minute - Personal attendance updates frequently
 * @param params - Query parameters for filtering
 */
export const useMyAttendance = (
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<PaginatedResponse<Attendance>>, 'queryKey' | 'queryFn'>
) =>
  useQuery<PaginatedResponse<Attendance>>({
    queryKey: ['my-attendance', params],
    queryFn: () => api.get('/my-attendance', { params }).then((res) => res.data),
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });

// ============================================================================
// LIBRARY / SUBJECT MATTER HOOKS
// ============================================================================

/**
 * Fetches paginated list of library materials (subject matters) with optional filters
 * Cache duration: 10 minutes - Library content doesn't change very frequently
 * @param params - Query parameters for filtering (subject_id, class_id, type, etc.)
 */
export const useLibrary = (
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<PaginatedResponse<SubjectMatter>>, 'queryKey' | 'queryFn'>
) =>
  useQuery<PaginatedResponse<SubjectMatter>>({
    queryKey: ['library', params],
    queryFn: () => api.get('/library', { params }).then((res) => res.data),
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });

/**
 * Fetches a single library material by ID
 * Cache duration: 10 minutes - Individual materials rarely change
 * @param id - Subject matter ID
 */
export const useLibraryItem = (
  id: string | number,
  options?: Omit<UseQueryOptions<SubjectMatter>, 'queryKey' | 'queryFn'>
) =>
  useQuery<SubjectMatter>({
    queryKey: ['library', id],
    queryFn: () => api.get(`/library/${id}`).then((res) => res.data.data),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });

/**
 * Fetches subject matters for a specific subject
 * Cache duration: 10 minutes - Subject materials are relatively stable
 * @param subjectId - Subject ID
 */
export const useSubjectMatters = (
  subjectId: string | number,
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<PaginatedResponse<SubjectMatter>>, 'queryKey' | 'queryFn'>
) =>
  useQuery<PaginatedResponse<SubjectMatter>>({
    queryKey: ['subjects', subjectId, 'matters', params],
    queryFn: () => api.get(`/subjects/${subjectId}/matters`, { params }).then((res) => res.data),
    enabled: !!subjectId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });

// ============================================================================
// NOTIFICATION HOOKS
// ============================================================================

/**
 * Fetches user notifications with auto-refresh
 * Cache duration: 30 seconds - Notifications need to be fresh
 * Auto-refetch: Every 30 seconds to keep notifications up-to-date
 */
export const useNotifications = (
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<PaginatedResponse<any>>, 'queryKey' | 'queryFn'>
) =>
  useQuery<PaginatedResponse<any>>({
    queryKey: ['notifications', params],
    queryFn: () => api.get('/notifications', { params }).then((res) => res.data),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    ...options,
  });

/**
 * Fetches count of unread notifications
 * Cache duration: 30 seconds - Unread count needs to be fresh
 * Auto-refetch: Every 30 seconds
 */
export const useUnreadNotificationsCount = (
  options?: Omit<UseQueryOptions<{ count: number }>, 'queryKey' | 'queryFn'>
) =>
  useQuery<{ count: number }>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get('/notifications/unread-count').then((res) => res.data.data),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    ...options,
  });

// ============================================================================
// ACTIVITY LOG HOOKS
// ============================================================================

/**
 * Fetches paginated activity logs with optional filters
 * Cache duration: 1 minute - Activity logs update frequently
 * @param params - Query parameters for filtering (user_id, type, date range, etc.)
 */
export const useActivityLogs = (
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<PaginatedResponse<ActivityItem>>, 'queryKey' | 'queryFn'>
) =>
  useQuery<PaginatedResponse<ActivityItem>>({
    queryKey: ['activity-logs', params],
    queryFn: () => api.get('/activity-logs', { params }).then((res) => res.data),
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });

/**
 * Fetches recent activity for dashboard display
 * Cache duration: 1 minute - Recent activity should be fresh
 * @param limit - Number of recent activities to fetch
 */
export const useRecentActivity = (
  limit: number = 10,
  options?: Omit<UseQueryOptions<ActivityItem[]>, 'queryKey' | 'queryFn'>
) =>
  useQuery<ActivityItem[]>({
    queryKey: ['recent-activity', limit],
    queryFn: () => api.get('/activity-logs/recent', { params: { limit } }).then((res) => res.data.data),
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });

// ============================================================================
// STATISTICS & REPORTS HOOKS
// ============================================================================

/**
 * Fetches overall system statistics for admin dashboard
 * Cache duration: 5 minutes - System stats don't change rapidly
 */
export const useSystemStats = (options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>) =>
  useQuery<any>({
    queryKey: ['system-stats'],
    queryFn: () => api.get('/stats/system').then((res) => res.data.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });

/**
 * Fetches class performance statistics
 * Cache duration: 5 minutes - Performance stats are calculated periodically
 * @param classId - Class ID
 * @param params - Query parameters (date range, subject, etc.)
 */
export const useClassPerformance = (
  classId: string | number,
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) =>
  useQuery<any>({
    queryKey: ['classes', classId, 'performance', params],
    queryFn: () => api.get(`/classes/${classId}/performance`, { params }).then((res) => res.data.data),
    enabled: !!classId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });

/**
 * Fetches student performance report
 * Cache duration: 5 minutes - Student performance updates periodically
 * @param studentId - Student ID
 * @param params - Query parameters (date range, subject, etc.)
 */
export const useStudentPerformance = (
  studentId: string | number,
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) =>
  useQuery<any>({
    queryKey: ['students', studentId, 'performance', params],
    queryFn: () => api.get(`/students/${studentId}/performance`, { params }).then((res) => res.data.data),
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });

// ============================================================================
// PROFILE HOOKS
// ============================================================================

/**
 * Fetches current user's profile
 * Cache duration: 5 minutes - Profile data is relatively stable
 */
export const useProfile = (options?: Omit<UseQueryOptions<User>, 'queryKey' | 'queryFn'>) =>
  useQuery<User>({
    queryKey: ['profile'],
    queryFn: () => api.get('/profile').then((res) => res.data.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });

/**
 * Fetches current user's classes (for teachers and students)
 * Cache duration: 5 minutes - User's class list is relatively stable
 */
export const useMyClasses = (
  params?: Record<string, any>,
  options?: Omit<UseQueryOptions<ClassRoom[]>, 'queryKey' | 'queryFn'>
) =>
  useQuery<ClassRoom[]>({
    queryKey: ['my-classes', params],
    queryFn: () => api.get('/my-classes', { params }).then((res) => res.data.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
