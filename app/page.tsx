"use client";

import { useState } from "react";
import Link from "next/link";
import { GameApp } from "@/app/components/game/GameApp";
import { HomeLobby } from "@/app/components/game/HomeLobby";

export default function Home() {
  const [localMode, setLocalMode] = useState(false);

  if (localMode) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-ink">
        <GameApp onLeave={() => setLocalMode(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-ink">
      <HomeLobby onLocal={() => setLocalMode(true)} />
      <Link href="/" className="sr-only">
        Home
      </Link>
    </div>
  );
}
