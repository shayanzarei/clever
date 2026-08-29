# Supabase setup

1. Create a project at [supabase.com](https://supabase.com).

2. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API → service_role)

3. Run the migrations in the Supabase SQL editor:
   - `supabase/migrations/001_games.sql`
   - `supabase/migrations/002_player_count.sql` (skip if 001 already includes player_count)

4. Confirm **Realtime** is enabled for the `games` table (Database → Replication).

5. Start the app: `npm run dev`

## Architecture

- **Reads**: browser subscribes to `postgres_changes` on `games` for live state.
- **Writes**: Next.js API routes use the service role to apply `reduce()` server-side with optimistic locking (`version` column).
- **Auth**: anonymous `client_id` in localStorage; each client owns one seat (`p1` / `p2`) per room.
