"use client";

import { useState } from "react";
import Link from "next/link";
import { GameApp } from "@/app/components/game/GameApp";
import { HomeLobby } from "@/app/components/game/HomeLobby";

export default function Home() {
  const [localMode, setLocalMode] = useState(false);

  if (localMode) {
    return (
      <div className="app-shell flex h-dvh flex-col overflow-hidden">
        <div className="flex-shrink-0 border-b border-zinc-200 bg-white px-3 py-1.5">
          <button
            type="button"
            className="touch-target text-sm text-zinc-600 hover:text-zinc-900"
            onClick={() => setLocalMode(false)}
          >
            ← Back to menu
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <GameApp />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col items-center bg-zinc-100 px-4 py-4 pb-safe">
      <HomeLobby onLocal={() => setLocalMode(true)} />
      <Link href="/" className="sr-only">
        Home
      </Link>
    </div>
  );
}
