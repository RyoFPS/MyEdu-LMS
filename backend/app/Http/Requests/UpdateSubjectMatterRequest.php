<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSubjectMatterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() || $this->user()?->isTeacher();
    }

    public function rules(): array
    {
        return [
            'title'       => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'file'        => ['nullable', 'file', 'max:10240', 'mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,jpg,jpeg,png,mp4,avi,webp,svg'],
            'type'        => ['sometimes', 'in:main,optional'],
            'subject_id'  => ['nullable', 'exists:subjects,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.max'   => 'Ukuran file maksimal 10 MB.',
            'file.mimes' => 'Format file tidak didukung.',
        ];
    }
}
