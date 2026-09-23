"use client";

// Two sign-out choices on /account. The header menu signs out this
// browser only (scope: local); this is the one place that offers the
// global scope, which revokes every device's refresh token, for a
// lost phone or a shared laptop (audit account-social-23). The global
// button confirms on a second tap because it logs out devices the
// person cannot see.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import ConfirmButton from "@/components/ConfirmButton";

export default function SignOutButtons() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [busy, setBusy] = useState<null | "local" | "global">(null);
  const [error, setError] = useState<string | null>(null);

  async function signOut(scope: "local" | "global") {
    if (busy) return;
    setBusy(scope);
    setError(null);
    const { error: err } = await supabase.auth.signOut({ scope });
    if (err) {
      // The SDK keeps the local session when the server refuses; say so
      // instead of navigating away as if it worked.
      setBusy(null);
      setError(`Could not sign out (${err.message}). Try again.`);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => signOut("local")}
          disabled={busy != null}
          className="inline-flex min-h-11 items-center rounded-md border border-wn-charcoal/20 bg-white px-4 text-sm font-semibold text-wn-charcoal transition hover:border-wn-navy hover:text-wn-navy disabled:opacity-60"
        >
          {busy === "local" ? "Signing out…" : "Sign out"}
        </button>
        <ConfirmButton
          onConfirm={() => signOut("global")}
          busy={busy != null}
          busyLabel={busy === "global" ? "Signing out everywhere…" : "…"}
          label="Sign out of all devices"
          confirmLabel="Tap again to sign out everywhere"
          className="inline-flex min-h-11 items-center rounded-md border border-wn-charcoal/20 bg-white px-4 text-sm font-semibold text-wn-charcoal/80 transition hover:border-wn-navy hover:text-wn-navy disabled:opacity-60"
          armedClassName="inline-flex min-h-11 items-center rounded-md border border-wn-navy bg-wn-navy/5 px-4 text-sm font-semibold text-wn-navy"
        />
      </div>
      <p className="text-[11px] text-wn-charcoal/55">
        Sign out ends this browser&rsquo;s session. All devices also ends every phone, tablet and
        laptop signed in as you; each one asks for a new code next time.
      </p>
      {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
    </div>
  );
}
