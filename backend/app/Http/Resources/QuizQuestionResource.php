<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuizQuestionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * Note: correct_answer is hidden from students during active quizzes.
     * Teachers and results views will include it.
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $showAnswer = $user && ($user->isTeacher() || $user->isAdmin());

        return [
            'id'             => $this->id,
            'quiz_id'        => $this->quiz_id,
            'question'       => $this->question,
            'option_a'       => $this->option_a,
            'option_b'       => $this->option_b,
            'option_c'       => $this->option_c,
            'option_d'       => $this->option_d,
            'correct_answer' => $this->when($showAnswer, $this->correct_answer),
            'points'         => $this->points,
            'created_at'     => $this->created_at?->toISOString(),
        ];
    }
}
