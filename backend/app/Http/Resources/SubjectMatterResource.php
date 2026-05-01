<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubjectMatterResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'title'          => $this->title,
            'description'    => $this->description,
            'file_name'      => $this->file_name,
            'file_size'      => $this->file_size,
            'file_size_formatted' => $this->formattedFileSize(),
            'file_type'      => $this->file_type,
            'type'           => $this->type,
            'class_id'       => $this->class_id,
            'subject_id'     => $this->subject_id,
            'uploaded_by'    => $this->uploaded_by,
            'created_at'     => $this->created_at?->toISOString(),
            'updated_at'     => $this->updated_at?->toISOString(),

            // Conditional relationships
            'class_room' => new ClassResource($this->whenLoaded('classRoom')),
            'subject'    => $this->whenLoaded('subject', fn () => [
                'id'   => $this->subject->id,
                'name' => $this->subject->name,
                'code' => $this->subject->code,
            ]),
            'uploader'   => new UserResource($this->whenLoaded('uploader')),
        ];
    }
}
