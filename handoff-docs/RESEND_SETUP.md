# Resend setup — step by step

Resend is the transactional email service Wynla uses to send the
Founder Welcome email (after a `/early` signup) and, later, any
in-product emails. **Free tier is fine** for the inaugural season — no
credit card needed, 3,000 emails/month, 100/day. Upgrade later only if
volume grows.

The code is already wired up. This doc covers the one-time DNS +
account setup so the emails actually leave your domain.

---

## What's already done in the codebase

- `npm install resend` — done.
- `lib/email/resendClient.ts` — lazy-init Resend SDK client. No throw at
  build time when the key is missing.
- `lib/email/templates/founderWelcome.ts` — the welcome email template.
- `app/api/early/route.ts` — fires the welcome email fire-and-forget
  after a successful signup; falls back silently if Resend isn't
  configured yet.

So once you finish the steps below, **redeploy and the emails just
start working**. No code changes needed.

---

## Step 1 — Create the Resend account

1. Go to <https://resend.com/signup>.
2. Sign up with your email (no credit card required).
3. Verify the email Resend sends you.

## Step 2 — Add the wynla.app domain

1. In the Resend dashboard, go to **Domains → Add Domain**.
2. Enter `wynla.app`.
3. Pick a region close to your users (US East is fine for a US ski
   product).

Resend will display **4 DNS records** to add:

- `SPF` (TXT) — typically `v=spf1 include:amazonses.com ~all`
- `DKIM` (TXT, often 3 records) — selectors `resend._domainkey.wynla.app`
  etc.
- `MX` — for receiving bounces, optional but recommended.

Copy them somewhere you can paste from in step 3.

## Step 3 — Add the DNS records

Where you add them depends on who hosts your DNS for `wynla.app`.

### If DNS is on Vercel

1. Open the Vercel dashboard.
2. Pick the Wynla project → **Settings → Domains**.
3. Click `wynla.app` → **DNS Records**.
4. Add each record Resend showed you. Match the type (TXT, MX, etc.)
   exactly. For TXT records, paste the full value including any
   quotes.

### If DNS is on Cloudflare

1. Open Cloudflare → pick the `wynla.app` zone.
2. **DNS → Records → Add record**.
3. Add each Resend record. **Important**: set the proxy status to **DNS
   only** (gray cloud, not orange). The orange cloud breaks email
   records.

### If DNS is somewhere else

Same idea — TXT records exactly as Resend specifies, MX record for
bounces. Don't forget to disable any proxying.

## Step 4 — Verify

1. Wait ~10 minutes for DNS propagation (sometimes a few seconds,
   sometimes an hour).
2. In Resend dashboard → **Domains → wynla.app** → click **Verify
   DNS records**.
3. All 4 records should turn green. If a record is missing, Resend
   tells you which one — fix it and re-verify.

## Step 5 — Create the API key

1. Resend dashboard → **API Keys → Create API Key**.
2. Name: `wynla-production` (or similar).
3. Permission: **Sending access** (not "Full access" — least privilege).
4. **Copy the key** — you only see it once.

## Step 6 — Add the key to Vercel

1. Vercel dashboard → Wynla project → **Settings → Environment
   Variables**.
2. Add:
   - `RESEND_API_KEY` = the key from step 5. Scope: **Production +
     Preview**.
   - `RESEND_FROM` = `Wynla <hello@wynla.app>` (or whatever sender
     mailbox you want — has to be on the verified domain). Scope:
     **Production + Preview**.
3. **Redeploy** the production branch (Settings → Deployments → ...
   → Redeploy). Env vars are read at runtime per-deploy.

## Step 7 — Test

1. Go to your live `/early` page.
2. Submit your own email.
3. Welcome email should land in 5–10 seconds.
4. If it doesn't, check Vercel function logs for `/api/early` — any
   Resend errors are logged with `[/api/early] founder welcome send
   failed`.

---

## Troubleshooting

- **"Domain not verified"** — DNS records aren't all green yet. Wait
  longer or re-check that you pasted them exactly. Cloudflare's
  orange-cloud proxy is the most common gotcha.
- **Email lands in spam** — verify DKIM + SPF are both green in Resend.
  Add a DMARC record (`v=DMARC1; p=none; rua=mailto:hello@wynla.app`)
  as a TXT on `_dmarc.wynla.app` for better deliverability.
- **"From address not allowed"** — `RESEND_FROM` must use a mailbox on
  the verified domain (e.g. `hello@wynla.app`, not `you@gmail.com`).
- **Want to test without DNS yet?** Set `RESEND_FROM` to
  `onboarding@resend.dev`. Resend lets you send from their sandbox
  domain to *your own verified address only* — useful for end-to-end
  smoke tests pre-DNS.

---

## What this unlocks later

Once Resend is live we can drop in any of:

- Magic-link sign-in emails branded as Wynla (Supabase has a Resend
  SMTP integration — see Supabase Auth → Email Templates → Custom
  SMTP).
- Pre-launch milestone emails to the founder list.
- The eventual weekly powder digest.

All of those reuse `lib/email/resendClient.ts` + a new template under
`lib/email/templates/`.
