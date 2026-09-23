// Thursday picks email: the same three mountains /go shows, rendered for
// a subscriber's city + pass, with a link back to the exact view. Pure
// template (no I/O) so it can be unit-tested and previewed.
//
// Styles are inline for the same reason as lib/emailTemplates.ts: Gmail,
// Outlook and Apple Mail strip <style>. Palette matches that file (navy
// #1E2952, charcoal #4A4D5A, off-white #FAF7F2, sky #87CEEB, gold #D4A84B).
//
// Every number names what it is and when it was measured or forecast:
// "8 in forecast (NWS, refreshed 6 h ago)", never a bare "8 in".

import { forecastSourceLabel, type RankResult, type RankedPick, type CountdownEntry, type Confidence } from "@/lib/saturday/rank";
import { formatAge, formatMonthDay, formatTargetDate, formatTargetDateShort } from "@/lib/saturday/dates";

const NAVY = "#1E2952";
const CHARCOAL = "#4A4D5A";
const OFFWHITE = "#FAF7F2";
const SKY = "#87CEEB";
const GOLD = "#D4A84B";

export type ThursdayPicksEmailInput = {
  userName: string | null;
  cityName: string;
  /** "Ikon Base Pass" / "Epic Pass" / "any pass or lift ticket". */
  passLabel: string;
  result: RankResult;
  /** Absolute link to the same view on /go. */
  goUrl: string;
  siteBase: string;
  unsubscribeUrl: string;
  preferencesUrl: string;
  /** When the ranking ran, for the "as of" line. */
  now: Date;
};

export type ThursdayPicksEmailOutput = { subject: string; html: string; text: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function confidenceColor(c: Confidence): string {
  return c === "High" ? "#1B7F4B" : c === "Medium" ? "#946200" : "#8A3B12";
}

/** "8 in forecast Fri into Sat (NWS, refreshed 6 h ago)". */
export function snowSentence(p: RankedPick, now: Date): string {
  const s = p.snow;
  if (s.expectedIn == null) return "No forecast for that day yet";
  const age = formatAge(s.forecastUpdatedAt, now);
  const head = s.expectedIn < 0.5 ? "No new snow forecast" : `${s.expectedIn} in forecast`;
  // Source from the forecast row itself, so an Open-Meteo day is never
  // credited to the NWS.
  return `${head} (${forecastSourceLabel(s.forecastSource)} forecast${age ? `, refreshed ${age}` : ""})`;
}

/** "Measured 6 in in 72 h (NOAA, to Thu 7 AM)" or null. */
export function measuredSentence(p: RankedPick, now: Date): string | null {
  const s = p.snow;
  if (s.reported24In != null && s.reportedAt) {
    return `Resort reports ${s.reported24In} in in 24 h (${formatAge(s.reportedAt, now)})`;
  }
  if (s.measured72In != null && s.measuredAt) {
    return `Measured ${s.measured72In} in in 72 h (NOAA analysis, ${formatAge(s.measuredAt, now)})`;
  }
  return null;
}

export function surfaceSentence(p: RankedPick): string {
  if (p.surface.dormant) return `Surface: ${p.surface.reason}`;
  const c = p.surface.confidence;
  return `Surface: ${p.surface.label} (${c} confidence, ${p.surface.basis === "stored" ? "this morning's classification" : "estimated from forecast"})`;
}

function pickRow(p: RankedPick, siteBase: string, now: Date): string {
  const url = `${siteBase}/resort/${encodeURIComponent(p.resort.slug)}`;
  const measured = measuredSentence(p, now);
  const lines = [
    snowSentence(p, now),
    measured,
    surfaceSentence(p),
    p.windHold.level !== "ok" ? `Wind: ${p.windHold.detail}, ${p.windHold.label.toLowerCase()}` : null,
    `Crowds: ${p.crowd.label.toLowerCase()} (estimated)`,
    p.access.line,
  ].filter((x): x is string => !!x);
  return `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #e6e2d8;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td>
              <div style="font-size:12px;font-weight:700;color:${GOLD};letter-spacing:1px;text-transform:uppercase;">${p.rank}</div>
              <div style="font-size:18px;font-weight:700;color:${NAVY};margin:2px 0 2px 0;">${escapeHtml(p.resort.name)}</div>
              <div style="font-size:12px;color:${CHARCOAL};margin:0 0 8px 0;">${escapeHtml(p.resort.state)} &middot; ${escapeHtml(p.drive.label)} drive${p.drive.estimated ? " (estimate)" : ""} &middot; <span style="color:${confidenceColor(p.confidence)};font-weight:600;">${p.confidence} confidence</span></div>
              <div style="font-size:14px;color:${NAVY};font-weight:600;margin:0 0 8px 0;">${escapeHtml(p.reason)}</div>
              ${lines.map((l) => `<div style="font-size:13px;color:${CHARCOAL};margin:0 0 3px 0;">${escapeHtml(l)}</div>`).join("")}
            </td>
            <td align="right" valign="top" style="padding-left:12px;white-space:nowrap;">
              <a href="${url}" style="display:inline-block;padding:8px 14px;background:${NAVY};color:${OFFWHITE};text-decoration:none;border-radius:6px;font-size:13px;font-weight:500;">Details &rarr;</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function countdownRow(c: CountdownEntry, siteBase: string): string {
  const url = `${siteBase}/resort/${encodeURIComponent(c.resort.slug)}`;
  const when = c.opensOn
    ? `${c.projected ? "Projected to open" : "Opens"} ${c.approximate ? "~" : ""}${formatMonthDay(c.opensOn)}${c.daysUntilOpen != null ? ` (${c.daysUntilOpen} days)` : ""}`
    : "Opening date not published";
  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e6e2d8;">
        <div style="font-size:16px;font-weight:700;color:${NAVY};">${escapeHtml(c.resort.name)}</div>
        <div style="font-size:13px;color:${CHARCOAL};">${escapeHtml(when)} &middot; ${escapeHtml(c.drive.label)} drive</div>
        ${c.access ? `<div style="font-size:12px;color:${CHARCOAL};">${escapeHtml(c.access.line)}</div>` : ""}
        <a href="${url}" style="font-size:12px;color:${NAVY};">Resort page</a>
      </td>
    </tr>`;
}

export function buildThursdayPicksEmail(input: ThursdayPicksEmailInput): ThursdayPicksEmailOutput {
  const { userName, cityName, passLabel, result, goUrl, siteBase, unsubscribeUrl, preferencesUrl, now } = input;
  const name = (userName ?? "").trim();
  const greeting = name ? `Hi ${name},` : "Hi there,";
  const dateLong = formatTargetDate(result.targetDate);
  const dateShort = formatTargetDateShort(result.targetDate);
  const picks = result.picks;

  const subject =
    result.mode === "picks" && picks.length > 0
      ? `${dateShort} from ${cityName}: ${picks.map((p) => p.resort.name).join(", ")}`
      : result.mode === "off-season" && result.countdown[0]
        ? `Season countdown from ${cityName}: ${result.countdown[0].resort.name} opens ${result.countdown[0].opensOn ? formatMonthDay(result.countdown[0].opensOn) : "soon"}`
        : `${dateShort} from ${cityName}: nothing fits your pass yet`;

  let intro: string;
  let bodyRows: string;
  if (result.mode === "picks" && picks.length > 0) {
    intro = `Your ${passLabel} from ${cityName}, ${dateLong}. Three mountains, ranked on forecast snow, the surface you will ski, the drive, wind and crowds:`;
    bodyRows = picks.map((p) => pickRow(p, siteBase, now)).join("");
    if (result.runnersUp.length > 0) {
      bodyRows += `
    <tr><td style="padding:14px 0 4px 0;font-size:12px;font-weight:700;color:${CHARCOAL};text-transform:uppercase;letter-spacing:1px;">Runners-up</td></tr>
    ${result.runnersUp
      .map(
        (p) =>
          `<tr><td style="padding:4px 0;font-size:13px;color:${CHARCOAL};"><strong style="color:${NAVY};">${escapeHtml(p.resort.name)}</strong> &middot; ${escapeHtml(p.reason)}</td></tr>`,
      )
      .join("")}`;
    }
  } else if (result.mode === "off-season") {
    intro =
      result.seasonPhase === "after"
        ? `The season is over within ${cityName}'s reach. Mountains on your pass that have already announced next season:`
        : `The season has not started within ${cityName}'s reach yet. The first mountains on your pass to open:`;
    bodyRows = result.countdown.slice(0, 3).map((c) => countdownRow(c, siteBase)).join("");
  } else if (result.mode === "no-picks") {
    intro = `Mountains within reach of ${cityName} are running, but none fits your ${passLabel} on ${dateLong}:`;
    bodyRows = result.excluded
      .slice(0, 6)
      .map(
        (e) =>
          `<tr><td style="padding:6px 0;font-size:13px;color:${CHARCOAL};border-bottom:1px solid #e6e2d8;"><strong style="color:${NAVY};">${escapeHtml(e.resort.name)}</strong> &middot; ${escapeHtml(e.reason)}</td></tr>`,
      )
      .join("");
  } else {
    intro = `No resort is within your drive radius of ${cityName}. Widen it on Wynla to see picks.`;
    bodyRows = "";
  }

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
              <div style="font-size:13px;color:${CHARCOAL};margin-top:2px;">Where to ride ${escapeHtml(dateLong)} &middot; from ${escapeHtml(cityName)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px 8px 24px;">
              <p style="margin:0 0 12px 0;font-size:15px;color:${CHARCOAL};line-height:1.5;">${escapeHtml(greeting)}</p>
              <p style="margin:0 0 16px 0;font-size:15px;color:${CHARCOAL};line-height:1.5;">${escapeHtml(intro)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${bodyRows}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <a href="${goUrl}" style="display:inline-block;padding:12px 20px;background:${GOLD};color:${NAVY};text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Open this Saturday on Wynla</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 24px 24px;border-top:1px solid #e6e2d8;">
              <p style="margin:0 0 6px 0;font-size:12px;color:${CHARCOAL};line-height:1.5;">
                Confidence is about the forecast horizon and data age, not how good the pick looks. ${result.horizonDays} day${result.horizonDays === 1 ? "" : "s"} out, forecasts are often off by a few inches. Snow figures name their source: forecast (NWS or Open-Meteo, named per mountain), measured (NOAA analysis at the resort) or resort-reported. Surface calls are estimates from the weather, not resort reports. Crowds are estimates. Pass rules verified from the operators' pages; check blackout dates before you drive.
              </p>
              <p style="margin:0;font-size:12px;color:${CHARCOAL};line-height:1.5;">
                You get this every Thursday because you asked for Saturday picks on Wynla. It is separate from the weekly snow digest for your favorites.
                <a href="${preferencesUrl}" style="color:${CHARCOAL};text-decoration:underline;">Change city or pass</a>
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

  const textLines: string[] = [greeting, "", intro, ""];
  if (result.mode === "picks") {
    for (const p of picks) {
      textLines.push(`${p.rank}. ${p.resort.name} (${p.resort.state}) — ${p.drive.label} drive${p.drive.estimated ? " (estimate)" : ""} — ${p.confidence} confidence`);
      textLines.push(`   ${p.reason}`);
      textLines.push(`   ${snowSentence(p, now)}`);
      const m = measuredSentence(p, now);
      if (m) textLines.push(`   ${m}`);
      textLines.push(`   ${surfaceSentence(p)}`);
      if (p.windHold.level !== "ok") textLines.push(`   Wind: ${p.windHold.detail}, ${p.windHold.label.toLowerCase()}`);
      textLines.push(`   Crowds: ${p.crowd.label.toLowerCase()} (estimated)`);
      textLines.push(`   ${p.access.line}`);
      textLines.push(`   ${siteBase}/resort/${p.resort.slug}`);
      textLines.push("");
    }
    if (result.runnersUp.length > 0) {
      textLines.push("Runners-up:");
      for (const p of result.runnersUp) textLines.push(`- ${p.resort.name}: ${p.reason}`);
      textLines.push("");
    }
  } else if (result.mode === "off-season") {
    for (const c of result.countdown.slice(0, 3)) {
      const when = c.opensOn
        ? `${c.projected ? "projected to open" : "opens"} ${c.approximate ? "~" : ""}${formatMonthDay(c.opensOn)}${c.daysUntilOpen != null ? ` (${c.daysUntilOpen} days)` : ""}`
        : "opening date not published";
      textLines.push(`- ${c.resort.name}: ${when}, ${c.drive.label} drive${c.access ? ` — ${c.access.line}` : ""}`);
    }
    textLines.push("");
  } else if (result.mode === "no-picks") {
    for (const e of result.excluded.slice(0, 6)) textLines.push(`- ${e.resort.name}: ${e.reason}`);
    textLines.push("");
  }
  textLines.push(`Open this Saturday on Wynla: ${goUrl}`);
  textLines.push("");
  textLines.push(
    `Confidence reflects the forecast horizon (${result.horizonDays} days out) and data age, not how good the pick looks. Snow figures name their source: forecast (NWS or Open-Meteo, named per mountain), measured (NOAA analysis) or resort-reported. Surface calls and crowds are estimates.`,
  );
  textLines.push("This Thursday email is separate from the weekly snow digest for your favorites.");
  textLines.push(`Change city or pass: ${preferencesUrl}`);
  textLines.push(`Unsubscribe: ${unsubscribeUrl}`);

  return { subject, html, text: textLines.join("\n") };
}
