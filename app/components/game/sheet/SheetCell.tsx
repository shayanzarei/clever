"use client";

import type { ReactNode } from "react";

const CELL = "pad-cell";

type SheetCellProps = {
  value: ReactNode;
  color: "yellow" | "blue" | "green" | "orange" | "purple";
  active?: boolean;
  crossed?: boolean;
  filled?: boolean;
  preprinted?: boolean;
  fluid?: boolean;
  onClick?: () => void;
  title?: string;
  watermark?: string;
  prefix?: string;
};

export function SheetCell({
  value,
  color,
  active = false,
  crossed = false,
  filled = false,
  preprinted = false,
  fluid = false,
  onClick,
  title,
  watermark,
  prefix,
}: SheetCellProps) {
  const clickable = Boolean(onClick);
  const isEmpty =
    value === "" || value === "·" || value === null || value === undefined;

  return (
    <button
      type="button"
      title={title}
      disabled={!clickable}
      onClick={onClick}
      className={[
        CELL,
        `${CELL}--${color}`,
        crossed ? `${CELL}--crossed` : "",
        preprinted ? `${CELL}--preprinted` : "",
        filled ? `${CELL}--filled` : "",
        fluid ? `${CELL}--fluid` : "",
        isEmpty && !watermark && !preprinted ? `${CELL}--empty` : "",
        active ? `${CELL}--active` : "",
        clickable ? `${CELL}--clickable` : "",
      ].join(" ")}
    >
      {watermark && !filled && !crossed && !preprinted && (
        <span className={`${CELL}__watermark`}>{watermark}</span>
      )}
      <span className={`${CELL}__value`}>
        {preprinted ? "✕" : prefix}
        {!preprinted && (isEmpty && !watermark ? "·" : value)}
      </span>
    </button>
  );
}

export function BonusSlot({
  children,
  claimed = false,
}: {
  children: React.ReactNode;
  claimed?: boolean;
}) {
  return (
    <span
      className={["pad-bonus-slot", claimed ? "pad-bonus-slot--claimed" : ""].join(
        " ",
      )}
    >
      {children}
    </span>
  );
}

export function FlowArrow({ direction = "right" }: { direction?: "right" | "down" }) {
  return (
    <span className="pad-flow-arrow" aria-hidden>
      {direction === "down" ? "↓" : "→"}
    </span>
  );
}
