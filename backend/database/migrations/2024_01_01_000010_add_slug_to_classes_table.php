<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        // Add slug as nullable first so existing rows don't fail
        Schema::table('classes', function (Blueprint $table) {
            $table->string('slug')->nullable()->unique()->after('name');
        });

        // Generate unique slugs for existing records using raw DB (avoids model hooks)
        $classes = DB::table('classes')->orderBy('id')->get();
        $usedSlugs = [];

        foreach ($classes as $class) {
            $slug = Str::slug($class->name);

            if (empty($slug)) {
                $slug = 'class-' . $class->id;
            }

            $originalSlug = $slug;
            $count = 1;

            while (in_array($slug, $usedSlugs)) {
                $slug = $originalSlug . '-' . $count;
                $count++;
            }

            $usedSlugs[] = $slug;
            DB::table('classes')->where('id', $class->id)->update(['slug' => $slug]);
        }
    }

    public function down(): void
    {
        Schema::table('classes', function (Blueprint $table) {
            $table->dropColumn('slug');
        });
    }
};
