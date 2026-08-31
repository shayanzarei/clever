/**
 * Rule: Reroll and extra-die (+1) actions — unlock onto action stock, consume FIFO,
 * may be saved; reroll is active-only and rerolls all pool dice; extra die is
 * end-of-turn only, any die once per turn.
 */
import { describe, expect, it } from "vitest";
import { poolDice } from "./dice";
import { applyPassiveBonus } from "./apply";
import {
  consumePlusOne,
  consumeReroll,
  grantPlusOne,
  grantReroll,
  grantLegacyExtraDie,
  plusOneActionsRemaining,
} from "./sheet-actions";
import { activePlayerId } from "./turn";
import { reduceWithInvariants as reduce, sheetWithLegacyExtraDice, sheetWithPlusOnes, sheetWithRerolls } from "./test-reduce";
import { beginRound } from "./turn";
import { createEmptySheet } from "./sheet";
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

describe("rule: action stock unlock and consume", () => {
  it("adds a reroll or +1 to the stock when unlocked", () => {
    let sheet = createEmptySheet();
    sheet = grantReroll(sheet);
    sheet = grantPlusOne(sheet);
    expect(sheet.rerolls).toBe(1);
    expect(plusOneActionsRemaining(sheet)).toBe(1);
  });

  it("consumes the first available action when used (FIFO for +1)", () => {
    let sheet = grantPlusOne(grantPlusOne(createEmptySheet()));
    sheet = grantLegacyExtraDie(sheet);
    expect(plusOneActionsRemaining(sheet)).toBe(3);

    sheet = consumePlusOne(sheet);
    expect(sheet.plusOnes).toBe(1);
    expect(sheet.extraDice).toBe(1);

    sheet = consumePlusOne(sheet);
    expect(sheet.plusOnes).toBe(0);
    expect(sheet.extraDice).toBe(1);

    sheet = consumePlusOne(sheet);
    expect(sheet.extraDice).toBe(0);
  });

  it("consumes a reroll action when spent", () => {
    const sheet = consumeReroll(grantReroll(createEmptySheet()));
    expect(sheet.rerolls).toBe(0);
  });

  it("can save unlocked actions for a later turn", () => {
    let game = startGame();
    expect(game.players[0].sheet.rerolls).toBe(1);

    game = beginRound({ ...game, round: 2 });
    expect(game.players[0].sheet.rerolls).toBe(1);
    expect(game.players[0].sheet.plusOnes).toBe(1);
  });

  it("unlocks actions from bonuses onto the stock", () => {
    const sheet = applyPassiveBonus(createEmptySheet(), { type: "reroll" });
    expect(sheet?.rerolls).toBe(1);
    const plus = applyPassiveBonus(createEmptySheet(), { type: "plus_one" });
    expect(plus?.plusOnes).toBe(1);
  });
});

describe("rule: reroll action", () => {
  it("is only available to the active player during active_choose", () => {
    let game = roll(
      {
        ...startGame(),
        players: startGame().players.map((player, index) =>
          index === 0
            ? { ...player, sheet: sheetWithRerolls(player.sheet, 1) }
            : player,
        ),
      },
    );

    expect(() =>
      reduce(game, {
        type: "USE_REROLL",
        playerId: "p2",
        values: FULL_ROLL,
      }),
    ).toThrow("Only the active player may reroll");

    game = completeActiveTurn(startGame());
    expect(() =>
      reduce(game, {
        type: "USE_REROLL",
        playerId: "p2",
        values: FULL_ROLL,
      }),
    ).toThrow("Only the active player may reroll");
  });

  it("rerolls all dice currently in the pool", () => {
    let game = startGame();
    game = {
      ...game,
      players: game.players.map((player, index) =>
        index === 0
          ? { ...player, sheet: sheetWithRerolls(player.sheet, 1) }
          : player,
      ),
    };
    game = roll(game, FULL_ROLL);
    expect(poolDice(game.dice)).toHaveLength(6);

    game = reduce(game, {
      type: "USE_REROLL",
      playerId: "p1",
      values: FULL_ROLL.map((face) => ({ ...face, value: 6 })),
    });

    expect(poolDice(game.dice)).toHaveLength(6);
    expect(game.dice.every((die) => die.value === 6)).toBe(true);
    expect(game.players[0].sheet.rerolls).toBe(0);
  });

  it("requires values for every pool die", () => {
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
    const poolSize = poolDice(game.dice).length;

    expect(() =>
      reduce(game, {
        type: "USE_REROLL",
        playerId: "p1",
        values: FULL_ROLL.slice(0, poolSize - 1),
      }),
    ).toThrow(`ROLL must include ${poolSize} dice values`);
  });

  it("cannot be used after choosing a die until the cross is complete", () => {
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
      type: "CHOOSE_DIE",
      playerId: "p1",
      dieId: "die-blue",
      slotIndex: 0,
    });

    expect(() =>
      reduce(game, {
        type: "USE_REROLL",
        playerId: "p1",
        values: FULL_ROLL,
      }),
    ).toThrow("Must complete cross before rerolling");
  });

  it("can spend multiple saved rerolls on the same roll", () => {
    let game = startGame();
    game = {
      ...game,
      players: game.players.map((player, index) =>
        index === 0
          ? { ...player, sheet: sheetWithRerolls(player.sheet, 2) }
          : player,
      ),
    };
    game = roll(game);

    game = reduce(game, {
      type: "USE_REROLL",
      playerId: "p1",
      values: FULL_ROLL.map((face) => ({ ...face, value: 6 })),
    });
    expect(game.players[0].sheet.rerolls).toBe(1);

    game = reduce(game, {
      type: "USE_REROLL",
      playerId: "p1",
      values: FULL_ROLL.map((face) => ({ ...face, value: 5 })),
    });
    expect(game.players[0].sheet.rerolls).toBe(0);
    expect(game.dice.every((die) => die.value === 5)).toBe(true);
  });
});

describe("rule: extra die (+1) action", () => {
  it("is only available at the end of the active or passive turn", () => {
    let game = startGame();
    game = {
      ...game,
      players: game.players.map((player, index) =>
        index === 0
          ? { ...player, sheet: sheetWithPlusOnes(player.sheet, 1) }
          : player,
      ),
    };
    game = roll(game);

    expect(() =>
      reduce(game, { type: "USE_EXTRA_DIE", playerId: "p1", dieId: "die-white" }),
    ).toThrow("USE_EXTRA_DIE is only allowed at the end of a main or passive turn");

    game = completeActiveTurn(
      {
        ...startGame(),
        players: startGame().players.map((player, index) =>
          index === 0
            ? { ...player, sheet: sheetWithPlusOnes(player.sheet, 1) }
            : player,
        ),
      },
      { skipPlusOne: false },
    );
    expect(game.phase).toBe("active_extra");
  });

  it("allows choosing any die in play, including one in an active slot", () => {
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
    expect(game.dice.find((die) => die.id === "die-green")?.location).toBe(
      "slot",
    );

    game = reduce(game, {
      type: "USE_EXTRA_DIE",
      playerId: "p1",
      dieId: "die-green",
    });
    game = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "green",
      value: 4,
    });

    expect(game.players[0].sheet.plusOnes).toBe(0);
    expect(game.extraDieUsedIds).toContain("die-green");
  });

  it("rejects choosing the same die twice in one turn", () => {
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
    game = reduce(game, {
      type: "USE_EXTRA_DIE",
      playerId: "p1",
      dieId: "die-green",
    });
    game = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "green",
      value: 4,
    });

    expect(() =>
      reduce(game, {
        type: "USE_EXTRA_DIE",
        playerId: "p1",
        dieId: "die-green",
      }),
    ).toThrow("Die already used for an extra-die action this turn");
  });

  it("can spend multiple extra-die actions in one turn", () => {
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

    game = reduce(game, {
      type: "USE_EXTRA_DIE",
      playerId: "p1",
      dieId: "die-green",
    });
    game = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "green",
      value: 4,
    });
    expect(game.phase).toBe("active_extra");

    game = reduce(game, {
      type: "USE_EXTRA_DIE",
      playerId: "p1",
      dieId: "die-white",
    });
    game = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "yellow",
      value: 1,
      targetIndex: 9,
    });

    expect(game.players[0].sheet.extraDice).toBe(0);
    expect(game.extraDieUsedIds).toEqual(
      expect.arrayContaining(["die-green", "die-white"]),
    );
  });

  it("lets a passive player spend an extra die after their main turn", () => {
    let game = completeActiveTurn(startGame());
    game = {
      ...game,
      players: game.players.map((player, index) =>
        index === 1
          ? { ...player, sheet: sheetWithPlusOnes(player.sheet, 1) }
          : player,
      ),
    };

    expect(game.phase).toBe("passive_choose");
    game = reduce(game, {
      type: "USE_EXTRA_DIE",
      playerId: "p2",
      dieId: "die-orange",
    });
    game = reduce(game, {
      type: "CROSS",
      playerId: "p2",
      color: "orange",
      value: 5,
    });

    expect(game.players[1].sheet.plusOnes).toBe(0);
    expect(game.players[1].sheet.orange.boxes[0].value).toBe(5);
  });
});
