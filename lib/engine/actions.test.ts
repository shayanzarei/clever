import { describe, expect, it } from "vitest";
import { trayDice } from "./dice";
import { activePlayerId } from "./turn";
import { reduceWithInvariants as reduce, sheetWithLegacyExtraDice, sheetWithPlusOnes, sheetWithRerolls } from "./test-reduce";
import { beginRoundFourBonus } from "./round-start";
import { beginRound } from "./turn";
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

function roll(game: Game, values: DieFace[] = FULL_ROLL): Game {
  return reduce(game, { type: "ROLL", values });
}

/** Three active choices without purple-slot bonuses (white/yellow → green → orange). */
function completeActiveTurn(
  game: Game,
  options: { skipPlusOne?: boolean } = {},
): Game {
  let next = roll(game);
  next = reduce(next, {
    type: "CHOOSE_DIE",
    playerId: activePlayerId(next),
    dieId: "die-white",
    slotIndex: 0,
  });
  next = reduce(next, {
    type: "CROSS",
    playerId: activePlayerId(next),
    color: "yellow",
    value: 1,
    targetIndex: 8,
  });

  next = roll(next, [
    { color: "yellow", value: 2 },
    { color: "blue", value: 3 },
    { color: "green", value: 4 },
    { color: "orange", value: 5 },
    { color: "purple", value: 6 },
  ]);
  next = reduce(next, {
    type: "CHOOSE_DIE",
    playerId: activePlayerId(next),
    dieId: "die-green",
    slotIndex: 1,
  });
  next = reduce(next, {
    type: "CROSS",
    playerId: activePlayerId(next),
    color: "green",
    value: 4,
  });

  next = roll(next, [
    { color: "orange", value: 5 },
    { color: "purple", value: 6 },
  ]);
  next = reduce(next, {
    type: "CHOOSE_DIE",
    playerId: activePlayerId(next),
    dieId: "die-orange",
    slotIndex: 2,
  });
  next = reduce(next, {
    type: "CROSS",
    playerId: activePlayerId(next),
    color: "orange",
    value: 5,
  });

  if (options.skipPlusOne !== false && next.phase === "active_extra") {
    next = reduce(next, {
      type: "SKIP_EXTRA_DIE",
      playerId: activePlayerId(next),
    });
  }

  return next;
}

describe("round-start bonuses", () => {
  it("grants a reroll action to all players at round 1", () => {
    const game = startGame();
    expect(game.players.every((player) => player.sheet.rerolls === 1)).toBe(true);
    expect(game.players.every((player) => player.sheet.plusOnes === 0)).toBe(true);
  });

  it("lets the active player take the silver bonus then play", () => {
    let game = beginRoundFourBonus({ ...startGame(), round: 4 });

    expect(game.phase).toBe("round_bonus_choose");
    expect(game.roundBonusPendingPlayerIds).toEqual(["p1"]);
    expect(() => roll(game)).toThrow("ROLL is only allowed during active_roll");

    game = reduce(game, {
      type: "CHOOSE_ROUND_BONUS",
      playerId: "p1",
      choice: "black_x",
    });
    expect(game.pending[0]).toEqual({ type: "round_black_x" });
    game = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "yellow",
      value: 3,
      targetIndex: 0,
    });

    expect(game.phase).toBe("active_roll");
    expect(game.activePlayerIndex).toBe(0);
    expect(game.roundBonusPendingPlayerIds).toEqual([]);
    expect(game.players[0].sheet.yellow.grid[0][0].crossed).toBe(true);
    expect(() =>
      reduce(game, {
        type: "CHOOSE_ROUND_BONUS",
        playerId: "p2",
        choice: "black_six",
      }),
    ).toThrow("CHOOSE_ROUND_BONUS is only allowed during round_bonus_choose");
  });

  it("does not wait for the other player after a leftover all-player queue", () => {
    let game = beginRoundFourBonus({ ...startGame(), round: 4 });
    game = {
      ...game,
      roundBonusPendingPlayerIds: ["p1", "p2"],
    };

    game = reduce(game, {
      type: "CHOOSE_ROUND_BONUS",
      playerId: "p1",
      choice: "black_x",
    });
    game = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "yellow",
      value: 3,
      targetIndex: 0,
    });

    expect(game.phase).toBe("active_roll");
    expect(game.roundBonusPendingPlayerIds).toEqual([]);
    expect(game.activePlayerIndex).toBe(0);
  });

  it("asks the next player for silver X or 6 when their turn starts", () => {
    let game = beginRoundFourBonus({
      ...startGame(),
      round: 4,
      activePlayerIndex: 1,
    });

    expect(game.roundBonusPendingPlayerIds).toEqual(["p2"]);
    expect(() => roll(game)).toThrow("ROLL is only allowed during active_roll");

    game = reduce(game, {
      type: "CHOOSE_ROUND_BONUS",
      playerId: "p2",
      choice: "black_six",
    });
    game = reduce(game, {
      type: "CROSS",
      playerId: "p2",
      color: "orange",
      value: 6,
    });

    expect(game.phase).toBe("active_roll");
    expect(game.activePlayerIndex).toBe(1);
    expect(game.players[1].sheet.orange.boxes[0].value).toBe(6);
  });

  it("lets the active player finish the whole turn before the other player gets silver", () => {
    let game = beginRoundFourBonus({
      ...startGame(),
      round: 4,
      roundBonusPendingPlayerIds: ["p1", "p2"],
    });

    game = reduce(game, {
      type: "CHOOSE_ROUND_BONUS",
      playerId: "p1",
      choice: "black_x",
    });
    game = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "yellow",
      value: 3,
      targetIndex: 0,
    });

    expect(game.phase).toBe("active_roll");
    expect(game.activePlayerIndex).toBe(0);

    game = completeActiveTurn(game);

    expect(game.activePlayerIndex).toBe(0);
    expect(game.phase).toBe("passive_choose");
    expect(() =>
      reduce(game, {
        type: "CHOOSE_ROUND_BONUS",
        playerId: "p2",
        choice: "black_six",
      }),
    ).toThrow("CHOOSE_ROUND_BONUS is only allowed during round_bonus_choose");

    game = reduce(game, { type: "SKIP_EXTRA_DIE", playerId: "p2" });
    if (game.phase === "passive_extra") {
      game = reduce(game, { type: "SKIP_EXTRA_DIE", playerId: "p2" });
    }

    expect(game.activePlayerIndex).toBe(1);
    expect(game.phase).toBe("round_bonus_choose");
    expect(game.roundBonusPendingPlayerIds).toEqual(["p2"]);
  });

  it("does not offer silver bonus on rounds 5 or 6", () => {
    const base = startGame();
    const roundFive = beginRound({ ...base, round: 5 });
    expect(roundFive.phase).toBe("active_roll");
    expect(roundFive.roundBonusPendingPlayerIds).toEqual([]);

    const roundSix = beginRound({ ...base, round: 6 });
    expect(roundSix.phase).toBe("active_roll");
    expect(roundSix.roundBonusPendingPlayerIds).toEqual([]);
  });
});

describe("sheet actions", () => {
  it("USE_REROLL replaces pool values and consumes a reroll", () => {
    let game = startGame();
    game = {
      ...game,
      players: game.players.map((player, index) =>
        index === 0
          ? { ...player, sheet: sheetWithRerolls(player.sheet, 1) }
          : player,
      ),
    };
    game = roll(game);
    game = reduce(game, {
      type: "USE_REROLL",
      playerId: "p1",
      values: [
        { color: "yellow", value: 6 },
        { color: "blue", value: 6 },
        { color: "green", value: 6 },
        { color: "orange", value: 6 },
        { color: "purple", value: 6 },
        { color: "white", value: 6 },
      ],
    });

    expect(game.dice.find((die) => die.color === "purple")?.value).toBe(6);
    expect(game.players[0].sheet.rerolls).toBe(0);
  });

  it("USE_PLUS_ONE after the main turn scores an extra mark", () => {
    let game = startGame();
    game = {
      ...game,
      players: game.players.map((player, index) =>
        index === 0
          ? { ...player, sheet: sheetWithPlusOnes(player.sheet, 1) }
          : player,
      ),
    };
    game = completeActiveTurn(game, { skipPlusOne: false });
    expect(game.phase).toBe("active_extra");

    const white = game.dice.find((die) => die.id === "die-white")!.value;
    game = reduce(game, { type: "USE_PLUS_ONE", playerId: "p1", dieId: "die-white" });
    expect(game.dice.find((die) => die.id === "die-white")?.value).toBe(white);
    game = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "yellow",
      value: white,
      targetIndex: 5,
    });

    expect(game.players[0].sheet.plusOnes).toBe(0);
    expect(game.extraDieUsedIds).toContain("die-white");
  });

  it("USE_EXTRA_DIE after active turn allows a fourth mark", () => {
    let game = startGame();
    game = {
      ...game,
      players: game.players.map((player, index) =>
        index === 0
          ? { ...player, sheet: sheetWithLegacyExtraDice(player.sheet, 1) }
          : player,
      ),
    };

    game = completeActiveTurn(game, { skipPlusOne: false });
    expect(game.phase).toBe("active_extra");

    game = reduce(game, { type: "USE_EXTRA_DIE", playerId: "p1", dieId: "die-green" });
    game = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "green",
      value: 4,
    });

    expect(game.phase).toBe("passive_choose");
    expect(game.players[0].sheet.extraDice).toBe(0);
    expect(game.extraDieUsedIds).toContain("die-green");
  });

  it("rejects using the same die twice as an extra die", () => {
    let game = startGame();
    game = {
      ...game,
      players: game.players.map((player, index) =>
        index === 0
          ? { ...player, sheet: sheetWithLegacyExtraDice(player.sheet, 2) }
          : player,
      ),
    };
    game = completeActiveTurn(game, { skipPlusOne: false });
    game = reduce(game, { type: "USE_EXTRA_DIE", playerId: "p1", dieId: "die-green" });
    game = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "green",
      value: 4,
    });

    expect(game.phase).toBe("active_extra");
    expect(() =>
      reduce(game, { type: "USE_EXTRA_DIE", playerId: "p1", dieId: "die-green" }),
    ).toThrow("Die already used for an extra-die action this turn");
  });

  it("lets a passive player spend extra die without taking a leftover", () => {
    let game = completeActiveTurn(startGame());
    game = {
      ...game,
      players: game.players.map((player, index) =>
        index === 1
          ? { ...player, sheet: sheetWithLegacyExtraDice(player.sheet, 1) }
          : player,
      ),
    };

    expect(game.phase).toBe("passive_choose");
    game = reduce(game, { type: "USE_EXTRA_DIE", playerId: "p2", dieId: "die-orange" });
    game = reduce(game, {
      type: "CROSS",
      playerId: "p2",
      color: "orange",
      value: 5,
    });

    expect(game.players[1].sheet.orange.boxes[0].value).toBe(5);
    expect(game.players[1].sheet.extraDice).toBe(0);
    expect(game.activePlayerIndex).toBe(1);
  });

  it("lets a passive player skip the leftover die", () => {
    let game = completeActiveTurn(startGame());
    expect(game.phase).toBe("passive_choose");

    game = reduce(game, { type: "SKIP_EXTRA_DIE", playerId: "p2" });
    if (game.phase === "passive_extra") {
      game = reduce(game, { type: "SKIP_EXTRA_DIE", playerId: "p2" });
    }

    expect(game.activePlayerIndex).toBe(1);
    expect(game.phase).toBe("active_roll");
  });
});

describe("passive slot fallback", () => {
  it("allows passive to take from active slots when tray is empty", () => {
    let game = startGame();
    game = {
      ...game,
      players: game.players.map((player, index) =>
        index === 0
          ? {
              ...player,
              sheet: { ...player.sheet, plusOnes: 0 },
              diceSlots: [
                { color: "yellow", value: 2 },
                null,
                null,
              ],
            }
          : player,
      ),
      dice: game.dice.map((die) =>
        die.color === "yellow"
          ? { ...die, location: "slot" as const, slotIndex: 0, value: 2 as const }
          : { ...die, location: "consumed" as const, slotIndex: undefined },
      ),
      phase: "passive_choose",
      activeRollCount: 3,
    };

    expect(trayDice(game.dice).length).toBe(0);

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

  it("requires tray dice when the tray has a usable die", () => {
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

    expect(() =>
      reduce(game, { type: "PASSIVE_TAKE", playerId: "p2", dieId: "die-yellow" }),
    ).toThrow("Must take a usable die from the tray");
  });
});
