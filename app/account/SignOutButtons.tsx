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
import Button from "@/components/ui/Button";

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
        <Button variant="secondary" onClick={() => signOut("local")} disabled={busy != null}>
          {busy === "local" ? "Signing out…" : "Sign out"}
        </Button>
        <ConfirmButton
          onConfirm={() => signOut("global")}
          busy={busy != null}
          busyLabel={busy === "global" ? "Signing out everywhere…" : "…"}
          label="Sign out of all devices"
          confirmLabel="Tap again to sign out everywhere"
          variant="secondary"
          armedVariant="primary"
        />
      </div>
      <p className="text-xs text-wn-muted">
        Sign out ends this browser&rsquo;s session. All devices also ends every phone, tablet and
        laptop signed in as you; each one has to sign in again next time.
      </p>
      {error && <p role="alert" className="text-xs font-semibold text-wn-danger">{error}</p>}
    </div>
  );
}
