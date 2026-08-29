import { NextResponse } from "next/server";
import { getGameSnapshot, updateGamePlayerCount } from "@/lib/server/game-repository";
import { jsonError } from "@/lib/server/api-error";
import { isPlayerCount } from "@/lib/game/player-seats";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured on the server" },
      { status: 503 },
    );
  }

  try {
    const { code } = await context.params;
    const snapshot = await getGameSnapshot(code);
    return NextResponse.json(snapshot);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured on the server" },
      { status: 503 },
    );
  }

  try {
    const { code } = await context.params;
    const body = (await request.json()) as {
      clientId?: string;
      playerCount?: number;
    };

    if (!body.clientId || body.playerCount === undefined) {
      return NextResponse.json(
        { error: "clientId and playerCount are required" },
        { status: 400 },
      );
    }

    if (!isPlayerCount(body.playerCount)) {
      return NextResponse.json({ error: "playerCount must be 2, 3, or 4" }, { status: 400 });
    }

    const snapshot = await updateGamePlayerCount(code, body.clientId, body.playerCount);
    return NextResponse.json(snapshot);
  } catch (error) {
    return jsonError(error);
  }
}
