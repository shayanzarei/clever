import type { DieFace, DieState, DieValue } from "@/lib/engine/types";

/** Reject bytes >= 252 so `byte % 6` is uniform (252 = 42 × 6). */
const REJECTION_THRESHOLD = 252;

function secureDieValue(): DieValue {
  const bytes = new Uint8Array(1);
  while (true) {
    crypto.getRandomValues(bytes);
    const byte = bytes[0]!;
    if (byte >= REJECTION_THRESHOLD) {
      continue;
    }
    return ((byte % 6) + 1) as DieValue;
  }
}

/** Server-side pool roll using a CSPRNG (online play only). */
export function rollPoolDiceSecure(pool: readonly DieState[]): DieFace[] {
  return pool.map((die) => ({
    color: die.color,
    value: secureDieValue(),
  }));
}
