// Concrete narrative-report provider for Phase 14 (AI Results Report).
//
// Text-only - no audio is sent again here. By the time a candidate requests
// this report, every voice response has already been transcribed and
// analyzed (Phase 8) and every category already has a real computed score
// (Phase 13's scoring-engine.ts). This call's only job is to WRITE, in
// plain language, over numbers and notes that already exist - it is
// explicitly told the final scores and forbidden from inventing new ones.
// That keeps the "no fabricated measurements" rule intact even though the
// output here is prose, not a number.

const PINNED_MODEL = "gemini-3.1-flash-lite";
const FALLBACK_MODEL = "gemini-3.5-flash-lite";

export interface ReportEvidenceItem {
  category: string;
  note: string;
}

export interface ResultsReportInput {
  overallScore: number | null;
  categories: { label: string; score: number | null; basis: string }[];
  evidence: ReportEvidenceItem[];
  proctoringFlagCount: number;
}

export interface ResultsReportResult {
  summary: string;
  strengths: { point: string; evidence: string }[];
  improvements: { point: string; evidence: string; tip: string }[];
}

function buildPrompt(input: ResultsReportInput): string {
  const categoryLines = input.categories
    .map((c) => `- ${c.label}: ${c.score === null ? "not yet available" : c.score} (${c.basis})`)
    .join("\n");
  const evidenceLines = input.evidence.length
    ? input.evidence.map((e) => `- [${e.category}] ${e.note}`).join("\n")
    : "(no per-response notes available)";

  return `You are a supportive English Communication & Voice Assessment coach writing a results summary for a candidate. You are given ALREADY-COMPUTED final scores and real notes from their assessment. Do NOT invent, restate as different, or contradict any number below - you may only reference them in prose. Your job is purely to synthesize a narrative from this evidence, grounding every claim in something actually given here.

Overall score: ${input.overallScore === null ? "not yet available" : input.overallScore}

Category scores (final, computed by rules - do not change these):
${categoryLines}

Real per-response notes (evidence to ground your claims in):
${evidenceLines}

Proctoring flags this session: ${input.proctoringFlagCount}

Write:
1. "summary": a short (3-4 sentence), encouraging but honest overall paragraph.
2. "strengths": exactly 3 items, each the candidate's strongest points, with "evidence" pointing to a specific note or score above (not generic praise).
3. "improvements": exactly 3 items, each a genuine area to work on, with "evidence" from above and a "tip" that is one concrete, practical action the candidate can take to improve it.

If there isn't enough evidence for a full set of 3 distinct strengths or improvements, it is fine to write fewer and say so in "summary" - never pad with invented material.

Return ONLY valid JSON matching exactly this shape:
{
  "summary": string,
  "strengths": [{"point": string, "evidence": string}],
  "improvements": [{"point": string, "evidence": string, "tip": string}]
}`;
}

async function callGemini(apiKey: string, model: string, input: ResultsReportInput) {
  const start = Date.now();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );
  const latencyMs = Date.now() - start;

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini generateContent failed (${res.status}): ${errText}`);
  }

  const raw = await res.json();
  const text = raw.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Gemini returned no content: ${JSON.stringify(raw)}`);

  let parsed: ResultsReportResult;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Gemini did not return valid JSON: ${text}`);
  }

  return { parsed, raw, latencyMs };
}

export function createGeminiReportProvider(apiKey: string) {
  if (!apiKey) throw new Error("createGeminiReportProvider: apiKey is required");

  return {
    providerName: "gemini" as const,
    model: PINNED_MODEL,

    async generateResultsReport(input: ResultsReportInput) {
      let modelUsed = PINNED_MODEL;
      let outcome;
      try {
        outcome = await callGemini(apiKey, PINNED_MODEL, input);
      } catch {
        modelUsed = FALLBACK_MODEL;
        outcome = await callGemini(apiKey, FALLBACK_MODEL, input);
      }

      const usage = outcome.raw.usageMetadata || {};

      return {
        result: outcome.parsed,
        tokenUsage: {
          textInput: usage.promptTokenCount ?? 0,
          output: usage.candidatesTokenCount ?? 0,
          total: usage.totalTokenCount ?? 0,
        },
        providerName: "gemini" as const,
        model: modelUsed,
        latencyMs: outcome.latencyMs,
      };
    },
  };
}
