import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { stimulusText } from "@/lib/question-stimulus";
import { readRecording } from "@/lib/storage";
import { canonicalAudioMimeType } from "@/lib/uploads";
import { createGeminiConversationProvider } from "@/lib/providers/gemini-conversation-provider";
import { getRoleDef } from "@/lib/conversation-roles";
import { combineDeterministicMetrics } from "@/lib/speech-metrics";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const convoSession = await db.conversationSession.findUnique({
    where: { id },
    include: {
      turns: { orderBy: { turnIndex: "asc" }, include: { recording: true } },
      question: true,
    },
  });
  if (!convoSession || convoSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (convoSession.overallAnalysisJson) {
    return NextResponse.json({ analysis: JSON.parse(convoSession.overallAnalysisJson) });
  }

  const candidateTurns = convoSession.turns.filter((t) => t.speaker === "candidate");
  if (candidateTurns.length === 0) {
    await db.conversationSession.update({ where: { id }, data: { endedAt: new Date() } });
    return NextResponse.json({ analysis: null, note: "No candidate responses to analyze." });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    await db.conversationSession.update({ where: { id }, data: { endedAt: new Date() } });
    return NextResponse.json({ error: "AI is not configured on this server." }, { status: 503 });
  }

  const roleDef = getRoleDef(convoSession.role);
  const scenario = stimulusText(convoSession.question?.passage) ?? convoSession.question?.prompt ?? "";
  const conversationProvider = createGeminiConversationProvider(geminiKey);
  const history = convoSession.turns.map((t) => ({ speaker: t.speaker as "ai" | "candidate", text: t.text }));

  try {
    if (convoSession.role === "CUSTOMER") {
      // Full 10-dimension rubric, using the candidate's real audio.
      const audioClips = [];
      const metricsInputs = [];
      for (const t of candidateTurns) {
        if (!t.recording) continue;
        try {
          const buffer = await readRecording(t.recording.filePath);
          audioClips.push({ mimeType: canonicalAudioMimeType(t.recording.mimeType), base64: buffer.toString("base64") });
        } catch {
          continue; // missing file - skip this clip rather than fail the whole analysis
        }
        metricsInputs.push({
          transcript: t.text,
          durationSeconds: t.durationSeconds ?? t.recording.durationSeconds ?? 0,
          segments: t.segmentsJson ? JSON.parse(t.segmentsJson) : [],
        });
      }

      const deterministic = combineDeterministicMetrics(metricsInputs);

      // Extract the scenario type our own seed data encodes in scoringCriteria
      // (e.g. "Scenario type: angry customer. Look for...") for extra context.
      const scenarioTypeMatch = convoSession.question?.scoringCriteria?.match(/Scenario type: ([^.]+)\./);
      const scenarioType = scenarioTypeMatch ? scenarioTypeMatch[1] : null;

      const aiResult = await conversationProvider.analyzeCustomerServiceSimulation({
        scenario,
        scenarioType,
        history,
        candidateAudioClips: audioClips,
      });

      const combined = { kind: "customer_service_simulation", deterministic, ai: aiResult.result };

      await db.conversationSession.update({
        where: { id },
        data: { endedAt: new Date(), overallAnalysisJson: JSON.stringify(combined) },
      });

      return NextResponse.json({ analysis: combined });
    }

    // Other roles: generic text-based summary (Phase 10 behavior, unchanged).
    const summary = await conversationProvider.summarizeConversation({
      role: roleDef?.label ?? convoSession.role,
      scenario,
      history,
    });
    const combined = { kind: "generic", ai: summary.result };

    await db.conversationSession.update({
      where: { id },
      data: { endedAt: new Date(), overallAnalysisJson: JSON.stringify(combined) },
    });

    return NextResponse.json({ analysis: combined });
  } catch (err) {
    await db.conversationSession.update({ where: { id }, data: { endedAt: new Date() } });
    return NextResponse.json(
      { error: `Analysis failed: ${err instanceof Error ? err.message : "unknown error"}` },
      { status: 502 }
    );
  }
}
