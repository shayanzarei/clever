import { OnlineGameApp } from "@/app/components/game/OnlineGameApp";

type GamePageProps = {
  params: Promise<{ code: string }>;
};

export default async function GamePage({ params }: GamePageProps) {
  const { code } = await params;

  return (
    <div className="app-shell flex h-dvh flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col">
        <OnlineGameApp code={code} />
      </div>
    </div>
  );
}
