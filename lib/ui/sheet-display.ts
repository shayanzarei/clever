import type { Effect } from "@/lib/engine/types";

/** Compact bonus labels matching the official pad iconography. */
export function effectShortLabel(effect: Effect): string {
  switch (effect.type) {
    case "cross_yellow_free":
      return "Free Y";
    case "cross_blue_free":
      return "Free B";
    case "cross_green_bonus":
      return "Green ✓";
    case "fill_orange":
      return `Orange ${effect.value}`;
    case "fill_purple":
      return `Purple ${effect.value}`;
    case "fox":
      return "Fox";
    case "reroll":
      return "Reroll";
    case "plus_one":
      return "+1";
    case "round_black_x":
      return "Black X";
    case "round_black_six":
      return "Black 6";
    default:
      return "Bonus";
  }
}

export const PAD_COLORS = {
  yellow: { fill: "#f7e047", ink: "#5c4a00", soft: "#fffbea" },
  blue: { fill: "#5b9bd5", ink: "#0e3a5e", soft: "#eef6fc" },
  green: { fill: "#6fbf73", ink: "#1b4d1f", soft: "#eef8ef" },
  orange: { fill: "#f4a261", ink: "#6b3a12", soft: "#fff4eb" },
  purple: { fill: "#b185db", ink: "#4a2d6b", soft: "#f6effc" },
  paper: "#faf6ef",
  grid: "#c9bfb0",
  ink: "#2c2416",
} as const;

export type PadColor = keyof typeof PAD_COLORS;
