-- =====================================================================
--  Lien — Partie 3 : réseau (invitations et contacts)
--  À coller dans Supabase > SQL Editor > New query, puis "Run".
--  (À exécuter APRÈS les scripts des parties 1 et 2.)
-- =====================================================================

-- Une ligne = une relation entre deux utilisateurs.
--   status = 'pending'  : invitation envoyée, pas encore acceptée
--   status = 'accepted' : les deux personnes sont en contact
-- Refuser, annuler ou retirer un contact = supprimer la ligne.
create table if not exists public.connections (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null,
  receiver_id   uuid not null,
  status        text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at    timestamptz not null default now(),

  -- Ces noms sont utilisés par l'application pour savoir quel profil charger.
  constraint connections_requester_id_fkey
    foreign key (requester_id) references public.profiles (id) on delete cascade,
  constraint connections_receiver_id_fkey
    foreign key (receiver_id) references public.profiles (id) on delete cascade,

  -- On ne peut pas s'inviter soi-même.
  check (requester_id <> receiver_id)
);

-- Une seule relation par paire de personnes, quel que soit le sens
-- (A→B et B→A comptent pour la même paire).
create unique index if not exists connections_pair_idx
  on public.connections (least(requester_id, receiver_id), greatest(requester_id, receiver_id));

create index if not exists connections_receiver_idx on public.connections (receiver_id);

-- Sécurité ------------------------------------------------------------
alter table public.connections enable row level security;

-- On ne voit que les relations qui nous concernent.
create policy "Voir ses relations"
  on public.connections for select
  to authenticated
  using (auth.uid() in (requester_id, receiver_id));

-- On peut envoyer une invitation seulement en son nom, et toujours "pending".
create policy "Envoyer une invitation"
  on public.connections for insert
  to authenticated
  with check (auth.uid() = requester_id and status = 'pending');

-- Seul le destinataire peut accepter.
create policy "Accepter une invitation reçue"
  on public.connections for update
  to authenticated
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id and status = 'accepted');

-- Les deux personnes peuvent supprimer la relation (refuser, annuler, retirer).
create policy "Supprimer une relation"
  on public.connections for delete
  to authenticated
  using (auth.uid() in (requester_id, receiver_id));
