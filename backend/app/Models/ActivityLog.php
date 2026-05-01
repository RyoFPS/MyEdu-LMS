<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    protected $fillable = [
        'user_id',
        'user_name',
        'user_role',
        'action',
        'target_type',
        'target_name',
        'target_id',
        'description',
        'details',
        'ip_address',
    ];

    protected function casts(): array
    {
        return [
            'details' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function log(
        ?User $user,
        string $action,
        string $targetType,
        string $targetName,
        string $description,
        ?int $targetId = null,
        ?array $details = null,
        ?string $ipAddress = null
    ): void {
        static::create([
            'user_id'     => $user?->id,
            'user_name'   => $user?->name ?? 'System',
            'user_role'   => $user?->role ?? 'system',
            'action'      => $action,
            'target_type' => $targetType,
            'target_name' => $targetName,
            'target_id'   => $targetId,
            'description' => $description,
            'details'     => $details,
            'ip_address'  => $ipAddress,
        ]);
    }

    public static function pruneOld(): int
    {
        return static::where('created_at', '<', now()->subDays(90))->delete();
    }
}
