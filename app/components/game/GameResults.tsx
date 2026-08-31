"use client";

import {
  colorScores,
  scoreFoxes,
  scoreSheet,
} from "@/lib/engine/scoring";
import type { Game } from "@/lib/engine/types";
import type { PlayerSeatId } from "@/lib/game/player-seats";
import {
  rankFinishedPlayers,
  SCORE_LEVELS,
  scoreLevelRange,
  winnerNames,
  type FinishedPlayerResult,
} from "@/lib/game/score-level";
import { initials, seatAccent } from "@/lib/game/turn-order";

type GameResultsProps = {
  game: Game;
  myPlayerId?: PlayerSeatId | null;
  onLeave?: () => void;
};

export function GameResults({ game, myPlayerId = null, onLeave }: GameResultsProps) {
  const results = buildResults(game);
  const winners = winnerNames(results);
  const headline =
    winners.length === 1
      ? `${winners[0]} wins!`
      : `${winners.join(" & ")} tie for first!`;

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-y-auto bg-ink text-white">
      <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-16">
        <div className="h-[28rem] w-[28rem] rounded-full border border-dashed border-line/60" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-5 py-8 sm:px-6">
        <p className="text-center text-xs font-bold tracking-[0.2em] text-neon-green uppercase">
          Game over
        </p>
        <h1 className="mt-3 text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
          {headline}
        </h1>
        <p className="mt-2 text-center text-sm text-muted">
          {game.maxRounds} rounds · {game.playerCount} players
        </p>

        <ol className="mt-8 flex flex-col gap-3">
          {results.map((player, index) => (
            <PlayerResultCard
              key={player.id}
              player={player}
              accent={seatAccent(index)}
              isMe={player.id === myPlayerId}
              isWinner={player.rank === 1}
            />
          ))}
        </ol>

        <section className="mt-8 rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-xs font-bold tracking-[0.18em] text-muted uppercase">
            Score levels
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {SCORE_LEVELS.map((level) => (
              <li
                key={level.label}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-white">{level.label}</span>
                <span className="shrink-0 font-mono text-xs text-muted">
                  {scoreLevelRange(level)} pts
                </span>
              </li>
            ))}
          </ul>
        </section>

        {onLeave && (
          <button
            type="button"
            onClick={onLeave}
            className="mt-8 h-14 rounded-2xl bg-neon-blue text-sm font-black tracking-wider text-ink uppercase shadow-[0_0_24px_rgba(19,239,244,0.35)]"
          >
            Back to menu
          </button>
        )}
      </main>
    </div>
  );
}

function buildResults(game: Game): FinishedPlayerResult[] {
  const scored = game.players.map((player) => {
    const colors = colorScores(player.sheet);
    return {
      id: player.id,
      name: player.name,
      total: scoreSheet(player.sheet),
      colors: {
        ...colors,
        foxes: scoreFoxes(player.sheet),
      },
    };
  });

  return rankFinishedPlayers(scored);
}

function PlayerResultCard({
  player,
  accent,
  isMe,
  isWinner,
}: {
  player: FinishedPlayerResult;
  accent: string;
  isMe: boolean;
  isWinner: boolean;
}) {
  return (
    <li
      className={[
        "rounded-2xl border bg-elevated p-4",
        isWinner ? "border-neon-yellow/60 shadow-[0_0_24px_rgba(244,240,19,0.12)]" : "border-line",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold"
          style={{ borderColor: accent, color: accent }}
        >
          {initials(player.name)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-lg font-bold">{player.name}</p>
            {isMe && (
              <span className="rounded-full bg-neon-blue/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-neon-blue uppercase">
                You
              </span>
            )}
            {isWinner && (
              <span className="rounded-full bg-neon-yellow/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-neon-yellow uppercase">
                Winner
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-neon-orange">{player.level.label}</p>
        </div>

        <div className="text-right">
          <p className="text-2xl font-extrabold tabular-nums">{player.total}</p>
          <p className="text-[10px] tracking-widest text-muted uppercase">points</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs sm:grid-cols-6">
        <ColorScore label="Yellow" value={player.colors.yellow} tone="text-neon-yellow" />
        <ColorScore label="Blue" value={player.colors.blue} tone="text-neon-blue" />
        <ColorScore label="Green" value={player.colors.green} tone="text-neon-green" />
        <ColorScore label="Orange" value={player.colors.orange} tone="text-neon-orange" />
        <ColorScore label="Purple" value={player.colors.purple} tone="text-neon-purple" />
        <ColorScore label="Foxes" value={player.colors.foxes} tone="text-white" />
      </dl>
    </li>
  );
}

function ColorScore({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-line/80 bg-ink/40 px-2 py-1.5 text-center">
      <dt className="text-[10px] tracking-wide text-muted uppercase">{label}</dt>
      <dd className={`mt-0.5 font-bold tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}
