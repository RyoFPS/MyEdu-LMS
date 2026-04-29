<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClassRoom extends Model
{
    use HasFactory;

    /**
     * The actual database table is "classes".
     */
    protected $table = 'classes';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'name',
        'grade_level',
        'academic_year',
    ];

    /* ------------------------------------------------------------------ */
    /*  Relationships                                                      */
    /* ------------------------------------------------------------------ */

    /**
     * Teachers assigned to this class.
     */
    public function teachers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'class_teacher', 'class_id', 'teacher_id')
                    ->withPivot('subject')
                    ->withTimestamps();
    }

    /**
     * Students enrolled in this class.
     */
    public function students(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'class_student', 'class_id', 'student_id')
                    ->withTimestamps();
    }

    /**
     * Attendance records for this class.
     */
    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class, 'class_id');
    }

    /**
     * Quizzes belonging to this class.
     */
    public function quizzes(): HasMany
    {
        return $this->hasMany(Quiz::class, 'class_id');
    }
}
