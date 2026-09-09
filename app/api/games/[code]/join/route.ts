import { NextResponse } from "next/server";
import { joinGame } from "@/lib/server/game-repository";
import { jsonError } from "@/lib/server/api-error";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured on the server" },
      { status: 503 },
    );
  }

  try {
    const { code } = await context.params;
    const body = (await request.json()) as {
      displayName?: string;
      clientId?: string;
    };

    if (!body.clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const result = await joinGame(code, body.displayName ?? "Player 2", body.clientId);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
