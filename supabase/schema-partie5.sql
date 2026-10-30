-- =====================================================================
--  Lien — Partie 5 : notifications push
--  À coller dans Supabase > SQL Editor > New query, puis "Run".
--  (À exécuter APRÈS les scripts des parties 1 à 4.)
--
--  Principe : l'application enregistre l'identifiant de notification du téléphone
--  (le "push token") ; des triggers SQL appellent ensuite le service gratuit
--  Expo Push pour prévenir la bonne personne (nouveau message, invitation reçue,
--  invitation acceptée). Aucun serveur à déployer.
-- =====================================================================

-- 0) Extension qui permet à Postgres d'appeler une URL -------------------
create extension if not exists pg_net with schema extensions;

-- 1) Table des tokens (un utilisateur peut avoir plusieurs téléphones) ----
create table if not exists public.push_tokens (
  token       text primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  platform    text,
  updated_at  timestamptz not null default now()
);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

-- RLS activée sans politique : personne ne lit ni n'écrit directement,
-- tout passe par les fonctions ci-dessous.
alter table public.push_tokens enable row level security;

-- 2) Enregistrer / retirer le token du téléphone actuel -------------------
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  -- Si le téléphone était lié à un autre compte, il passe au compte actuel.
  insert into public.push_tokens (token, user_id, platform, updated_at)
  values (p_token, auth.uid(), p_platform, now())
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        updated_at = now();
end;
$$;

create or replace function public.unregister_push_token(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
$$;

grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

-- 3) Envoi d'une notification à tous les téléphones d'un utilisateur -------
create or replace function public.send_push(target_user uuid, p_title text, p_body text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb;
begin
  select jsonb_agg(jsonb_build_object(
           'to', token,
           'title', p_title,
           'body', p_body,
           'data', p_data,
           'sound', 'default'
         ))
    into payload
    from public.push_tokens
   where user_id = target_user;

  if payload is null then
    return; -- aucun téléphone enregistré
  end if;

  perform net.http_post(
    url     := 'https://exp.host/--/api/v2/push/send',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := payload
  );
end;
$$;

-- Cette fonction ne doit être appelée que par les triggers, jamais par l'application.
revoke all on function public.send_push(uuid, text, text, jsonb) from public, anon, authenticated;

-- 4) Trigger : nouveau message -------------------------------------------
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
  sender_name text;
begin
  select case when c.user_a = new.sender_id then c.user_b else c.user_a end
    into recipient
    from public.conversations c
   where c.id = new.conversation_id;

  select coalesce(nullif(p.full_name, ''), p.username)
    into sender_name
    from public.profiles p
   where p.id = new.sender_id;

  if recipient is not null then
    perform public.send_push(
      recipient,
      sender_name,
      left(new.content, 100),
      jsonb_build_object('type', 'message', 'conversation_id', new.conversation_id)
    );
  end if;

  return new;
exception
  when others then
    return new; -- un problème de notification ne doit jamais bloquer l'envoi du message
end;
$$;

drop trigger if exists on_message_push on public.messages;
create trigger on_message_push
  after insert on public.messages
  for each row execute function public.notify_new_message();

-- 5) Trigger : invitation reçue / invitation acceptée ----------------------
create or replace function public.notify_connection_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
  if tg_op = 'INSERT' then
    select coalesce(nullif(p.full_name, ''), p.username) into actor_name
      from public.profiles p where p.id = new.requester_id;

    perform public.send_push(
      new.receiver_id,
      'Nouvelle invitation',
      actor_name || ' souhaite se connecter avec toi.',
      jsonb_build_object('type', 'invitation')
    );

  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
    select coalesce(nullif(p.full_name, ''), p.username) into actor_name
      from public.profiles p where p.id = new.receiver_id;

    perform public.send_push(
      new.requester_id,
      'Invitation acceptée',
      actor_name || ' a accepté ton invitation.',
      jsonb_build_object('type', 'accepted')
    );
  end if;

  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists on_connection_push on public.connections;
create trigger on_connection_push
  after insert or update on public.connections
  for each row execute function public.notify_connection_change();
