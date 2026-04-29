<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('classes', function (Blueprint $table) {
            $table->string('slug')->unique()->after('name');
        });

        // Generate slugs for existing records
        $classes = \App\Models\ClassRoom::all();
        foreach ($classes as $class) {
            $class->slug = \Illuminate\Support\Str::slug($class->name);
            $class->save();
        }
    }

    public function down(): void
    {
        Schema::table('classes', function (Blueprint $table) {
            $table->dropColumn('slug');
        });
    }
};
