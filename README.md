# 🎓 MyEdu LMS

A modern, full-stack **Learning Management System** built for schools and educational institutions. MyEdu LMS supports three roles — Admin, Teacher, and Student — with a rich feature set including quizzes, attendance tracking, class materials, a curriculum library, real-time notifications, and a full audit trail.

---

## ✨ Features

### 🔐 Authentication & User Management
- Token-based authentication via **Laravel Sanctum**
- Three roles: **Admin**, **Teacher**, **Student**
- Profile management with photo upload (JPG/PNG/WEBP, max 2MB)
- Password change from profile page
- Multi-language support: 🇬🇧 English, 🇮🇩 Bahasa Indonesia, 🇨🇳 中文

### 📊 Role-Specific Dashboards
- **Student**: Today's attendance status, class info, available quizzes, new materials, upcoming deadlines, recent quiz scores, and a "Mark Present" self-attendance button
- **Teacher**: Class attendance status per class with "Record Now" button, active quizzes, recent student submissions, and new materials
- **Admin**: System overview, platform statistics, today's materials, and quick action shortcuts

### 👥 User Management *(Admin)*
- Full CRUD for users across all roles
- Filter by role, subject, and joined date
- Teacher subject assignment with multi-select (includes "Other/Versatile" option)
- Profile photo display with clickable preview

### 🏫 Class Management
- Admin creates, edits, and deletes classes with a grade-level picker (chips + free text)
- Grade level filter on class list
- Assign/remove teachers and students per class
- Students are restricted to one class at a time
- Class detail view with tabs: **Students**, **Teachers**, **Attendance**, **Quizzes**, **Materials**

### 📚 Subject Management *(Admin)*
- Full CRUD for subjects with category grouping
- Category chips for quick selection
- Subjects grouped by category in all dropdowns

### 🗂️ Library *(Core Curriculum)*
- Admin uploads global curriculum materials by grade level and subject
- All users can browse and download materials
- Filter by grade level and subject
- In-browser preview for PDF, images, and videos

### 📄 Class Materials *(Supplementary)*
- Teachers and admins upload supplementary materials per class
- Students in the class can view, preview, and download
- In-browser preview: PDF iframe, image viewer, video player
- Debounced search

### 📋 Attendance
- Teachers record bulk attendance for their class (students + themselves)
- Admin records attendance for all members (teachers + students)
- Students can mark themselves present from the dashboard (self-attendance)
- Export attendance as CSV with date range filter
- Status types: **Present**, **Absent**, **Late**, **Excused** (color-coded radio buttons)
- Attendance history and statistics

### 📝 Quiz System
- Teachers create quizzes with multiple-choice questions (drag-to-reorder)
- Subject assignment on quizzes
- Timed quizzes with countdown timer
- Auto-expire when deadline passes (`is_expired` flag)
- Students take quizzes and view results instantly
- Auto-grading with instant score display
- Quiz analytics for teachers: average, highest, and lowest scores
- Export quiz results as CSV
- Configurable max attempts: 1, unlimited, or custom number

### 🔔 Notifications
- Real-time notification bell with unread count badge
- Auto-refresh every 30 seconds
- Triggered by: new quiz, quiz submitted, attendance recorded, new material, added to class
- Mark single or all notifications as read
- Multi-language notification messages
- 90-day retention policy

### 🕵️ Activity Log *(Admin)*
- Full audit trail of all platform actions
- Logs: user CRUD, class CRUD, quiz CRUD, attendance recording, material uploads, subject CRUD, login/logout
- Filter by action type, target type, user, and date range
- Export as CSV
- Color-coded timeline view
- Stats: today, this week, total (90-day window)

### 🌐 Multi-Language (i18n)
- Three languages: 🇬🇧 English, 🇮🇩 Bahasa Indonesia, 🇨🇳 中文
- Language switcher (globe icon) in the header
- Persisted to `localStorage`
- All pages fully translated

### 📱 Mobile Responsive
- Fully responsive on mobile and desktop
- Scrollable tabs on mobile
- Responsive tables with columns hidden on small screens
- Mobile-friendly dialogs and forms
- Network access support over the same WiFi LAN

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend Framework** | Laravel 11 |
| **PHP Version** | PHP 8.2+ |
| **Database** | MySQL 8.0+ |
| **Authentication** | Laravel Sanctum |
| **Frontend Framework** | React 18 + TypeScript |
| **Build Tool** | Vite 5 |
| **Styling** | Tailwind CSS v3 |
| **State Management** | Zustand |
| **HTTP Client** | Axios |
| **Routing** | React Router v6 |
| **Icons** | Lucide React |
| **Notifications (UI)** | react-hot-toast |

---

## 📁 Project Structure

```
MyEdu-LMS/
├── backend/                    # Laravel 11 API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/    # API controllers
│   │   │   ├── Middleware/     # Auth & role middleware
│   │   │   ├── Requests/       # Form request validation
│   │   │   └── Resources/      # API resource transformers
│   │   ├── Models/             # Eloquent models
│   │   └── Providers/          # Service providers
│   ├── database/
│   │   ├── migrations/         # Database schema
│   │   └── seeders/            # Demo data seeders
│   ├── routes/
│   │   └── api.php             # API route definitions
│   └── storage/
│       └── app/public/         # Uploaded files (avatars, materials)
│
└── frontend/                   # React + TypeScript SPA
    └── src/
        ├── components/         # Reusable UI components
        ├── hooks/              # Custom React hooks
        ├── i18n/               # Translation files (en, id, zh)
        ├── lib/                # Axios instance & utilities
        ├── pages/              # Page components by feature
        │   ├── admin/          # Activity logs
        │   ├── attendance/     # Attendance pages
        │   ├── classes/        # Class management
        │   ├── library/        # Curriculum library
        │   ├── quiz/           # Quiz pages
        │   ├── subjects/       # Subject management
        │   └── users/          # User management
        ├── stores/             # Zustand state stores
        └── types/              # TypeScript type definitions
```

---

## 🚀 Getting Started

### Prerequisites

- PHP 8.2+
- Composer 2.x
- Node.js 18+ and npm
- MySQL 8.0+

### Backend Setup

```bash
cd backend

# Install PHP dependencies
composer install

# Copy environment file and configure your database credentials
cp .env.example .env

# Generate application key
php artisan key:generate

# Run database migrations
php artisan migrate

# Seed demo data (users, classes, subjects, etc.)
php artisan db:seed

# Create the storage symlink for file uploads
php artisan storage:link

# Start the development server
php artisan serve
```

The API will be available at `http://localhost:8000`.

### Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Copy environment file and set the API base URL
cp .env.example .env

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

---

## 📡 Network Access (Mobile / Same WiFi)

To access the app from other devices on the same WiFi network:

**Backend:**
```bash
php artisan serve --host=0.0.0.0 --port=8000
```

**Frontend:**
```bash
npm run dev -- --host
```

Then update `frontend/.env` to point `VITE_API_URL` to your machine's local IP address (e.g., `http://192.168.1.x:8000`).

---

## 🔑 Default Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | admin@myedu.sch.id | password |
| **Teacher** | budi@myedu.sch.id | password |
| **Teacher** | siti@myedu.sch.id | password |
| **Student** | andi.wijaya@myedu.sch.id | password |

> ⚠️ Change these credentials before deploying to any production environment.

---

## 📖 API Reference

All endpoints are prefixed with `/api` and require a Bearer token (except `/login`).

### 🔐 Authentication

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/login` | Authenticate and receive token |
| `POST` | `/logout` | Revoke current token |
| `GET` | `/me` | Get authenticated user |
| `PUT` | `/profile` | Update profile info |
| `POST` | `/profile/avatar` | Upload profile photo |
| `DELETE` | `/profile/avatar` | Remove profile photo |

### 📊 Dashboard

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/dashboard` | Role-specific dashboard data |

### 👥 Users

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/users` | List all users (filterable) |
| `POST` | `/users` | Create a new user |
| `GET` | `/users/{id}` | Get a specific user |
| `PUT` | `/users/{id}` | Update a user |
| `DELETE` | `/users/{id}` | Delete a user |
| `GET` | `/teachers` | List all teachers |
| `GET` | `/students` | List all students |

### 🏫 Classes

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/classes` | List all classes |
| `POST` | `/classes` | Create a class |
| `GET` | `/classes/{id}` | Get class details |
| `PUT` | `/classes/{id}` | Update a class |
| `DELETE` | `/classes/{id}` | Delete a class |
| `GET` | `/classes/grade-levels` | List available grade levels |
| `POST` | `/classes/{id}/assign-teacher` | Assign a teacher to a class |
| `POST` | `/classes/{id}/assign-student` | Assign a student to a class |
| `DELETE` | `/classes/{id}/remove-teacher/{teacherId}` | Remove a teacher from a class |
| `DELETE` | `/classes/{id}/remove-student/{studentId}` | Remove a student from a class |

### 📚 Subjects

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/subjects` | List all subjects |
| `POST` | `/subjects` | Create a subject |
| `GET` | `/subjects/{id}` | Get a subject |
| `PUT` | `/subjects/{id}` | Update a subject |
| `DELETE` | `/subjects/{id}` | Delete a subject |
| `GET` | `/subjects/categories` | List subject categories |

### 🗂️ Library

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/library` | List library materials |
| `POST` | `/library` | Upload a library material |
| `GET` | `/library/grade-levels` | List grade levels with materials |
| `POST` | `/library/{id}/update` | Update a library material |
| `DELETE` | `/library/{id}` | Delete a library material |

### 📄 Class Materials

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/classes/{classId}/subject-matters` | List materials for a class |
| `POST` | `/classes/{classId}/subject-matters` | Upload material to a class |
| `GET` | `/subject-matters/{id}` | Get a material |
| `PUT` | `/subject-matters/{id}` | Update a material |
| `DELETE` | `/subject-matters/{id}` | Delete a material |
| `GET` | `/subject-matters/{id}/download` | Download a material file |
| `GET` | `/subject-matters/{id}/preview` | Preview a material in-browser |

### 📋 Attendance

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/attendances` | List attendance records |
| `GET` | `/attendances/summary` | Attendance statistics |
| `GET` | `/attendances/export` | Export attendance as CSV |
| `POST` | `/attendances` | Record a single attendance |
| `POST` | `/attendances/bulk` | Record bulk attendance |
| `POST` | `/attendances/self` | Student self-attendance |
| `GET` | `/attendances/{id}` | Get a specific record |

### 📝 Quizzes

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/quizzes` | List quizzes |
| `POST` | `/quizzes` | Create a quiz |
| `GET` | `/quizzes/{id}` | Get quiz details |
| `PUT` | `/quizzes/{id}` | Update a quiz |
| `DELETE` | `/quizzes/{id}` | Delete a quiz |
| `GET` | `/quizzes/{id}/export` | Export quiz results as CSV |
| `POST` | `/quizzes/{id}/start` | Start a quiz attempt |
| `POST` | `/quizzes/{id}/submit` | Submit quiz answers |
| `GET` | `/quizzes/{id}/results` | Get quiz results/analytics |

### 🔔 Notifications

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/notifications` | List notifications |
| `POST` | `/notifications/read-all` | Mark all as read |
| `POST` | `/notifications/{id}/read` | Mark one as read |

### 🕵️ Activity Logs

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/activity-logs` | List activity logs (filterable) |
| `GET` | `/activity-logs/export` | Export logs as CSV |
| `GET` | `/activity-logs/stats` | Log statistics |

---

## 🔒 Permission Matrix

| Feature | Admin | Teacher | Student |
|---|:---:|:---:|:---:|
| View dashboard | ✅ | ✅ | ✅ |
| Manage users | ✅ | ❌ | ❌ |
| Manage classes | ✅ | ❌ | ❌ |
| Manage subjects | ✅ | ❌ | ❌ |
| Upload library materials | ✅ | ❌ | ❌ |
| Browse & download library | ✅ | ✅ | ✅ |
| Upload class materials | ✅ | ✅ | ❌ |
| View class materials | ✅ | ✅ | ✅ (own class) |
| Record attendance (bulk) | ✅ | ✅ (own class) | ❌ |
| Self-attendance | ❌ | ❌ | ✅ |
| Export attendance CSV | ✅ | ✅ | ❌ |
| Create & manage quizzes | ✅ | ✅ (own class) | ❌ |
| Take quizzes | ❌ | ❌ | ✅ |
| View quiz analytics | ✅ | ✅ | ❌ |
| Export quiz results CSV | ✅ | ✅ | ❌ |
| View notifications | ✅ | ✅ | ✅ |
| View activity logs | ✅ | ❌ | ❌ |
| Export activity logs CSV | ✅ | ❌ | ❌ |

---

## 📜 License

This project is licensed under the **MIT License**.

---

## 🙏 Credits

Built with ❤️ using [Laravel](https://laravel.com), [React](https://react.dev), and [Tailwind CSS](https://tailwindcss.com).
