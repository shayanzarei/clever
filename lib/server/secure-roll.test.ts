import { afterEach, describe, expect, it, vi } from "vitest";
import { rollPoolDiceSecure } from "@/lib/server/secure-roll";
import { createInitialDice } from "@/lib/engine/dice";

describe("rollPoolDiceSecure", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns integers from 1 to 6 for every pool die", () => {
    const faces = rollPoolDiceSecure(createInitialDice());
    expect(faces).toHaveLength(6);
    for (const face of faces) {
      expect(Number.isInteger(face.value)).toBe(true);
      expect(face.value).toBeGreaterThanOrEqual(1);
      expect(face.value).toBeLessThanOrEqual(6);
    }
  });

  it("rejects bytes >= 252 before mapping to die values", () => {
    const sequence = [252, 10, 5];
    let index = 0;
    vi.spyOn(crypto, "getRandomValues").mockImplementation((array) => {
      const bytes = array as Uint8Array;
      for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = sequence[index % sequence.length]!;
        index += 1;
      }
      return array;
    });

    const [first] = rollPoolDiceSecure(createInitialDice().slice(0, 1));
    expect(first?.value).toBe(5);
  });
});
