"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";

type InviteQrProps = {
  code: string;
};

export function InviteQr({ code }: InviteQrProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    setShareUrl(`${window.location.origin}/game/${code}`);
  }, [code]);

  if (!shareUrl) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="rounded-lg bg-white p-3 shadow-sm">
        <QRCode
          value={shareUrl}
          size={160}
          level="M"
          bgColor="#ffffff"
          fgColor="#18181b"
        />
      </div>
      <div className="flex w-full flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700">Invite link</span>
        <code className="break-all rounded-lg bg-white px-3 py-2 text-xs text-zinc-800">
          {shareUrl}
        </code>
        <p className="text-xs text-zinc-500">
          Scan to join room <span className="font-semibold tracking-widest">{code}</span>
        </p>
      </div>
    </div>
  );
}
