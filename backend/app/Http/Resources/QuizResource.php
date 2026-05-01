<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuizResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'title'            => $this->title,
            'description'      => $this->description,
            'class_id'         => $this->class_id,
            'subject_id'       => $this->subject_id,
            'teacher_id'       => $this->teacher_id,
            'duration_minutes' => $this->duration_minutes,
            'is_active'        => $this->is_active,
            'is_expired'       => $this->isExpired(),
            'max_attempts'     => $this->max_attempts,
            'start_time'       => $this->start_time?->toISOString(),
            'end_time'         => $this->end_time?->toISOString(),
            'created_at'       => $this->created_at?->toISOString(),
            'updated_at'       => $this->updated_at?->toISOString(),

            // Conditional relationships
            'teacher'         => new UserResource($this->whenLoaded('teacher')),
            'class_room'      => new ClassResource($this->whenLoaded('classRoom')),
            'subject'         => $this->whenLoaded('subject', fn () => [
                'id'       => $this->subject->id,
                'name'     => $this->subject->name,
                'code'     => $this->subject->code,
                'category' => $this->subject->category,
            ]),
            'questions'       => QuizQuestionResource::collection($this->whenLoaded('questions')),
            'attempts'        => $this->whenLoaded('attempts'),
            'questions_count' => $this->whenCounted('questions'),
            'attempts_count'  => $this->whenCounted('attempts'),
        ];
    }
}
