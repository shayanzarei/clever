import { Die } from "@/app/components/Die";
import type { DieState } from "@/lib/engine/types";

type DiceBoardProps = {
  dice: readonly DieState[];
  onDieClick?: (die: DieState) => void;
  clickableIds?: ReadonlySet<string>;
  selectedId?: string | null;
  compact?: boolean;
};

const LANES: { location: DieState["location"]; label: string }[] = [
  { location: "pool", label: "Rolled" },
  { location: "slot", label: "Active used" },
  { location: "tray", label: "For others" },
];

export function DiceBoard({
  dice,
  onDieClick,
  clickableIds,
  selectedId,
  compact = false,
}: DiceBoardProps) {
  function renderDie(die: DieState) {
    const clickable = Boolean(onDieClick && clickableIds?.has(die.id));
    return (
      <Die
        key={die.id}
        color={die.color}
        value={die.value}
        size={compact ? "sm" : "md"}
        title={`${die.color} ${die.value}`}
        isSelected={selectedId === die.id || die.location === "slot"}
        isHighlighted={clickable}
        isUsed={die.location === "consumed"}
        disabled={!clickable}
        onClick={clickable ? () => onDieClick?.(die) : undefined}
      />
    );
  }

  return (
    <section className={compact ? "dice-rack dice-rack--compact" : "dice-rack"}>
      {LANES.map(({ location, label }) => {
        const group = dice.filter((die) => die.location === location);
        return (
          <div
            key={location}
            className={[
              "dice-lane",
              `dice-lane--${location}`,
              group.length === 0 ? "dice-lane--empty" : "",
            ].join(" ")}
          >
            <p className="dice-lane__label">{label}</p>
            <div className="dice-lane__dice">
              {group.length > 0 ? group.map(renderDie) : <span className="dice-lane__empty">—</span>}
            </div>
          </div>
        );
      })}
    </section>
  );
}
