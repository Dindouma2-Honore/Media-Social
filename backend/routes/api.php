<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SocialController;
use App\Http\Middleware\AuthenticateApiToken;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::middleware(AuthenticateApiToken::class)->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/profile', [SocialController::class, 'profile']);
        Route::patch('/profile', [SocialController::class, 'updateProfile']);
        Route::get('/users', [SocialController::class, 'users']);
        Route::get('/posts', [SocialController::class, 'posts']);
        Route::post('/posts', [SocialController::class, 'createPost']);
        Route::delete('/posts/{post}', [SocialController::class, 'deletePost']);
        Route::post('/posts/{post}/like', [SocialController::class, 'toggleLike']);
        Route::get('/posts/{post}/comments', [SocialController::class, 'comments']);
        Route::post('/posts/{post}/comments', [SocialController::class, 'createComment']);
        Route::delete('/comments/{comment}', [SocialController::class, 'deleteComment']);
        Route::get('/connections', [SocialController::class, 'connections']);
        Route::post('/connections/{user}', [SocialController::class, 'sendConnection']);
        Route::post('/connections/{id}/accept', [SocialController::class, 'acceptConnection']);
        Route::put('/follows/{user}', [SocialController::class, 'follow']);
        Route::delete('/follows/{user}', [SocialController::class, 'unfollow']);
        Route::get('/conversations', [SocialController::class, 'conversations']);
        Route::post('/conversations/{user}', [SocialController::class, 'startConversation']);
        Route::get('/conversations/{conversation}/messages', [SocialController::class, 'messages']);
        Route::post('/conversations/{conversation}/messages', [SocialController::class, 'sendMessage']);
        Route::post('/conversations/{conversation}/read', [SocialController::class, 'markMessagesRead']);
        Route::get('/notifications', [SocialController::class, 'notifications']);
        Route::post('/notifications/read',[SocialController::class, 'markNotificationsRead']);
    });
});
