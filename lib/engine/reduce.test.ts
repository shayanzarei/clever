import { describe, expect, it } from "vitest";
import {
  applyBlueCross,
  applyGreenCross,
  applyOrangeFill,
  applyPurpleFill,
} from "./apply";
import { resetDiceToPool } from "./dice";
import { createEmptySheet } from "./sheet";
import { reduce } from "./reduce";
import type { Action, DieFace, DieValue, Game } from "./types";

type CrossAction = Extract<Action, { type: "CROSS" }>;

function startTwoPlayerGame(): Game {
  return reduce({} as Game, {
    type: "START_GAME",
    playerCount: 2,
    playerNames: ["Alice", "Bob"],
  });
}

function withSheet(
  game: Game,
  playerId: string,
  sheet: ReturnType<typeof createEmptySheet>,
): Game {
  return {
    ...game,
    players: game.players.map((player) =>
      player.id === playerId ? { ...player, sheet } : player,
    ),
  };
}

const DEFAULT_FACES: DieFace[] = [
  { color: "yellow", value: 2 },
  { color: "blue", value: 3 },
  { color: "green", value: 4 },
  { color: "orange", value: 5 },
  { color: "purple", value: 6 },
  { color: "white", value: 1 },
];

function resetTurnForNextCross(game: Game): Game {
  return {
    ...game,
    phase: "active_roll",
    activeRollCount: 0,
    awaitingCross: null,
    passiveCompletedPlayerIds: [],
    roundBonusPendingPlayerIds: [],
    extraDieUsedIds: [],
    extraDieActionsUsed: {},
    players: game.players.map((player) => ({
      ...player,
      diceSlots: [null, null, null],
      passiveDieId: null,
    })),
    dice: resetDiceToPool(game.dice),
  };
}

function rollValuesForCross(cross: CrossAction): DieFace[] {
  const defaults = Object.fromEntries(
    DEFAULT_FACES.map((face) => [face.color, face.value]),
  ) as Record<DieFace["color"], DieValue>;

  return DEFAULT_FACES.map((face) => {
    if (cross.color === "yellow") {
      if (face.color === "yellow" || face.color === "white") {
        return { ...face, value: cross.value as DieValue };
      }
    } else if (cross.color === "blue") {
      if (face.color === "blue") {
        return { ...face, value: cross.blueDie };
      }
      if (face.color === "white") {
        return { ...face, value: cross.whiteDie };
      }
    } else if (face.color === cross.color) {
      return { ...face, value: cross.value as DieValue };
    }

    return { ...face, value: defaults[face.color] };
  });
}

function dieIdForCross(cross: CrossAction): string {
  if (cross.color === "yellow") {
    return "die-yellow";
  }
  if (cross.color === "blue") {
    return "die-blue";
  }
  return `die-${cross.color}`;
}

/** Sets up ROLL → CHOOSE_DIE → CROSS for bonus-chain tests. Resets turn state between crosses. */
function performCross(game: Game, cross: CrossAction): Game {
  if (game.pending.length > 0 && game.pendingPlayerId === cross.playerId) {
    return reduce(game, cross);
  }

  let next = resetTurnForNextCross(game);
  next = reduce(next, { type: "ROLL", values: rollValuesForCross(cross) });

  const player = next.players.find((entry) => entry.id === cross.playerId)!;
  const slotIndex = player.diceSlots.findIndex((slot) => slot === null);

  next = reduce(next, {
    type: "CHOOSE_DIE",
    playerId: cross.playerId,
    dieId: dieIdForCross(cross),
    slotIndex,
  });

  return reduce(next, cross);
}

describe("reduce bonus chains", () => {
  it("starts a game with empty pending queue", () => {
    const game = startTwoPlayerGame();
    expect(game.pending).toEqual([]);
    expect(game.pendingPlayerId).toBeNull();
    expect(game.players).toHaveLength(2);
  });

  it("queues cross_blue_free when yellow row 0 is completed", () => {
    let game = startTwoPlayerGame();
    for (const [index, value] of [
      [0, 3],
      [1, 6],
      [2, 5],
    ] as const) {
      game = performCross(game, {
        type: "CROSS",
        playerId: "p1",
        color: "yellow",
        value,
        targetIndex: index,
      });
    }

    expect(game.pending[0]).toEqual({ type: "cross_blue_free" });
    expect(game.pendingPlayerId).toBe("p1");
    expect(game.phase).toBe("resolve_pending");
  });

  it("auto-fills orange when yellow row 1 completes", () => {
    let game = startTwoPlayerGame();

    for (const [index, value] of [
      [4, 2],
      [5, 1],
      [7, 5],
    ] as const) {
      game = performCross(game, {
        type: "CROSS",
        playerId: "p1",
        color: "yellow",
        value,
        targetIndex: index,
      });
    }

    expect(game.players[0].sheet.orange.boxes[0].value).toBe(4);
    expect(game.pending).toEqual([]);
  });

  it("chains yellow row 0 bonus into a pending blue cross", () => {
    let game = startTwoPlayerGame();

    for (const [index, value] of [
      [0, 3],
      [1, 6],
      [2, 5],
    ] as const) {
      game = performCross(game, {
        type: "CROSS",
        playerId: "p1",
        color: "yellow",
        value,
        targetIndex: index,
      });
    }

    expect(game.pending[0]).toEqual({ type: "cross_blue_free" });

    let sheet = game.players[0].sheet;
    sheet = applyBlueCross(sheet, 1).sheet;
    sheet = applyBlueCross(sheet, 9).sheet;
    game = withSheet(game, "p1", sheet);

    game = performCross(game, {
      type: "CROSS",
      playerId: "p1",
      color: "blue",
      blueDie: 3,
      whiteDie: 4,
      targetIndex: 5,
    });

    expect(game.players[0].sheet.blue.boxes[5].crossed).toBe(true);
    expect(game.players[0].sheet.purple.boxes[0].value).toBe(6);
    expect(game.pending).toEqual([]);
  });

  it("auto-applies cross_green_bonus when yellow row 2 completes", () => {
    let game = startTwoPlayerGame();
    for (const [index, value] of [
      [8, 1],
      [10, 2],
      [11, 4],
    ] as const) {
      game = performCross(game, {
        type: "CROSS",
        playerId: "p1",
        color: "yellow",
        value,
        targetIndex: index,
      });
    }

    expect(game.players[0].sheet.green.boxes[0].crossed).toBe(true);
    expect(game.pending).toEqual([]);
  });

  it("increments fox count when blue row 2 is completed", () => {
    let game = startTwoPlayerGame();
    for (const [index, blueDie, whiteDie] of [
      [7, 3, 6],
      [8, 4, 6],
      [9, 5, 6],
      [10, 6, 6],
    ] as const) {
      game = performCross(game, {
        type: "CROSS",
        playerId: "p1",
        color: "blue",
        blueDie,
        whiteDie,
        targetIndex: index,
      });
    }

    expect(game.players[0].sheet.foxes).toBe(1);
    expect(game.pending).toEqual([]);
  });

  it("triggers the printed green slot bonuses", () => {
    const sheet = createEmptySheet();

    expect(applyGreenCross(sheet, 3).triggered).toEqual([{ type: "plus_one" }]);
    expect(applyGreenCross(sheet, 5).triggered).toEqual([
      { type: "cross_blue_free" },
    ]);
    expect(applyGreenCross(sheet, 6).triggered).toEqual([{ type: "fox" }]);
    expect(applyGreenCross(sheet, 8).triggered).toEqual([
      { type: "fill_purple", value: 6 },
    ]);
    expect(applyGreenCross(sheet, 9).triggered).toEqual([{ type: "reroll" }]);

    for (const index of [0, 1, 2, 4, 7, 10]) {
      expect(applyGreenCross(sheet, index).triggered).toEqual([]);
    }
  });

  it("triggers the printed orange slot bonuses", () => {
    const sheet = createEmptySheet();

    expect(applyOrangeFill(sheet, 2, 6).triggered).toEqual([{ type: "reroll" }]);
    expect(applyOrangeFill(sheet, 4, 6).triggered).toEqual([
      { type: "cross_yellow_free" },
    ]);
    expect(applyOrangeFill(sheet, 5, 6).triggered).toEqual([
      { type: "plus_one" },
    ]);
    expect(applyOrangeFill(sheet, 7, 6).triggered).toEqual([{ type: "fox" }]);
    expect(applyOrangeFill(sheet, 9, 6).triggered).toEqual([
      { type: "fill_purple", value: 6 },
    ]);

    for (const index of [0, 1, 3, 6, 8, 10]) {
      expect(applyOrangeFill(sheet, index, 6).triggered).toEqual([]);
    }
  });

  it("triggers the printed purple slot bonuses", () => {
    const sheet = createEmptySheet();

    expect(applyPurpleFill(sheet, 2, 6).triggered).toEqual([{ type: "reroll" }]);
    expect(applyPurpleFill(sheet, 3, 6).triggered).toEqual([
      { type: "cross_blue_free" },
    ]);
    expect(applyPurpleFill(sheet, 4, 6).triggered).toEqual([
      { type: "plus_one" },
    ]);
    expect(applyPurpleFill(sheet, 5, 6).triggered).toEqual([
      { type: "cross_yellow_free" },
    ]);
    expect(applyPurpleFill(sheet, 6, 6).triggered).toEqual([{ type: "fox" }]);
    expect(applyPurpleFill(sheet, 7, 6).triggered).toEqual([{ type: "reroll" }]);
    expect(applyPurpleFill(sheet, 8, 6).triggered).toEqual([
      { type: "cross_green_bonus" },
    ]);
    expect(applyPurpleFill(sheet, 9, 6).triggered).toEqual([
      { type: "fill_orange", value: 6 },
    ]);
    expect(applyPurpleFill(sheet, 10, 6).triggered).toEqual([
      { type: "plus_one" },
    ]);

    for (const index of [0, 1]) {
      expect(applyPurpleFill(sheet, index, 6).triggered).toEqual([]);
    }
  });

  it("increments plusOnes for yellow diagonal completion", () => {
    let game = startTwoPlayerGame();
    for (const [index, value] of [
      [0, 3],
      [5, 1],
      [10, 2],
    ] as const) {
      game = performCross(game, {
        type: "CROSS",
        playerId: "p1",
        color: "yellow",
        value,
        targetIndex: index,
      });
    }

    game = performCross(game, {
      type: "CROSS",
      playerId: "p1",
      color: "yellow",
      value: 6,
      targetIndex: 15,
    });

    expect(game.players[0].sheet.plusOnes).toBe(2);
    expect(game.players[0].sheet.claims.yellowDiagonal).toBe(true);
  });

  it("rejects non-matching crosses while pending effects remain", () => {
    let game = startTwoPlayerGame();
    game = {
      ...game,
      pending: [{ type: "cross_yellow_free" }],
      pendingPlayerId: "p1",
      phase: "resolve_pending",
    };

    expect(() =>
      reduce(game, {
        type: "CROSS",
        playerId: "p1",
        color: "green",
        value: 3,
      }),
    ).toThrow("Must resolve pending effects");
  });

  it("bumps version on every state change", () => {
    const game = startTwoPlayerGame();
    const next = performCross(game, {
      type: "CROSS",
      playerId: "p1",
      color: "yellow",
      value: 3,
      targetIndex: 0,
    });
    expect(next.version).toBeGreaterThan(game.version);
  });
});
