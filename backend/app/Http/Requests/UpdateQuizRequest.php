<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateQuizRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isTeacher() || $this->user()?->isAdmin();
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'title'            => ['sometimes', 'string', 'max:255'],
            'description'      => ['nullable', 'string'],
            'class_id'         => ['sometimes', 'exists:classes,id'],
            'duration_minutes' => ['sometimes', 'integer', 'min:1', 'max:300'],
            'is_active'        => ['sometimes', 'boolean'],
            'max_attempts'     => ['sometimes', 'integer', 'min:0', 'max:100'],
            'start_time'       => ['nullable', 'date'],
            'end_time'         => ['nullable', 'date', 'after:start_time'],

            // Questions can be updated along with the quiz
            'questions'                    => ['sometimes', 'array', 'min:1'],
            'questions.*.id'               => ['sometimes', 'exists:quiz_questions,id'],
            'questions.*.question'         => ['required_with:questions', 'string'],
            'questions.*.option_a'         => ['required_with:questions', 'string'],
            'questions.*.option_b'         => ['required_with:questions', 'string'],
            'questions.*.option_c'         => ['required_with:questions', 'string'],
            'questions.*.option_d'         => ['required_with:questions', 'string'],
            'questions.*.correct_answer'   => ['required_with:questions', 'in:a,b,c,d'],
            'questions.*.points'           => ['sometimes', 'integer', 'min:1'],
        ];
    }
}
