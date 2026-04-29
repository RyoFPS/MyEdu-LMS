<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\ClassRoom;
use App\Models\Quiz;
use App\Models\QuizAnswer;
use App\Models\QuizAttempt;
use App\Models\QuizQuestion;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database with sample data for Chikabu LMS.
     */
    public function run(): void
    {
        // ─── 1. Admin ────────────────────────────────────────────────────
        $admin = User::create([
            'name'     => 'Administrator',
            'email'    => 'admin@chikabu.sch.id',
            'password' => Hash::make('password'),
            'role'     => 'admin',
            'phone'    => '081200000001',
        ]);

        // ─── 2. Teachers (5) ────────────────────────────────────────────
        $teacherData = [
            ['name' => 'Budi Santoso',    'email' => 'budi@chikabu.sch.id',    'phone' => '081200000002'],
            ['name' => 'Siti Rahayu',     'email' => 'siti@chikabu.sch.id',    'phone' => '081200000003'],
            ['name' => 'Ahmad Fauzi',     'email' => 'ahmad@chikabu.sch.id',   'phone' => '081200000004'],
            ['name' => 'Dewi Lestari',    'email' => 'dewi@chikabu.sch.id',    'phone' => '081200000005'],
            ['name' => 'Eko Prasetyo',    'email' => 'eko@chikabu.sch.id',     'phone' => '081200000006'],
        ];

        $teachers = [];
        foreach ($teacherData as $data) {
            $teachers[] = User::create([
                'name'     => $data['name'],
                'email'    => $data['email'],
                'password' => Hash::make('password'),
                'role'     => 'teacher',
                'phone'    => $data['phone'],
            ]);
        }

        // ─── 3. Students (20) ───────────────────────────────────────────
        $studentNames = [
            'Andi Wijaya', 'Bella Putri', 'Cahya Ramadhan', 'Dina Safitri',
            'Eka Nugraha', 'Fajar Hidayat', 'Gita Permata', 'Hadi Kusuma',
            'Indah Sari', 'Joko Susanto', 'Kartika Dewi', 'Lukman Hakim',
            'Maya Anggraini', 'Naufal Rizky', 'Olivia Putri', 'Putra Pratama',
            'Qori Amelia', 'Rizal Firmansyah', 'Sinta Maharani', 'Taufik Hidayat',
        ];

        $students = [];
        foreach ($studentNames as $i => $name) {
            $emailName  = strtolower(str_replace(' ', '.', $name));
            $students[] = User::create([
                'name'     => $name,
                'email'    => "{$emailName}@chikabu.sch.id",
                'password' => Hash::make('password'),
                'role'     => 'student',
                'phone'    => '08120000' . str_pad($i + 10, 4, '0', STR_PAD_LEFT),
            ]);
        }

        // ─── 4. Subjects (3) ────────────────────────────────────────────
        $subjects = [
            Subject::create(['name' => 'Matematika',          'code' => 'MTK']),
            Subject::create(['name' => 'Bahasa Indonesia',    'code' => 'BIN']),
            Subject::create(['name' => 'Ilmu Pengetahuan Alam', 'code' => 'IPA']),
        ];

        // ─── 5. Classes (4) ─────────────────────────────────────────────
        $classData = [
            ['name' => 'Kelas 7A', 'grade_level' => '7', 'academic_year' => '2024/2025'],
            ['name' => 'Kelas 7B', 'grade_level' => '7', 'academic_year' => '2024/2025'],
            ['name' => 'Kelas 8A', 'grade_level' => '8', 'academic_year' => '2024/2025'],
            ['name' => 'Kelas 8B', 'grade_level' => '8', 'academic_year' => '2024/2025'],
        ];

        $classes = [];
        foreach ($classData as $data) {
            $classes[] = ClassRoom::create($data);
        }

        // Assign teachers to classes
        // Teacher 0 (Budi) teaches MTK in 7A and 7B
        $classes[0]->teachers()->attach($teachers[0]->id, ['subject' => 'Matematika']);
        $classes[1]->teachers()->attach($teachers[0]->id, ['subject' => 'Matematika']);

        // Teacher 1 (Siti) teaches BIN in 7A and 8A
        $classes[0]->teachers()->attach($teachers[1]->id, ['subject' => 'Bahasa Indonesia']);
        $classes[2]->teachers()->attach($teachers[1]->id, ['subject' => 'Bahasa Indonesia']);

        // Teacher 2 (Ahmad) teaches IPA in 7B and 8B
        $classes[1]->teachers()->attach($teachers[2]->id, ['subject' => 'Ilmu Pengetahuan Alam']);
        $classes[3]->teachers()->attach($teachers[2]->id, ['subject' => 'Ilmu Pengetahuan Alam']);

        // Teacher 3 (Dewi) teaches MTK in 8A and 8B
        $classes[2]->teachers()->attach($teachers[3]->id, ['subject' => 'Matematika']);
        $classes[3]->teachers()->attach($teachers[3]->id, ['subject' => 'Matematika']);

        // Teacher 4 (Eko) teaches BIN in 7B and 8B
        $classes[1]->teachers()->attach($teachers[4]->id, ['subject' => 'Bahasa Indonesia']);
        $classes[3]->teachers()->attach($teachers[4]->id, ['subject' => 'Bahasa Indonesia']);

        // Assign students to classes (5 per class)
        foreach ($classes as $i => $class) {
            $classStudents = array_slice($students, $i * 5, 5);
            foreach ($classStudents as $student) {
                $class->students()->attach($student->id);
            }
        }

        // ─── 6. Sample Attendance Records ────────────────────────────────
        $statuses = ['present', 'present', 'present', 'present', 'late', 'absent', 'excused'];
        $dates    = [
            now()->subDays(4)->toDateString(),
            now()->subDays(3)->toDateString(),
            now()->subDays(2)->toDateString(),
            now()->subDays(1)->toDateString(),
            now()->toDateString(),
        ];

        foreach ($classes as $i => $class) {
            $classStudents = array_slice($students, $i * 5, 5);
            foreach ($dates as $date) {
                foreach ($classStudents as $student) {
                    Attendance::create([
                        'user_id'  => $student->id,
                        'class_id' => $class->id,
                        'date'     => $date,
                        'status'   => $statuses[array_rand($statuses)],
                    ]);
                }
            }
        }

        // ─── 7. Sample Quizzes ───────────────────────────────────────────

        // Quiz 1: Matematika for Kelas 7A by Budi
        $quiz1 = Quiz::create([
            'title'            => 'Ulangan Harian Matematika - Bab 1',
            'description'      => 'Ulangan harian tentang bilangan bulat dan operasi dasar.',
            'class_id'         => $classes[0]->id,
            'teacher_id'       => $teachers[0]->id,
            'duration_minutes' => 45,
            'is_active'        => true,
            'start_time'       => now()->subDay(),
            'end_time'         => now()->addDays(7),
        ]);

        $quiz1Questions = [
            [
                'question'       => 'Berapakah hasil dari 15 + 27?',
                'option_a'       => '40',
                'option_b'       => '42',
                'option_c'       => '43',
                'option_d'       => '45',
                'correct_answer' => 'b',
                'points'         => 10,
            ],
            [
                'question'       => 'Berapakah hasil dari 100 - 37?',
                'option_a'       => '63',
                'option_b'       => '67',
                'option_c'       => '73',
                'option_d'       => '77',
                'correct_answer' => 'a',
                'points'         => 10,
            ],
            [
                'question'       => 'Berapakah hasil dari 8 x 12?',
                'option_a'       => '86',
                'option_b'       => '90',
                'option_c'       => '96',
                'option_d'       => '102',
                'correct_answer' => 'c',
                'points'         => 10,
            ],
            [
                'question'       => 'Berapakah hasil dari 144 / 12?',
                'option_a'       => '10',
                'option_b'       => '11',
                'option_c'       => '12',
                'option_d'       => '14',
                'correct_answer' => 'c',
                'points'         => 10,
            ],
            [
                'question'       => 'Manakah bilangan prima berikut?',
                'option_a'       => '9',
                'option_b'       => '15',
                'option_c'       => '21',
                'option_d'       => '23',
                'correct_answer' => 'd',
                'points'         => 10,
            ],
        ];

        foreach ($quiz1Questions as $q) {
            QuizQuestion::create(array_merge($q, ['quiz_id' => $quiz1->id]));
        }

        // Quiz 2: Bahasa Indonesia for Kelas 7A by Siti
        $quiz2 = Quiz::create([
            'title'            => 'Kuis Bahasa Indonesia - Teks Deskripsi',
            'description'      => 'Kuis tentang struktur dan ciri-ciri teks deskripsi.',
            'class_id'         => $classes[0]->id,
            'teacher_id'       => $teachers[1]->id,
            'duration_minutes' => 30,
            'is_active'        => true,
            'start_time'       => now()->subDay(),
            'end_time'         => now()->addDays(5),
        ]);

        $quiz2Questions = [
            [
                'question'       => 'Apa tujuan utama teks deskripsi?',
                'option_a'       => 'Menceritakan kejadian',
                'option_b'       => 'Menggambarkan suatu objek secara detail',
                'option_c'       => 'Memberikan instruksi',
                'option_d'       => 'Menyampaikan pendapat',
                'correct_answer' => 'b',
                'points'         => 10,
            ],
            [
                'question'       => 'Bagian teks deskripsi yang berisi gambaran umum disebut?',
                'option_a'       => 'Orientasi',
                'option_b'       => 'Deskripsi bagian',
                'option_c'       => 'Identifikasi',
                'option_d'       => 'Kesimpulan',
                'correct_answer' => 'c',
                'points'         => 10,
            ],
            [
                'question'       => 'Ciri kebahasaan teks deskripsi adalah menggunakan...',
                'option_a'       => 'Kata kerja aktif',
                'option_b'       => 'Kata sifat dan majas',
                'option_c'       => 'Kata hubung sebab-akibat',
                'option_d'       => 'Kata ganti orang pertama',
                'correct_answer' => 'b',
                'points'         => 10,
            ],
            [
                'question'       => 'Manakah yang termasuk contoh teks deskripsi?',
                'option_a'       => 'Resep masakan',
                'option_b'       => 'Berita koran',
                'option_c'       => 'Gambaran tentang pantai Kuta',
                'option_d'       => 'Surat lamaran kerja',
                'correct_answer' => 'c',
                'points'         => 10,
            ],
        ];

        foreach ($quiz2Questions as $q) {
            QuizQuestion::create(array_merge($q, ['quiz_id' => $quiz2->id]));
        }

        // Create a sample quiz attempt for the first student in class 7A
        $firstStudent = $students[0];
        $quiz1Qs      = $quiz1->questions()->get();

        $attempt = QuizAttempt::create([
            'quiz_id'      => $quiz1->id,
            'student_id'   => $firstStudent->id,
            'score'        => 40,
            'total_points' => 50,
            'started_at'   => now()->subHours(2),
            'completed_at' => now()->subHours(1),
        ]);

        // Simulate answers: first 4 correct, last 1 wrong
        foreach ($quiz1Qs as $index => $question) {
            $selectedAnswer = $index < 4 ? $question->correct_answer : 'a';
            $isCorrect      = $selectedAnswer === $question->correct_answer;

            QuizAnswer::create([
                'quiz_attempt_id'  => $attempt->id,
                'quiz_question_id' => $question->id,
                'selected_answer'  => $selectedAnswer,
                'is_correct'       => $isCorrect,
            ]);
        }

        $this->command->info('Chikabu LMS database seeded successfully!');
        $this->command->info('Admin login: admin@chikabu.sch.id / password');
    }
}
