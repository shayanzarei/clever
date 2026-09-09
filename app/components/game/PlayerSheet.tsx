import type { Sheet } from "@/lib/engine/types";
import type { SheetCrossOption } from "@/lib/ui/cross-options";
import { ScorePad } from "@/app/components/game/sheet/ScorePad";

type PlayerSheetProps = {
  sheet: Sheet;
  title: string;
  highlight?: boolean;
  crossOptions?: SheetCrossOption[];
  onCross?: (option: SheetCrossOption) => void;
};

export function PlayerSheet(props: PlayerSheetProps) {
  return <ScorePad {...props} />;
}
