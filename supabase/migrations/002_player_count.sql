-- Extend online rooms to 2–4 players (run after 001_games.sql).

alter table public.games
  add column if not exists player_count integer not null default 2
  check (player_count in (2, 3, 4));

alter table public.game_members drop constraint if exists game_members_player_id_check;
alter table public.game_members
  add constraint game_members_player_id_check
  check (player_id in ('p1', 'p2', 'p3', 'p4'));
