import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAccentCode, type VoiceGender } from "@/lib/tts/accents";
import { getSpeech, SPEECH_FAILURE_MESSAGES } from "@/lib/tts/service";

// Natural-voice playback. The browser never sends free text to be spoken
// (that would let anyone spend the ElevenLabs credits on anything): it
// names a SOURCE, and the text is looked up here, checked against the
// signed-in candidate. The one exception is a short word or phrase
// (pronunciation help), which is length- and character-limited.
//
// Answer: { ok: true, url } to play, or { ok: false, reason, message,
// fallbackText } - the browser then speaks fallbackText with the device's
// own voice.

type Source =
  | { type: "question"; questionId: string }
  | { type: "improved-answer"; attemptId: string }
  | { type: "conversation-turn"; turnId: string }
  | { type: "phrase"; text: string };

const SPEAKABLE_QUESTION_CATEGORIES = new Set(["READING", "PRONUNCIATION"]);
const PHRASE = /^[\p{L}\p{M}\p{N}' .,?!-]{1,80}$/u;

async function resolveText(source: Source, userId: string): Promise<string | null> {
  switch (source?.type) {
    case "question": {
      const q = await db.practiceQuestion.findUnique({ where: { id: String(source.questionId) }, select: { category: true, expectedAnswer: true, isActive: true } });
      if (!q?.isActive || !SPEAKABLE_QUESTION_CATEGORIES.has(q.category)) return null;
      return q.expectedAnswer;
    }
    case "improved-answer": {
      const a = await db.practiceAttempt.findUnique({ where: { id: String(source.attemptId) }, select: { userId: true, analysis: { select: { improvedAnswerJson: true } } } });
      if (!a || a.userId !== userId || !a.analysis?.improvedAnswerJson) return null;
      try {
        const parsed = JSON.parse(a.analysis.improvedAnswerJson) as { improvedAnswer?: unknown };
        return typeof parsed.improvedAnswer === "string" ? parsed.improvedAnswer : null;
      } catch {
        return null;
      }
    }
    case "conversation-turn": {
      const t = await db.conversationTurn.findUnique({ where: { id: String(source.turnId) }, select: { speaker: true, text: true, session: { select: { userId: true } } } });
      if (!t || t.speaker !== "ai" || t.session.userId !== userId) return null;
      return t.text;
    }
    case "phrase":
      return typeof source.text === "string" && PHRASE.test(source.text.trim()) ? source.text.trim() : null;
    default:
      return null;
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { source?: Source; accent?: unknown; gender?: unknown } | null;
  if (!body?.source) return NextResponse.json({ error: "A source is required." }, { status: 400 });
  const accent = isAccentCode(body.accent) ? body.accent : "IN";
  const gender: VoiceGender = body.gender === "male" ? "male" : "female";

  const text = await resolveText(body.source, session.user.id);
  if (!text) return NextResponse.json({ error: "Nothing to read out for this item." }, { status: 404 });

  const result = await getSpeech({ userId: session.user.id, text, accent, gender });
  if (result.ok) return NextResponse.json({ ok: true, url: `/api/tts/audio/${result.id}`, cached: result.cached });
  return NextResponse.json({ ok: false, reason: result.reason, message: SPEECH_FAILURE_MESSAGES[result.reason], fallbackText: text });
}
