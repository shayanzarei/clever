import type { PlayerCount } from "@/lib/game/player-seats";
import { PLAYER_COUNTS } from "@/lib/game/player-seats";

type PlayerCountPickerProps = {
  value: PlayerCount;
  onChange: (count: PlayerCount) => void;
  disabled?: boolean;
  minCount?: PlayerCount;
  variant?: "light" | "neon";
};

export function PlayerCountPicker({
  value,
  onChange,
  disabled = false,
  minCount = 2,
  variant = "light",
}: PlayerCountPickerProps) {
  const neon = variant === "neon";

  return (
    <fieldset className="flex flex-col gap-2 text-sm" disabled={disabled}>
      <legend
        className={
          neon
            ? "text-xs font-bold tracking-widest text-muted uppercase"
            : "font-medium text-zinc-700"
        }
      >
        Players
      </legend>
      <div className="flex gap-3">
        {PLAYER_COUNTS.map((count) => (
          <button
            key={count}
            type="button"
            disabled={count < minCount}
            className={[
              "flex-1 font-bold transition-colors",
              neon
                ? [
                    "h-14 rounded-2xl border-2",
                    value === count
                      ? "border-neon-blue bg-elevated text-neon-blue"
                      : "border-line bg-elevated text-muted",
                  ].join(" ")
                : [
                    "rounded-lg border px-3 py-2 font-medium",
                    value === count
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50",
                  ].join(" "),
              disabled || count < minCount ? "opacity-50" : "",
            ].join(" ")}
            onClick={() => onChange(count)}
          >
            {count}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
