<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAssignmentRequest extends FormRequest
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
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'class_id' => 'required|exists:classes,id',
            'subject_id' => 'nullable|exists:subjects,id',
            'due_date' => 'required|date|after:now',
            'max_score' => 'integer|min:1',
            'allow_late_submission' => 'boolean',
            'allow_resubmission' => 'boolean',
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
            'title.required' => 'Assignment title is required',
            'description.required' => 'Assignment description is required',
            'class_id.required' => 'Class is required',
            'class_id.exists' => 'Selected class does not exist',
            'subject_id.exists' => 'Selected subject does not exist',
            'due_date.required' => 'Due date is required',
            'due_date.after' => 'Due date must be in the future',
            'attachment.max' => 'Attachment must not exceed 10MB',
        ];
    }
}
