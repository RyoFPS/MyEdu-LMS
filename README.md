# 🎓 Chikabu LMS - Learning Management System

A modern, full-featured **Learning Management System** built for **School Chikabu**. Powered by **Laravel 11** (Backend API) and **React + TypeScript** (Frontend SPA).

---

## ✨ Features

### 🔐 Authentication & Roles
- **3 user roles**: Admin, Teacher, Student
- Token-based authentication via **Laravel Sanctum**
- Role-based access control across all endpoints

### 📋 Attendance Management
- Teachers can record attendance for their classes
- Bulk attendance recording for efficiency
- Students can view their own attendance history
- Attendance statistics and summaries
- Status types: `Present`, `Absent`, `Late`, `Excused`

### 📝 Quiz System
- Teachers can create quizzes with multiple-choice questions
- Timed quizzes with countdown timer
- Students can take quizzes and view results instantly
- Auto-grading system
- Quiz analytics for teachers

### 🏫 Class Management
- Admin can create and manage classes
- Assign teachers and students to classes
- View class details with enrolled students and teachers

### 👥 User Management
- Admin can manage all users (full CRUD)
- Students can view all teachers
- Teachers can view students by class

### 📊 Dashboard
- Role-specific dashboards with relevant statistics
- Quick actions and recent activity overview

---

## 🛠️ Tech Stack

### Backend
| Technology | Description |
|---|---|
| **Laravel 11** | PHP Framework |
| **Laravel Sanctum** | Token-based Authentication |
| **MySQL** | Relational Database |
| **RESTful JSON API** | API Architecture |

### Frontend
| Technology | Description |
|---|---|
| **React 18** | UI Library |
| **TypeScript** | Type Safety |
| **Vite** | Build Tool & Dev Server |
| **Tailwind CSS v3** | Utility-first Styling |
| **shadcn/ui-style** | Custom UI Components |
| **Zustand** | State Management |
| **Axios** | HTTP Client |
| **Lucide React** | Icon Library |
| **React Router v6** | Client-side Routing |

---

## 📁 Project Structure

```
Chikabu-LMS/
├── backend/                    # Laravel API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/
│   │   │   ├── Middleware/
│   │   │   ├── Requests/
│   │   │   └── Resources/
│   │   └── Models/
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── routes/
│   └── config/
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   └── layout/
│   │   ├── pages/
│   │   ├── stores/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── types/
│   └── public/
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **PHP** 8.2+
- **Composer**
- **Node.js** 18+
- **npm** or **yarn**
- **MySQL** 8.0+

---

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Copy environment file
cp .env.example .env

# Install PHP dependencies
composer install

# Generate application key
php artisan key:generate

# Create a MySQL database named 'chikabu_lms', then run:
php artisan migrate
php artisan db:seed

# Start the development server
php artisan serve
# ✅ Backend runs at http://localhost:8000
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Copy environment file
cp .env.example .env

# Install Node.js dependencies
npm install

# Start the development server
npm run dev
# ✅ Frontend runs at http://localhost:5173
```

---

## 🔑 Default Login Credentials

| Role | Email | Password |
|---------|-------------------------------|----------|
| Admin | `admin@chikabu.sch.id` | password |
| Teacher | `budi@chikabu.sch.id` | password |
| Teacher | `siti@chikabu.sch.id` | password |
| Student | `andi.wijaya@chikabu.sch.id` | password |

> ⚠️ **Note:** These credentials are seeded for development purposes. Change them in production.

---

## 📡 API Endpoints

All API endpoints are prefixed with `/api` and require authentication unless stated otherwise.

### Authentication

| Method | Endpoint | Description |
|--------|----------------|---------------------|
| `POST` | `/api/login` | Login |
| `POST` | `/api/logout` | Logout |
| `GET` | `/api/me` | Get current user |
| `PUT` | `/api/profile` | Update profile |

### Dashboard

| Method | Endpoint | Description |
|--------|------------------|--------------------------|
| `GET` | `/api/dashboard` | Role-specific dashboard |

### Users

| Method | Endpoint | Description |
|----------|-------------------|----------------------|
| `GET` | `/api/users` | List users |
| `POST` | `/api/users` | Create user (Admin) |
| `GET` | `/api/users/{id}` | Show user |
| `PUT` | `/api/users/{id}` | Update user (Admin) |
| `DELETE` | `/api/users/{id}` | Delete user (Admin) |
| `GET` | `/api/teachers` | List teachers |
| `GET` | `/api/students` | List students |

### Classes

| Method | Endpoint | Description |
|----------|------------------------------------------------------|-----------------|
| `GET` | `/api/classes` | List classes |
| `POST` | `/api/classes` | Create class (Admin) |
| `GET` | `/api/classes/{id}` | Show class |
| `PUT` | `/api/classes/{id}` | Update class (Admin) |
| `DELETE` | `/api/classes/{id}` | Delete class (Admin) |
| `POST` | `/api/classes/{id}/assign-teacher` | Assign teacher |
| `POST` | `/api/classes/{id}/assign-student` | Assign student |
| `DELETE` | `/api/classes/{id}/remove-teacher/{teacherId}` | Remove teacher |
| `DELETE` | `/api/classes/{id}/remove-student/{studentId}` | Remove student |

### Attendance

| Method | Endpoint | Description |
|--------|------------------------------|----------------------|
| `GET` | `/api/attendances` | List attendance |
| `POST` | `/api/attendances` | Record attendance |
| `POST` | `/api/attendances/bulk` | Bulk record |
| `GET` | `/api/attendances/summary` | Summary stats |
| `GET` | `/api/attendances/{id}` | Show attendance |

### Quizzes

| Method | Endpoint | Description |
|----------|------------------------------|---------------------------|
| `GET` | `/api/quizzes` | List quizzes |
| `POST` | `/api/quizzes` | Create quiz (Teacher) |
| `GET` | `/api/quizzes/{id}` | Show quiz |
| `PUT` | `/api/quizzes/{id}` | Update quiz (Teacher) |
| `DELETE` | `/api/quizzes/{id}` | Delete quiz (Teacher) |
| `POST` | `/api/quizzes/{id}/start` | Start attempt (Student) |
| `POST` | `/api/quizzes/{id}/submit` | Submit answers (Student) |
| `GET` | `/api/quizzes/{id}/results` | View results |

---

## 🎨 Screenshots

> 📸 *Add screenshots here after running the project.*

---

## 📄 License

This project is built for **School Chikabu**.

---

## 👨‍💻 Built With ❤️

Powered by **enowX Labs** AI Infrastructure.
