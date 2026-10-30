-- =====================================================================
--  Lien — Partie 4 : messagerie (conversations + messages en temps réel)
--  À coller dans Supabase > SQL Editor > New query, puis "Run".
--  (À exécuter APRÈS les scripts des parties 1, 2 et 3.)
-- =====================================================================

-- 0) Fonction utilitaire : "ces deux personnes sont-elles en contact ?" ---
-- security definer = la fonction lit la table connections avec ses propres droits.
-- On ne répond que si la personne connectée est l'une des deux.
create or replace function public.are_connected(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() in (a, b)
     and exists (
       select 1 from public.connections c
       where c.status = 'accepted'
         and ((c.requester_id = a and c.receiver_id = b)
           or (c.requester_id = b and c.receiver_id = a))
     );
$$;

-- 1) Conversations (une par paire de personnes) -------------------------
create table if not exists public.conversations (
  id                    uuid primary key default gen_random_uuid(),
  user_a                uuid not null,
  user_b                uuid not null,
  last_message_at       timestamptz not null default now(),
  last_message_preview  text,
  created_at            timestamptz not null default now(),

  constraint conversations_user_a_fkey
    foreign key (user_a) references public.profiles (id) on delete cascade,
  constraint conversations_user_b_fkey
    foreign key (user_b) references public.profiles (id) on delete cascade,

  check (user_a <> user_b)
);

-- Une seule conversation par paire, quel que soit l'ordre.
create unique index if not exists conversations_pair_idx
  on public.conversations (least(user_a, user_b), greatest(user_a, user_b));

alter table public.conversations enable row level security;

-- On ne voit que ses propres conversations.
-- (Pas de politique d'écriture : les conversations se créent uniquement via start_conversation.)
create policy "Voir ses conversations"
  on public.conversations for select
  to authenticated
  using (auth.uid() in (user_a, user_b));

-- 2) Messages -----------------------------------------------------------
create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  sender_id        uuid not null references public.profiles (id) on delete cascade,
  content          text not null check (char_length(content) between 1 and 1000),
  created_at       timestamptz not null default now(),
  read_at          timestamptz  -- rempli quand le destinataire ouvre la conversation
);

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at desc);

alter table public.messages enable row level security;

create policy "Lire les messages de ses conversations"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.user_a, c.user_b)
    )
  );

-- On écrit en son nom, dans sa conversation, et seulement si on est toujours en contact.
create policy "Envoyer un message"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.user_a, c.user_b)
        and public.are_connected(c.user_a, c.user_b)
    )
  );

-- 3) Mise à jour automatique de la conversation à chaque message ----------
create or replace function public.handle_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
     set last_message_at = new.created_at,
         last_message_preview = left(new.content, 80)
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute function public.handle_new_message();

-- 4) Démarrer (ou retrouver) une conversation avec un contact -------------
create or replace function public.start_conversation(other_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  conv_id uuid;
begin
  if me is null or me = other_id then
    raise exception 'invalid_request';
  end if;

  if not public.are_connected(me, other_id) then
    raise exception 'not_connected';
  end if;

  select id into conv_id
    from public.conversations
   where least(user_a, user_b) = least(me, other_id)
     and greatest(user_a, user_b) = greatest(me, other_id);

  if conv_id is null then
    insert into public.conversations (user_a, user_b)
    values (me, other_id)
    on conflict do nothing
    returning id into conv_id;

    -- Cas rare : l'autre personne vient de la créer en même temps.
    if conv_id is null then
      select id into conv_id
        from public.conversations
       where least(user_a, user_b) = least(me, other_id)
         and greatest(user_a, user_b) = greatest(me, other_id);
    end if;
  end if;

  return conv_id;
end;
$$;

-- 5) Marquer comme lus les messages reçus dans une conversation ----------
create or replace function public.mark_conversation_read(conv_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.messages m
     set read_at = now()
   where m.conversation_id = conv_id
     and m.sender_id <> auth.uid()
     and m.read_at is null
     and exists (
       select 1 from public.conversations c
       where c.id = conv_id and auth.uid() in (c.user_a, c.user_b)
     );
$$;

-- Seuls les utilisateurs connectés peuvent appeler ces fonctions.
revoke all on function public.start_conversation(uuid) from public;
revoke all on function public.mark_conversation_read(uuid) from public;
grant execute on function public.start_conversation(uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- 6) Temps réel : diffuser les nouveaux messages aux applications ---------
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end;
$$;
