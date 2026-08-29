import type { PlayerCount } from "@/lib/game/player-seats";
import { PLAYER_COUNTS } from "@/lib/game/player-seats";

type PlayerCountPickerProps = {
  value: PlayerCount;
  onChange: (count: PlayerCount) => void;
  disabled?: boolean;
  minCount?: PlayerCount;
};

export function PlayerCountPicker({
  value,
  onChange,
  disabled = false,
  minCount = 2,
}: PlayerCountPickerProps) {
  return (
    <fieldset className="flex flex-col gap-2 text-sm" disabled={disabled}>
      <legend className="font-medium text-zinc-700">Players</legend>
      <div className="flex gap-2">
        {PLAYER_COUNTS.map((count) => (
          <button
            key={count}
            type="button"
            disabled={count < minCount}
            className={[
              "flex-1 rounded-lg border px-3 py-2 font-medium transition-colors",
              value === count
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50",
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
