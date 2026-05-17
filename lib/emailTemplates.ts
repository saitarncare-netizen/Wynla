// Stage 32 — pure HTML email templates for digest emails.
//
// All styles are inline. Most email clients (Gmail web, Outlook, Apple Mail
// on iOS) strip <style> tags or ignore class-based selectors, so every visual
// rule has to live on the element itself.
//
// Wynla brand palette:
//   navy     #1E2952  primary text / headings
//   charcoal #4A4D5A  body text
//   offwhite #FAF7F2  page background
//   sky      #87CEEB  accent (snow / cold)
//   gold     #D4A84B  CTA / link highlight

const NAVY = "#1E2952";
const CHARCOAL = "#4A4D5A";
const OFFWHITE = "#FAF7F2";
const SKY = "#87CEEB";
const GOLD = "#D4A84B";

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wynla.app";

export type FavoriteResortSnapshot = {
  name: string;
  slug: string;
  state: string;
  tempHigh: number | null;
  conditions: string | null;
  snowNew24h: number | null;
  snowReportStatus: string | null;
  primaryPass: string;
};

export type DigestEmailInput = {
  userName: string | null;
  favoriteResortSnapshots: FavoriteResortSnapshot[];
  unsubscribeUrl: string;
  date: string;
};

export type DigestEmailOutput = {
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

function renderResortRow(r: FavoriteResortSnapshot): string {
  const name = escapeHtml(r.name);
  const url = `${SITE_BASE}/resort/${encodeURIComponent(r.slug)}`;
  const temp = r.tempHigh != null ? `${r.tempHigh}°F` : "—";
  const cond = r.conditions ? escapeHtml(r.conditions) : "—";
  const snow = r.snowNew24h != null && r.snowNew24h > 0
    ? `${r.snowNew24h}" new snow in 24h`
    : "No new snow";
  const status = r.snowReportStatus ? escapeHtml(r.snowReportStatus) : "";
  const pass = escapeHtml(r.primaryPass);
  const state = escapeHtml(r.state);

  return `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #e6e2d8;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td>
              <div style="font-size:16px;font-weight:600;color:${NAVY};margin:0 0 4px 0;">${name}</div>
              <div style="font-size:12px;color:${CHARCOAL};margin:0 0 8px 0;">${state} &middot; ${pass}${status ? ` &middot; ${status}` : ""}</div>
              <div style="font-size:14px;color:${CHARCOAL};margin:0 0 4px 0;">${temp} &middot; ${cond}</div>
              <div style="font-size:14px;color:${snow.startsWith("No") ? CHARCOAL : NAVY};font-weight:${snow.startsWith("No") ? "400" : "600"};">${snow}</div>
            </td>
            <td align="right" valign="middle" style="padding-left:12px;">
              <a href="${url}" style="display:inline-block;padding:8px 14px;background:${NAVY};color:${OFFWHITE};text-decoration:none;border-radius:6px;font-size:13px;font-weight:500;">View &rarr;</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

export function buildDigestEmail(input: DigestEmailInput): DigestEmailOutput {
  const { userName, favoriteResortSnapshots, unsubscribeUrl, date } = input;

  const greeting = userName ? `Hey ${escapeHtml(userName)},` : "Hey there,";
  const totalSnow = favoriteResortSnapshots.reduce(
    (sum, r) => sum + (r.snowNew24h ?? 0),
    0,
  );
  const powderResort = favoriteResortSnapshots
    .filter((r) => (r.snowNew24h ?? 0) > 0)
    .sort((a, b) => (b.snowNew24h ?? 0) - (a.snowNew24h ?? 0))[0];

  const subject = powderResort
    ? `${powderResort.snowNew24h}" at ${powderResort.name} — your Wynla digest`
    : `Your Wynla snow digest — ${date}`;

  const rowsHtml = favoriteResortSnapshots.length > 0
    ? favoriteResortSnapshots.map(renderResortRow).join("")
    : `<tr><td style="padding:24px 0;color:${CHARCOAL};font-size:14px;text-align:center;">No favorites yet. Add some on Wynla to see them here.</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${OFFWHITE};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${OFFWHITE};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px 24px 8px 24px;border-bottom:3px solid ${SKY};">
              <div style="font-size:22px;font-weight:700;color:${NAVY};letter-spacing:-0.01em;">Wynla</div>
              <div style="font-size:13px;color:${CHARCOAL};margin-top:2px;">${escapeHtml(date)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px 8px 24px;">
              <p style="margin:0 0 12px 0;font-size:15px;color:${CHARCOAL};line-height:1.5;">${greeting}</p>
              <p style="margin:0 0 16px 0;font-size:15px;color:${CHARCOAL};line-height:1.5;">
                ${powderResort
                  ? `Fresh snow at <strong style="color:${NAVY};">${escapeHtml(powderResort.name)}</strong> — ${powderResort.snowNew24h}" in the last 24h. Here's your watchlist:`
                  : `Here's the latest from your favorites${totalSnow > 0 ? ` (${totalSnow.toFixed(1)}" combined new snow)` : ""}:`}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${rowsHtml}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <a href="${SITE_BASE}" style="display:inline-block;padding:12px 20px;background:${GOLD};color:${NAVY};text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Open Wynla</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 24px 24px;border-top:1px solid #e6e2d8;">
              <p style="margin:0;font-size:12px;color:${CHARCOAL};line-height:1.5;">
                You're getting this because you subscribed to digest emails on Wynla.
                <a href="${unsubscribeUrl}" style="color:${CHARCOAL};text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines = [
    greeting,
    "",
    powderResort
      ? `Fresh snow at ${powderResort.name} — ${powderResort.snowNew24h}" in the last 24h.`
      : "Here's the latest from your favorites:",
    "",
    ...favoriteResortSnapshots.map((r) => {
      const t = r.tempHigh != null ? `${r.tempHigh}F` : "—";
      const s = r.snowNew24h != null && r.snowNew24h > 0
        ? `${r.snowNew24h}" new snow`
        : "No new snow";
      return `- ${r.name} (${r.state}): ${t}, ${r.conditions ?? "—"}, ${s}\n  ${SITE_BASE}/resort/${r.slug}`;
    }),
    "",
    `Open Wynla: ${SITE_BASE}`,
    `Unsubscribe: ${unsubscribeUrl}`,
  ];

  return {
    subject,
    html,
    text: textLines.join("\n"),
  };
}
