-- =====================================================================
--  Lien — Partie 7 : suivre des personnes + notifications
--  À coller dans Supabase > SQL Editor > New query, puis "Run".
--  (À exécuter APRÈS les scripts des parties 1 à 4 et 6 ; la partie 5 est facultative.)
-- =====================================================================

-- 1) Abonnements ("suivre") ------------------------------------------------
-- Une ligne = "follower_id suit following_id". C'est à sens unique :
-- suivre quelqu'un ne demande aucune acceptation (contrairement aux invitations du réseau).
create table if not exists public.follows (
  follower_id   uuid not null,
  following_id  uuid not null,
  created_at    timestamptz not null default now(),
  primary key (follower_id, following_id),

  constraint follows_follower_id_fkey
    foreign key (follower_id) references public.profiles (id) on delete cascade,
  constraint follows_following_id_fkey
    foreign key (following_id) references public.profiles (id) on delete cascade,

  check (follower_id <> following_id)
);

create index if not exists follows_following_idx on public.follows (following_id);

alter table public.follows enable row level security;

-- On voit les abonnements qui nous concernent (ceux qu'on a faits, et ceux qu'on a reçus).
create policy "Voir ses abonnements"
  on public.follows for select
  to authenticated
  using (auth.uid() in (follower_id, following_id));

create policy "Suivre quelqu'un"
  on public.follows for insert
  to authenticated
  with check (auth.uid() = follower_id);

create policy "Ne plus suivre"
  on public.follows for delete
  to authenticated
  using (auth.uid() = follower_id);

-- 2) Notifications (affichées dans l'onglet Notifications) -----------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,  -- la personne qui reçoit la notification
  actor_id    uuid not null,  -- la personne qui a publié
  type        text not null default 'post' check (type in ('post')),
  post_id     uuid,
  created_at  timestamptz not null default now(),
  read_at     timestamptz,    -- vide = pas encore lue

  constraint notifications_user_id_fkey
    foreign key (user_id) references public.profiles (id) on delete cascade,
  constraint notifications_actor_id_fkey
    foreign key (actor_id) references public.profiles (id) on delete cascade,
  constraint notifications_post_id_fkey
    foreign key (post_id) references public.posts (id) on delete cascade
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Chacun ne voit, ne marque comme lues et ne supprime que SES notifications.
-- Il n'y a pas de politique d'insertion : seules les fonctions ci-dessous en créent.
create policy "Voir ses notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Marquer ses notifications comme lues"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Supprimer ses notifications"
  on public.notifications for delete
  to authenticated
  using (auth.uid() = user_id);

-- 3) À chaque nouvelle publication : prévenir tous les abonnés -------------
create or replace function public.notify_followers_of_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  summary text;
  f record;
begin
  -- a) Notification dans l'application, pour chaque abonné.
  insert into public.notifications (user_id, actor_id, type, post_id)
  select follower_id, new.user_id, 'post', new.id
    from public.follows
   where following_id = new.user_id;

  -- b) Notification push sur le téléphone (seulement si la partie 5 est installée).
  begin
    select coalesce(nullif(p.full_name, ''), p.username) into actor_name
      from public.profiles p where p.id = new.user_id;

    summary := case
      when new.content <> '' then 'a publié : ' || left(new.content, 80)
      when new.video_url is not null then 'a publié une vidéo'
      else 'a publié une photo'
    end;

    for f in select follower_id from public.follows where following_id = new.user_id loop
      perform public.send_push(
        f.follower_id,
        actor_name,
        summary,
        jsonb_build_object('type', 'post', 'user_id', new.user_id)
      );
    end loop;
  exception
    when others then null; -- pas de partie 5, ou problème d'envoi : on ignore
  end;

  return new;
exception
  when others then
    return new; -- une notification ratée ne doit jamais empêcher de publier
end;
$$;

drop trigger if exists on_post_notify_followers on public.posts;
create trigger on_post_notify_followers
  after insert on public.posts
  for each row execute function public.notify_followers_of_post();

-- 4) Temps réel : le badge de l'onglet Notifications se met à jour tout seul ---
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end;
$$;
