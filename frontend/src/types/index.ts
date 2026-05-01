export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  avatar?: string;
  phone?: string;
  created_at: string;
  updated_at?: string;
}

export interface ClassRoom {
  id: number;
  name: string;
  slug: string;
  grade_level: string;
  academic_year: string;
  description?: string;
  teachers?: User[];
  students?: User[];
  students_count?: number;
  teachers_count?: number;
  created_at?: string;
}

export interface Attendance {
  id: number;
  user_id: number;
  class_id: number;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  user?: User;
  class_room?: ClassRoom;
  created_at?: string;
}

export interface Quiz {
  id: number;
  title: string;
  description?: string;
  class_id: number;
  teacher_id: number;
  duration_minutes: number;
  is_active: boolean;
  max_attempts?: number;
  start_time?: string;
  end_time?: string;
  subject_id?: number;
  is_expired?: boolean;
  questions?: QuizQuestion[];
  questions_count?: number;
  class_room?: ClassRoom;
  teacher?: User;
  subject?: Subject;
  created_at?: string;
}

export interface QuizQuestion {
  id: number;
  quiz_id?: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer?: 'a' | 'b' | 'c' | 'd';
  points: number;
}

export interface QuizAttempt {
  id: number;
  quiz_id: number;
  student_id: number;
  score: number;
  total_points: number;
  started_at: string;
  completed_at?: string;
  student?: User;
  quiz?: Quiz;
  answers?: QuizAnswer[];
}

export interface QuizAnswer {
  id: number;
  quiz_attempt_id: number;
  quiz_question_id: number;
  selected_answer: string;
  is_correct: boolean;
  question?: QuizQuestion;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface DashboardStats {
  total_users?: number;
  total_classes?: number;
  total_students?: number;
  total_teachers?: number;
  today_attendance_rate?: number;
  active_quizzes?: number;
  my_classes?: number;
  my_attendance_rate?: number;
  upcoming_quizzes?: number;
  recent_scores?: number[];
  recent_activity?: ActivityItem[];
  [key: string]: unknown;
}

export interface ActivityItem {
  id: number;
  type: string;
  message: string;
  created_at: string;
}

export interface AttendanceRecord {
  user_id: number;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  category?: string;
  description?: string;
  subject_matters_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SubjectMatter {
  id: number;
  title: string;
  description?: string;
  file_name: string;
  file_size: number;
  file_size_formatted: string;
  file_type: string;
  type: 'main' | 'optional';
  grade_level?: string;
  class_id: number;
  subject_id?: number;
  uploaded_by: number;
  created_at?: string;
  updated_at?: string;
  class_room?: ClassRoom;
  subject?: Subject;
  uploader?: User;
}
