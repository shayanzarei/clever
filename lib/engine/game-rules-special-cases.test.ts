/**
 * Special cases:
 * 1. Passive may use active pad only when tray is unusable; cannot refuse tray to use pad.
 * 2. Active player who cannot use any rolled die still consumes one of 3 rolls.
 */
import { describe, expect, it } from "vitest";
import { poolDice } from "./dice";
import {
  dieHasLegalCross,
  mayUseActiveSlotFallback,
  trayHasUsableDie,
} from "./passive";
import { activePlayerId } from "./turn";
import { reduceWithInvariants as reduce } from "./test-reduce";
import { createEmptySheet } from "./sheet";
import { getSheetCrossOptions } from "@/lib/ui/cross-options";
import type { DieFace, Game } from "./types";

const FULL_ROLL: DieFace[] = [
  { color: "yellow", value: 2 },
  { color: "blue", value: 3 },
  { color: "green", value: 4 },
  { color: "orange", value: 5 },
  { color: "purple", value: 6 },
  { color: "white", value: 1 },
];

function startGame(): Game {
  return reduce({} as Game, {
    type: "START_GAME",
    playerCount: 2,
    playerNames: ["Alice", "Bob"],
  });
}

function roll(game: Game, values: readonly DieFace[]): Game {
  return reduce(game, { type: "ROLL", values });
}

describe("special case: passive slot fallback", () => {
  it("allows taking from the active pad when the tray is empty", () => {
    let game = startGame();
    game = {
      ...game,
      players: game.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              diceSlots: [{ color: "yellow", value: 2 }, null, null],
            }
          : player,
      ),
      dice: game.dice.map((die) =>
        die.color === "yellow"
          ? { ...die, location: "slot" as const, slotIndex: 0, value: 2 as const }
          : { ...die, location: "consumed" as const },
      ),
      phase: "passive_choose",
      activeRollCount: 3,
    };

    expect(mayUseActiveSlotFallback(game, "p2")).toBe(true);
    game = reduce(game, { type: "PASSIVE_TAKE", playerId: "p2", dieId: "die-yellow" });
    game = reduce(game, {
      type: "CROSS",
      playerId: "p2",
      color: "yellow",
      value: 2,
      targetIndex: 4,
    });

    expect(game.players[1].sheet.yellow.grid[1][0].crossed).toBe(true);
  });

  it("blocks taking from the active pad when the tray has a usable die", () => {
    let game = startGame();
    game = {
      ...game,
      phase: "passive_choose",
      activeRollCount: 3,
      dice: game.dice.map((die) =>
        die.color === "blue"
          ? { ...die, location: "tray" as const, value: 3 as const }
          : die.color === "white"
            ? { ...die, location: "tray" as const, value: 1 as const }
            : die.color === "yellow"
              ? { ...die, location: "slot" as const, slotIndex: 0, value: 2 as const }
              : { ...die, location: "tray" as const },
      ),
      players: game.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              diceSlots: [{ color: "yellow", value: 2 }, null, null],
            }
          : player,
      ),
    };

    expect(trayHasUsableDie(game, "p2")).toBe(true);
    expect(mayUseActiveSlotFallback(game, "p2")).toBe(false);
    expect(() =>
      reduce(game, { type: "PASSIVE_TAKE", playerId: "p2", dieId: "die-yellow" }),
    ).toThrow("Must take a usable die from the tray");
  });

  it("documents gap: passive may skip entirely while tray still has a usable die", () => {
    let game = startGame();
    game = {
      ...game,
      phase: "passive_choose",
      activeRollCount: 3,
      dice: game.dice.map((die) =>
        die.color === "blue"
          ? { ...die, location: "tray" as const, value: 3 as const }
          : die.color === "white"
            ? { ...die, location: "tray" as const, value: 1 as const }
            : { ...die, location: "tray" as const, value: 6 as const },
      ),
    };

    expect(trayHasUsableDie(game, "p2")).toBe(true);
    game = reduce(game, { type: "SKIP_EXTRA_DIE", playerId: "p2" });
    expect(game.activePlayerIndex).toBe(1);
    expect(game.phase).toBe("active_roll");
  });
});

describe("special case: active player cannot use any rolled die", () => {
  function unusableRollGame(): Game {
    const sheet = createEmptySheet();
    const fullYellow = sheet.yellow.grid.map((row) =>
      row.map((cell) => ({ ...cell, crossed: true })),
    );
    const fullGreen = sheet.green.boxes.map((box) => ({ ...box, crossed: true }));
    const fullBlue = sheet.blue.boxes.map((box) => ({ ...box, crossed: true }));
    const fullOrange = sheet.orange.boxes.map((box) => ({
      ...box,
      value: box.value ?? 6,
    }));
    const fullPurple = sheet.purple.boxes.map((box) => ({ ...box, value: 6 }));

    let game = startGame();
    game = {
      ...game,
      players: game.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              sheet: {
                ...player.sheet,
                yellow: { ...player.sheet.yellow, grid: fullYellow },
                green: { boxes: fullGreen },
                blue: { boxes: fullBlue },
                orange: { boxes: fullOrange },
                purple: { boxes: fullPurple },
              },
            }
          : player,
      ),
    };

    return roll(game, [
      { color: "yellow", value: 2 },
      { color: "blue", value: 3 },
      { color: "green", value: 1 },
      { color: "orange", value: 1 },
      { color: "purple", value: 1 },
      { color: "white", value: 1 },
    ]);
  }

  it("can reach a rolled state with no legal marks", () => {
    const game = unusableRollGame();
    const player = game.players[0]!;

    expect(game.phase).toBe("active_choose");
    expect(
      poolDice(game.dice).every(
        (die) => !dieHasLegalCross(player.sheet, game.dice, die.id),
      ),
    ).toBe(true);
    expect(getSheetCrossOptions(game, "p1")).toEqual([]);
  });

  it("does not expose a skip-roll action that consumes one roll", () => {
    const game = unusableRollGame();

    expect(game.activeRollCount).toBe(0);
    expect(() =>
      reduce(game, { type: "SKIP_EXTRA_DIE", playerId: "p1" }),
    ).toThrow("SKIP_EXTRA_DIE is only allowed during extra-die phase");
  });

  it("consumes one roll and continues when no pool die can be marked", () => {
    let game = unusableRollGame();
    expect(game.activeRollCount).toBe(0);

    game = reduce(game, { type: "SKIP_ROLL", playerId: "p1" });
    expect(game.activeRollCount).toBe(1);
    expect(game.phase).toBe("active_roll");
    expect(poolDice(game.dice)).toHaveLength(6);
  });

  it("rejects skip-roll when a pool die is still markable", () => {
    const game = roll(startGame(), FULL_ROLL);
    expect(() => reduce(game, { type: "SKIP_ROLL", playerId: "p1" })).toThrow(
      "At least one pool die can still be marked",
    );
  });

  it("ends the active turn after three passed or played rolls", () => {
    let game = unusableRollGame();
    game = reduce(game, { type: "SKIP_ROLL", playerId: "p1" });
    game = roll(game, [
      { color: "yellow", value: 2 },
      { color: "blue", value: 3 },
      { color: "green", value: 1 },
      { color: "orange", value: 1 },
      { color: "purple", value: 1 },
      { color: "white", value: 1 },
    ]);
    game = reduce(game, { type: "SKIP_ROLL", playerId: "p1" });
    game = roll(game, [
      { color: "yellow", value: 2 },
      { color: "blue", value: 3 },
      { color: "green", value: 1 },
      { color: "orange", value: 1 },
      { color: "purple", value: 1 },
      { color: "white", value: 1 },
    ]);
    game = reduce(game, { type: "SKIP_ROLL", playerId: "p1" });

    expect(game.activeRollCount).toBe(3);
    expect(game.phase).toBe("passive_choose");
    expect(poolDice(game.dice)).toHaveLength(0);
  });
});
