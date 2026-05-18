<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAssignmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return in_array($this->user()->role, ['admin', 'teacher']);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'class_id' => 'sometimes|exists:classes,id',
            'subject_id' => 'nullable|exists:subjects,id',
            'due_date' => 'sometimes|date|after:now',
            'max_score' => 'sometimes|integer|min:1',
            'allow_late_submission' => 'sometimes|boolean',
            'allow_resubmission' => 'sometimes|boolean',
            'is_published' => 'sometimes|boolean',
            'attachment' => 'nullable|file|max:10240|mimes:pdf,doc,docx,jpg,jpeg,png,zip',
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'class_id.exists' => 'Selected class does not exist',
            'subject_id.exists' => 'Selected subject does not exist',
            'due_date.after' => 'Due date must be in the future',
            'attachment.max' => 'Attachment must not exceed 10MB',
        ];
    }
}
