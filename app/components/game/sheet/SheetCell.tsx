"use client";

import type { ReactNode } from "react";

type SheetCellProps = {
  value: ReactNode;
  color: "yellow" | "blue" | "green" | "orange" | "purple";
  active?: boolean;
  crossed?: boolean;
  filled?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
  diagonal?: boolean;
  /** Faded label inside empty cells (e.g. orange ×2). */
  watermark?: string;
  prefix?: string;
};

export function SheetCell({
  value,
  color,
  active = false,
  crossed = false,
  filled = false,
  disabled = true,
  onClick,
  title,
  diagonal = false,
  watermark,
  prefix,
}: SheetCellProps) {
  const clickable = Boolean(onClick) && !disabled;
  const isEmpty =
    value === "" || value === "·" || value === null || value === undefined;

  return (
    <button
      type="button"
      title={title}
      disabled={!clickable}
      onClick={onClick}
      className={[
        "pad-cell",
        `pad-cell--${color}`,
        crossed ? "pad-cell--crossed" : "",
        filled ? "pad-cell--filled" : "",
        isEmpty && !watermark ? "pad-cell--empty" : "",
        active ? "pad-cell--active" : "",
        clickable ? "pad-cell--clickable" : "",
      ].join(" ")}
    >
      {diagonal && <span className="pad-cell__diag" aria-hidden />}
      {watermark && !filled && !crossed && (
        <span className="pad-cell__watermark">{watermark}</span>
      )}
      <span className="pad-cell__value">
        {prefix}
        {isEmpty && !watermark ? "·" : value}
      </span>
    </button>
  );
}
