"use client";

import { useState } from "react";
import Link from "next/link";
import { GameApp } from "@/app/components/game/GameApp";
import { HomeLobby } from "@/app/components/game/HomeLobby";

export default function Home() {
  const [localMode, setLocalMode] = useState(false);

  if (localMode) {
    return (
      <div className="flex min-h-full flex-col bg-zinc-100">
        <div className="border-b border-zinc-200 bg-white px-4 py-2">
          <button
            type="button"
            className="text-sm text-zinc-600 hover:text-zinc-900"
            onClick={() => setLocalMode(false)}
          >
            ← Back to menu
          </button>
        </div>
        <GameApp />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-100 p-6">
      <HomeLobby onLocal={() => setLocalMode(true)} />
      <Link href="/" className="sr-only">
        Home
      </Link>
    </div>
  );
}
