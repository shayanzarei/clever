"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InviteQr } from "@/app/components/game/InviteQr";
import { PlayerCountPicker } from "@/app/components/game/PlayerCountPicker";
import {
  defaultDisplayName,
  seatLabel,
  seatsForCount,
  type PlayerCount,
  type PlayerSeatId,
} from "@/lib/game/player-seats";
import type { GameMemberRow } from "@/lib/supabase/types";

type OnlineLobbyProps = {
  code: string;
  playerCount: PlayerCount;
  members: GameMemberRow[];
  playerId: PlayerSeatId | null;
  onStart: () => void;
  onPlayerCountChange: (count: PlayerCount) => void;
  onDisplayNameChange: (name: string) => void;
  onDeleteRoom: () => void;
  starting: boolean;
  updatingCount: boolean;
  updatingName: boolean;
  deleting: boolean;
};

export function OnlineLobby({
  code,
  playerCount,
  members,
  playerId,
  onStart,
  onPlayerCountChange,
  onDisplayNameChange,
  onDeleteRoom,
  starting,
  updatingCount,
  updatingName,
  deleting,
}: OnlineLobbyProps) {
  const isHost = playerId === "p1";
  const ready = members.length >= 2 && members.length === playerCount;
  const myMember = members.find((member) => member.player_id === playerId);
  const [myName, setMyName] = useState(myMember?.display_name ?? "");

  useEffect(() => {
    if (myMember) {
      setMyName(myMember.display_name);
    }
  }, [myMember?.display_name]);

  const slots = useMemo(() => {
    const bySeat = new Map(members.map((member) => [member.player_id, member]));
    return seatsForCount(playerCount).map((seat) => ({
      seat,
      member: bySeat.get(seat) ?? null,
    }));
  }, [members, playerCount]);

  const waitingCount = playerCount - members.length;

  function commitName() {
    const trimmed = myName.trim();
    if (!trimmed || trimmed === myMember?.display_name) {
      return;
    }
    onDisplayNameChange(trimmed);
  }

  function handleDeleteRoom() {
    if (
      window.confirm(
        "Delete this room for everyone? All players will be removed and the session will be gone.",
      )
    ) {
      onDeleteRoom();
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Room
        </p>
        <h1 className="text-3xl font-bold tracking-widest text-zinc-900">{code}</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Share the code or link. The host sets the table size and starts when every
          seat is filled.
        </p>
      </div>

      {myMember && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Your name</span>
          <input
            className="app-input"
            value={myName}
            disabled={updatingName}
            onChange={(event) => setMyName(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
          />
          <span className="text-xs text-zinc-500">Press Enter or click away to save</span>
        </label>
      )}

      {isHost && (
        <PlayerCountPicker
          value={playerCount}
          onChange={onPlayerCountChange}
          disabled={updatingCount}
          minCount={Math.min(Math.max(members.length, 2), 4) as PlayerCount}
        />
      )}

      {!isHost && (
        <p className="text-sm text-zinc-600">{playerCount}-player game</p>
      )}

      <ul className="flex flex-col gap-2">
        {slots.map(({ seat, member }) => (
          <li
            key={seat}
            className={[
              "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
              member ? "border-zinc-200" : "border-dashed border-zinc-300 text-zinc-500",
            ].join(" ")}
          >
            <span className={member ? "font-medium text-zinc-800" : ""}>
              {member?.display_name ?? defaultDisplayName(seat)}
            </span>
            <span className="text-zinc-500">
              {member
                ? `${seatLabel(seat, seat === "p1")}${member.player_id === playerId ? " (you)" : ""}`
                : "Open seat"}
            </span>
          </li>
        ))}
      </ul>

      {waitingCount > 0 && (
        <p className="text-sm text-zinc-600">
          Waiting for {waitingCount} more player{waitingCount === 1 ? "" : "s"}…
        </p>
      )}

      <InviteQr code={code} />

      {isHost ? (
        <button
          type="button"
          disabled={!ready || starting || updatingCount || updatingName}
          className="rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          onClick={onStart}
        >
          {starting
            ? "Starting…"
            : ready
              ? `Start ${playerCount}-player game`
              : `Need ${Math.max(playerCount - members.length, 0)} more`}
        </button>
      ) : (
        <p className="text-center text-sm text-zinc-600">
          Waiting for the host to start…
        </p>
      )}

      {isHost && (
        <button
          type="button"
          disabled={deleting || starting}
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
          onClick={handleDeleteRoom}
        >
          {deleting ? "Deleting…" : "Delete room"}
        </button>
      )}

      <Link href="/" className="text-center text-sm text-zinc-500 hover:text-zinc-800">
        ← Back to menu
      </Link>
    </div>
  );
}
