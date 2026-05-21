// One-app project — 4-agent verification scaffold for Tier 1 + future
// daily pipelines. Defines the shapes the orchestration code uses; the
// actual agent calls happen via the Claude Code Agent tool during
// Saitarn's interactive sessions (Phase 2) and via the Anthropic API
// from cron jobs once Phase 4 activates in October.
//
// Architecture (4 layers + sanity rules):
//   1. Researcher — fetches from resort official source, must cite URL
//   2. Verifier   — fetches from independent secondary, must cite URL
//   3. Editor     — reconciles R+V → drafts final + confidence
//   4. Skeptic    — challenges Editor's draft; rerun once or escalate
//   + Code sanity rules (deterministic) catch out-of-range values
//   + Citation requirement — every claim carries ≥1 source URL
//
// Confidence semantics:
//   high   — both R+V agree AND Skeptic confirms
//   medium — one outlier with reasonable Editor reconciliation
//   low    — direct conflict OR sanity rule mismatch; auto-escalate

import type { SupabaseClient } from "@supabase/supabase-js";

// ---------- Public types ----------

export type AgentRole = "researcher" | "verifier" | "editor" | "skeptic";

export type AgentFinding<TValue> = {
  /** The structured value the agent produced. */
  value: TValue | null;
  /** URLs the agent cites as evidence. Empty array = auto-escalate. */
  citations: string[];
  /** Free-form notes (debugging + audit). */
  notes?: string;
  /** Self-reported confidence the agent has in its own answer. */
  selfConfidence?: "low" | "medium" | "high";
};

export type VerificationResult<TValue> = {
  finalValue: TValue | null;
  confidence: "low" | "medium" | "high";
  citations: string[];
  agentOutputs: {
    researcher: AgentFinding<TValue>;
    verifier: AgentFinding<TValue>;
    editor: AgentFinding<TValue>;
    skeptic: SkepticVerdict;
  };
  /** When true: caller should NOT write to the canonical table; instead
   *  enqueue to data_review_queue for human review. */
  escalated: boolean;
  escalationReason?: string;
};

export type SkepticVerdict = {
  verdict: "confirm" | "rerun" | "escalate";
  reason: string;
};

/** Sanity rule for a single field. Returns null if value passes, or an
 *  explanation if the rule fires. */
export type SanityRule<TValue> = (value: TValue | null) => string | null;

// ---------- Sanity rule presets ----------

export const SANITY: Record<string, SanityRule<unknown>> = {
  liftCount: (v) => {
    if (v == null) return null;
    if (typeof v !== "number") return "expected number";
    if (v < 0 || v > 100) return `lift count ${v} outside 0-100 range`;
    return null;
  },
  trailCount: (v) => {
    if (v == null) return null;
    if (typeof v !== "number") return "expected number";
    if (v < 0 || v > 300) return `trail count ${v} outside 0-300 range`;
    return null;
  },
  verticalDropFt: (v) => {
    if (v == null) return null;
    if (typeof v !== "number") return "expected number";
    if (v < 100 || v > 5000) return `vertical ${v} outside 100-5000 ft range`;
    return null;
  },
  windHoldMph: (v) => {
    if (v == null) return null;
    if (typeof v !== "number") return "expected number";
    if (v < 20 || v > 100) return `wind hold ${v} outside 20-100 mph range`;
    return null;
  },
  pctZeroToHundred: (v) => {
    if (v == null) return null;
    if (typeof v !== "number") return "expected number";
    if (v < 0 || v > 100) return `${v} not a valid percentage`;
    return null;
  },
} as const;

// ---------- Editor reconciliation ----------

/**
 * Default reconciliation: if Researcher + Verifier agree (deepEqual), pick
 * either; otherwise prefer Researcher (official source bias) but mark
 * confidence=medium. Caller can override with a custom reconcile fn.
 */
export function defaultReconcile<TValue>(
  researcher: AgentFinding<TValue>,
  verifier: AgentFinding<TValue>,
): AgentFinding<TValue> {
  const rv = researcher.value;
  const vv = verifier.value;
  const agree = JSON.stringify(rv) === JSON.stringify(vv);
  if (agree) {
    return {
      value: rv,
      citations: dedupeUrls([...researcher.citations, ...verifier.citations]),
      notes: "R+V agree",
      selfConfidence: "high",
    };
  }
  // Disagreement — prefer official-source (Researcher) but flag medium.
  return {
    value: rv,
    citations: dedupeUrls([...researcher.citations, ...verifier.citations]),
    notes: `R+V disagree. Researcher=${JSON.stringify(rv)} Verifier=${JSON.stringify(vv)}. Picked Researcher (official source).`,
    selfConfidence: "medium",
  };
}

function dedupeUrls(urls: string[]): string[] {
  return Array.from(new Set(urls.filter(Boolean)));
}

// ---------- Aggregation logic ----------

/**
 * Combine R + V + Editor + Skeptic + sanity rules into a final write
 * decision. The actual agent calls happen elsewhere; this function just
 * decides what to do with their outputs.
 */
export function aggregate<TValue>(args: {
  researcher: AgentFinding<TValue>;
  verifier: AgentFinding<TValue>;
  editor: AgentFinding<TValue>;
  skeptic: SkepticVerdict;
  sanityRules?: SanityRule<TValue>[];
}): VerificationResult<TValue> {
  const { researcher, verifier, editor, skeptic, sanityRules = [] } = args;

  // Citation requirement — every layer must have ≥1 citation.
  if (
    researcher.citations.length === 0 ||
    verifier.citations.length === 0 ||
    editor.citations.length === 0
  ) {
    return {
      finalValue: editor.value,
      confidence: "low",
      citations: editor.citations,
      agentOutputs: { researcher, verifier, editor, skeptic },
      escalated: true,
      escalationReason: "Missing citations from at least one layer.",
    };
  }

  // Sanity rules — deterministic guards run on Editor's draft.
  for (const rule of sanityRules) {
    const violation = rule(editor.value);
    if (violation) {
      return {
        finalValue: editor.value,
        confidence: "low",
        citations: editor.citations,
        agentOutputs: { researcher, verifier, editor, skeptic },
        escalated: true,
        escalationReason: `Sanity rule failed: ${violation}`,
      };
    }
  }

  // Skeptic verdict
  if (skeptic.verdict === "escalate") {
    return {
      finalValue: editor.value,
      confidence: "low",
      citations: editor.citations,
      agentOutputs: { researcher, verifier, editor, skeptic },
      escalated: true,
      escalationReason: `Skeptic escalated: ${skeptic.reason}`,
    };
  }

  if (skeptic.verdict === "rerun") {
    // The orchestrator (not this function) is responsible for actually
    // rerunning R+V+Editor. We return escalated=true with a special
    // reason so the orchestrator knows to retry, not write.
    return {
      finalValue: editor.value,
      confidence: "low",
      citations: editor.citations,
      agentOutputs: { researcher, verifier, editor, skeptic },
      escalated: true,
      escalationReason: `__rerun__: ${skeptic.reason}`,
    };
  }

  // Skeptic confirmed — confidence depends on R+V agreement (carried by
  // Editor's self-reported notes / confidence).
  const editorConfidence = editor.selfConfidence ?? "medium";
  return {
    finalValue: editor.value,
    confidence: editorConfidence,
    citations: editor.citations,
    agentOutputs: { researcher, verifier, editor, skeptic },
    escalated: false,
  };
}

// ---------- Database writers ----------

/**
 * Write the verified value back to the resorts table. Returns true if
 * written, false if escalated (queued for human review instead).
 *
 * `serviceClient` should be a Supabase client built with the service-role
 * key — RLS won't apply, so caller controls access. Construct it once at
 * the call site (cron handler) rather than recreating per write.
 */
export async function writeOrEscalate<TValue>(
  serviceClient: SupabaseClient,
  args: {
    resortId: number;
    field: string;
    tableName?: string;
    result: VerificationResult<TValue>;
  },
): Promise<{ written: boolean; reason: string }> {
  const { resortId, field, tableName = "resorts", result } = args;

  // Cast away the generic Database type — these tables aren't in the
  // typed schema yet (Phase 0 schema migration just added them). Once
  // we regenerate types this can drop back to typed access.
  const sb = serviceClient as unknown as {
    from: (t: string) => {
      insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      update: (row: Record<string, unknown>) => {
        eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }>;
      };
    };
  };

  if (result.escalated) {
    await sb.from("data_review_queue").insert({
      table_name: tableName,
      resort_id: resortId,
      field,
      proposed_value: result.finalValue as unknown,
      agent_outputs: result.agentOutputs as unknown,
      reason: result.escalationReason ?? "unspecified",
    });
    return { written: false, reason: "escalated" };
  }

  if (tableName === "resorts") {
    const { error } = await sb
      .from("resorts")
      .update({ [field]: result.finalValue })
      .eq("id", resortId);
    if (error) {
      await sb.from("data_review_queue").insert({
        table_name: tableName,
        resort_id: resortId,
        field,
        proposed_value: result.finalValue as unknown,
        agent_outputs: result.agentOutputs as unknown,
        reason: `write failed: ${error.message}`,
      });
      return { written: false, reason: `write failed: ${error.message}` };
    }
    return { written: true, reason: `confidence=${result.confidence}` };
  }

  // For other tables (lift_status_daily, etc.), caller writes directly.
  return { written: false, reason: "non-resorts table — caller handles write" };
}
