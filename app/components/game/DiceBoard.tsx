import { Die } from "@/app/components/Die";
import type { DieState } from "@/lib/engine/types";

type DiceBoardProps = {
  dice: readonly DieState[];
  onDieClick?: (die: DieState) => void;
  clickableIds?: ReadonlySet<string>;
  selectedId?: string | null;
  compact?: boolean;
};

function groupLabel(location: DieState["location"]): string {
  switch (location) {
    case "pool":
      return "Pool";
    case "tray":
      return "Silver tray";
    case "slot":
      return "Active slots";
    default:
      return "Used";
  }
}

export function DiceBoard({
  dice,
  onDieClick,
  clickableIds,
  selectedId,
  compact = false,
}: DiceBoardProps) {
  const locations: DieState["location"][] = compact
    ? ["pool", "slot", "tray"]
    : ["pool", "slot", "tray", "consumed"];

  return (
    <section className={compact ? "dice-board dice-board--compact" : ""}>
      {!compact && (
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Dice
        </h3>
      )}
      <div className={compact ? "flex flex-wrap items-end gap-2" : "flex flex-wrap gap-4"}>
        {locations.map((location) => {
          const group = dice.filter((die) => die.location === location);
          if (group.length === 0) {
            return null;
          }
          return (
            <div key={location} className="min-w-0">
              <p
                className={[
                  "font-medium uppercase tracking-wide text-zinc-400",
                  compact ? "mb-1 text-[10px]" : "mb-1.5 text-xs",
                ].join(" ")}
              >
                {groupLabel(location)}
              </p>
              <div className="dice-tray">
                {group.map((die) => {
                  const clickable = Boolean(
                    onDieClick && clickableIds?.has(die.id),
                  );
                  return (
                    <Die
                      key={die.id}
                      color={die.color}
                      value={die.value}
                      size={compact ? "sm" : "md"}
                      title={`${die.color} ${die.value} (${die.location})`}
                      isSelected={selectedId === die.id}
                      isHighlighted={clickableIds?.has(die.id)}
                      isUsed={location === "consumed"}
                      disabled={clickableIds ? !clickable : !onDieClick}
                      onClick={clickable ? () => onDieClick?.(die) : undefined}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
