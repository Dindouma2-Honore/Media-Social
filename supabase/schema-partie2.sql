-- =====================================================================
--  Lien — Partie 2 : publications, likes, photos des publications
--  À coller dans Supabase > SQL Editor > New query, puis "Run".
--  (À exécuter APRÈS le script de la partie 1.)
-- =====================================================================

-- 1) Publications ------------------------------------------------------
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  content     text not null default '' check (char_length(content) <= 500),
  image_url   text,
  created_at  timestamptz not null default now(),
  -- une publication doit avoir du texte ou une image
  check (char_length(content) > 0 or image_url is not null)
);

-- Accélère le tri du fil d'actualité (les plus récentes d'abord).
create index if not exists posts_created_at_idx on public.posts (created_at desc);

alter table public.posts enable row level security;

create policy "Publications lisibles par les utilisateurs connectés"
  on public.posts for select
  to authenticated
  using (true);

create policy "Publier en son nom"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Supprimer ses publications"
  on public.posts for delete
  to authenticated
  using (auth.uid() = user_id);

-- 2) Likes -------------------------------------------------------------
-- Une ligne = "cet utilisateur aime cette publication".
-- La clé primaire (post_id, user_id) empêche de liker deux fois.
create table if not exists public.likes (
  post_id     uuid not null references public.posts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.likes enable row level security;

create policy "Likes lisibles par les utilisateurs connectés"
  on public.likes for select
  to authenticated
  using (true);

create policy "Liker en son nom"
  on public.likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Retirer son like"
  on public.likes for delete
  to authenticated
  using (auth.uid() = user_id);

-- 3) Photos des publications -------------------------------------------
insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (id) do nothing;

create policy "Images de publications lisibles par tous"
  on storage.objects for select
  using (bucket_id = 'posts');

create policy "Envoyer une image dans son dossier"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Supprimer ses images de publications"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
