<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\ClassRoom;
use Carbon\Carbon;

class Assignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'class_id',
        'subject_id',
        'teacher_id',
        'due_date',
        'max_score',
        'allow_late_submission',
        'allow_resubmission',
        'file_path',
        'file_name',
        'is_published',
    ];

    protected $casts = [
        'due_date' => 'datetime',
        'is_published' => 'boolean',
        'allow_late_submission' => 'boolean',
        'allow_resubmission' => 'boolean',
    ];

    protected $appends = [
        'is_overdue',
        'days_until_due',
        'submission_count',
        'graded_count',
    ];

    /**
     * Get the class that owns the assignment.
     */
    public function classRoom(): BelongsTo
    {
        return $this->belongsTo(ClassRoom::class, 'class_id');
    }

    /**
     * Get the subject that owns the assignment.
     */
    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * Get the teacher that owns the assignment.
     */
    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    /**
     * Get the submissions for the assignment.
     */
    public function submissions(): HasMany
    {
        return $this->hasMany(AssignmentSubmission::class);
    }

    /**
     * Check if the assignment is overdue.
     */
    public function isOverdue(): bool
    {
        return Carbon::now()->isAfter($this->due_date);
    }

    /**
     * Get the is_overdue attribute.
     */
    public function getIsOverdueAttribute(): bool
    {
        return $this->isOverdue();
    }

    /**
     * Get days until due date.
     */
    public function getDaysUntilDueAttribute(): int
    {
        if ($this->isOverdue()) {
            return 0;
        }
        return Carbon::now()->diffInDays($this->due_date);
    }

    /**
     * Get submission count.
     */
    public function getSubmissionCountAttribute(): int
    {
        return $this->submissions()->distinct('student_id')->count('student_id');
    }

    /**
     * Get graded submission count.
     */
    public function getGradedCountAttribute(): int
    {
        return $this->submissions()
            ->whereNotNull('score')
            ->distinct('student_id')
            ->count('student_id');
    }

    /**
     * Check if a student can submit.
     */
    public function canSubmit($student): bool
    {
        // Check if assignment is published
        if (!$this->is_published) {
            return false;
        }

        // Check if overdue and late submission not allowed
        if ($this->isOverdue() && !$this->allow_late_submission) {
            return false;
        }

        // Check if student already submitted and resubmission not allowed
        $existingSubmission = $this->submissions()
            ->where('student_id', $student->id)
            ->exists();

        if ($existingSubmission && !$this->allow_resubmission) {
            return false;
        }

        return true;
    }
}
