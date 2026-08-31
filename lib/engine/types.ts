import type { DieColor } from "./constants";

export type { DieColor };

/** Playable color areas (white is wild, not a sheet area). */
export type ColorArea = "yellow" | "blue" | "green" | "orange" | "purple";

export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

export type DieFace = {
  color: DieColor;
  value: DieValue;
};

export type DieLocation = "pool" | "tray" | "slot" | "consumed";

export type DieState = DieFace & {
  id: string;
  location: DieLocation;
  /** Index 0–2 when location is "slot". */
  slotIndex?: number;
};

export type YellowSheet = {
  /** 4×4 grid; each cell holds the printed value and whether it is crossed. */
  grid: readonly (readonly {
    value: number;
    crossed: boolean;
    /** Pre-printed ✕ on the pad — crossed from game start. */
    preprinted?: boolean;
  }[])[];
  /** Column completion bonuses already claimed (star circled). */
  columnScored: readonly boolean[];
};

export type BlueSheet = {
  /** Each box maps to a sum 2–12 and whether it is crossed. */
  boxes: readonly { sum: number; crossed: boolean }[];
};

export type GreenSheet = {
  boxes: readonly { threshold: number; crossed: boolean }[];
};

export type OrangeSheet = {
  boxes: readonly {
    multiplier: 1 | 2 | 3;
    /** Recorded pip total after multiplier; null when empty. */
    value: number | null;
  }[];
};

export type PurpleSheet = {
  boxes: readonly { value: number | null }[];
};

export type Sheet = {
  yellow: YellowSheet;
  blue: BlueSheet;
  green: GreenSheet;
  orange: OrangeSheet;
  purple: PurpleSheet;
  /** Activated fox bonuses collected on the sheet. */
  foxes: number;
  /** Uncrossed +1 extra-mark actions remaining. */
  plusOnes: number;
  /** Uncrossed reroll actions remaining. */
  rerolls: number;
  /** Legacy extra-die count; still spent as +1. */
  extraDice: number;
  /** One-shot line bonuses already collected. */
  claims: SheetClaims;
};

export type SheetClaims = {
  yellowRows: readonly boolean[];
  yellowDiagonal: boolean;
  blueRows: readonly boolean[];
  blueColumns: readonly boolean[];
};

export type Player = {
  id: string;
  name: string;
  sheet: Sheet;
  /** Three dice slots for the active player's current turn. */
  diceSlots: readonly (DieFace | null)[];
  /** Die selected from the tray this passive phase; cleared after CROSS. */
  passiveDieId: string | null;
};

export type GamePhase =
  | "lobby"
  | "round_bonus_choose"
  | "active_roll"
  | "active_choose"
  | "active_extra"
  | "passive_choose"
  | "passive_extra"
  | "resolve_pending"
  | "finished";

export type RoundBonusChoice = "black_x" | "black_six";

export type Game = {
  /** Optimistic-locking version; incremented on every state change. */
  version: number;
  id: string;
  playerCount: 2 | 3 | 4;
  players: readonly Player[];
  activePlayerIndex: number;
  round: number;
  maxRounds: number;
  phase: GamePhase;
  dice: readonly DieState[];
  /** Bonus-chain queue for the resolving player. */
  pending: readonly Effect[];
  /** Player who must resolve `pending`; null when queue is empty. */
  pendingPlayerId: string | null;
  /** Active-player dice choices made this turn (0–3). */
  activeRollCount: number;
  /** Slot or extra-die awaiting sheet mark. */
  awaitingCross: AwaitingCross | null;
  /** Passive players who finished tray pick + cross this turn. */
  passiveCompletedPlayerIds: readonly string[];
  /** Players who still owe a round-4 bonus choice. */
  roundBonusPendingPlayerIds: readonly string[];
  /** Die ids already used via extra-die actions this turn. */
  extraDieUsedIds: readonly string[];
  /** Extra-die actions spent by each player this turn. */
  extraDieActionsUsed: Readonly<Record<string, number>>;
};

export type AwaitingCross = {
  playerId: string;
  /** Regular active choice; omitted for extra-die crosses. */
  slotIndex?: number;
  /** Die selected for an extra-die cross. */
  extraDieId?: string;
  /** Pool dice swept to the tray by this choice, so it can be undone. */
  trayedDieIds?: readonly string[];
};

/** Bonus triggered by filling a box or completing a line. */
export type Effect =
  | { type: "cross_yellow_free" }
  | { type: "cross_blue_free" }
  | { type: "cross_green_bonus" }
  | { type: "fill_orange"; value: DieValue }
  | { type: "fill_purple"; value: DieValue }
  | { type: "fox" }
  | { type: "reroll" }
  | { type: "plus_one" }
  | { type: "round_black_x" }
  | { type: "round_black_six" };

export type Action =
  | {
      type: "START_GAME";
      playerCount: 2 | 3 | 4;
      playerNames: string[];
      /** When omitted, seats are assigned p1… in name order. */
      playerIds?: readonly string[];
    }
  | {
      type: "ROLL";
      /** Dice values supplied by the caller; engine never rolls. */
      values: readonly DieFace[];
    }
  | {
      type: "CHOOSE_DIE";
      playerId: string;
      dieId: string;
      slotIndex: number;
    }
  | {
      type: "CROSS";
      playerId: string;
      color: Exclude<ColorArea, "blue">;
      /** Die face value; always inside the action payload. */
      value: number;
      targetIndex?: number;
    }
  | {
      type: "CROSS";
      playerId: string;
      color: "blue";
      /** Required for a normal die cross; omitted for a free blue-x bonus. */
      blueDie?: DieValue;
      whiteDie?: DieValue;
      targetIndex?: number;
    }
  | { type: "PASSIVE_TAKE"; playerId: string; dieId: string }
  /** Take back a die selection that has not been marked on the sheet yet. */
  | { type: "UNDO_DIE_CHOICE"; playerId: string }
  | {
      type: "USE_REROLL";
      playerId: string;
      values: readonly DieFace[];
    }
  | { type: "USE_PLUS_ONE"; playerId: string; dieId: string }
  | {
      type: "USE_EXTRA_DIE";
      playerId: string;
      dieId: string;
    }
  | { type: "SKIP_EXTRA_DIE"; playerId: string }
  | {
      type: "CHOOSE_ROUND_BONUS";
      playerId: string;
      choice: RoundBonusChoice;
    }
  | { type: "RESOLVE_EFFECT"; playerId: string; effectIndex: number }
  | { type: "END_TURN"; playerId: string };
