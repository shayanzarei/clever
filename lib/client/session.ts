import type { PlayerSeatId } from "@/lib/game/player-seats";
import { isPlayerSeatId } from "@/lib/game/player-seats";

const CLIENT_ID_KEY = "pretty-clever-client-id";

export function getClientId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  let clientId = localStorage.getItem(CLIENT_ID_KEY);
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }
  return clientId;
}

function playerIdKey(code: string): string {
  return `pretty-clever:${code.toUpperCase()}:playerId`;
}

export function getStoredPlayerId(code: string): PlayerSeatId | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = sessionStorage.getItem(playerIdKey(code));
  return value && isPlayerSeatId(value) ? value : null;
}

export function storePlayerId(code: string, playerId: PlayerSeatId): void {
  sessionStorage.setItem(playerIdKey(code), playerId);
}
