<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BulkAttendanceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();
        return $user && ($user->isAdmin() || $user->isTeacher());
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'class_id'              => ['required', 'exists:classes,id'],
            'date'                  => ['required', 'date', 'before_or_equal:today'],
            'attendances'           => ['required', 'array', 'min:1'],
            'attendances.*.user_id' => ['required', 'exists:users,id'],
            'attendances.*.status'  => ['required', 'in:present,absent,late,excused'],
            'attendances.*.notes'   => ['nullable', 'string', 'max:500'],
        ];
    }
}
