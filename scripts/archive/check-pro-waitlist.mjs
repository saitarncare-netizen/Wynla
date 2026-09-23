// Read-only check: does the pro_waitlist table exist? Used to verify the
// schema apply succeeded when the SQL Editor UI hangs.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";

{
  const text = readFileSync(path.resolve(".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const { count, error } = await supabase
  .from("pro_waitlist")
  .select("*", { count: "exact", head: true });

if (error) {
  console.log(JSON.stringify({ exists: false, error: error.message, code: error.code }, null, 2));
} else {
  console.log(JSON.stringify({ exists: true, row_count: count }, null, 2));
}
