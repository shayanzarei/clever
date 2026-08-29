import { NextResponse } from "next/server";
import type { Action } from "@/lib/engine/types";
import { applyGameAction } from "@/lib/server/game-repository";
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
      clientId?: string;
      action?: Action;
      expectedVersion?: number;
    };

    if (!body.clientId || !body.action || body.expectedVersion === undefined) {
      return NextResponse.json(
        { error: "clientId, action, and expectedVersion are required" },
        { status: 400 },
      );
    }

    const snapshot = await applyGameAction(
      code,
      body.clientId,
      body.action,
      body.expectedVersion,
    );
    return NextResponse.json(snapshot);
  } catch (error) {
    return jsonError(error);
  }
}
