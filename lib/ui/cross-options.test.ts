import { describe, expect, it } from "vitest";
import { reduce } from "@/lib/engine/reduce";
import type { DieFace, Game } from "@/lib/engine/types";
import { crossOptionKey, getSheetCrossOptions } from "./cross-options";

const ROLL: DieFace[] = [
  { color: "yellow", value: 2 },
  { color: "blue", value: 3 },
  { color: "green", value: 4 },
  { color: "orange", value: 5 },
  { color: "purple", value: 6 },
  { color: "white", value: 1 },
];

function gameWithChosenDie(dieId: string): Game {
  let game = reduce({} as Game, {
    type: "START_GAME",
    playerCount: 2,
    playerNames: ["Alice", "Bob"],
  });
  game = reduce(game, { type: "ROLL", values: ROLL });
  return reduce(game, {
    type: "CHOOSE_DIE",
    playerId: "p1",
    dieId,
    slotIndex: 0,
  });
}

describe("getSheetCrossOptions", () => {
  it("offers every yellow cell matching the chosen die", () => {
    const game = gameWithChosenDie("die-yellow");
    const options = getSheetCrossOptions(game, "p1");
    const sheet = game.players[0].sheet;

    expect(options.length).toBeGreaterThan(0);
    for (const option of options) {
      expect(option.color).toBe("yellow");
      const row = Math.floor(option.targetIndex / 4);
      const col = option.targetIndex % 4;
      expect(sheet.yellow.grid[row][col].value).toBe(2);
    }
  });

  it("offers the blue box whose sum matches blue + white", () => {
    const game = gameWithChosenDie("die-blue");
    const options = getSheetCrossOptions(game, "p1");
    const sheet = game.players[0].sheet;

    expect(options.length).toBeGreaterThan(0);
    for (const option of options) {
      expect(option.color).toBe("blue");
      expect(sheet.blue.boxes[option.targetIndex].sum).toBe(4);
    }
  });

  it("offers the next green box for a die above its threshold", () => {
    const game = gameWithChosenDie("die-green");
    const options = getSheetCrossOptions(game, "p1");

    expect(options).toEqual([
      { color: "green", value: 4, targetIndex: 0 },
    ]);
  });

  it("keys options by box so the die face cannot desync the sheet", () => {
    const game = gameWithChosenDie("die-green");
    const [option] = getSheetCrossOptions(game, "p1");

    expect(crossOptionKey(option)).toBe("green:0");
    expect(crossOptionKey({ color: "green", targetIndex: 0 })).toBe("green:0");
  });

  it("offers every uncrossed blue box for a free blue-x bonus", () => {
    let game = reduce({} as Game, {
      type: "START_GAME",
      playerCount: 2,
      playerNames: ["Alice", "Bob"],
    });
    game = reduce(game, { type: "ROLL", values: ROLL });
    game = reduce(game, {
      type: "CHOOSE_DIE",
      playerId: "p1",
      dieId: "die-yellow",
      slotIndex: 0,
    });
    const sheet = game.players[0].sheet;
    game = {
      ...game,
      pending: [{ type: "cross_blue_free" }],
      pendingPlayerId: "p1",
      phase: "resolve_pending",
      players: game.players.map((player) =>
        player.id === "p1"
          ? {
              ...player,
              sheet: {
                ...sheet,
                blue: {
                  boxes: sheet.blue.boxes.map((box, index) =>
                    index === 5 ? { ...box, crossed: true } : box,
                  ),
                },
              },
            }
          : player,
      ),
    };

    const options = getSheetCrossOptions(game, "p1");

    expect(options.every((option) => option.color === "blue")).toBe(true);
    expect(options.map((option) => option.targetIndex)).toEqual([
      0, 1, 2, 3, 4, 6, 7, 8, 9, 10,
    ]);
    expect(options.every((option) => option.blueDie === undefined)).toBe(true);
    expect(options.find((option) => option.value === 5)).toBeDefined();
    expect(options.find((option) => option.value === 12)).toBeDefined();
  });
});
