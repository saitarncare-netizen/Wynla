"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ConfirmButton — two-tap confirmation pattern that replaces window.confirm.
 *
 * Why not window.confirm? It's blocked in Capacitor WebView (iOS native
 * wrap target) and renders a jarring system dialog elsewhere. The two-tap
 * pattern is friendlier and works identically web + native.
 *
 * UX: first tap arms the button → label flips to confirmLabel for `armMs`
 * ms → second tap fires onConfirm. If the user looks away, the button
 * disarms back to its original label automatically.
 */
export default function ConfirmButton({
  onConfirm,
  label,
  confirmLabel = "Tap again to confirm",
  armMs = 4000,
  disabled = false,
  className = "",
  armedClassName = "",
  type = "button",
  busy = false,
  busyLabel,
}: {
  onConfirm: () => void | Promise<void>;
  label: React.ReactNode;
  confirmLabel?: React.ReactNode;
  armMs?: number;
  disabled?: boolean;
  className?: string;
  armedClassName?: string;
  type?: "button" | "submit";
  busy?: boolean;
  busyLabel?: React.ReactNode;
}) {
  const [armed, setArmed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function arm() {
    setArmed(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setArmed(false), armMs);
  }

  function handleClick() {
    if (disabled || busy) return;
    if (!armed) {
      arm();
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setArmed(false);
    void onConfirm();
  }

  return (
    <button
      type={type}
      disabled={disabled || busy}
      onClick={handleClick}
      aria-pressed={armed}
      className={[
        "transition",
        armed ? armedClassName || className : className,
        (disabled || busy) ? "opacity-60 cursor-not-allowed" : "",
      ].join(" ")}
    >
      {busy ? (busyLabel ?? label) : armed ? confirmLabel : label}
    </button>
  );
}
