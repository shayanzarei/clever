/**
 * Rule: Passive players act only after the active turn ends (3 dice placed or no
 * pool dice left). Each passive picks one tray die (simultaneously; same die OK).
 * Then play passes to the next player with all 6 dice reset.
 */
import { describe, expect, it } from "vitest";
import { poolDice, trayDice } from "./dice";
import {
  activePlayerId,
  canPlayerActNow,
  passivePlayerIds,
  playersActingNow,
} from "./turn";
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

function startGame(playerCount: 2 | 3 | 4 = 2): Game {
  const names =
    playerCount === 2
      ? ["Alice", "Bob"]
      : playerCount === 3
        ? ["Alice", "Bob", "Cara"]
        : ["Alice", "Bob", "Cara", "Dan"];
  return reduce({} as Game, {
    type: "START_GAME",
    playerCount,
    playerNames: names,
  });
}

function startThreePlayerGame(): Game {
  return startGame(3);
}

function roll(game: Game, values: DieFace[] = FULL_ROLL): Game {
  return reduce(game, { type: "ROLL", values });
}

function completeActiveTurn(game: Game): Game {
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
    { color: "green", value: 4 },
    { color: "orange", value: 5 },
    { color: "purple", value: 6 },
    { color: "blue", value: 3 },
    { color: "yellow", value: 2 },
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

  if (next.phase === "active_extra") {
    next = reduce(next, {
      type: "SKIP_EXTRA_DIE",
      playerId: activePlayerId(next),
    });
  }

  return next;
}

function finishPassive(
  game: Game,
  playerId: string,
  dieId: string,
): Game {
  let next = reduce(game, { type: "PASSIVE_TAKE", playerId, dieId });
  const die = next.dice.find((entry) => entry.id === dieId)!;
  if (die.color === "blue" || die.color === "white") {
    next = reduce(next, {
      type: "CROSS",
      playerId,
      color: "blue",
      blueDie: 3,
      whiteDie: 1,
    });
  } else if (die.color === "yellow") {
    next = reduce(next, {
      type: "CROSS",
      playerId,
      color: "yellow",
      value: die.value,
      targetIndex: 1,
    });
  } else if (die.color === "green") {
    next = reduce(next, { type: "CROSS", playerId, color: "green", value: die.value });
  } else if (die.color === "orange") {
    next = reduce(next, { type: "CROSS", playerId, color: "orange", value: die.value });
  } else {
    next = reduce(next, { type: "CROSS", playerId, color: "purple", value: die.value });
  }

  if (next.phase === "passive_extra") {
    next = reduce(next, { type: "SKIP_EXTRA_DIE", playerId });
  }
  return next;
}

describe("rule: passive phase starts only after active turn ends", () => {
  it("does not let passive players act during the active turn", () => {
    const game = roll(startGame());
    expect(canPlayerActNow(game, "p2")).toBe(false);
    expect(() =>
      reduce(game, { type: "PASSIVE_TAKE", playerId: "p2", dieId: "die-blue" }),
    ).toThrow("PASSIVE_TAKE is only allowed during passive_choose");
  });

  it("starts passive phase after three active dice are placed", () => {
    const game = completeActiveTurn(startGame());
    expect(game.phase).toBe("passive_choose");
    expect(game.activeRollCount).toBe(3);
    expect(trayDice(game.dice).length).toBeGreaterThan(0);
  });

  it("starts passive phase early when no pool dice remain", () => {
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
  });
});

describe("rule: passive players take from the silver platter", () => {
  it("exposes tray dice to every passive player", () => {
    const game = completeActiveTurn(startGame());
    expect(trayDice(game.dice).length).toBeGreaterThan(0);
    for (const playerId of passivePlayerIds(game)) {
      expect(canPlayerActNow(game, playerId)).toBe(true);
    }
  });

  it("lets multiple passive players choose the same tray die", () => {
    let game = completeActiveTurn(startThreePlayerGame());
    const trayDie = trayDice(game.dice)[0]!.id;

    game = reduce(game, { type: "PASSIVE_TAKE", playerId: "p2", dieId: trayDie });
    game = reduce(game, { type: "PASSIVE_TAKE", playerId: "p3", dieId: trayDie });

    expect(game.dice.find((die) => die.id === trayDie)?.location).toBe("tray");
    expect(game.players.find((player) => player.id === "p2")?.passiveDieId).toBe(
      trayDie,
    );
    expect(game.players.find((player) => player.id === "p3")?.passiveDieId).toBe(
      trayDie,
    );
  });
});

describe("rule: passive players act simultaneously", () => {
  it("allows all unfinished passive players to act at once", () => {
    const game = completeActiveTurn(startThreePlayerGame());
    expect(playersActingNow(game).sort()).toEqual(["p2", "p3"]);
    expect(canPlayerActNow(game, "p1")).toBe(false);
  });

  it("keeps other passives able to act while one has picked but not crossed", () => {
    let game = completeActiveTurn(startThreePlayerGame());
    game = reduce(game, { type: "PASSIVE_TAKE", playerId: "p3", dieId: "die-blue" });

    expect(canPlayerActNow(game, "p2")).toBe(true);
    expect(canPlayerActNow(game, "p3")).toBe(true);
  });
});

describe("rule: next active player gets all six dice", () => {
  it("passes play to the next seat after all passives finish", () => {
    let game = completeActiveTurn(startGame());
    expect(activePlayerId(game)).toBe("p1");

    game = finishPassive(game, "p2", "die-blue");

    expect(activePlayerId(game)).toBe("p2");
    expect(game.phase).toBe("active_roll");
  });

  it("resets every die to the pool for the new active player", () => {
    let game = completeActiveTurn(startGame());
    game = finishPassive(game, "p2", "die-blue");

    expect(game.dice).toHaveLength(6);
    expect(game.dice.every((die) => die.location === "pool")).toBe(true);
    expect(poolDice(game.dice)).toHaveLength(6);
    expect(game.players.every((player) => player.diceSlots.every((slot) => slot === null))).toBe(
      true,
    );
  });

  it("advances through each player in seat order across a full round (2p)", () => {
    let game = startGame();
    expect(activePlayerId(game)).toBe("p1");

    game = completeActiveTurn(game);
    game = finishPassive(game, "p2", "die-blue");
    expect(activePlayerId(game)).toBe("p2");

    game = completeActiveTurn(game);
    game = finishPassive(game, "p1", "die-blue");
    expect(activePlayerId(game)).toBe("p1");
    expect(game.round).toBe(2);
  });
});
