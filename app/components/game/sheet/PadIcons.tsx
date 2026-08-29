import type { Effect } from "@/lib/engine/types";

type BonusIconProps = {
  effect: Effect;
  claimed?: boolean;
  size?: "sm" | "md";
};

export function BonusIcon({ effect, claimed = false, size = "md" }: BonusIconProps) {
  const className = [
    "pad-icon",
    `pad-icon--${iconVariant(effect)}`,
    size === "sm" ? "pad-icon--sm" : "",
    claimed ? "pad-icon--claimed" : "",
  ].join(" ");

  return (
    <span className={className} aria-hidden>
      <IconContent effect={effect} />
    </span>
  );
}

function iconVariant(effect: Effect): string {
  switch (effect.type) {
    case "cross_yellow_free":
      return "yellow-x";
    case "cross_blue_free":
      return "blue-x";
    case "cross_green_bonus":
      return "green-x";
    case "fill_orange":
      return "orange-num";
    case "fill_purple":
      return "purple-num";
    case "fox":
      return "fox";
    case "reroll":
      return "reroll";
    case "plus_one":
      return "plus-one";
    default:
      return "neutral";
  }
}

function IconContent({ effect }: { effect: Effect }) {
  switch (effect.type) {
    case "cross_yellow_free":
    case "cross_blue_free":
    case "cross_green_bonus":
      return <span className="pad-icon__x">✕</span>;
    case "fill_orange":
      return <span className="pad-icon__num">{effect.value}</span>;
    case "fill_purple":
      return <span className="pad-icon__num">{effect.value}</span>;
    case "fox":
      return <FoxSvg />;
    case "reroll":
      return <RerollSvg />;
    case "plus_one":
      return <span className="pad-icon__plus">+1</span>;
    default:
      return <span className="pad-icon__plus">?</span>;
  }
}

export function StarBadge({
  value,
  claimed = false,
  tone = "gold",
}: {
  value: number;
  claimed?: boolean;
  tone?: "gold" | "green" | "blue";
}) {
  return (
    <span
      className={[
        "pad-star",
        `pad-star--${tone}`,
        claimed ? "pad-star--claimed" : "",
      ].join(" ")}
    >
      {value}
    </span>
  );
}

export function TrackArrow({ tone }: { tone: "green" | "orange" | "purple" }) {
  return (
    <span className={`pad-track-arrow pad-track-arrow--${tone}`} aria-hidden>
      →
    </span>
  );
}

export function BlueDieHint() {
  return (
    <span className="pad-dice-hint" aria-hidden title="Blue + white die sum">
      <span className="pad-dice-hint__die pad-dice-hint__die--blue">◆</span>
      <span className="pad-dice-hint__plus">+</span>
      <span className="pad-dice-hint__die pad-dice-hint__die--white">◆</span>
    </span>
  );
}

export function TrackSeparator({ tone }: { tone: "purple" }) {
  return <span className={`pad-track-sep pad-track-sep--${tone}`}>&gt;</span>;
}

function FoxSvg() {
  return (
    <svg viewBox="0 0 24 24" className="pad-icon__fox" aria-hidden>
      <path
        fill="currentColor"
        d="M12 3 8 8.5 4 7l2 6.5L3 22l9-4.5L21 22l-3-8.5L20 7l-4 1.5L12 3Z"
      />
      <circle cx="9" cy="12" r="1.2" fill="#fff" />
      <circle cx="15" cy="12" r="1.2" fill="#fff" />
    </svg>
  );
}

function RerollSvg() {
  return (
    <svg viewBox="0 0 24 24" className="pad-icon__reroll" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        d="M17 4l2 2-2 2M7 20l-2-2 2-2M19 12a7 7 0 0 0-7-7H5M5 12a7 7 0 0 0 7 7h7"
      />
    </svg>
  );
}

export function ColumnSeal({ value, claimed }: { value: number; claimed: boolean }) {
  return (
    <span className={["pad-seal", claimed ? "pad-seal--claimed" : ""].join(" ")}>
      {value}
    </span>
  );
}
