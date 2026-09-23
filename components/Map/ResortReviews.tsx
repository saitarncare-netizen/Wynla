"use client";

// Stage 28 — user reviews for a resort.
// Renders an avg-rating header, lists existing reviews, and (when signed
// in) shows a form to add/edit own review. Uses Supabase RLS directly
// from the browser — `resort_reviews_select_all` lets anyone read,
// `..._insert_own` / `_update_own` / `_delete_own` gate writes by auth.uid().

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import ConfirmButton from "@/components/ConfirmButton";
import Button from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";

type Review = {
  id: number;
  resort_id: number;
  user_id: string;
  rating: number;
  body: string | null;
  created_at: string;
  updated_at: string;
};

type Props = {
  resortId: number;
};

export default function ResortReviews({ resortId }: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [myDraft, setMyDraft] = useState<{ rating: number; body: string }>({
    rating: 0,
    body: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: rs }, { data: u }] = await Promise.all([
        supabase
          .from("resort_reviews")
          .select("id, resort_id, user_id, rating, body, created_at, updated_at")
          .eq("resort_id", resortId)
          .order("created_at", { ascending: false }),
        supabase.auth.getUser(),
      ]);
      if (cancelled) return;
      const rows = (rs ?? []) as Review[];
      setReviews(rows);
      setUserId(u.user?.id ?? null);
      const own = rows.find((r) => r.user_id === u.user?.id);
      if (own) setMyDraft({ rating: own.rating, body: own.body ?? "" });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, resortId]);

  const avg =
    reviews.length === 0
      ? 0
      : Math.round(
          (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10,
        ) / 10;

  async function submitReview() {
    if (!userId) return;
    if (myDraft.rating < 1 || myDraft.rating > 5) {
      setError("Pick 1-5 stars first.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: upsertErr } = await supabase
      .from("resort_reviews")
      .upsert(
        {
          resort_id: resortId,
          user_id: userId,
          rating: myDraft.rating,
          body: myDraft.body.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "resort_id,user_id" },
      );
    if (upsertErr) {
      setError(upsertErr.message);
      setSaving(false);
      return;
    }
    // refresh
    const { data: rs } = await supabase
      .from("resort_reviews")
      .select("*")
      .eq("resort_id", resortId)
      .order("created_at", { ascending: false });
    setReviews((rs ?? []) as Review[]);
    setSaving(false);
  }

  async function deleteMyReview() {
    if (!userId) return;
    // No window.confirm — blocked in Capacitor WebView. Two-tap UX via
    // ConfirmButton below provides the same safety net.
    setSaving(true);
    const { error: delErr } = await supabase
      .from("resort_reviews")
      .delete()
      .eq("resort_id", resortId)
      .eq("user_id", userId);
    if (delErr) {
      setError(delErr.message);
      setSaving(false);
      return;
    }
    setMyDraft({ rating: 0, body: "" });
    setReviews((rs) => rs.filter((r) => r.user_id !== userId));
    setSaving(false);
  }

  const myReview = userId ? reviews.find((r) => r.user_id === userId) : null;
  const otherReviews = userId ? reviews.filter((r) => r.user_id !== userId) : reviews;

  // Hide-when-empty: a signed-out visitor can neither read nor write
  // anything here when the resort has no reviews, so an empty "No
  // reviews yet · Sign in" block is dead weight on every page (audit
  // resort-panel-detail-24). Signed-in users still get the form so the
  // first review can be written. Nothing renders while loading either —
  // the section pops in only when it has something to show.
  if (loading) return null;
  if (!userId && reviews.length === 0) return null;

  return (
    <section className="rounded-wn-md border border-wn-line bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold text-wn-navy">Reviews</h3>
        {reviews.length > 0 && (
          <div className="flex items-baseline gap-2">
            <span className="text-wn-xl font-extrabold text-wn-navy">
              {"★".repeat(Math.round(avg))}
              <span className="text-wn-charcoal/25">{"★".repeat(5 - Math.round(avg))}</span>
            </span>
            <span className="text-sm font-semibold text-wn-muted">
              {avg.toFixed(1)} ({reviews.length})
            </span>
          </div>
        )}
      </div>

      {userId && (
        <div className="mb-4 rounded-wn-sm border border-wn-line bg-wn-offwhite p-3">
          <div className="mb-2 text-eyebrow font-semibold uppercase text-wn-muted">
            {myReview ? "Your review" : "Leave a review"}
          </div>
          <StarPicker
            value={myDraft.rating}
            onChange={(v) => setMyDraft((p) => ({ ...p, rating: v }))}
          />
          <Textarea
            value={myDraft.body}
            onChange={(e) => setMyDraft((p) => ({ ...p, body: e.target.value }))}
            placeholder="What's it like? (optional)"
            aria-label="Review text (optional)"
            rows={3}
            maxLength={1000}
            className="mt-2"
          />
          {error && (
            <p role="alert" className="mt-1 text-xs text-wn-danger">
              {error}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Button onClick={submitReview} disabled={saving || myDraft.rating === 0}>
              {saving ? "Saving…" : myReview ? "Update" : "Post"}
            </Button>
            {myReview && (
              <ConfirmButton
                onConfirm={deleteMyReview}
                busy={saving}
                label="Delete"
                confirmLabel="Tap to confirm"
                className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-wn-muted underline-offset-2 hover:text-wn-danger hover:underline"
                armedClassName="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-wn-danger underline"
              />
            )}
          </div>
        </div>
      )}

      {!userId && (
        <p className="mb-3 text-xs text-wn-muted">
          <Link href="/login" className="font-semibold text-wn-navy underline">
            Sign in
          </Link>{" "}
          to leave a review.
        </p>
      )}

      {otherReviews.length === 0 && !myReview && (
        <p className="text-sm text-wn-muted">
          No reviews yet. Be the first to share your experience.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {otherReviews.map((r) => (
          <li key={r.id} className="rounded-wn-sm border border-wn-line bg-white px-3 py-2">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-sm font-bold text-wn-navy">
                {"★".repeat(r.rating)}
                <span className="text-wn-charcoal/25">{"★".repeat(5 - r.rating)}</span>
              </span>
              <span className="text-xs text-wn-muted">
                {new Date(r.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            {r.body && (
              <p className="text-sm leading-snug text-wn-charcoal">{r.body}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="-ml-2 flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          className="inline-flex h-11 w-11 items-center justify-center text-wn-2xl leading-none transition active:scale-90"
        >
          <span
            className={
              n <= value ? "text-wn-gold-halo" : "text-wn-subtle hover:text-wn-gold"
            }
          >
            ★
          </span>
        </button>
      ))}
    </div>
  );
}
