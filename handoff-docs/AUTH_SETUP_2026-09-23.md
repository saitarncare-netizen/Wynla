# Auth setup — Supabase dashboard steps (2026-09-23)

The new sign-in flow (6-digit email code as the primary path,
`/auth/confirm` link that works in any browser, 90-day sessions,
local-scope sign-out) ships on branch `wf/auth-2026-09-23` and is live
only once that branch is merged and deployed. Everything below is
**dashboard configuration** that only the founder (or Claude signed in
with her Supabase / Resend logins) can do.

**Order matters.** Do step 1 (email templates) only **after** the deploy
that contains this branch is live on wynla.app. The current production
build has no `/auth/confirm` route and its login page cannot accept a
code, so switching the templates early would break sign-in for everyone
until the deploy lands. Once the deploy is live, do step 1 straight away:
until then the email still contains only the old link and the code box on
`/login` has nothing to accept.

Supabase project: the one whose URL is in `NEXT_PUBLIC_SUPABASE_URL`
(`.env.local`). Dashboard: <https://supabase.com/dashboard>.

Variable names below were checked against
<https://supabase.com/docs/guides/auth/auth-email-templates> and
<https://supabase.com/docs/guides/auth/auth-email-passwordless> on
2026-09-23: `{{ .Token }}` (6-digit code), `{{ .TokenHash }}`,
`{{ .SiteURL }}`, `{{ .RedirectTo }}`, `{{ .Email }}`.

---

## 1. Email templates — put the code AND a working link in the email

**Authentication → Emails (Email Templates).** Edit **both** templates
below. Supabase sends *Magic Link* to existing users and *Confirm signup*
to brand-new addresses, so a new user would get no code if only one is
changed.

### 1a. Magic Link

Subject:

```
Your Wynla sign-in code: {{ .Token }}
```

Body (replace the whole template):

```html
<h2 style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f2a4a;margin:0 0 12px">Sign in to Wynla</h2>
<p style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#2b2b2b;font-size:15px;margin:0 0 8px">Type this code on the sign-in page. It is valid for 15 minutes.</p>
<p style="font-family:SFMono-Regular,Menlo,Consolas,monospace;font-size:32px;letter-spacing:0.3em;color:#0f2a4a;margin:0 0 20px">{{ .Token }}</p>
<p style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#2b2b2b;font-size:14px;margin:0 0 8px">Prefer a link? This one works in any browser:</p>
<p style="margin:0 0 20px"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&redirect_to={{ .RedirectTo }}" style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;color:#ffffff;background:#0f2a4a;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">Sign in to Wynla</a></p>
<p style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#6b6b6b;font-size:12px;margin:0">If you did not request this, you can ignore this email. Sent to {{ .Email }}.</p>
```

### 1b. Confirm signup

Paste exactly the same subject and body as 1a. Keep `type=email` in the
link: Supabase's `signup` and `magiclink` types are deprecated in favour
of `email`, which verifies both new and existing users, and
`/auth/confirm` accepts every email type anyway.

### Why this shape

- `{{ .Token }}` is what the person types into `/login`. The page calls
  `verifyOtp({ email, token, type: 'email' })` from the browser they are
  already in, so the iOS PWA, Gmail's in-app browser and phone-to-laptop
  all work.
- `token_hash` + `/auth/confirm` verifies server-side with no PKCE
  verifier cookie, so the link also works in any browser. The old
  `{{ .ConfirmationURL }}` only worked in the exact browser that
  requested the email.
- `redirect_to={{ .RedirectTo }}` carries the page the person was on
  (`/auth/confirm?next=<encoded path>`), which `/auth/confirm` unwraps.
  Keep it as the **last** parameter of the link and do not wrap it in
  another encoding: Supabase pastes the value in verbatim and the app
  already encodes `next` so that a destination with its own query
  (`/?plan=1&resort=vail`) survives the trip.
- Link scanners (Outlook Safe Links, corporate Gmail) can still open the
  link before the person does and consume it. That is why the code is
  primary and the link is secondary; the page copy says so.

## 2. Email provider settings — OTP length and expiry

**Authentication → Sign In / Providers → Email:**

- **Enable Email provider**: on.
- **Confirm email**: on (keeps sign-up bound to a verified mailbox).
- **Email OTP Length**: `6` (the login page only accepts 6 digits).
- **Email OTP Expiration**: `900` seconds (15 minutes; the page copy says
  15 minutes — keep them in sync if you change it). Default is 3600.
- **Secure email change**: on.

## 3. Custom SMTP through Resend (fixes the "2 emails per hour" cap)

Supabase's built-in mailer is limited to a few auth emails per hour and,
for newer projects, only delivers to organization members. Sign-in
emails must go through Resend.

Prerequisite: `wynla.app` is verified in Resend (handoff-docs/RESEND_SETUP.md,
steps 1-4, including DMARC). Then create a **Sending access** API key in
Resend (**API Keys → Create → Permission: Sending access → Domain:
wynla.app**). Do not reuse the full-access key the app uses.

**Project Settings → Authentication → SMTP Settings → Enable Custom SMTP:**

| Field | Value |
| --- | --- |
| Sender email | `login@wynla.app` |
| Sender name | `Wynla` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | the Resend *Sending access* API key (paste it, never commit it) |
| Minimum interval between emails | `60` seconds (default) |

Save, then send yourself a code from `/login` using an address that is
**not** a Supabase org member to confirm delivery.

## 4. Rate limits

**Authentication → Rate Limits:**

- **Rate limit for sending emails**: raise from the default (30/hour) to
  at least `100` per hour. This field is only editable once custom SMTP
  (step 3) is enabled.
- **Rate limit for verifying OTPs**: leave the default (360 per 5 min).
- **Rate limit for token refreshes**: leave the default.

## 5. URL configuration — redirect allow list

**Authentication → URL Configuration:**

- **Site URL**: `https://wynla.app`
- **Redirect URLs** (add each):
  - `https://wynla.app/auth/confirm`
  - `https://wynla.app/auth/callback`
  - `https://wynla.app/auth/**` (covers the `?next=` query on both routes)
  - `http://localhost:3000/auth/**` (local development)
  - the Vercel preview pattern if previews are used for sign-in testing,
    e.g. `https://*-<vercel-team>.vercel.app/auth/**`

If `emailRedirectTo` is not on this list Supabase silently swaps
`{{ .RedirectTo }}` for the Site URL, so people land on `/` instead of
where they were. Nothing breaks, but keep the list current.

## 6. Google provider (already working — verify only)

**Authentication → Sign In / Providers → Google**: enabled, with the
authorized redirect URI in Google Cloud set to
`https://<project-ref>.supabase.co/auth/v1/callback`. No change needed.

## 7. Quick end-to-end check after the steps above

1. Open <https://wynla.app/login> in a private window. Enter an email
   that is not a Supabase org member. Expect the code screen.
2. The email should show a 6-digit code AND a "Sign in to Wynla" button.
3. Type the code: you land on `/` signed in (header shows your initial).
4. Sign out. Request a new code, then tap the **link** on a different
   device or browser: you should also land signed in (no
   "different browser" message).
5. Tap the same link a second time: `/login` shows "That sign-in link has
   expired..." — expected, links are single-use.
6. Sign in on the phone and the laptop, sign out on the phone: the laptop
   stays signed in (local-scope sign-out).
7. iPhone only, over the following weeks: sign in with the **code** in the
   installed Wynla app (home-screen icon), use it for a few minutes, then
   leave it closed for more than 7 days. Opening it again should still show
   you signed in. Safari caps cookies written by page scripts at 7 days;
   the proxy re-issues the session cookie over HTTP on every request to
   lift that cap, and this is the only way to confirm it on a real device.
   If it fails, note the iOS version and whether the app was opened at all
   during those 7 days.

## What the code already handles (no dashboard work)

- `/login?e=expired|used|different-browser|invalid` copy; raw SDK
  messages never reach the URL.
- 60 s resend cooldown, "Use a different email", spam-folder hint.
- 90-day session cookie (`lib/supabase/sessionMaxAge.ts`), shared by
  `proxy.ts` and `lib/supabase/server.ts`; deletions are not extended.
  The proxy also re-issues the session cookie as HTTP `Set-Cookie` on
  every request so Safari's 7-day cap on script-written cookies does not
  apply to code sign-ins.
- Proxy skips `sw.js`, `manifest.json`, `robots.txt`, `sitemap.xml`,
  `/offline`, `/api/cron/*`, `/api/health`, Open Graph image routes and
  static files.
