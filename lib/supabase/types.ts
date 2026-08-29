import type { Game } from "@/lib/engine/types";
import type { PlayerCount, PlayerSeatId } from "@/lib/game/player-seats";

export type GameStatus = "lobby" | "playing" | "finished";

export type GameRow = {
  id: string;
  code: string;
  status: GameStatus;
  player_count: PlayerCount;
  state: Game | null;
  version: number;
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
};
