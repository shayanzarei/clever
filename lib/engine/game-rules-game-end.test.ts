/**
 * Rule: Game ends after the last active turn in the final round and all passive
 * actions; score each color area plus foxes; highest total wins; tie-break by
 * individual areas; shared victory if still tied.
 */
import { describe, expect, it } from "vitest";
import { applyYellowCross } from "./apply";
import { reduceWithInvariants as reduce } from "./test-reduce";
import {
  colorScores,
  scoreBlue,
  scoreFoxes,
  scoreGreen,
  scoreOrange,
  scorePurple,
  scoreSheet,
  scoreYellow,
} from "./scoring";
import { createEmptySheet } from "./sheet";
import { advanceTurn } from "./turn";
import {
  rankFinishedPlayers,
  winnerNames,
} from "@/lib/game/score-level";
import type { Game } from "./types";

function startGame(): Game {
  return reduce({} as Game, {
    type: "START_GAME",
    playerCount: 2,
    playerNames: ["Alice", "Bob"],
  });
}

function crossYellowColumn(sheet: ReturnType<typeof createEmptySheet>, column: number) {
  let next = sheet;
  for (let row = 0; row < 4; row += 1) {
    next = applyYellowCross(next, row * 4 + column).sheet;
  }
  return next;
}

describe("rule: game ends after the final round and passive actions", () => {
  it("does not finish before the last active player completes the final round", () => {
    const game = advanceTurn({
      ...startGame(),
      round: 6,
      maxRounds: 6,
      activePlayerIndex: 0,
    });

    expect(game.phase).toBe("active_roll");
    expect(game.round).toBe(6);
    expect(game.activePlayerIndex).toBe(1);
  });

  it("finishes when the turn advances past the last round", () => {
    const game = advanceTurn({
      ...startGame(),
      round: 6,
      maxRounds: 6,
      activePlayerIndex: 1,
    });

    expect(game.phase).toBe("finished");
    expect(game.round).toBe(7);
  });

  it("ends only after the last passive player acts on the final turn", () => {
    let game = startGame();
    game = {
      ...game,
      round: 6,
      maxRounds: 6,
      activePlayerIndex: 1,
      phase: "passive_choose",
      activeRollCount: 0,
    };

    game = reduce(game, { type: "SKIP_EXTRA_DIE", playerId: "p1" });
    expect(game.phase).toBe("finished");
  });

  it("does not end while passive players still owe actions earlier in the game", () => {
    let game = startGame();
    game = {
      ...game,
      round: 1,
      maxRounds: 6,
      activePlayerIndex: 0,
      phase: "passive_choose",
    };

    game = reduce(game, { type: "SKIP_EXTRA_DIE", playerId: "p2" });
    expect(game.phase).toBe("active_roll");
    expect(game.activePlayerIndex).toBe(1);
  });
});

describe("rule: end-game scoring by colored area and foxes", () => {
  it("scores each colored area independently", () => {
    let sheet = crossYellowColumn(createEmptySheet(), 0);
    expect(scoreYellow(sheet)).toBe(10);

    sheet = {
      ...sheet,
      blue: {
        boxes: sheet.blue.boxes.map((box, index) => ({
          ...box,
          crossed: index < 4,
        })),
      },
    };
    expect(scoreBlue(sheet)).toBe(7);
  });

  it("adds fox points based on the lowest color score", () => {
    let sheet = crossYellowColumn(createEmptySheet(), 0);
    sheet = {
      ...sheet,
      blue: {
        boxes: sheet.blue.boxes.map((box, index) => ({
          ...box,
          crossed: index === 0,
        })),
      },
      green: {
        boxes: sheet.green.boxes.map((box, index) => ({
          ...box,
          crossed: index === 0,
        })),
      },
      orange: {
        boxes: sheet.orange.boxes.map((box, i) => ({
          ...box,
          value: i === 0 ? 2 : null,
        })),
      },
      purple: {
        boxes: sheet.purple.boxes.map((box, i) => ({
          ...box,
          value: i === 0 ? 3 : null,
        })),
      },
      foxes: 2,
    };

    expect(scoreFoxes(sheet)).toBe(2);
    expect(scoreSheet(sheet)).toBe(
      scoreYellow(sheet) +
        scoreBlue(sheet) +
        scoreGreen(sheet) +
        scoreOrange(sheet) +
        scorePurple(sheet) +
        scoreFoxes(sheet),
    );
  });
});

describe("rule: winner and tie-breaking", () => {
  function player(
    id: string,
    name: string,
    colors: {
      yellow: number;
      blue: number;
      green: number;
      orange: number;
      purple: number;
      foxScore?: number;
      foxCount?: number;
    },
  ) {
    const foxScore = colors.foxScore ?? 0;
    const foxCount = colors.foxCount ?? 0;
    const areaColors = {
      yellow: colors.yellow,
      blue: colors.blue,
      green: colors.green,
      orange: colors.orange,
      purple: colors.purple,
    };
    const total =
      areaColors.yellow +
      areaColors.blue +
      areaColors.green +
      areaColors.orange +
      areaColors.purple +
      foxScore;
    return {
      id,
      name,
      total,
      colors: areaColors,
      foxCount,
      foxScore,
    };
  }

  it("declares the highest total the winner", () => {
    const results = rankFinishedPlayers([
      player("p1", "Alice", { yellow: 10, blue: 7, green: 6, orange: 5, purple: 4 }),
      player("p2", "Bob", { yellow: 14, blue: 11, green: 10, orange: 8, purple: 6 }),
    ]);

    expect(winnerNames(results)).toEqual(["Bob"]);
    expect(results[0]?.name).toBe("Bob");
  });

  it("breaks a tie using the highest score in any single area", () => {
    const results = rankFinishedPlayers([
      player("p1", "Alice", { yellow: 8, blue: 6, green: 4, orange: 4, purple: 3 }),
      player("p2", "Bob", { yellow: 7, blue: 9, green: 3, orange: 3, purple: 3 }),
    ]);

    expect(results[0]?.total).toBe(results[1]?.total);
    expect(winnerNames(results)).toEqual(["Bob"]);
  });

  it("shares victory when totals and all color scores match", () => {
    const results = rankFinishedPlayers([
      player("p1", "Alice", { yellow: 10, blue: 7, green: 6, orange: 5, purple: 4, foxScore: 2 }),
      player("p2", "Bob", { yellow: 10, blue: 7, green: 6, orange: 5, purple: 4, foxScore: 2 }),
    ]);

    expect(winnerNames(results)).toEqual(["Alice", "Bob"]);
    expect(results[0]?.rank).toBe(1);
    expect(results[1]?.rank).toBe(1);
  });

  it("ranks finished players from engine sheets consistently", () => {
    const aliceSheet = crossYellowColumn(createEmptySheet(), 0);
    const bobSheet = crossYellowColumn(createEmptySheet(), 1);

    const results = rankFinishedPlayers([
      {
        id: "p1",
        name: "Alice",
        total: scoreSheet(aliceSheet),
        colors: colorScores(aliceSheet),
        foxCount: aliceSheet.foxes,
        foxScore: scoreFoxes(aliceSheet),
      },
      {
        id: "p2",
        name: "Bob",
        total: scoreSheet(bobSheet),
        colors: colorScores(bobSheet),
        foxCount: bobSheet.foxes,
        foxScore: scoreFoxes(bobSheet),
      },
    ]);

    expect(results[0]?.total).toBeGreaterThan(results[1]?.total ?? 0);
    expect(winnerNames(results)).toHaveLength(1);
  });
});
