// Founder Welcome email — sent after a successful /early waitlist
// signup. Tone: warm, grateful, founder-y. No logo image (we don't have
// a hosted brand asset for emails yet); navy header text only. Single
// column, 600px max-width, system font stack.

export type FounderWelcomeInput = {
  /** Optional first name. Falls back to "there" if absent. */
  firstName?: string | null;
};

export type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function founderWelcomeEmail(
  input: FounderWelcomeInput = {},
): EmailTemplate {
  const first = (input.firstName ?? "").trim();
  const greeting = first ? `Hi ${escapeHtml(first)}` : "Hi there";

  const subject = "Welcome to Wynla — Founder Member";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0; padding:0; background:#F7F6F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#2A2A2A; line-height:1.55;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7F6F2;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background:#FFFFFF; border-radius:12px; box-shadow:0 1px 3px rgba(0,0,0,0.04); overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 0 32px;">
                <div style="font-size:13px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#1E2952;">Wynla</div>
                <h1 style="margin:12px 0 0 0; font-size:24px; line-height:1.25; color:#1E2952; font-weight:800;">You&rsquo;re in.</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 8px 32px; font-size:15px; color:#2A2A2A;">
                <p style="margin:0 0 14px 0;">${greeting}, you&rsquo;re in.</p>
                <p style="margin:0 0 14px 0;">Wynla opens for the inaugural ski season in <strong>November 2026</strong> &mdash; free for everyone. One map, every US resort, with weather, drive time, and the snow surface forecast we&rsquo;ve been quietly building all summer.</p>
                <p style="margin:0 0 14px 0;">When the season ends and Wynla moves to paid plans (Season 2, around November 2027), you keep a <strong>Founder Member rate that no one will ever see again</strong>. That price is for you and the rest of this list &mdash; it never goes on the public pricing page.</p>
                <p style="margin:0 0 14px 0;">We&rsquo;ll send invites a few weeks before the season opens, with a heads-up email once or twice before then if something genuinely interesting ships.</p>
                <p style="margin:0 0 14px 0;">Until then, we read every feedback note. If a feature would make your season better, or a resort on the map needs better data, just reply to this message.</p>
                <p style="margin:24px 0 0 0;">&mdash; Saitarn<br/><span style="color:#6B6B6B; font-size:13px;">Wynla, Founder</span></p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px 32px;">
                <hr style="border:none; border-top:1px solid #ECEAE2; margin:8px 0 16px 0;" />
                <p style="margin:0; font-size:11px; color:#8A8A8A; line-height:1.5;">You&rsquo;re receiving this because you signed up at wynla.app/early. We&rsquo;ll only email you about the season opening and the occasional milestone &mdash; nothing else. Reply with &ldquo;unsubscribe&rdquo; if you change your mind.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textGreeting = first ? `Hi ${first}` : "Hi there";
  const text = [
    `${textGreeting}, you're in.`,
    "",
    "Wynla opens for the inaugural ski season in November 2026 — free for everyone. One map, every US resort, with weather, drive time, and the snow surface forecast we've been quietly building all summer.",
    "",
    "When the season ends and Wynla moves to paid plans (Season 2, around November 2027), you keep a Founder Member rate that no one will ever see again. That price is for you and the rest of this list — it never goes on the public pricing page.",
    "",
    "We'll send invites a few weeks before the season opens, with a heads-up email once or twice before then if something genuinely interesting ships.",
    "",
    "Until then, we read every feedback note. If a feature would make your season better, or a resort on the map needs better data, just reply to this message.",
    "",
    "— Saitarn, Wynla Founder",
    "",
    "---",
    "You're receiving this because you signed up at wynla.app/early. We'll only email you about the season opening and the occasional milestone. Reply with \"unsubscribe\" to opt out.",
  ].join("\n");

  return { subject, html, text };
}
