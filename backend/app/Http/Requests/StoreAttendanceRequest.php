<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAttendanceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Teachers and admins can record attendance
        $user = $this->user();
        return $user && ($user->isAdmin() || $user->isTeacher());
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'user_id'  => ['required', 'exists:users,id'],
            'class_id' => ['required', 'exists:classes,id'],
            'date'     => ['required', 'date', 'before_or_equal:today'],
            'status'   => ['required', 'in:present,absent,late,excused'],
            'notes'    => ['nullable', 'string', 'max:500'],
        ];
    }
}
