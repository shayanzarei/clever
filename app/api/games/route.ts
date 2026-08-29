import { NextResponse } from "next/server";
import { createGame } from "@/lib/server/game-repository";
import { jsonError } from "@/lib/server/api-error";
import { isPlayerCount } from "@/lib/game/player-seats";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured on the server" },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as {
      displayName?: string;
      clientId?: string;
      playerCount?: number;
    };

    if (!body.clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const playerCount =
      body.playerCount && isPlayerCount(body.playerCount) ? body.playerCount : 2;

    const result = await createGame(
      body.displayName ?? "Player 1",
      body.clientId,
      playerCount,
    );
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
