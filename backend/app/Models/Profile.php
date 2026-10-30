<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Profile extends Model
{
    protected $fillable = ['user_id', 'username', 'full_name', 'bio', 'avatar_url'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
