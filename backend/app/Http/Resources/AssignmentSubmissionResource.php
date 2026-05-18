<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssignmentSubmissionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'assignment' => [
                'id' => $this->assignment->id,
                'title' => $this->assignment->title,
            ],
            'student' => [
                'id' => $this->student->id,
                'name' => $this->student->name,
                'email' => $this->student->email,
            ],
            'file_name' => $this->file_name,
            'file_size' => $this->file_size,
            'formatted_file_size' => $this->formatted_file_size,
            'submitted_at' => $this->submitted_at->toISOString(),
            'is_late' => $this->is_late,
            'score' => $this->score,
            'feedback' => $this->feedback,
            'graded_at' => $this->graded_at?->toISOString(),
            'graded_by' => $this->gradedBy ? [
                'id' => $this->gradedBy->id,
                'name' => $this->gradedBy->name,
            ] : null,
            'version' => $this->version,
            'is_graded' => $this->is_graded,
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
