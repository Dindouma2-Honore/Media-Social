<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\Post;
use App\Models\Profile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SocialController extends Controller
{
    public function profile(Request $r)
    {
        return response()->json($r->user()->load('profile'));
    }

    public function updateProfile(Request $r)
    {
        $data = $r->validate(['username' => 'sometimes|string|min:3|max:30|alpha_dash|unique:profiles,username,'.optional($r->user()->profile)->id, 'full_name' => 'nullable|string|max:120', 'bio' => 'nullable|string|max:160', 'avatar_url' => 'nullable|url|max:2048']);
        $r->user()->profile()->updateOrCreate([], $data);

        return response()->json($r->user()->fresh()->load('profile'));
    }

    public function users(Request $r)
    {
        $term = $r->query('q');

        return Profile::query()->with('user:id,email')->when($term, fn ($q) => $q->where(fn ($x) => $x->where('username', 'like', "%$term%")->orWhere('full_name', 'like', "%$term%")))->where('user_id', '!=', $r->user()->id)->paginate(30);
    }

    public function posts(Request $r)
    {
        $posts = Post::with(['author.profile', 'comments'])->withCount(['comments', 'likes'])->latest()->paginate(20);

        return response()->json($posts);
    }

    public function createPost(Request $r)
    {
        $data = $r->validate(['content' => 'nullable|string|max:500', 'image_url' => 'nullable|url|max:2048', 'video_url' => 'nullable|url|max:2048']);
        if (blank($data['content'] ?? null) && empty($data['image_url']) && empty($data['video_url'])) {
            return response()->json(['message' => 'Ajoute du texte, une image ou une vidéo.'], 422);
        }

        return response()->json(Post::create(['user_id' => $r->user()->id] + $data)->load('author.profile'), 201);
    }

    public function deletePost(Request $r, Post $post)
    {
        abort_unless($post->user_id === $r->user()->id, 403);
        $post->delete();

        return response()->json(['message' => 'Publication supprimée.']);
    }

    public function toggleLike(Request $r, Post $post)
    {
        $row = DB::table('likes')->where('post_id', $post->id)->where('user_id', $r->user()->id)->first();
        if ($row) {
            DB::table('likes')->where('id', $row->id)->delete();
            $liked = false;
        } else {
            DB::table('likes')->insert(['post_id' => $post->id, 'user_id' => $r->user()->id, 'created_at' => now(), 'updated_at' => now()]);
            $liked = true;
        }

        return response()->json(['liked' => $liked, 'count' => DB::table('likes')->where('post_id', $post->id)->count()]);
    }

    public function comments(Post $post)
    {
        return response()->json($post->comments()->with('author.profile')->oldest()->paginate(100));
    }

    public function createComment(Request $r, Post $post)
    {
        $data = $r->validate(['content' => 'required|string|min:1|max:500', 'parent_id' => 'nullable|integer|exists:comments,id']);
        if (! empty($data['parent_id'])) {
            $parent = Comment::findOrFail($data['parent_id']);
            abort_unless($parent->post_id === $post->id && ! $parent->parent_id, 422, 'Réponse invalide.');
        }

        return response()->json($post->comments()->create(['user_id' => $r->user()->id] + $data)->load('author.profile'), 201);
    }

    public function deleteComment(Request $r, Comment $comment)
    {
        abort_unless($comment->user_id === $r->user()->id || $comment->post->user_id === $r->user()->id, 403);
        $comment->delete();

        return response()->json(['message' => 'Commentaire supprimé.']);
    }

    public function follow(Request $r, int $user)
    {
        abort_if($user === $r->user()->id, 422, 'Action impossible.');
        abort_unless(Profile::where('user_id', $user)->exists(), 404);
        DB::table('follows')->updateOrInsert(['follower_id' => $r->user()->id, 'following_id' => $user], ['created_at' => now(), 'updated_at' => now()]);

        return response()->json(['following' => true]);
    }

    public function unfollow(Request $r, int $user)
    {
        DB::table('follows')->where('follower_id', $r->user()->id)->where('following_id', $user)->delete();

        return response()->json(['following' => false]);
    }

    public function sendConnection(Request $r, int $user)
    {
        abort_if($user === $r->user()->id, 422);
        abort_unless(Profile::where('user_id', $user)->exists(), 404);
        $row = DB::table('connections')->where(fn ($q) => $q->where('requester_id', $r->user()->id)->where('receiver_id', $user)->orWhere(fn ($z) => $z->where('requester_id', $user)->where('receiver_id', $r->user()->id)))->first();
        if ($row) {
            return response()->json((array) $row, 200);
        }
        $id = DB::table('connections')->insertGetId(['requester_id' => $r->user()->id, 'receiver_id' => $user, 'status' => 'pending', 'created_at' => now(), 'updated_at' => now()]);

        return response()->json((array) DB::table('connections')->find($id), 201);
    }

    public function connections(Request $r)
    {
        return response()->json(DB::table('connections')->where('requester_id', $r->user()->id)->orWhere('receiver_id', $r->user()->id)->latest()->paginate(50));
    }

    public function acceptConnection(Request $r, int $id)
    {
        $updated = DB::table('connections')->where('id', $id)->where('receiver_id', $r->user()->id)->where('status', 'pending')->update(['status' => 'accepted', 'updated_at' => now()]);
        abort_unless($updated, 404);

        return response()->json(['status' => 'accepted']);
    }

    public function conversations(Request $r)
    {
        $id = $r->user()->id;

        return response()->json(DB::table('conversations')->where('user_a', $id)->orWhere('user_b', $id)->orderByDesc('last_message_at')->paginate(50));
    }

    public function startConversation(Request $r, int $user)
    {
        $me = $r->user()->id;
        abort_if($me === $user, 422);
        $connected = DB::table('connections')->where('status', 'accepted')->where(fn ($q) => $q->where('requester_id', $me)->where('receiver_id', $user)->orWhere(fn ($z) => $z->where('requester_id', $user)->where('receiver_id', $me)))->exists();
        abort_unless($connected, 403, 'Vous devez être en contact pour discuter.');
        $a = min($me, $user);
        $b = max($me, $user);
        $conv = DB::table('conversations')->where('user_a', $a)->where('user_b', $b)->first();
        if (! $conv) {
            $id = DB::table('conversations')->insertGetId(['user_a' => $a, 'user_b' => $b, 'created_at' => now(), 'updated_at' => now()]);
            $conv = DB::table('conversations')->find($id);
        }

        return response()->json($conv);
    }

    public function messages(Request $r, int $conversation)
    {
        $conv = DB::table('conversations')->where('id', $conversation)->first();
        abort_unless($conv && in_array($r->user()->id, [$conv->user_a, $conv->user_b]), 404);

        return response()->json(DB::table('messages')->where('conversation_id', $conversation)->orderByDesc('created_at')->paginate(50));
    }

    public function sendMessage(Request $r, int $conversation)
    {
        $data = $r->validate(['content' => 'required|string|min:1|max:1000']);
        $conv = DB::table('conversations')->where('id', $conversation)->first();
        abort_unless($conv && in_array($r->user()->id, [$conv->user_a, $conv->user_b]), 404);
        $connected = DB::table('connections')->where('status', 'accepted')->where(fn ($q) => $q->where('requester_id', $conv->user_a)->where('receiver_id', $conv->user_b)->orWhere(fn ($z) => $z->where('requester_id', $conv->user_b)->where('receiver_id', $conv->user_a)))->exists();
        abort_unless($connected, 403, 'Vous n’êtes plus en contact.');
        $id = DB::table('messages')->insertGetId(['conversation_id' => $conversation, 'sender_id' => $r->user()->id, 'content' => $data['content'], 'created_at' => now(), 'updated_at' => now()]);
        DB::table('conversations')->where('id', $conversation)->update(['last_message_at' => now(), 'last_message_preview' => mb_substr($data['content'], 0, 80), 'updated_at' => now()]);

        return response()->json((array) DB::table('messages')->find($id), 201);
    }

    public function markMessagesRead(Request $r, int $conversation)
    {
        $conv = DB::table('conversations')->where('id', $conversation)->first();
        abort_unless($conv && in_array($r->user()->id, [$conv->user_a, $conv->user_b]), 404);
        DB::table('messages')->where('conversation_id', $conversation)->where('sender_id', '!=', $r->user()->id)->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json(['message' => 'Messages marqués comme lus.']);
    }

    public function notifications(Request $r)
    {
        return response()->json(DB::table('notifications')->where('user_id', $r->user()->id)->orderByDesc('created_at')->paginate(50));
    }

    public function markNotificationsRead(Request $r)
    {
        DB::table('notifications')->where('user_id',$r->user()->id)->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json(['message' => 'Notifications marquées comme lues.']);
    }
}
