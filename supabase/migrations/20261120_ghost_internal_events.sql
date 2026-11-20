create table if not exists public.ghost_internal_events (
  event_id text primary key check (char_length(event_id) between 8 and 200),
  body_hash text not null check (body_hash ~ '^[a-f0-9]{64}$'),
  status text not null check (status in ('processing', 'completed', 'failed')),
  interaction_id text,
  lease_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ghost_internal_events_created_at_idx
  on public.ghost_internal_events (created_at);

alter table public.ghost_internal_events enable row level security;
revoke all on table public.ghost_internal_events from anon, authenticated;
grant all on table public.ghost_internal_events to service_role;
