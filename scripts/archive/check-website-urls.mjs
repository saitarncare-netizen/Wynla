// Probe every active resort's website_url to find broken / dead links.
// Uses HEAD with a 8 s timeout, follows up to 3 redirects, treats any
// non-2xx as broken. Writes a JSON report to .tmp-broken-urls.json.

import fs from "node:fs";

const list = JSON.parse(fs.readFileSync(".tmp-urls.json", "utf8"));
const TIMEOUT_MS = 8_000;
const CONCURRENCY = 20;

async function probe(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    let r = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
    // Some hosts reject HEAD — retry with GET.
    if (r.status === 405 || r.status === 403 || r.status === 400) {
      r = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: ctrl.signal,
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        },
      });
    }
    return { ok: r.ok, status: r.status, finalUrl: r.url };
  } catch (e) {
    return { ok: false, status: 0, error: String(e?.cause?.code ?? e?.message ?? e) };
  } finally {
    clearTimeout(t);
  }
}

const results = [];
let i = 0;
async function worker() {
  while (i < list.length) {
    const idx = i++;
    const r = list[idx];
    const probed = await probe(r.website_url);
    results[idx] = { ...r, ...probed };
    if (idx % 20 === 0) process.stderr.write(`  [${idx}/${list.length}]\n`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

const broken = results.filter((x) => !x.ok);
fs.writeFileSync(
  ".tmp-broken-urls.json",
  JSON.stringify(broken, null, 2),
);
console.log(`\nTotal: ${results.length} | OK: ${results.length - broken.length} | Broken: ${broken.length}`);
console.log("Broken (first 20):");
for (const b of broken.slice(0, 20)) {
  console.log(`  ${b.slug.padEnd(34)} ${String(b.status).padEnd(4)} ${b.error ?? ""}  ${b.website_url}`);
}
console.log(`\nFull list written to .tmp-broken-urls.json`);
