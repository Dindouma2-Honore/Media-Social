-- =====================================================================
--  Lien — Partie 1 : profils + stockage des photos
--  À coller dans Supabase > SQL Editor > New query, puis cliquer sur "Run".
-- =====================================================================

-- 1) Table des profils -------------------------------------------------
-- Supabase gère déjà les comptes (e-mail + mot de passe) dans auth.users.
-- Notre table "profiles" ajoute les infos publiques : nom, pseudo, bio, photo.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null unique,
  full_name   text,
  bio         text check (char_length(bio) <= 160),
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- 2) Sécurité (Row Level Security) -------------------------------------
-- Par défaut, personne ne peut rien lire ni écrire. On autorise ensuite précisément.
alter table public.profiles enable row level security;

-- Tout le monde peut lire les profils (c'est un réseau social).
create policy "Profils lisibles par tous"
  on public.profiles for select
  using (true);

-- Un utilisateur ne peut modifier que SON profil.
create policy "Modifier son propre profil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 3) Création automatique du profil à l'inscription -------------------
-- Quand un compte est créé dans auth.users, on crée la ligne profiles correspondante.
-- Le pseudo et le nom viennent des "options.data" envoyées par l'application.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'username', ''),
      'user_' || substr(replace(new.id::text, '-', ''), 1, 8)
    ),
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) Stockage des photos de profil ------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Lecture publique des photos.
create policy "Photos de profil lisibles par tous"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Un utilisateur ne peut envoyer des fichiers que dans SON dossier (avatars/<son id>/...).
create policy "Envoyer sa photo de profil"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Supprimer sa photo de profil"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
