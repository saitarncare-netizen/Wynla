"use client";

// Client-side actions for the (server-rendered) compare page. The page
// is driven by ?ids= and cannot touch window, so these thin islands own
// the localStorage list and the URL:
//
//   ClearCompareButton   — empties the list and stays on /compare (the
//                          empty state explains how to add resorts) rather
//                          than bouncing to the map (audit fresh-eyes-power-31).
//   RemoveFromCompare    — the x on each column: drops one id from both
//                          the list and the URL, keeping origin params.
//   ShareCompareButton   — native share sheet or clipboard for a link that
//                          carries the ids and the drive origin.

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { clearCompare, removeFromCompare } from "@/lib/compareList";
import Button from "@/components/ui/Button";
import Icon from "@/components/icons/Icon";

const noopSubscribe = () => () => {};
function useCanNativeShare(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );
}

export function ClearCompareButton() {
  const router = useRouter();
  function onClick() {
    clearCompare();
    router.replace("/compare");
  }
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      aria-label="Clear the compare list"
      iconLeft={<Icon name="close" />}
    >
      Clear all
    </Button>
  );
}

export function RemoveFromCompare({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  function onClick() {
    removeFromCompare(id);
    // The URL is the page's input; rebuild ids from it (not from
    // storage, which may hold a different set than a shared link).
    const params = new URLSearchParams(searchParams.toString());
    const rest = (params.get("ids") ?? "")
      .split(",")
      .filter((s) => s && Number(s) !== id);
    if (rest.length === 0) params.delete("ids");
    else params.set("ids", rest.join(","));
    const qs = params.toString();
    router.replace(qs ? `/compare?${qs}` : "/compare");
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Remove ${name} from the comparison`}
      title="Remove"
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-wn-muted transition hover:bg-wn-danger-bg hover:text-wn-danger"
    >
      <Icon name="close" className="h-4 w-4" />
    </button>
  );
}

export function ShareCompareButton({ path, title }: { path: string; title: string }) {
  const canNativeShare = useCanNativeShare();
  const [status, setStatus] = useState<"idle" | "copied" | "shared" | "failed">("idle");

  function flash(next: typeof status) {
    setStatus(next);
    window.setTimeout(() => setStatus((cur) => (cur === next ? "idle" : cur)), 2500);
  }

  // Called synchronously inside the tap: Safari drops the user activation
  // after an await and rejects share() / clipboard writes.
  function onClick() {
    const url = `${window.location.origin}${path}`;
    if (canNativeShare) {
      navigator
        .share({ title, url })
        .then(() => flash("shared"))
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") return;
          copy(url);
        });
      return;
    }
    copy(url);
  }

  function copy(url: string) {
    if (!navigator.clipboard?.writeText) {
      flash("failed");
      return;
    }
    navigator.clipboard
      .writeText(url)
      .then(() => flash("copied"))
      .catch(() => flash("failed"));
  }

  const label =
    status === "copied"
      ? "Link copied"
      : status === "shared"
        ? "Shared"
        : status === "failed"
          ? "Copy the address bar"
          : canNativeShare
            ? "Share"
            : "Copy link";

  return (
    <Button
      variant="secondary"
      onClick={onClick}
      aria-live="polite"
      iconLeft={<Icon name={status === "copied" || status === "shared" ? "check" : "share"} />}
    >
      {label}
    </Button>
  );
}
