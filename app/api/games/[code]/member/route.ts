import { NextResponse } from "next/server";
import { updateMemberDisplayName } from "@/lib/server/game-repository";
import { jsonError } from "@/lib/server/api-error";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ code: string }>;
};

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
      displayName?: string;
    };

    if (!body.clientId || body.displayName === undefined) {
      return NextResponse.json(
        { error: "clientId and displayName are required" },
        { status: 400 },
      );
    }

    const snapshot = await updateMemberDisplayName(code, body.clientId, body.displayName);
    return NextResponse.json(snapshot);
  } catch (error) {
    return jsonError(error);
  }
}
