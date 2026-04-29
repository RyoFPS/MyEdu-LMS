<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmitQuizRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isStudent() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'answers'                      => ['required', 'array', 'min:1'],
            'answers.*.quiz_question_id'   => ['required', 'exists:quiz_questions,id'],
            'answers.*.selected_answer'    => ['required', 'in:a,b,c,d'],
        ];
    }
}
