import type { DieFace } from "@/lib/engine/types";

export type RollHistoryEntry = {
  action: "ROLL" | "USE_REROLL";
  playerId?: string;
  values: DieFace[];
  gameVersion: number;
};
