"use client";

// Share the current picks: the Web Share sheet where it exists (mobile),
// otherwise copy the link. The URL carries the whole state, so the
// recipient sees the same three mountains and the OG card matches.

import { useState } from "react";
import Icon from "@/components/icons/Icon";
import Button from "@/components/ui/Button";

type Props = { url: string; title: string; text: string };

export default function ShareButton({ url, title, text }: Props) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function share() {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2500);
    } catch (e) {
      // An aborted share sheet is not a failure worth reporting.
      if ((e as Error)?.name === "AbortError") return;
      setStatus("failed");
      setTimeout(() => setStatus("idle"), 2500);
    }
  }

  return (
    <Button variant="secondary" onClick={share} aria-live="polite" iconLeft={<Icon name="share" />}>
      {status === "copied" ? "Link copied" : status === "failed" ? "Could not share" : "Share"}
    </Button>
  );
}
