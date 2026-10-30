<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profiles', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $t->string('username')->unique();
            $t->string('full_name')->nullable();
            $t->string('bio', 160)->nullable();
            $t->text('avatar_url')->nullable();
            $t->timestamps();
        });
        Schema::create('api_tokens', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->char('token_hash', 64)->unique();
            $t->string('name')->default('mobile');
            $t->timestamp('last_used_at')->nullable();
            $t->timestamps();
        });
        Schema::create('posts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->text('content')->default('');
            $t->text('image_url')->nullable();
            $t->text('video_url')->nullable();
            $t->timestamps();
            $t->index(['created_at']);
        });
        Schema::create('likes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('post_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->timestamps();
            $t->unique(['post_id', 'user_id']);
        });
        Schema::create('comments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('post_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('parent_id')->nullable()->constrained('comments')->cascadeOnDelete();
            $t->string('content', 500);
            $t->timestamps();
        });
        Schema::create('comment_likes', function (Blueprint $t) {
            $t->id();
            $t->foreignId('comment_id')->constrained()->cascadeOnDelete();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->timestamps();
            $t->unique(['comment_id', 'user_id']);
        });
        Schema::create('connections', function (Blueprint $t) {
            $t->id();
            $t->foreignId('requester_id')->constrained('users')->cascadeOnDelete();
            $t->foreignId('receiver_id')->constrained('users')->cascadeOnDelete();
            $t->string('status')->default('pending');
            $t->timestamps();
            $t->unique(['requester_id', 'receiver_id']);
        });
        Schema::create('follows', function (Blueprint $t) {
            $t->id();
            $t->foreignId('follower_id')->constrained('users')->cascadeOnDelete();
            $t->foreignId('following_id')->constrained('users')->cascadeOnDelete();
            $t->timestamps();
            $t->unique(['follower_id', 'following_id']);
        });
        Schema::create('conversations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_a')->constrained('users')->cascadeOnDelete();
            $t->foreignId('user_b')->constrained('users')->cascadeOnDelete();
            $t->timestamp('last_message_at')->nullable();
            $t->text('last_message_preview')->nullable();
            $t->timestamps();
            $t->unique(['user_a', 'user_b']);
        });
        Schema::create('messages', function (Blueprint $t) {
            $t->id();
            $t->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $t->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $t->string('content', 1000);
            $t->timestamp('read_at')->nullable();
            $t->timestamps();
        });
        Schema::create('notifications', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $t->foreignId('actor_id')->constrained('users')->cascadeOnDelete();
            $t->string('type');
            $t->foreignId('post_id')->nullable()->constrained()->nullOnDelete();
            $t->timestamp('read_at')->nullable();
            $t->timestamps();
            $t->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        foreach (['notifications', 'messages', 'conversations', 'follows', 'connections', 'comment_likes', 'comments', 'likes', 'posts', 'api_tokens', 'profiles'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
