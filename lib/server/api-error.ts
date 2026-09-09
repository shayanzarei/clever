import { NextResponse } from "next/server";
import { GameRepositoryError } from "@/lib/server/game-repository";

export function jsonError(error: unknown) {
  if (error instanceof GameRepositoryError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        snapshot: error.snapshot,
      },
      { status: error.status },
    );
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
}
