import { describe, expect, it } from "vitest";
import { applyBlueCross } from "./apply";
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

  it("queues cross_blue_free when yellow row 1 is completed", () => {
    let game = startTwoPlayerGame();
    for (const index of [4, 5, 6]) {
      game = performCross(game, {
        type: "CROSS",
        playerId: "p1",
        color: "yellow",
        value: [6, 2, 5][index - 4],
        targetIndex: index,
      });
    }

    game = performCross(game, {
      type: "CROSS",
      playerId: "p1",
      color: "yellow",
      value: 1,
      targetIndex: 7,
    });

    expect(game.pending[0]).toEqual({ type: "cross_blue_free" });
    expect(game.pendingPlayerId).toBe("p1");
    expect(game.phase).toBe("resolve_pending");
  });

  it("chains yellow row bonus → blue cross → auto purple fill", () => {
    let game = startTwoPlayerGame();

    for (const index of [4, 5, 6, 7]) {
      const values = [6, 2, 5, 1];
      game = performCross(game, {
        type: "CROSS",
        playerId: "p1",
        color: "yellow",
        value: values[index - 4],
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
    expect(game.pending[0]).toEqual({ type: "cross_yellow_free" });
  });

  it("auto-applies cross_green_bonus when yellow row 2 completes", () => {
    let game = startTwoPlayerGame();
    const values = [1, 5, 3, 6];
    for (let index = 8; index <= 11; index += 1) {
      game = performCross(game, {
        type: "CROSS",
        playerId: "p1",
        color: "yellow",
        value: values[index - 8],
        targetIndex: index,
      });
    }

    expect(game.players[0].sheet.green.boxes[0].crossed).toBe(true);
    expect(game.pending).toEqual([]);
  });

  it("increments fox count when blue row 2 is completed", () => {
    let game = startTwoPlayerGame();
    for (const [index, blueDie, whiteDie] of [
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

  it("increments plusOnes for yellow diagonal completion", () => {
    let game = startTwoPlayerGame();
    for (const index of [0, 5, 10]) {
      const values = [2, 2, 6];
      game = performCross(game, {
        type: "CROSS",
        playerId: "p1",
        color: "yellow",
        value: values[index === 0 ? 0 : index === 5 ? 1 : 2],
        targetIndex: index,
      });
    }

    game = performCross(game, {
      type: "CROSS",
      playerId: "p1",
      color: "yellow",
      value: 1,
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
      value: 2,
      targetIndex: 0,
    });
    expect(next.version).toBeGreaterThan(game.version);
  });
});
