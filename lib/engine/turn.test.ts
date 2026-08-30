import { describe, expect, it } from "vitest";
import { poolDice, trayDice } from "./dice";
import { activePlayerId, canPlayerActNow, playersActingNow } from "./turn";
import { reduce } from "./reduce";
import type { Action, ColorArea, DieFace, DieValue, Game } from "./types";

type CrossInput = {
  type: "CROSS";
  color: ColorArea;
  value?: number;
  targetIndex?: number;
  blueDie?: DieValue;
  whiteDie?: DieValue;
};

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

function startThreePlayerGame(): Game {
  return reduce({} as Game, {
    type: "START_GAME",
    playerCount: 3,
    playerNames: ["Alice", "Bob", "Cara"],
  });
}

function roll(game: Game, values: DieFace[] = FULL_ROLL): Game {
  return reduce(game, { type: "ROLL", values });
}

function activeChooseCross(
  game: Game,
  dieId: string,
  slotIndex: number,
  cross: CrossInput,
): Game {
  const playerId = activePlayerId(game);
  let next = reduce(game, {
    type: "CHOOSE_DIE",
    playerId,
    dieId,
    slotIndex,
  });
  next = reduce(next, { ...cross, playerId } as Extract<Action, { type: "CROSS" }>);
  return next;
}

/** Three active choices without triggering purple-slot bonuses (white/yellow → green → orange). */
function completeActiveTurn(game: Game): Game {
  let next = roll(game);
  next = activeChooseCross(next, "die-white", 0, {
    type: "CROSS",
    color: "yellow",
    value: 1,
    targetIndex: 7,
  });

  next = roll(next, [
    { color: "yellow", value: 2 },
    { color: "blue", value: 3 },
    { color: "green", value: 4 },
    { color: "orange", value: 5 },
    { color: "purple", value: 6 },
  ]);
  next = activeChooseCross(next, "die-green", 1, {
    type: "CROSS",
    color: "green",
    value: 4,
  });

  next = roll(next, [
    { color: "orange", value: 5 },
    { color: "purple", value: 6 },
  ]);
  next = activeChooseCross(next, "die-orange", 2, {
    type: "CROSS",
    color: "orange",
    value: 5,
  });

  return next;
}

describe("turn flow", () => {
  it("initializes six dice in the pool", () => {
    const game = startGame();
    expect(game.dice).toHaveLength(6);
    expect(game.dice.every((die) => die.location === "pool")).toBe(true);
    expect(game.phase).toBe("active_roll");
  });

  it("ROLL applies values and moves to active_choose", () => {
    const game = roll(startGame());
    expect(game.phase).toBe("active_choose");
    expect(game.dice.find((d) => d.color === "purple")?.value).toBe(6);
  });

  it("CHOOSE_DIE moves lower dice to the silver tray", () => {
    let game = roll(startGame());
    game = reduce(game, {
      type: "CHOOSE_DIE",
      playerId: "p1",
      dieId: "die-purple",
      slotIndex: 0,
    });

    const tray = trayDice(game.dice);
    expect(tray.map((d) => d.color).sort()).toEqual(
      ["blue", "green", "orange", "white", "yellow"].sort(),
    );
    expect(game.awaitingCross).toEqual({
      playerId: "p1",
      slotIndex: 0,
      trayedDieIds: tray.map((d) => d.id),
    });
  });

  it("UNDO_DIE_CHOICE returns the pick and its sweep to the pool", () => {
    const rolled = roll(startGame());
    let game = reduce(rolled, {
      type: "CHOOSE_DIE",
      playerId: "p1",
      dieId: "die-purple",
      slotIndex: 0,
    });

    game = reduce(game, { type: "UNDO_DIE_CHOICE", playerId: "p1" });

    expect(trayDice(game.dice)).toEqual([]);
    expect(poolDice(game.dice).map((d) => d.id).sort()).toEqual(
      poolDice(rolled.dice).map((d) => d.id).sort(),
    );
    expect(game.awaitingCross).toBeNull();
    expect(game.players[0].diceSlots).toEqual([null, null, null]);
    expect(game.phase).toBe("active_choose");
  });

  it("requires CROSS after CHOOSE_DIE before next roll", () => {
    let game = roll(startGame());
    game = reduce(game, {
      type: "CHOOSE_DIE",
      playerId: "p1",
      dieId: "die-yellow",
      slotIndex: 0,
    });

    expect(() => roll(game, [{ color: "yellow", value: 2 }])).toThrow(
      "Must complete cross",
    );
  });

  it("active player completes three choices then passives act", () => {
    let game = completeActiveTurn(startGame());

    expect(game.phase).toBe("passive_choose");
    expect(game.activeRollCount).toBe(3);
    expect(trayDice(game.dice).length).toBeGreaterThan(0);

    game = reduce(game, { type: "PASSIVE_TAKE", playerId: "p2", dieId: "die-blue" });
    game = reduce(game, {
      type: "CROSS",
      playerId: "p2",
      color: "blue",
      blueDie: 3,
      whiteDie: 1,
    });

    expect(game.activePlayerIndex).toBe(1);
    expect(game.phase).toBe("active_roll");
    expect(activePlayerId(game)).toBe("p2");
  });

  it("passive players may use the same tray die", () => {
    let game = completeActiveTurn(startGame());
    expect(game.phase).toBe("passive_choose");

    game = reduce(game, { type: "PASSIVE_TAKE", playerId: "p2", dieId: "die-yellow" });
    const dieStillOnTray = game.dice.find((d) => d.id === "die-yellow")?.location;
    expect(dieStillOnTray).toBe("tray");
  });

  it("lets every unfinished passive player act at the same time", () => {
    let game = completeActiveTurn(startThreePlayerGame());
    expect(game.phase).toBe("passive_choose");
    expect(playersActingNow(game)).toEqual(["p2", "p3"]);
    expect(canPlayerActNow(game, "p1")).toBe(false);

    game = reduce(game, { type: "PASSIVE_TAKE", playerId: "p3", dieId: "die-blue" });
    game = reduce(game, {
      type: "CROSS",
      playerId: "p3",
      color: "blue",
      blueDie: 3,
      whiteDie: 1,
    });

    expect(playersActingNow(game)).toEqual(["p2"]);
    expect(canPlayerActNow(game, "p3")).toBe(false);
  });

  it("advances round after each player was active once (2p)", () => {
    let game = startGame();
    expect(game.round).toBe(1);

    for (const active of ["p1", "p2"] as const) {
      game = completeActiveTurn(game);

      const passive = active === "p1" ? "p2" : "p1";
      game = reduce(game, {
        type: "PASSIVE_TAKE",
        playerId: passive,
        dieId: "die-blue",
      });
      game = reduce(game, {
        type: "CROSS",
        playerId: passive,
        color: "blue",
        blueDie: 3,
        whiteDie: 1,
      });
    }

    expect(game.round).toBe(2);
    expect(game.activePlayerIndex).toBe(0);
  });
});
