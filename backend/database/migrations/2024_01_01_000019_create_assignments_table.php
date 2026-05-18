<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('assignments', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description');
            $table->foreignId('class_id')->constrained('classes')->onDelete('cascade');
            $table->foreignId('subject_id')->nullable()->constrained('subjects')->onDelete('set null');
            $table->foreignId('teacher_id')->constrained('users')->onDelete('cascade');
            $table->dateTime('due_date');
            $table->integer('max_score')->default(100);
            $table->boolean('allow_late_submission')->default(false);
            $table->boolean('allow_resubmission')->default(false);
            $table->string('file_path')->nullable();
            $table->string('file_name')->nullable();
            $table->boolean('is_published')->default(true);
            $table->timestamps();

            $table->index('class_id');
            $table->index('teacher_id');
            $table->index('due_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assignments');
    }
};
