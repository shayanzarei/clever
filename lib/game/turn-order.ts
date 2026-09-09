import type { PlayerSeatId } from "@/lib/game/player-seats";

export type LobbyTurnOrderState = {
  kind: "turn_order";
  seats: PlayerSeatId[];
};

const RANK_LABELS = ["First", "Second", "Third", "Fourth"] as const;
const ACCENTS = [
  "var(--color-neon-yellow)",
  "var(--color-neon-blue)",
  "var(--color-neon-green)",
  "var(--color-neon-orange)",
] as const;

export function shuffleSeats<T>(items: readonly T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = next[index]!;
    next[index] = next[swap]!;
    next[swap] = current;
  }
  return next;
}

export function rankLabel(index: number): string {
  return RANK_LABELS[index] ?? `${index + 1}`;
}

export function seatAccent(index: number): string {
  return ACCENTS[index] ?? ACCENTS[0];
}

export function isLobbyTurnOrderState(value: unknown): value is LobbyTurnOrderState {
  if (!value || typeof value !== "object" || !("kind" in value)) {
    return false;
  }
  const candidate = value as LobbyTurnOrderState;
  return (
    candidate.kind === "turn_order" &&
    Array.isArray(candidate.seats) &&
    candidate.seats.every((seat) => /^p[1-4]$/.test(seat))
  );
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}
