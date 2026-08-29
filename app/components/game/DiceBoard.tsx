import type { DieColor, DieState } from "@/lib/engine/types";

const DIE_STYLES: Record<DieColor, string> = {
  yellow: "bg-yellow-300 text-yellow-950 border-yellow-500",
  blue: "bg-blue-400 text-blue-950 border-blue-600",
  green: "bg-green-400 text-green-950 border-green-600",
  orange: "bg-orange-400 text-orange-950 border-orange-600",
  purple: "bg-purple-400 text-purple-950 border-purple-600",
  white: "bg-zinc-100 text-zinc-800 border-zinc-400",
};

type DieChipProps = {
  die: DieState;
  selected?: boolean;
  highlight?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
};

export function DieChip({
  die,
  selected,
  highlight,
  disabled,
  onClick,
  title,
}: DieChipProps) {
  const interactive = Boolean(onClick) && !disabled;

  return (
    <button
      type="button"
      title={title ?? `${die.color} ${die.value} (${die.location})`}
      disabled={!interactive}
      onClick={onClick}
      className={[
        "flex h-11 w-11 flex-col items-center justify-center rounded-lg border-2 text-xs font-bold shadow-sm transition",
        DIE_STYLES[die.color],
        selected ? "ring-2 ring-zinc-900 ring-offset-2" : "",
        highlight ? "scale-105 shadow-md" : "",
        interactive ? "cursor-pointer hover:brightness-95" : "opacity-80",
        disabled ? "cursor-not-allowed opacity-40" : "",
      ].join(" ")}
    >
      <span className="text-[10px] uppercase leading-none opacity-70">
        {die.color.slice(0, 1)}
      </span>
      <span className="text-base leading-none">{die.value}</span>
    </button>
  );
}

type DiceBoardProps = {
  dice: readonly DieState[];
  onDieClick?: (die: DieState) => void;
  clickableIds?: ReadonlySet<string>;
  selectedId?: string | null;
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
}: DiceBoardProps) {
  const locations: DieState["location"][] = ["pool", "slot", "tray", "consumed"];

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Dice
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {locations.map((location) => {
          const group = dice.filter((die) => die.location === location);
          if (group.length === 0) {
            return null;
          }
          return (
            <div key={location}>
              <p className="mb-2 text-xs font-medium text-zinc-500">
                {groupLabel(location)}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.map((die) => (
                  <DieChip
                    key={die.id}
                    die={die}
                    selected={selectedId === die.id}
                    highlight={clickableIds?.has(die.id)}
                    disabled={clickableIds ? !clickableIds.has(die.id) : !onDieClick}
                    onClick={
                      onDieClick && clickableIds?.has(die.id)
                        ? () => onDieClick(die)
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
