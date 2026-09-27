// /account/feedback — admin-only inbox for the feedback table.
// Guarded to the single founder email. Anyone else gets bounced to "/".
//
// Renders a simple table of the 200 most-recent rows + an unread
// (status='new') count at the top. The "Mark as reviewed" link uses a
// small client island so we don't have to round-trip the whole page.

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import MarkReviewedButton from "./MarkReviewedButton";
import EmptyState from "@/components/ui/EmptyState";
import Notice from "@/components/ui/Notice";
import PageHeader from "@/components/ui/PageHeader";

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
    <main className="min-h-dvh bg-wn-offwhite">
      {/* Phones: back to Account comes from the AppShell bar (lib/nav backLinkFor),
          which is md:hidden, so the header link is shown from md up only. */}
      <PageHeader
        title="Feedback"
        back={{ href: "/account", label: "Account" }}
        className="max-md:[&>div>a:first-child]:hidden"
        actions={
          <span className="rounded-full bg-wn-navy/10 px-3 py-1 text-xs font-semibold text-wn-navy tabular-nums">
            {unread} unread · {rows.length} total
          </span>
        }
      />
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-4 sm:px-6">
        {error && (
          <Notice tone="danger" className="mb-4">
            Failed to load feedback: {error.message}
          </Notice>
        )}

        {rows.length === 0 ? (
          <>
          {/* EmptyState renders its title as a <p>; keep the section heading. */}
          <h2 className="sr-only">No feedback yet</h2>
          <EmptyState
            icon="list"
            title="No feedback yet"
            body="Submissions from the floating Feedback pill on the map will appear here."
          />
          </>
        ) : (
          <div className="overflow-x-auto rounded-wn-md border border-wn-line bg-white shadow-wn-sm">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-wn-line bg-wn-offwhite text-eyebrow font-bold uppercase text-wn-muted">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Body</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Page</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-wn-line">
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={r.status === "new" ? "bg-white" : "bg-wn-offwhite/30"}
                  >
                    <td className="px-3 py-2 align-top text-xs text-wn-muted whitespace-nowrap">
                      {formatWhen(r.created_at)}
                    </td>
                    <td className="px-3 py-2 align-top text-sm text-wn-charcoal">
                      <div className="max-w-md whitespace-pre-wrap break-words">
                        {r.body}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-wn-muted">
                      {r.email ? (
                        <a
                          href={`mailto:${r.email}`}
                          className="text-wn-navy underline-offset-2 hover:underline"
                        >
                          {r.email}
                        </a>
                      ) : (
                        <span className="text-wn-subtle">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-wn-muted">
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
                        <span className="text-wn-subtle">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-xs">
                      {r.status === "new" ? (
                        <MarkReviewedButton id={r.id} />
                      ) : (
                        <span className="rounded-full bg-wn-line px-2 py-0.5 font-semibold text-wn-muted">
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
