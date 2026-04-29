<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClassResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'name'          => $this->name,
            'slug'          => $this->slug,
            'grade_level'   => $this->grade_level,
            'academic_year' => $this->academic_year,
            'created_at'    => $this->created_at?->toISOString(),
            'updated_at'    => $this->updated_at?->toISOString(),

            // Conditional relationships
            'teachers'       => UserResource::collection($this->whenLoaded('teachers')),
            'students'       => UserResource::collection($this->whenLoaded('students')),
            'students_count' => $this->whenCounted('students'),
            'teachers_count' => $this->whenCounted('teachers'),

            // Pivot data (when loaded via belongsToMany)
            'subject' => $this->whenPivotLoaded('class_teacher', fn () => $this->pivot->subject),
        ];
    }
}
