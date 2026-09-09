export type PlayerSeatId = "p1" | "p2" | "p3" | "p4";
export type PlayerCount = 2 | 3 | 4;

export const PLAYER_SEATS: readonly PlayerSeatId[] = ["p1", "p2", "p3", "p4"];
export const PLAYER_COUNTS: readonly PlayerCount[] = [2, 3, 4];

export function isPlayerSeatId(value: string): value is PlayerSeatId {
  return PLAYER_SEATS.includes(value as PlayerSeatId);
}

export function isPlayerCount(value: number): value is PlayerCount {
  return value === 2 || value === 3 || value === 4;
}

export function seatsForCount(count: PlayerCount): PlayerSeatId[] {
  return PLAYER_SEATS.slice(0, count);
}

export function nextAvailableSeat(
  taken: ReadonlySet<PlayerSeatId>,
  maxCount: PlayerCount,
): PlayerSeatId | null {
  for (const seat of seatsForCount(maxCount)) {
    if (!taken.has(seat)) {
      return seat;
    }
  }
  return null;
}

export function defaultDisplayName(seat: PlayerSeatId): string {
  return `Player ${seat.slice(1)}`;
}

export function seatLabel(seat: PlayerSeatId, isHost = false): string {
  if (isHost) {
    return "Host";
  }
  return `Player ${seat.slice(1)}`;
}
