import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { stimulusText } from "@/lib/question-stimulus";
import { readRecording } from "@/lib/storage";
import { extensionForMimeType, canonicalAudioMimeType } from "@/lib/uploads";
import { createGroqWhisperProvider } from "@/lib/providers/groq-whisper-provider";
import { createGeminiConversationProvider } from "@/lib/providers/gemini-conversation-provider";
import { getRoleDef } from "@/lib/conversation-roles";
import { getEffectivePlan, interviewSimulationMaxTurns } from "@/lib/entitlements";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const convoSession = await db.conversationSession.findUnique({
    where: { id },
    include: { turns: { orderBy: { turnIndex: "asc" } }, question: true },
  });
  if (!convoSession || convoSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (convoSession.endedAt) {
    return NextResponse.json({ error: "This conversation has already ended." }, { status: 400 });
  }

  const existingCandidateTurns = convoSession.turns.filter((t) => t.speaker === "candidate").length;
  const plan = await getEffectivePlan(session.user.id);
  const effectiveMaxTurns = interviewSimulationMaxTurns(plan);
  if (plan === "FREE" && existingCandidateTurns >= effectiveMaxTurns) {
    return NextResponse.json(
      { error: "You've reached the end of your free sample conversation. Upgrade to continue practicing interview simulations." },
      { status: 403 }
    );
  }
  // Paid plans too: every turn is a paid transcription, and the simulation
  // was charged once at the start - past the last turn there is no AI reply,
  // so a further turn would only be unbounded transcription spend.
  if (existingCandidateTurns >= effectiveMaxTurns) {
    return NextResponse.json(
      { error: "This conversation has reached its last turn. End it to see your analysis." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const recordingId = body?.recordingId;
  if (!recordingId) return NextResponse.json({ error: "recordingId is required." }, { status: 400 });

  const recording = await db.practiceRecording.findUnique({ where: { id: recordingId } });
  if (!recording || recording.userId !== session.user.id) {
    return NextResponse.json({ error: "Invalid recording." }, { status: 400 });
  }

  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!groqKey || !geminiKey) {
    return NextResponse.json({ error: "AI is not configured on this server." }, { status: 503 });
  }

  let audioBuffer: Buffer;
  try {
    audioBuffer = await readRecording(recording.filePath);
  } catch {
    return NextResponse.json({ error: "Recording file is missing." }, { status: 404 });
  }

  const speechProvider = createGroqWhisperProvider(groqKey);
  let transcription;
  try {
    transcription = await speechProvider.transcribe({
      audioBuffer,
      filename: `recording.${extensionForMimeType(recording.mimeType)}`,
      mimeType: canonicalAudioMimeType(recording.mimeType),
    });
  } catch (err) {
    console.error("conversation: transcription failed", { sessionId: id, err });
    return NextResponse.json(
      { error: "We couldn't transcribe what you said. Please try again." },
      { status: 502 }
    );
  }

  const candidateText = transcription.transcript || "(no speech detected)";
  const nextIndex = convoSession.turns.length;

  const candidateTurn = await db.conversationTurn.create({
    data: {
      sessionId: id,
      turnIndex: nextIndex,
      speaker: "candidate",
      text: candidateText,
      recordingId,
      durationSeconds: transcription.durationSeconds ?? recording.durationSeconds ?? null,
      segmentsJson: JSON.stringify(transcription.segments),
    },
  });

  const candidateTurnCount = convoSession.turns.filter((t) => t.speaker === "candidate").length + 1;
  const roleDef = getRoleDef(convoSession.role);
  const scenario = stimulusText(convoSession.question?.passage) ?? convoSession.question?.prompt ?? "";

  let aiTurn = null;
  if (roleDef && candidateTurnCount < effectiveMaxTurns) {
    const conversationProvider = createGeminiConversationProvider(geminiKey);
    try {
      const history = [...convoSession.turns, candidateTurn].map((t) => ({
        speaker: t.speaker as "ai" | "candidate",
        text: t.text,
      }));
      const nextTurn = await conversationProvider.generateNextTurn({
        systemPrompt: roleDef.systemPrompt,
        scenario,
        history,
      });
      aiTurn = await db.conversationTurn.create({
        data: { sessionId: id, turnIndex: nextIndex + 1, speaker: "ai", text: nextTurn.text },
      });
    } catch (err) {
      console.error("conversation: AI reply failed", { sessionId: id, err });
      return NextResponse.json(
        { error: "We couldn't generate a reply. Please try again in a moment." },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({
    candidateTurn,
    aiTurn,
    reachedMaxTurns: candidateTurnCount >= effectiveMaxTurns,
  });
}
