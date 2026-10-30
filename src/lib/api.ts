import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/** Base URL complète, par exemple https://serveur.example/api/v1. */
const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');
const TOKEN_KEY = 'media-social.laravel-api-token';

export type ApiProfile = {
  id: number;
  user_id: number;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiUser = {
  id: number;
  name: string;
  email: string;
  profile: ApiProfile | null;
};

export type AuthResponse = {
  token: string;
  user: ApiUser;
};

export type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type ApiErrorPayload = {
  message?: string;
  errors?: Record<string, string[]>;
};

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.localStorage.getItem(TOKEN_KEY);
  }
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

async function clearToken(): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }
  await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T> {
  if (!API_URL) {
    throw new Error('EXPO_PUBLIC_API_URL est absent. Configure-le avec l’URL du backend Laravel.');
  }

  const token = authenticated ? await getToken() : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    const firstValidationError = payload.errors ? Object.values(payload.errors)[0]?.[0] : undefined;
    throw new ApiError(
      firstValidationError ?? payload.message ?? `Erreur serveur (${response.status}).`,
      response.status,
      payload.errors
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function authenticate(path: '/auth/login' | '/auth/register', data: object): Promise<AuthResponse> {
  const result = await request<AuthResponse>(path, {
    method: 'POST',
    body: JSON.stringify(data),
  }, false);
  await saveToken(result.token);
  return result;
}

/** Client de l’API Laravel v1. Le token bearer est conservé entre les ouvertures de l’application. */
export const api = {
  getToken,
  clearToken,
  auth: {
    login: (email: string, password: string) => authenticate('/auth/login', { email, password }),
    register: (data: { email: string; password: string; username: string; full_name: string }) =>
      authenticate('/auth/register', data),
    me: () => request<{ user: ApiUser }>('/auth/me'),
    async logout() {
      try {
        await request('/auth/logout', { method: 'POST' });
      } finally {
        await clearToken();
      }
    },
  },
  profile: {
    get: () => request<ApiUser>('/profile'),
    update: (data: Partial<Pick<ApiProfile, 'username' | 'full_name' | 'bio' | 'avatar_url'>>) =>
      request<ApiUser>('/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  },
  users: (query = '') => request<Paginated<ApiProfile>>(`/users${query ? `?q=${encodeURIComponent(query)}` : ''}`),
  posts: {
    list: (page = 1) => request<Paginated<Record<string, unknown>>>(`/posts?page=${page}`),
    create: (data: { content?: string; image_url?: string | null; video_url?: string | null }) =>
      request<Record<string, unknown>>('/posts', { method: 'POST', body: JSON.stringify(data) }),
    remove: (id: number | string) => request(`/posts/${id}`, { method: 'DELETE' }),
    toggleLike: (id: number | string) =>
      request<{ liked: boolean; count: number }>(`/posts/${id}/like`, { method: 'POST' }),
    comments: (id: number | string, page = 1) =>
      request<Paginated<Record<string, unknown>>>(`/posts/${id}/comments?page=${page}`),
    addComment: (id: number | string, content: string, parent_id: number | null = null) =>
      request<Record<string, unknown>>(`/posts/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, parent_id }),
      }),
  },
  connections: {
    list: (page = 1) => request<Paginated<Record<string, unknown>>>(`/connections?page=${page}`),
    invite: (userId: number | string) => request(`/connections/${userId}`, { method: 'POST' }),
    accept: (id: number | string) => request(`/connections/${id}/accept`, { method: 'POST' }),
  },
  follows: {
    follow: (userId: number | string) => request(`/follows/${userId}`, { method: 'PUT' }),
    unfollow: (userId: number | string) => request(`/follows/${userId}`, { method: 'DELETE' }),
  },
  conversations: {
    list: (page = 1) => request<Paginated<Record<string, unknown>>>(`/conversations?page=${page}`),
    start: (userId: number | string) => request(`/conversations/${userId}`, { method: 'POST' }),
    messages: (id: number | string, page = 1) =>
      request<Paginated<Record<string, unknown>>>(`/conversations/${id}/messages?page=${page}`),
    send: (id: number | string, content: string) =>
      request(`/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
    markRead: (id: number | string) => request(`/conversations/${id}/read`, { method: 'POST' }),
  },
  notifications: {
    list: (page = 1) => request<Paginated<Record<string, unknown>>>(`/notifications?page=${page}`),
    markAllRead: () => request('/notifications/read', { method: 'POST' }),
  },
};
