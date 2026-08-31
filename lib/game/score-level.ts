export type ScoreLevel = {
  label: string;
  min: number;
  max: number | null;
};

/** Official end-game rating bands from the score pad. */
export const SCORE_LEVELS: readonly ScoreLevel[] = [
  { label: "You're So Clever", min: 281, max: null },
  { label: "Are you Einstein?", min: 260, max: 280 },
  { label: "What a genius!", min: 240, max: 259 },
  { label: "Impressive!", min: 220, max: 239 },
  { label: "Hat's off to you!", min: 200, max: 219 },
  { label: "Great result!", min: 180, max: 199 },
  { label: "That was pretty good.", min: 160, max: 179 },
  { label: "Not bad… you could do better.", min: 140, max: 159 },
  { label: "Try harder!", min: 0, max: 139 },
] as const;

export function scoreLevel(points: number): ScoreLevel {
  for (const level of SCORE_LEVELS) {
    if (level.max === null && points > level.min - 1) {
      return level;
    }
    if (level.max !== null && points >= level.min && points <= level.max) {
      return level;
    }
  }
  return SCORE_LEVELS[SCORE_LEVELS.length - 1]!;
}

export function scoreLevelRange(level: ScoreLevel): string {
  if (level.max === null) {
    return `>${level.min - 1}`;
  }
  if (level.min === 0) {
    return `<${level.max + 1}`;
  }
  return `${level.min}-${level.max}`;
}

export type ColorScoreBreakdown = {
  yellow: number;
  blue: number;
  green: number;
  orange: number;
  purple: number;
};

export type FinishedPlayerResult = {
  id: string;
  name: string;
  total: number;
  level: ScoreLevel;
  colors: ColorScoreBreakdown;
  foxCount: number;
  foxScore: number;
  rank: number;
};

function bestAreaScore(colors: ColorScoreBreakdown): number {
  return Math.max(
    colors.yellow,
    colors.blue,
    colors.green,
    colors.orange,
    colors.purple,
  );
}

function playersFullyTied(
  left: { total: number; colors: ColorScoreBreakdown },
  right: { total: number; colors: ColorScoreBreakdown },
): boolean {
  if (left.total !== right.total) {
    return false;
  }
  return bestAreaScore(left.colors) === bestAreaScore(right.colors);
}

function compareFinishedPlayers(
  left: { name: string; total: number; colors: ColorScoreBreakdown },
  right: { name: string; total: number; colors: ColorScoreBreakdown },
): number {
  if (right.total !== left.total) {
    return right.total - left.total;
  }

  const bestDiff = bestAreaScore(right.colors) - bestAreaScore(left.colors);
  if (bestDiff !== 0) {
    return bestDiff;
  }

  return left.name.localeCompare(right.name);
}

export function rankFinishedPlayers(
  players: readonly {
    id: string;
    name: string;
    total: number;
    colors: ColorScoreBreakdown;
    foxCount: number;
    foxScore: number;
  }[],
): FinishedPlayerResult[] {
  const sorted = [...players].sort(compareFinishedPlayers);

  let rank = 0;
  let lastEntry: (typeof sorted)[number] | null = null;

  return sorted.map((player, index) => {
    if (
      lastEntry === null ||
      !playersFullyTied(lastEntry, player)
    ) {
      rank = index + 1;
      lastEntry = player;
    }

    return {
      ...player,
      level: scoreLevel(player.total),
      rank,
    };
  });
}

export function winnerNames(results: readonly FinishedPlayerResult[]): string[] {
  if (results.length === 0) {
    return [];
  }
  const topRank = results[0]!.rank;
  return results.filter((entry) => entry.rank === topRank).map((entry) => entry.name);
}
