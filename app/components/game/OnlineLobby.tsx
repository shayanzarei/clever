"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InviteQr } from "@/app/components/game/InviteQr";
import { PlayerCountPicker } from "@/app/components/game/PlayerCountPicker";
import { TurnOrderScreen } from "@/app/components/game/TurnOrderScreen";
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
  onShuffle: () => void;
  onPlayerCountChange: (count: PlayerCount) => void;
  onDisplayNameChange: (name: string) => void;
  onDeleteRoom: () => void;
  turnOrder: PlayerSeatId[] | null;
  starting: boolean;
  shuffling: boolean;
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
  onShuffle,
  onPlayerCountChange,
  onDisplayNameChange,
  onDeleteRoom,
  turnOrder,
  starting,
  shuffling,
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

  if (ready && turnOrder && turnOrder.length === playerCount) {
    return (
      <TurnOrderScreen
        players={turnOrder.map((seat) => {
          const member = members.find((entry) => entry.player_id === seat);
          return {
            id: seat,
            name: member?.display_name ?? defaultDisplayName(seat),
          };
        })}
        isHost={isHost}
        shuffling={shuffling}
        starting={starting}
        onShuffle={onShuffle}
        onStart={onStart}
      />
    );
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
    <div className="relative min-h-dvh w-full overflow-x-hidden bg-ink text-white">
      <div className="bg-grid pointer-events-none absolute inset-0 z-0 opacity-10" />
      <div className="pointer-events-none absolute top-24 left-1/2 z-0 h-64 w-full -translate-x-1/2 rounded-full bg-neon-blue/20 opacity-20 blur-3xl" />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-8 pb-safe">
        <header>
          <p className="text-xs font-bold tracking-widest text-muted uppercase">Room</p>
          <h1 className="mt-1 text-5xl font-extrabold tracking-widest">{code}</h1>
          <p className="mt-3 text-sm text-muted">
            Share the code or link. The host sets the table size and starts when every
            seat is filled.
          </p>
        </header>

        {myMember && (
          <label className="block space-y-2">
            <span className="block text-xs font-bold tracking-widest text-muted uppercase">
              Your name
            </span>
            <input
              className="h-14 w-full rounded-2xl border-2 border-line bg-elevated px-5 font-bold text-white placeholder:text-muted/30 focus:border-neon-blue/50 focus:outline-none disabled:opacity-50"
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
            <span className="block text-xs text-muted italic">
              Press Enter or click away to save
            </span>
          </label>
        )}

        {isHost ? (
          <PlayerCountPicker
            value={playerCount}
            onChange={onPlayerCountChange}
            disabled={updatingCount}
            minCount={Math.min(Math.max(members.length, 2), 4) as PlayerCount}
            variant="neon"
          />
        ) : (
          <p className="text-xs font-bold tracking-widest text-muted uppercase">
            {playerCount}-player game
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {slots.map(({ seat, member }) => {
            const isYou = member?.player_id === playerId;
            const isHostSeat = seat === "p1";
            return (
              <li
                key={seat}
                className={[
                  "flex items-center justify-between rounded-2xl px-4 py-3 text-sm",
                  member
                    ? "border border-line bg-elevated"
                    : "border border-dashed border-line text-muted",
                ].join(" ")}
              >
                <span className={member ? "font-bold text-white" : ""}>
                  {member?.display_name ?? defaultDisplayName(seat)}
                </span>
                <span
                  className={
                    isHostSeat && member
                      ? "text-xs font-bold tracking-widest text-neon-blue uppercase"
                      : "text-xs tracking-widest text-muted uppercase italic"
                  }
                >
                  {member
                    ? `${seatLabel(seat, isHostSeat)}${isYou ? " (you)" : ""}`
                    : "Open seat"}
                </span>
              </li>
            );
          })}
        </ul>

        {waitingCount > 0 && (
          <p className="text-center text-sm text-neon-orange italic">
            Waiting for {waitingCount} more player{waitingCount === 1 ? "" : "s"}…
          </p>
        )}

        <InviteQr code={code} />

        {isHost ? (
          <button
            type="button"
            disabled={!ready || starting || shuffling || updatingCount || updatingName}
            className={[
              "h-14 rounded-2xl text-sm font-black tracking-tight transition-all",
              ready
                ? "bg-neon-blue text-ink shadow-[0_0_24px_rgba(19,239,244,0.35)]"
                : "bg-elevated text-muted",
            ].join(" ")}
            onClick={ready ? onShuffle : undefined}
          >
            {shuffling
              ? "Shuffling…"
              : ready
                ? "Who goes first?"
                : `Need ${Math.max(playerCount - members.length, 0)} more`}
          </button>
        ) : (
          <p className="text-center text-sm text-neon-orange italic">
            {ready
              ? "Waiting for the host to set turn order…"
              : "Waiting for the host to start…"}
          </p>
        )}

        {isHost && (
          <button
            type="button"
            disabled={deleting || starting}
            className="h-14 rounded-2xl border border-red-500/70 text-sm font-bold text-red-400 disabled:opacity-50"
            onClick={handleDeleteRoom}
          >
            {deleting ? "Deleting…" : "Delete room"}
          </button>
        )}

        <Link href="/" className="pb-4 text-center text-sm text-muted">
          ← Back to menu
        </Link>
      </div>
    </div>
  );
}
