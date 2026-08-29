import type { DieColor } from "@/lib/engine/types";

export type DieSize = "sm" | "md" | "lg";

type DieProps = {
  color: DieColor;
  value: number;
  isSelected?: boolean;
  isUsed?: boolean;
  isHighlighted?: boolean;
  size?: DieSize;
  title?: string;
  disabled?: boolean;
  onClick?: () => void;
};

/** Pip positions on a 3×3 grid, top-left to bottom-right. */
const PIP_LAYOUTS: Record<number, readonly number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const FACE_STYLES: Record<DieColor, string> = {
  yellow: "bg-[#f5c518]",
  blue: "bg-[#3b82f6]",
  green: "bg-[#22c55e]",
  orange: "bg-[#f97316]",
  purple: "bg-[#a855f7]",
  white: "bg-[#e4e4e7]",
};

const RING_STYLES: Record<DieColor, string> = {
  yellow: "ring-[#f5c518]",
  blue: "ring-[#3b82f6]",
  green: "ring-[#22c55e]",
  orange: "ring-[#f97316]",
  purple: "ring-[#a855f7]",
  white: "ring-[#e4e4e7]",
};

const SIZE_STYLES: Record<DieSize, string> = {
  sm: "h-7 w-7 rounded-[0.45rem] p-[0.18rem]",
  md: "h-9 w-9 rounded-[0.6rem] p-[0.24rem]",
  lg: "h-14 w-14 rounded-[0.9rem] p-[0.38rem]",
};

export function Die({
  color,
  value,
  isSelected = false,
  isUsed = false,
  isHighlighted = false,
  size = "md",
  title,
  disabled = false,
  onClick,
}: DieProps) {
  const pips = PIP_LAYOUTS[value] ?? [];
  const interactive = Boolean(onClick) && !disabled;
  const label = title ?? `${color} die showing ${value}`;

  const face = [
    "relative grid grid-cols-3 grid-rows-3 shadow-sm transition",
    SIZE_STYLES[size],
    isUsed ? "bg-[#6b7280]" : FACE_STYLES[color],
    isSelected
      ? `ring-2 ring-offset-2 ring-offset-[#2b2735] ${RING_STYLES[color]}`
      : "",
    isHighlighted && !isSelected ? "scale-105 shadow-md" : "",
    interactive ? "cursor-pointer hover:brightness-110" : "",
    disabled && !isUsed ? "opacity-45" : "",
  ].join(" ");

  const pipColor = isUsed ? "bg-[#3f3f46]" : "bg-[#18181b]";

  const content = Array.from({ length: 9 }, (_, cell) => (
    <span key={cell} className="flex items-center justify-center">
      {pips.includes(cell) && (
        <span className={`block h-[58%] w-[58%] rounded-full ${pipColor}`} />
      )}
    </span>
  ));

  if (!interactive) {
    return (
      <span className={face} role="img" aria-label={label} title={label}>
        {content}
      </span>
    );
  }

  return (
    <button type="button" className={face} title={label} onClick={onClick}>
      {content}
    </button>
  );
}
