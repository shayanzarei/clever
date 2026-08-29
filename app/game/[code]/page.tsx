import { OnlineGameApp } from "@/app/components/game/OnlineGameApp";

type GamePageProps = {
  params: Promise<{ code: string }>;
};

export default async function GamePage({ params }: GamePageProps) {
  const { code } = await params;

  return (
    <div className="flex min-h-full flex-col bg-zinc-100">
      <OnlineGameApp code={code} />
    </div>
  );
}
