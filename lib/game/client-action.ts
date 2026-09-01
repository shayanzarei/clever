import type { Action } from "@/lib/engine/types";

/** Wire format for online play — ROLL / USE_REROLL never carry die faces. */
export type ClientAction =
  | Exclude<Action, { type: "ROLL" } | { type: "USE_REROLL" }>
  | { type: "ROLL" }
  | { type: "USE_REROLL"; playerId: string };
