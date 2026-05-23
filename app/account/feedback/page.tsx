// /account/feedback — admin-only inbox for the feedback table.
// Guarded to the single founder email. Anyone else gets bounced to "/".
//
// Renders a simple table of the 200 most-recent rows + an unread
// (status='new') count at the top. The "Mark as reviewed" link uses a
// small client island so we don't have to round-trip the whole page.

import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import MarkReviewedButton from "./MarkReviewedButton";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "saitarncare@gmail.com";

type FeedbackRow = {
  id: number;
  body: string;
  email: string | null;
  user_id: string | null;
  page_url: string | null;
  user_agent: string | null;
  status: string;
  created_at: string;
};

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default async function FeedbackAdminPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user || user.email !== ADMIN_EMAIL) {
    redirect("/");
  }

  const { data, error } = await supabase
    .from("feedback")
    .select(
      "id, body, email, user_id, page_url, user_agent, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<FeedbackRow[]>();

  const rows = data ?? [];
  const unread = rows.filter((r) => r.status === "new").length;

  return (
    <main className="min-h-dvh bg-wn-offwhite px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/account"
          className="mb-3 inline-block text-xs font-semibold text-wn-charcoal/60 hover:text-wn-navy"
        >
          ← Account
        </Link>
        <header className="mb-6 flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-wn-navy sm:text-3xl">
            Feedback
          </h1>
          <span className="rounded-full bg-wn-navy/10 px-3 py-1 text-xs font-semibold text-wn-navy">
            {unread} unread · {rows.length} total
          </span>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            Failed to load feedback: {error.message}
          </div>
        )}

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-wn-charcoal/20 bg-white p-10 text-center">
            <h2 className="mb-1 text-lg font-bold text-wn-navy">No feedback yet</h2>
            <p className="text-sm text-wn-charcoal/70">
              Submissions from the floating Feedback pill on the map will
              appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-wn-charcoal/10 bg-white shadow-sm">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-wn-charcoal/10 bg-wn-offwhite text-[11px] font-bold uppercase tracking-wide text-wn-charcoal/60">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Body</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Page</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-wn-charcoal/10">
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={r.status === "new" ? "bg-white" : "bg-wn-offwhite/30"}
                  >
                    <td className="px-3 py-2 align-top text-[11px] text-wn-charcoal/65 whitespace-nowrap">
                      {formatWhen(r.created_at)}
                    </td>
                    <td className="px-3 py-2 align-top text-[13px] text-wn-charcoal">
                      <div className="max-w-md whitespace-pre-wrap break-words">
                        {r.body}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-[12px] text-wn-charcoal/75">
                      {r.email ? (
                        <a
                          href={`mailto:${r.email}`}
                          className="text-wn-navy underline-offset-2 hover:underline"
                        >
                          {r.email}
                        </a>
                      ) : (
                        <span className="text-wn-charcoal/40">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-wn-charcoal/60">
                      {r.page_url ? (
                        <a
                          href={r.page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="max-w-[180px] truncate underline-offset-2 hover:underline"
                          title={r.page_url}
                        >
                          {r.page_url.replace(/^https?:\/\//, "").slice(0, 32)}
                        </a>
                      ) : (
                        <span className="text-wn-charcoal/40">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-[11px]">
                      {r.status === "new" ? (
                        <MarkReviewedButton id={r.id} />
                      ) : (
                        <span className="rounded-full bg-wn-charcoal/10 px-2 py-0.5 font-semibold text-wn-charcoal/65">
                          {r.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
