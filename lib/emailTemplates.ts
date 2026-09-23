// Pure HTML + plain-text templates for the digest email.
//
// All styles are inline: most clients (Gmail web, Outlook, Apple Mail on
// iOS) strip <style> tags or ignore class selectors, so every visual rule
// lives on the element itself.
//
// Every number is labelled with what it is and where it came from
// ("Reported" = the resort's own snow report, "Estimated" = weather
// model, "Forecast" = NWS forecast), because a bare 6" means nothing
// to a reader deciding whether to drive.
//
// Wynla brand palette:
//   navy     #1E2952  primary text / headings
//   charcoal #4A4D5A  body text
//   offwhite #FAF7F2  page background
//   sky      #87CEEB  accent (snow / cold)
//   gold     #D4A84B  CTA / link highlight

import type { SnowSource } from "@/lib/alertRules";

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
  /** NWS forecast high for today, °F. */
  tempHigh: number | null;
  /** NWS short forecast, e.g. "Snow showers". */
  conditions: string | null;
  /** New snow in the last 24 h, inches. */
  snowNew24h: number | null;
  /** New snow in the last 7 days, inches (resort-reported only). */
  snowNew7d: number | null;
  /** Where snowNew24h came from. */
  snowSource: SnowSource;
  /** Friendly operating status, e.g. "Open", "Off-season". */
  statusLabel: string;
  /** True when the resort is open or running limited operations. */
  operating: boolean;
  /** Today's snow surface class label from the classifier, if any. */
  surfaceLabel: string | null;
  /** Whether the snow report is recent enough to trust (see alertRules). */
  reportFresh: boolean;
  primaryPass: string;
};

export type DigestEmailInput = {
  /** Display name from profiles, or null for a neutral greeting. */
  userName: string | null;
  favoriteResortSnapshots: FavoriteResortSnapshot[];
  /** True when the list is a platform-wide pick, not the user's favorites. */
  isRecap: boolean;
  unsubscribeUrl: string;
  /** Link to the preferences page (threshold, cadence). */
  preferencesUrl: string;
  /** YYYY-MM-DD, for the header and the fallback subject. */
  date: string;
  frequency: "daily" | "weekly";
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

function snowLine(r: FavoriteResortSnapshot): string {
  if (!r.operating) return "No report while closed";
  if (!r.reportFresh) return "Snow report not updated recently";
  if (r.snowNew24h == null) return "No snow report yet";
  const source = r.snowSource === "Reported" ? "resort-reported" : r.snowSource.toLowerCase();
  if (r.snowNew24h <= 0) return `No new snow in 24 h (${source})`;
  return `${r.snowNew24h} in new snow in 24 h (${source})`;
}

function weekLine(r: FavoriteResortSnapshot): string | null {
  if (!r.operating || r.snowNew7d == null || r.snowNew7d <= 0) return null;
  return `${r.snowNew7d} in in the last 7 days`;
}

function hasPowder(r: FavoriteResortSnapshot): boolean {
  return r.operating && r.reportFresh && (r.snowNew24h ?? 0) > 0;
}

function renderResortRow(r: FavoriteResortSnapshot): string {
  const name = escapeHtml(r.name);
  const url = `${SITE_BASE}/resort/${encodeURIComponent(r.slug)}`;
  const temp = r.tempHigh != null ? `High ${r.tempHigh}°F` : "High —";
  const cond = r.conditions ? escapeHtml(r.conditions) : "Forecast unavailable";
  const snow = escapeHtml(snowLine(r));
  const week = weekLine(r);
  const powder = hasPowder(r);
  const meta = [escapeHtml(r.state), escapeHtml(r.primaryPass), escapeHtml(r.statusLabel)];
  if (r.surfaceLabel) meta.push(`Surface: ${escapeHtml(r.surfaceLabel)}`);

  return `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #e6e2d8;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td>
              <div style="font-size:16px;font-weight:600;color:${NAVY};margin:0 0 4px 0;">${name}</div>
              <div style="font-size:12px;color:${CHARCOAL};margin:0 0 8px 0;">${meta.join(" &middot; ")}</div>
              <div style="font-size:14px;color:${CHARCOAL};margin:0 0 4px 0;">${temp} &middot; ${cond}</div>
              <div style="font-size:14px;color:${powder ? NAVY : CHARCOAL};font-weight:${powder ? "600" : "400"};">${snow}</div>
              ${week ? `<div style="font-size:12px;color:${CHARCOAL};margin-top:2px;">${escapeHtml(week)}</div>` : ""}
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
  const {
    userName,
    favoriteResortSnapshots,
    isRecap,
    unsubscribeUrl,
    preferencesUrl,
    date,
    frequency,
  } = input;

  const name = (userName ?? "").trim();
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi there,";
  const powderResort = favoriteResortSnapshots
    .filter(hasPowder)
    .sort((a, b) => (b.snowNew24h ?? 0) - (a.snowNew24h ?? 0))[0];

  const cadence = frequency === "weekly" ? "weekly" : "daily";
  const subject = powderResort
    ? `${powderResort.snowNew24h} in of new snow at ${powderResort.name}, your Wynla ${cadence} digest`
    : `Your Wynla ${cadence} snow digest for ${date}`;

  const intro = powderResort
    ? `Fresh snow at <strong style="color:${NAVY};">${escapeHtml(powderResort.name)}</strong>: ${powderResort.snowNew24h} in reported in the last 24 h. ${isRecap ? "Top resorts for new snow right now:" : "Here is your watchlist:"}`
    : isRecap
      ? "You have no favorites yet, so here are the resorts reporting the most new snow right now:"
      : "Here is the latest from your favorites:";
  const introText = powderResort
    ? `Fresh snow at ${powderResort.name}: ${powderResort.snowNew24h} in reported in the last 24 h.`
    : isRecap
      ? "You have no favorites yet, so here are the resorts reporting the most new snow right now:"
      : "Here is the latest from your favorites:";

  const rowsHtml =
    favoriteResortSnapshots.length > 0
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
              <div style="font-size:13px;color:${CHARCOAL};margin-top:2px;">${escapeHtml(cadence[0]!.toUpperCase() + cadence.slice(1))} digest &middot; ${escapeHtml(date)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px 8px 24px;">
              <p style="margin:0 0 12px 0;font-size:15px;color:${CHARCOAL};line-height:1.5;">${greeting}</p>
              <p style="margin:0 0 16px 0;font-size:15px;color:${CHARCOAL};line-height:1.5;">${intro}</p>
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
              <p style="margin:0 0 6px 0;font-size:12px;color:${CHARCOAL};line-height:1.5;">
                Snow figures are the resort&rsquo;s own report unless marked estimated or forecast. Temperatures are the NWS forecast high for today.
              </p>
              <p style="margin:0;font-size:12px;color:${CHARCOAL};line-height:1.5;">
                You get this because you turned on digest emails on Wynla.
                <a href="${preferencesUrl}" style="color:${CHARCOAL};text-decoration:underline;">Change cadence or threshold</a>
                &middot;
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
    name ? `Hi ${name},` : "Hi there,",
    "",
    introText,
    "",
    ...favoriteResortSnapshots.map((r) => {
      const t = r.tempHigh != null ? `high ${r.tempHigh}F` : "high —";
      const parts = [
        `${r.name} (${r.state}, ${r.primaryPass}) — ${r.statusLabel}`,
        `  ${snowLine(r)}`,
      ];
      const week = weekLine(r);
      if (week) parts.push(`  ${week}`);
      parts.push(`  Forecast: ${t}, ${r.conditions ?? "unavailable"}`);
      if (r.surfaceLabel) parts.push(`  Surface: ${r.surfaceLabel}`);
      parts.push(`  ${SITE_BASE}/resort/${r.slug}`);
      return parts.join("\n");
    }),
    "",
    "Snow figures are the resort's own report unless marked estimated or forecast. Temperatures are the NWS forecast high for today.",
    "",
    `Open Wynla: ${SITE_BASE}`,
    `Change cadence or threshold: ${preferencesUrl}`,
    `Unsubscribe: ${unsubscribeUrl}`,
  ];

  return {
    subject,
    html,
    text: textLines.join("\n"),
  };
}
