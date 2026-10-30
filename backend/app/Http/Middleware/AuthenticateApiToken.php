<?php

namespace App\Http\Middleware;

use App\Models\ApiToken;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $plain = $request->bearerToken();
        if (! $plain) {
            return response()->json(['message' => 'Non authentifié.'], 401);
        }
        $token = ApiToken::where('token_hash', hash('sha256', $plain))->with('user')->first();
        if (! $token) {
            return response()->json(['message' => 'Jeton invalide.'], 401);
        }
        $token->forceFill(['last_used_at' => now()])->save();
        Auth::setUser($token->user);

        return $next($request);
    }
}
