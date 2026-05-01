<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSubjectMatterRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (!$user) return false;
        return $user->isAdmin() || $user->isTeacher();
    }

    public function rules(): array
    {
        return [
            'title'       => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'file'        => ['required', 'file', 'max:10240', 'mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,jpg,jpeg,png,mp4,avi,webp,svg'],
            'subject_id'  => ['nullable', 'exists:subjects,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.max'   => 'Ukuran file maksimal 10 MB.',
            'file.mimes' => 'Format file tidak didukung. Format yang diizinkan: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, JPG, PNG, MP4, AVI.',
            'title.required' => 'Judul materi wajib diisi.',
        ];
    }
}
