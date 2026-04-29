<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttendanceResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'user_id'    => $this->user_id,
            'class_id'   => $this->class_id,
            'date'       => $this->date?->toDateString(),
            'status'     => $this->status,
            'notes'      => $this->notes,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),

            // Conditional relationships
            'user'       => new UserResource($this->whenLoaded('user')),
            'class_room' => new ClassResource($this->whenLoaded('classRoom')),
        ];
    }
}
