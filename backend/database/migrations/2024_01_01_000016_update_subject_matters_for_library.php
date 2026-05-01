<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subject_matters', function (Blueprint $table) {
            // Make class_id nullable (library materials don't belong to a class)
            $table->foreignId('class_id')->nullable()->change();
            // Add grade_level for library materials
            $table->string('grade_level')->nullable()->after('type');
        });
    }

    public function down(): void
    {
        Schema::table('subject_matters', function (Blueprint $table) {
            $table->dropColumn('grade_level');
            // Note: reverting nullable requires doctrine/dbal
        });
    }
};
