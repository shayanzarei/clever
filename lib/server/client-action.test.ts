import { describe, expect, it } from "vitest";
import { parseClientAction, toEngineAction } from "@/lib/server/client-action";
import { reduce } from "@/lib/engine/reduce";
import type { Game } from "@/lib/engine/types";

function startedGame(): Game {
  return reduce({} as Game, {
    type: "START_GAME",
    playerCount: 2,
    playerNames: ["Alice", "Bob"],
  });
}

describe("parseClientAction", () => {
  it("accepts ROLL without values", () => {
    expect(parseClientAction({ type: "ROLL" })).toEqual({ type: "ROLL" });
  });

  it("rejects ROLL with client-supplied values", () => {
    expect(() =>
      parseClientAction({
        type: "ROLL",
        values: [{ color: "yellow", value: 6 }],
      }),
    ).toThrow("ROLL must not include client-supplied values");
  });

  it("accepts USE_REROLL without values", () => {
    expect(parseClientAction({ type: "USE_REROLL", playerId: "p1" })).toEqual({
      type: "USE_REROLL",
      playerId: "p1",
    });
  });

  it("rejects USE_REROLL with client-supplied values", () => {
    expect(() =>
      parseClientAction({
        type: "USE_REROLL",
        playerId: "p1",
        values: [{ color: "yellow", value: 6 }],
      }),
    ).toThrow("USE_REROLL must not include client-supplied values");
  });
});

describe("toEngineAction", () => {
  it("injects one value per pool die for ROLL", () => {
    const game = startedGame();
    const engineAction = toEngineAction(game, { type: "ROLL" });
    expect(engineAction.type).toBe("ROLL");
    if (engineAction.type !== "ROLL") {
      return;
    }
    expect(engineAction.values).toHaveLength(6);
    for (const face of engineAction.values) {
      expect(face.value).toBeGreaterThanOrEqual(1);
      expect(face.value).toBeLessThanOrEqual(6);
    }
  });
});
