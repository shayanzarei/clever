import type { DieFace, DieState, DieValue } from "@/lib/engine/types";

function randomDieValue(): DieValue {
  return (Math.floor(Math.random() * 6) + 1) as DieValue;
}

/** Client-side roll for pool dice (engine never calls Math.random). */
export function rollPoolDice(pool: readonly DieState[]): DieFace[] {
  return pool.map((die) => ({
    color: die.color,
    value: randomDieValue(),
  }));
}
