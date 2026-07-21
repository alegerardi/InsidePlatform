"use client";

import { useState } from "react";

type CopyEventLinkButtonProps = {
  eventUrl: string;
};

export function CopyEventLinkButton({ eventUrl }: CopyEventLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-md border px-4 py-2 text-sm font-medium transition hover:opacity-80"
    >
      {copied ? "Copied" : "Copy event link"}
    </button>
  );
}