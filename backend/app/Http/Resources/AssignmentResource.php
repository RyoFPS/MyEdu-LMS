<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssignmentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $data = [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'class' => [
                'id' => $this->class->id,
                'name' => $this->class->name,
            ],
            'subject' => $this->subject ? [
                'id' => $this->subject->id,
                'name' => $this->subject->name,
            ] : null,
            'teacher' => [
                'id' => $this->teacher->id,
                'name' => $this->teacher->name,
            ],
            'due_date' => $this->due_date->toISOString(),
            'max_score' => $this->max_score,
            'allow_late_submission' => $this->allow_late_submission,
            'allow_resubmission' => $this->allow_resubmission,
            'file_name' => $this->file_name,
            'is_published' => $this->is_published,
            'is_overdue' => $this->is_overdue,
            'days_until_due' => $this->days_until_due,
            'submission_count' => $this->submission_count,
            'graded_count' => $this->graded_count,
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];

        // Add student's own submission if user is a student
        if ($request->user() && $request->user()->role === 'student') {
            $mySubmission = $this->submissions()
                ->where('student_id', $request->user()->id)
                ->orderBy('version', 'desc')
                ->first();
            
            $data['my_submission'] = $mySubmission 
                ? new AssignmentSubmissionResource($mySubmission)
                : null;
        }

        return $data;
    }
}
