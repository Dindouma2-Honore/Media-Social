-- =====================================================================
--  Lien — Partie 6 : vidéos, commentaires, réponses, likes de commentaires
--  À coller dans Supabase > SQL Editor > New query, puis "Run".
--  (À exécuter APRÈS les scripts des parties 1 à 4 ; la partie 5 est facultative.)
-- =====================================================================

-- 1) Vidéos dans les publications --------------------------------------
alter table public.posts add column if not exists video_url text;

-- L'ancienne règle "texte ou image obligatoire" doit maintenant accepter aussi la vidéo.
-- On supprime toute ancienne règle qui parle de image_url, puis on la recrée.
do $$
declare
  r record;
begin
  for r in
    select conname
      from pg_constraint
     where conrelid = 'public.posts'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) like '%image_url%'
  loop
    execute format('alter table public.posts drop constraint %I', r.conname);
  end loop;
end;
$$;

alter table public.posts drop constraint if exists posts_has_content;
alter table public.posts
  add constraint posts_has_content
  check (char_length(content) > 0 or image_url is not null or video_url is not null);

-- Les vidéos utilisent le même dossier de stockage que les images ("posts").
-- Taille maximale par fichier : 50 Mo (limite du plan gratuit Supabase).
update storage.buckets set file_size_limit = 52428800 where id = 'posts';

-- 2) Commentaires (avec réponses) -----------------------------------------
-- parent_id vide = commentaire principal ; rempli = réponse à un commentaire.
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  parent_id   uuid references public.comments (id) on delete cascade,
  content     text not null check (char_length(content) between 1 and 500),
  created_at  timestamptz not null default now()
);

create index if not exists comments_post_idx on public.comments (post_id, created_at);
create index if not exists comments_parent_idx on public.comments (parent_id);

-- Règle : une réponse doit appartenir à la même publication que son parent,
-- et on ne répond qu'à un commentaire principal (un seul niveau de réponses).
create or replace function public.check_comment_parent()
returns trigger
language plpgsql
as $$
declare
  parent_post uuid;
  parent_parent uuid;
begin
  if new.parent_id is not null then
    select post_id, parent_id into parent_post, parent_parent
      from public.comments
     where id = new.parent_id;

    if parent_post is null or parent_post <> new.post_id then
      raise exception 'invalid_parent';
    end if;
    if parent_parent is not null then
      raise exception 'reply_to_reply_not_allowed';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists check_comment_parent_trigger on public.comments;
create trigger check_comment_parent_trigger
  before insert on public.comments
  for each row execute function public.check_comment_parent();

alter table public.comments enable row level security;

create policy "Commentaires lisibles par les utilisateurs connectés"
  on public.comments for select
  to authenticated
  using (true);

create policy "Commenter en son nom"
  on public.comments for insert
  to authenticated
  with check (auth.uid() = user_id);

-- On peut supprimer son commentaire, et l'auteur d'une publication peut supprimer
-- les commentaires laissés sur sa publication.
create policy "Supprimer son commentaire ou ceux de sa publication"
  on public.comments for delete
  to authenticated
  using (
    auth.uid() = user_id
    or auth.uid() = (select p.user_id from public.posts p where p.id = post_id)
  );

-- 3) Likes de commentaires -------------------------------------------------
create table if not exists public.comment_likes (
  comment_id  uuid not null references public.comments (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.comment_likes enable row level security;

create policy "Likes de commentaires lisibles"
  on public.comment_likes for select
  to authenticated
  using (true);

create policy "Liker un commentaire en son nom"
  on public.comment_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Retirer son like de commentaire"
  on public.comment_likes for delete
  to authenticated
  using (auth.uid() = user_id);

-- 4) Notifications push (facultatif : nécessite le script de la partie 5) ---
-- Si la partie 5 n'est pas installée, ce trigger ne fait simplement rien.
create or replace function public.notify_new_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  commenter text;
  post_owner uuid;
  parent_owner uuid;
begin
  select coalesce(nullif(p.full_name, ''), p.username) into commenter
    from public.profiles p where p.id = new.user_id;

  select user_id into post_owner from public.posts where id = new.post_id;

  -- Réponse : on prévient l'auteur du commentaire d'origine.
  if new.parent_id is not null then
    select user_id into parent_owner from public.comments where id = new.parent_id;
    if parent_owner is not null and parent_owner <> new.user_id then
      perform public.send_push(
        parent_owner,
        commenter,
        'a répondu à ton commentaire : ' || left(new.content, 80),
        jsonb_build_object('type', 'comment', 'post_id', new.post_id)
      );
    end if;
  end if;

  -- On prévient aussi l'auteur de la publication (sauf si c'est la même personne).
  if post_owner is not null
     and post_owner <> new.user_id
     and post_owner is distinct from parent_owner then
    perform public.send_push(
      post_owner,
      commenter,
      'a commenté ta publication : ' || left(new.content, 80),
      jsonb_build_object('type', 'comment', 'post_id', new.post_id)
    );
  end if;

  return new;
exception
  when others then
    return new; -- une notification ratée ne doit jamais bloquer un commentaire
end;
$$;

drop trigger if exists on_comment_push on public.comments;
create trigger on_comment_push
  after insert on public.comments
  for each row execute function public.notify_new_comment();
