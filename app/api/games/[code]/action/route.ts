import { NextResponse } from "next/server";
import { applyGameAction } from "@/lib/server/game-repository";
import { parseClientAction } from "@/lib/server/client-action";
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
      action?: unknown;
      expectedVersion?: number;
    };

    if (!body.clientId || !body.action || body.expectedVersion === undefined) {
      return NextResponse.json(
        { error: "clientId, action, and expectedVersion are required" },
        { status: 400 },
      );
    }

    let clientAction;
    try {
      clientAction = parseClientAction(body.action);
    } catch (cause) {
      return NextResponse.json(
        { error: cause instanceof Error ? cause.message : "Invalid action" },
        { status: 400 },
      );
    }

    const snapshot = await applyGameAction(
      code,
      body.clientId,
      clientAction,
      body.expectedVersion,
    );
    return NextResponse.json(snapshot);
  } catch (error) {
    return jsonError(error);
  }
}
