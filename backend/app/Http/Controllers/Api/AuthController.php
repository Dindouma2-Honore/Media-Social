<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApiToken;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $r)
    {
        $data = $r->validate(['email' => 'required|email|max:255|unique:users,email', 'password' => 'required|string|min:8', 'username' => 'required|string|min:3|max:30|alpha_dash|unique:profiles,username', 'full_name' => 'required|string|max:120']);
        $user = User::create(['name' => $data['full_name'], 'email' => $data['email'], 'password' => $data['password']]);
        $profile = Profile::create(['user_id' => $user->id, 'username' => $data['username'], 'full_name' => $data['full_name']]);

        return $this->issue($user, $profile, 201);
    }

    public function login(Request $r)
    {
        $data = $r->validate(['email' => 'required|email', 'password' => 'required|string']);
        $user = User::where('email', $data['email'])->first();
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => ['Identifiants incorrects.']]);
        }

        return $this->issue($user, $user->profile);
    }

    private function issue(User $user, ?Profile $profile, int $status = 200)
    {
        $plain = bin2hex(random_bytes(32));
        ApiToken::create(['user_id' => $user->id, 'token_hash' => hash('sha256', $plain), 'name' => 'mobile']);

        return response()->json(['token' => $plain, 'user' => ['id' => (string) $user->id, 'email' => $user->email, 'profile' => $profile]], $status);
    }

    public function me(Request $r)
    {
        return response()->json(['user' => $r->user()->load('profile')]);
    }

    public function logout(Request $r)
    {
        ApiToken::where('token_hash', hash('sha256', $r->bearerToken()))->delete();

        return response()->json(['message' => 'Déconnecté.']);
    }
}
