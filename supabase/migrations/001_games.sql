-- Pretty Clever online games (run in Supabase SQL editor or via CLI)

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  player_count integer not null default 2 check (player_count in (2, 3, 4)),
  state jsonb,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_members (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  player_id text not null check (player_id in ('p1', 'p2', 'p3', 'p4')),
  display_name text not null,
  client_id text not null,
  joined_at timestamptz not null default now(),
  unique (game_id, player_id),
  unique (game_id, client_id)
);

create index if not exists game_members_game_id_idx on public.game_members (game_id);
create index if not exists games_code_idx on public.games (code);

alter table public.games enable row level security;
alter table public.game_members enable row level security;

-- Clients may read games and members (realtime + initial fetch via anon key).
create policy "games_select_anon"
  on public.games for select
  to anon, authenticated
  using (true);

create policy "game_members_select_anon"
  on public.game_members for select
  to anon, authenticated
  using (true);

-- Mutations go through Next.js API routes using the service role key.

create or replace function public.touch_game_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists games_touch_updated_at on public.games;
create trigger games_touch_updated_at
  before update on public.games
  for each row
  execute function public.touch_game_updated_at();

-- Enable Realtime (required once per table; ignore errors if already added).
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_members;
