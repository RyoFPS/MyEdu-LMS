<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\AssignmentSubmission;

class GradeSubmissionRequest extends FormRequest
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
        $submission = AssignmentSubmission::find($this->route('id'));
        $maxScore = $submission ? $submission->assignment->max_score : 100;

        return [
            'score' => "required|integer|min:0|max:{$maxScore}",
            'feedback' => 'nullable|string',
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
            'score.required' => 'Score is required',
            'score.integer' => 'Score must be a number',
            'score.min' => 'Score cannot be negative',
            'score.max' => 'Score cannot exceed the maximum score for this assignment',
        ];
    }
}
