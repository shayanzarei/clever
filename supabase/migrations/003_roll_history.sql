-- Append-only log of server-generated pool rolls for replay and debugging.

alter table public.games
  add column if not exists roll_history jsonb not null default '[]'::jsonb;
