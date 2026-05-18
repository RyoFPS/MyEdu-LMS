<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssignmentSubmission extends Model
{
    use HasFactory;

    protected $fillable = [
        'assignment_id',
        'student_id',
        'file_path',
        'file_name',
        'file_size',
        'submitted_at',
        'is_late',
        'score',
        'feedback',
        'graded_at',
        'graded_by',
        'version',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'graded_at' => 'datetime',
        'is_late' => 'boolean',
    ];

    protected $appends = [
        'formatted_file_size',
        'is_graded',
    ];

    /**
     * Get the assignment that owns the submission.
     */
    public function assignment(): BelongsTo
    {
        return $this->belongsTo(Assignment::class);
    }

    /**
     * Get the student that owns the submission.
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * Get the user who graded the submission.
     */
    public function gradedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'graded_by');
    }

    /**
     * Format file size to human readable format.
     */
    public function formattedFileSize(): string
    {
        $bytes = $this->file_size;
        $units = ['B', 'KB', 'MB', 'GB'];
        
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, 2) . ' ' . $units[$i];
    }

    /**
     * Get the formatted_file_size attribute.
     */
    public function getFormattedFileSizeAttribute(): string
    {
        return $this->formattedFileSize();
    }

    /**
     * Check if submission is graded.
     */
    public function isGraded(): bool
    {
        return !is_null($this->score);
    }

    /**
     * Get the is_graded attribute.
     */
    public function getIsGradedAttribute(): bool
    {
        return $this->isGraded();
    }
}
