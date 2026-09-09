/**
 * Rule: The game is played over 4 (4 players), 5 (3 players), or 6 (1 and 2
 * player) rounds. At the start of the first 4 rounds, each player gets 1 bonus
 * as shown on the round tracker (round 4: choose 1 of 2 options).
 */
import { describe, expect, it } from "vitest";
import { reduceWithInvariants as reduce } from "./test-reduce";
import {
  ROUND_START_ACTIONS,
  applyRoundStartActions,
  beginRoundFourBonus,
  isSilverBonusRound,
} from "./round-start";
import { beginRound } from "./turn";
import type { Game } from "./types";

function startGame(playerCount: 2 | 3 | 4): Game {
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

describe("rule: game length by player count", () => {
  it.each([
    [2, 6],
    [3, 5],
    [4, 4],
  ] as const)("uses %i rounds for %i players", (playerCount, expectedRounds) => {
    const game = startGame(playerCount);
    expect(game.maxRounds).toBe(expectedRounds);
  });

  it("only supports 2–4 players in the app (1-player solitaire not offered)", () => {
    expect([2, 3, 4]).toEqual(
      [2, 3, 4].map((count) => startGame(count as 2 | 3 | 4).playerCount),
    );
  });
});

describe("rule: round-tracker bonuses for rounds 1–3", () => {
  it("matches the official round tracker (reroll, +1, reroll)", () => {
    expect(ROUND_START_ACTIONS[1]).toBe("reroll");
    expect(ROUND_START_ACTIONS[2]).toBe("plus_one");
    expect(ROUND_START_ACTIONS[3]).toBe("reroll");
  });

  it("starts with no bonuses before round 1 grant is applied", () => {
    const empty = startGame(2);
    const beforeGrant = {
      ...empty,
      players: empty.players.map((player) => ({
        ...player,
        sheet: {
          ...player.sheet,
          plusOnes: 0,
          plusOnesEarned: 0,
          rerolls: 0,
          rerollsEarned: 0,
          extraDice: 0,
        },
      })),
    };
    const roundOne = beginRound(beforeGrant, { applyGrants: false });
    const withGrant = applyRoundStartActions(roundOne, 1);

    expect(withGrant.players.every((p) => p.sheet.rerolls === 1)).toBe(true);
    expect(withGrant.players.every((p) => p.sheet.plusOnes === 0)).toBe(true);
  });

  it("grants the round bonus to every player when a new round begins", () => {
    let game = startGame(4);
    expect(game.players.every((p) => p.sheet.rerolls === 1)).toBe(true);

    game = { ...game, round: 2 };
    game = applyRoundStartActions(game, 2);
    expect(game.players.every((p) => p.sheet.plusOnes === 1)).toBe(true);

    game = { ...game, round: 3 };
    game = applyRoundStartActions(game, 3);
    expect(game.players.every((p) => p.sheet.rerolls === 2)).toBe(true);
  });
});

describe("rule: round 4 silver bonus (choose 1 of 2 options)", () => {
  it("only applies on round 4, not later rounds", () => {
    expect(isSilverBonusRound(4)).toBe(true);
    expect(isSilverBonusRound(5)).toBe(false);
    expect(isSilverBonusRound(6)).toBe(false);
  });

  it("prompts the active player to choose before their turn", () => {
    const game = beginRoundFourBonus({ ...startGame(2), round: 4 });
    expect(game.phase).toBe("round_bonus_choose");
    expect(game.roundBonusPendingPlayerIds).toEqual(["p1"]);
  });

  it("does not grant automatic sheet actions on round 4", () => {
    const base = startGame(2);
    const afterRoundThree = {
      ...base,
      round: 4,
      players: base.players.map((player) => ({
        ...player,
        sheet: {
          ...player.sheet,
          plusOnes: 1,
          plusOnesEarned: 1,
          rerolls: 2,
          rerollsEarned: 2,
        },
      })),
    };
    const next = applyRoundStartActions(afterRoundThree, 4);
    expect(next.players.every((p) => p.sheet.plusOnes === 1)).toBe(true);
    expect(next.players.every((p) => p.sheet.rerolls === 2)).toBe(true);
  });
});

describe("rule: no round-tracker bonus after round 4", () => {
  it.each([5, 6] as const)("round %i begins in active_roll with no silver bonus", (round) => {
    const game = beginRound({ ...startGame(2), round });
    expect(game.phase).toBe("active_roll");
    expect(game.roundBonusPendingPlayerIds).toEqual([]);
  });
});
