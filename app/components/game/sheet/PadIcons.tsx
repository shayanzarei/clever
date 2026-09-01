import type { Effect } from "@/lib/engine/types";
import { Die } from "@/app/components/Die";

type BonusIconProps = {
  effect: Effect;
  claimed?: boolean;
  size?: "sm" | "md";
};

export function bonusIconClass(effect: Effect): string {
  return `pad-icon--${iconVariant(effect)}`;
}

export function BonusIcon({ effect, claimed = false, size = "md" }: BonusIconProps) {
  return (
    <span
      className={[
        "pad-icon",
        bonusIconClass(effect),
        size === "sm" ? "pad-icon--sm" : "",
        claimed ? "pad-icon--claimed" : "",
      ].join(" ")}
      aria-hidden
    >
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
      return "plus-one";
  }
}

function IconContent({ effect }: { effect: Effect }) {
  switch (effect.type) {
    case "cross_yellow_free":
    case "cross_blue_free":
    case "cross_green_bonus":
      return <span className="pad-icon__x">✕</span>;
    case "fill_orange":
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

export function BlueDieHint() {
  return (
    <span
      className="pad-dice-hint pad-cell pad-cell--hint"
      aria-label="Blue die plus white die"
      title="Blue die + white die"
    >
      <span className="pad-dice-hint__die" aria-hidden>
        <Die color="blue" value={1} size="sm" className="pad-dice-hint__face" />
      </span>
      <span className="pad-dice-hint__plus" aria-hidden>
        +
      </span>
      <span className="pad-dice-hint__die" aria-hidden>
        <Die color="white" value={1} size="sm" className="pad-dice-hint__face" />
      </span>
    </span>
  );
}

function FoxSvg() {
  return (
    <svg viewBox="0 0 24 24" className="pad-icon__fox" aria-hidden>
      <path d="M4 3 9 9 4 9Z" fill="currentColor" />
      <path d="M20 3 15 9 20 9Z" fill="currentColor" />
      <path
        d="M12 20c-4 0-7-3-7-7 0-3 2-5 3-6l4 4 4-4c1 1 3 3 3 6 0 4-3 7-7 7z"
        fill="currentColor"
      />
      <circle cx="9.5" cy="13" r="1" fill="#1a1a1a" />
      <circle cx="14.5" cy="13" r="1" fill="#1a1a1a" />
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

/** @deprecated Foxglow uses pad-yellow__col-score */
export function ColumnScoreBadge({
  value,
  claimed,
}: {
  value: number;
  claimed: boolean;
}) {
  return (
    <span
      className={[
        "pad-yellow__col-score",
        claimed ? "pad-yellow__col-score--claimed" : "",
      ].join(" ")}
    >
      {value}
    </span>
  );
}

/** @deprecated */
export function StarBadge(_props: {
  value: number;
  claimed?: boolean;
  tone?: string;
}) {
  return null;
}

/** @deprecated */
export function TrackArrow(_props: { tone: string }) {
  return null;
}

/** @deprecated */
export function ColumnSeal(props: { value: number; claimed: boolean }) {
  return <ColumnScoreBadge {...props} />;
}
