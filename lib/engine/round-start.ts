import { grantPlusOne, grantReroll } from "./sheet-actions";
import type { Effect, Game, Player, RoundBonusChoice } from "./types";

/** Round-tracker grants for rounds 1–3 (official sheet). */
export const ROUND_START_ACTIONS: Readonly<
  Record<1 | 2 | 3, "plus_one" | "reroll">
> = {
  1: "reroll",
  2: "plus_one",
  3: "reroll",
};

function applyActionGrant(player: Player, grant: "plus_one" | "reroll"): Player {
  let sheet = player.sheet;
  switch (grant) {
    case "plus_one":
      sheet = grantPlusOne(sheet);
      break;
    case "reroll":
      sheet = grantReroll(sheet);
      break;
  }
  return { ...player, sheet };
}

/** Grant the round-tracker action to the active player (rounds 1–3). */
export function applyRoundStartActions(game: Game, round: number): Game {
  if (round > 3) {
    return game;
  }

  const grant = ROUND_START_ACTIONS[round as 1 | 2 | 3];
  const activeIndex = game.activePlayerIndex;
  return {
    ...game,
    players: game.players.map((player, index) =>
      index === activeIndex ? applyActionGrant(player, grant) : player,
    ),
  };
}

export function isSilverBonusRound(round: number): boolean {
  return round === 4;
}

/** Active player picks silver X or 6, then plays their turn. */
export function beginRoundFourBonus(game: Game): Game {
  const activeId = game.players[game.activePlayerIndex]?.id;
  return {
    ...game,
    phase: "round_bonus_choose",
    roundBonusPendingPlayerIds: activeId ? [activeId] : [],
  };
}

export function roundBonusEffect(choice: RoundBonusChoice): Effect {
  return choice === "black_x"
    ? { type: "round_black_x" }
    : { type: "round_black_six" };
}

export function isRoundBonusEffect(
  effect: Effect | undefined,
): effect is Extract<Effect, { type: "round_black_x" | "round_black_six" }> {
  return effect?.type === "round_black_x" || effect?.type === "round_black_six";
}

export function allRoundBonusesChosen(game: Game): boolean {
  return game.roundBonusPendingPlayerIds.length === 0;
}
