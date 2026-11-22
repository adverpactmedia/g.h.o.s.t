create table if not exists public.ghost_rate_limits (
  bucket_key text primary key check (bucket_key ~ '^[a-f0-9]{64}$'),
  hit_count integer not null check (hit_count >= 1),
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.ghost_rate_limits enable row level security;
revoke all on table public.ghost_rate_limits from anon, authenticated;
grant all on table public.ghost_rate_limits to service_role;

create or replace function public.ghost_consume_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  retry_after integer,
  hit_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
  current_reset timestamptz;
begin
  if p_bucket_key !~ '^[a-f0-9]{64}$'
     or p_limit < 1 or p_limit > 10000
     or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate limit arguments';
  end if;

  -- Opportunistically remove expired buckets so the shared table does not
  -- grow without bound. Cast before abs() to avoid int32-minimum overflow.
  if mod(abs(hashtext(p_bucket_key)::bigint), 1000) = 0 then
    delete from public.ghost_rate_limits
    where reset_at < now() - interval '1 day';
  end if;

  insert into public.ghost_rate_limits (bucket_key, hit_count, reset_at, updated_at)
  values (
    p_bucket_key,
    1,
    now() + make_interval(secs => p_window_seconds),
    now()
  )
  on conflict (bucket_key) do update
  set
    hit_count = case
      when public.ghost_rate_limits.reset_at <= now() then 1
      else public.ghost_rate_limits.hit_count + 1
    end,
    reset_at = case
      when public.ghost_rate_limits.reset_at <= now()
        then now() + make_interval(secs => p_window_seconds)
      else public.ghost_rate_limits.reset_at
    end,
    updated_at = now()
  returning public.ghost_rate_limits.hit_count, public.ghost_rate_limits.reset_at
  into current_count, current_reset;

  return query
  select
    current_count <= p_limit,
    greatest(1, ceil(extract(epoch from (current_reset - now())))::integer),
    current_count;
end;
$$;

revoke all on function public.ghost_consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.ghost_consume_rate_limit(text, integer, integer) to service_role;
