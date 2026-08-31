"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";

type InviteQrProps = {
  code: string;
};

export function InviteQr({ code }: InviteQrProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setShareUrl(`${window.location.origin}/game/${code}`);
  }, [code]);

  if (!shareUrl) {
    return null;
  }

  async function copyLink() {
    if (!shareUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4 rounded-3xl border border-line bg-ink/70 p-5">
      <div className="mx-auto w-fit rounded-2xl bg-white p-3">
        <QRCode
          value={shareUrl}
          size={180}
          level="M"
          bgColor="#ffffff"
          fgColor="#08070d"
        />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-bold tracking-widest text-muted uppercase">
          Invite link
        </p>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-2xl border-2 border-line bg-elevated px-4 py-3 font-mono text-xs text-white">
            {shareUrl}
          </code>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-line bg-elevated text-muted"
            aria-label={copied ? "Copied" : "Copy invite link"}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
        <p className="text-xs text-muted">
          Scan to join room <span className="font-semibold tracking-widest text-white">{code}</span>
        </p>
      </div>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="8" y="8" width="11" height="13" rx="2" />
      <path d="M5 16V5a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-neon-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}
