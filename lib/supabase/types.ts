import type { Game } from "@/lib/engine/types";
import type { PlayerCount, PlayerSeatId } from "@/lib/game/player-seats";
import type { RollHistoryEntry } from "@/lib/game/roll-history";
import type { LobbyTurnOrderState } from "@/lib/game/turn-order";

export type { RollHistoryEntry } from "@/lib/game/roll-history";

export type GameStatus = "lobby" | "playing" | "finished";

export type GameRow = {
  id: string;
  code: string;
  status: GameStatus;
  player_count: PlayerCount;
  state: Game | LobbyTurnOrderState | null;
  version: number;
  roll_history: RollHistoryEntry[] | unknown;
  created_at: string;
  updated_at: string;
};

export type GameMemberRow = {
  id: string;
  game_id: string;
  player_id: PlayerSeatId;
  display_name: string;
  client_id: string;
  joined_at: string;
};

export type GameSnapshot = {
  id: string;
  code: string;
  status: GameStatus;
  playerCount: PlayerCount;
  state: Game | null;
  version: number;
  members: GameMemberRow[];
  /** Shared seat order while still in lobby; first entry goes first. */
  turnOrder: PlayerSeatId[] | null;
};
