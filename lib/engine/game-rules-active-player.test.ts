/**
 * Rule: Active player rolls 6 dice, chooses one per roll (up to 3), marks sheet,
 * sweeps lower dice to silver tray, white is wild; may finish with fewer than 3
 * rolls if no dice remain in the pool.
 */
import { describe, expect, it } from "vitest";
import { poolDice, trayDice } from "./dice";
import { getSheetCrossOptions } from "@/lib/ui/cross-options";
import { activePlayerId } from "./turn";
import { reduceWithInvariants as reduce } from "./test-reduce";
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

describe("rule: active player rolls and chooses dice", () => {
  it("starts with all 6 dice in the pool for the first roll", () => {
    const game = startGame();
    expect(game.dice).toHaveLength(6);
    expect(poolDice(game.dice)).toHaveLength(6);
    expect(game.phase).toBe("active_roll");
  });

  it("rolls all pool dice at once on the first roll", () => {
    const game = roll(startGame());
    expect(game.phase).toBe("active_choose");
    expect(poolDice(game.dice)).toHaveLength(6);
    expect(game.dice.find((die) => die.color === "purple")?.value).toBe(6);
  });

  it("places the chosen die in a slot without changing its value", () => {
    let game = roll(startGame());
    game = reduce(game, {
      type: "CHOOSE_DIE",
      playerId: "p1",
      dieId: "die-green",
      slotIndex: 1,
    });

    expect(game.players[0].diceSlots[1]).toEqual({ color: "green", value: 4 });
    expect(game.dice.find((die) => die.id === "die-green")?.value).toBe(4);
    expect(game.dice.find((die) => die.id === "die-green")?.location).toBe("slot");
  });

  it("requires a sheet cross before rolling again", () => {
    let game = roll(startGame());
    game = reduce(game, {
      type: "CHOOSE_DIE",
      playerId: "p1",
      dieId: "die-yellow",
      slotIndex: 0,
    });

    expect(() =>
      roll(game, [{ color: "yellow", value: 2 }]),
    ).toThrow("Must complete cross");
  });
});

describe("rule: silver tray sweep", () => {
  it("moves only lower-value pool dice to the tray after a choice", () => {
    let game = roll(startGame());
    game = reduce(game, {
      type: "CHOOSE_DIE",
      playerId: "p1",
      dieId: "die-purple",
      slotIndex: 0,
    });

    const tray = trayDice(game.dice);
    expect(tray.every((die) => die.value < 6)).toBe(true);
    expect(tray.map((die) => die.color).sort()).toEqual(
      ["blue", "green", "orange", "white", "yellow"].sort(),
    );
  });

  it("places no dice on the tray when the lowest value is chosen", () => {
    let game = roll(startGame());
    game = reduce(game, {
      type: "CHOOSE_DIE",
      playerId: "p1",
      dieId: "die-white",
      slotIndex: 0,
    });

    expect(trayDice(game.dice)).toHaveLength(0);
    expect(poolDice(game.dice)).toHaveLength(5);
  });

  it("does not let the active player choose a die from the tray", () => {
    let game = roll(startGame());
    game = reduce(game, {
      type: "CHOOSE_DIE",
      playerId: "p1",
      dieId: "die-yellow",
      slotIndex: 0,
    });
    game = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "yellow",
      value: 2,
      targetIndex: 1,
    });

    game = roll(game, [
      { color: "blue", value: 3 },
      { color: "green", value: 4 },
      { color: "orange", value: 5 },
      { color: "purple", value: 6 },
    ]);

    const trayDie = trayDice(game.dice)[0]!;
    expect(() =>
      reduce(game, {
        type: "CHOOSE_DIE",
        playerId: "p1",
        dieId: trayDie.id,
        slotIndex: 1,
      }),
    ).toThrow("Chosen die must be in the pool");
  });
});

describe("rule: white die is wild", () => {
  it("offers every color area when a white die is chosen", () => {
    let game = roll(startGame());
    game = reduce(game, {
      type: "CHOOSE_DIE",
      playerId: "p1",
      dieId: "die-white",
      slotIndex: 0,
    });

    const colors = new Set(
      getSheetCrossOptions(game, "p1").map((option) => option.color),
    );
    expect(colors).toEqual(
      new Set(["yellow", "blue", "green", "orange", "purple"]),
    );
  });
});

describe("rule: up to three rolls, fewer if pool is empty", () => {
  it("only rerolls remaining pool dice on later rolls", () => {
    let game = roll(startGame());
    game = reduce(game, {
      type: "CHOOSE_DIE",
      playerId: "p1",
      dieId: "die-green",
      slotIndex: 0,
    });
    game = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "green",
      value: 4,
    });

    const poolBeforeSecondRoll = poolDice(game.dice).map((die) => die.color).sort();
    expect(poolBeforeSecondRoll).toEqual(["orange", "purple"]);
    expect(game.phase).toBe("active_roll");

    game = roll(game, [
      { color: "orange", value: 5 },
      { color: "purple", value: 6 },
    ]);
    expect(poolDice(game.dice)).toHaveLength(2);
    expect(game.dice.find((die) => die.color === "orange")?.value).toBe(5);
  });

  it("ends the active turn early when no pool dice remain after a high pick", () => {
    let game = roll(startGame());
    game = reduce(game, {
      type: "CHOOSE_DIE",
      playerId: "p1",
      dieId: "die-purple",
      slotIndex: 0,
    });
    game = reduce(game, {
      type: "CROSS",
      playerId: "p1",
      color: "purple",
      value: 6,
    });

    expect(game.activeRollCount).toBe(1);
    expect(game.phase).toBe("passive_choose");
    expect(poolDice(game.dice)).toHaveLength(0);
    expect(trayDice(game.dice).length).toBeGreaterThan(0);
  });

  it("moves leftover pool dice to the tray after the third choice", () => {
    let game = startGame();

    game = roll(game);
    game = chooseAndCross(game, "die-white", 0, "yellow", 1, 8);

    game = roll(game, [
      { color: "green", value: 4 },
      { color: "orange", value: 5 },
      { color: "purple", value: 6 },
      { color: "blue", value: 3 },
      { color: "yellow", value: 2 },
    ]);
    game = chooseAndCross(game, "die-green", 1, "green", 4);

    game = roll(game, [
      { color: "orange", value: 5 },
      { color: "purple", value: 6 },
    ]);
    game = chooseAndCross(game, "die-orange", 2, "orange", 5);

    expect(game.activeRollCount).toBe(3);
    expect(game.phase).toBe("passive_choose");
    expect(poolDice(game.dice)).toHaveLength(0);
    expect(trayDice(game.dice).map((die) => die.color)).toContain("purple");
  });
});

function chooseAndCross(
  game: Game,
  dieId: string,
  slotIndex: number,
  color: "yellow" | "green" | "orange" | "purple",
  value: number,
  targetIndex?: number,
): Game {
  const playerId = activePlayerId(game);
  let next = reduce(game, {
    type: "CHOOSE_DIE",
    playerId,
    dieId,
    slotIndex,
  });
  next = reduce(next, {
    type: "CROSS",
    playerId,
    color,
    value,
    ...(targetIndex !== undefined ? { targetIndex } : {}),
  });
  return next;
}
