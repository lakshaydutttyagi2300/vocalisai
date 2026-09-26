"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Mic, Square } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SystemCheck } from "@/components/system-check/SystemCheck";
import { useMicLevel } from "@/hooks/useMicLevel";
import { uploadRecording } from "@/lib/upload-recording-client";
import { AccentPicker } from "@/components/speech/ListenButton";
import { playSpeech, useAccent, type PlayHandle } from "@/components/speech/speech";

interface Turn {
  id: string;
  turnIndex: number;
  speaker: "ai" | "candidate";
  text: string;
}

interface GenericAnalysis {
  grammar: { issues: { excerpt: string; problem: string; correction: string }[]; overallComment: string };
  vocabulary: { assessment: string; repetitiveWords: string[] };
  relevance: string;
  responseQuality: string;
  customerHandling: string;
  coachingNote: string;
}

interface CustomerServiceAnalysis {
  listening: string;
  grammar: { issues: { excerpt: string; problem: string; correction: string }[]; overallComment: string };
  pronunciation: { mispronouncedWords: { word: string; note: string }[]; articulation: string; intelligibility: string };
  fluency: { hesitations: string; smoothness: string };
  professionalTone: string;
  empathy: string;
  relevance: string;
  problemSolving: string;
  deEscalation: string;
  responseQuality: string;
  coachingNote: string;
}

interface DeterministicMetrics {
  wordCount: number;
  durationSeconds: number;
  wpm: number;
  pace: string;
  fillers: { total: number; byWord: Record<string, number> };
  repetitions: { count: number; examples: string[] };
  longPauses: { gapSeconds: number; atSeconds: number }[];
}

type AnalysisResult =
  | { kind: "generic"; ai: GenericAnalysis }
  | { kind: "customer_service_simulation"; deterministic: DeterministicMetrics; ai: CustomerServiceAnalysis };

type Stage = "system-check" | "loading" | "in-conversation" | "analyzing" | "complete" | "error";
type RecordingState = "idle" | "recording" | "uploading";

export default function ConversationPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("system-check");
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [role, setRole] = useState("");
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [reachedMax, setReachedMax] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef<number>(0);
  const spokenIndexRef = useRef(-1);
  const voiceRef = useRef<PlayHandle | null>(null);
  const [accent] = useAccent();
  const micLevel = useMicLevel(recordingState === "recording" ? micStream : null);

  useEffect(() => {
    return () => micStream?.getTracks().forEach((t) => t.stop());
  }, [micStream]);

  // Speak each new AI line exactly once, as it arrives - in a natural
  // voice when one is available (interviewers and supervisors male, others
  // female), otherwise the device's voice.
  useEffect(() => {
    const latest = turns[turns.length - 1];
    if (!latest || latest.speaker !== "ai") return;
    if (latest.turnIndex <= spokenIndexRef.current) return;
    spokenIndexRef.current = latest.turnIndex;
    voiceRef.current?.stop();
    voiceRef.current = playSpeech({
      source: { type: "conversation-turn", turnId: latest.id },
      fallbackText: latest.text,
      accent,
      gender: role === "INTERVIEWER" || role === "SUPERVISOR" ? "male" : "female",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turns]);

  useEffect(() => () => voiceRef.current?.stop(), []);

  async function handleSystemReady({ micStream: stream }: { cameraStream: MediaStream | null; micStream: MediaStream | null }) {
    setMicStream(stream);
    setStage("loading");
    try {
      const res = await fetch(`/api/conversations/${params.sessionId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't load this conversation.");
        setStage("error");
        return;
      }
      setTurns(data.turns);
      setRole(data.role);
      if (data.ended) {
        setAnalysis(data.analysis);
        setStage("complete");
      } else {
        setStage("in-conversation");
      }
    } catch {
      setError("Network error.");
      setStage("error");
    }
  }

  function startRecording() {
    if (!micStream) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(micStream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => submitTurn(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
    recorder.start();
    recorderRef.current = recorder;
    recordStartRef.current = Date.now();
    setRecordingState("recording");
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function submitTurn(blob: Blob) {
    setRecordingState("uploading");
    setAiThinking(true);
    try {
      const durationSeconds = Math.max(1, Math.round((Date.now() - recordStartRef.current) / 1000));
      const recordingId = await uploadRecording(blob, durationSeconds);

      const turnRes = await fetch(`/api/conversations/${params.sessionId}/turns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordingId }),
      });
      const turnData = await turnRes.json();
      if (!turnRes.ok) throw new Error(turnData.error || "Couldn't process your turn.");

      setTurns((prev) => [...prev, turnData.candidateTurn, ...(turnData.aiTurn ? [turnData.aiTurn] : [])]);
      setReachedMax(turnData.reachedMaxTurns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStage("error");
    } finally {
      setRecordingState("idle");
      setAiThinking(false);
    }
  }

  async function endConversation() {
    setStage("analyzing");
    micStream?.getTracks().forEach((t) => t.stop());
    try {
      const res = await fetch(`/api/conversations/${params.sessionId}/complete`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Analysis failed.");
        setStage("error");
        return;
      }
      setAnalysis(data.analysis);
      setStage("complete");
    } catch {
      setError("Network error while analyzing.");
      setStage("error");
    }
  }

  if (stage === "system-check") return <SystemCheck requireCamera={false} onReady={handleSystemReady} />;

  if (stage === "loading") {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 h-32 animate-pulse rounded-lg bg-slate-200" />
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
        <Link href="/practice/conversation" className="btn-secondary mt-4 inline-block">
          Start over
        </Link>
      </div>
    );
  }

  if (stage === "analyzing") {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        <p className="mt-4 text-sm text-slate-600">Analyzing the conversation...</p>
      </div>
    );
  }

  if (stage === "complete") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/practice/conversation" className="btn-ghost btn-sm -ml-3">
          <Icon as={ArrowLeft} />
          New conversation
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-ink-950">Conversation analysis</h1>

        <div className="card mt-6 max-h-64 space-y-2 overflow-y-auto p-4">
          {turns.map((t) => (
            <div key={t.id} className={t.speaker === "ai" ? "text-left" : "text-right"}>
              <span
                className={`inline-block max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  t.speaker === "ai" ? "bg-slate-100 text-slate-700" : "bg-brand-600 text-white"
                }`}
              >
                {t.text}
              </span>
            </div>
          ))}
        </div>

        {analysis?.kind === "customer_service_simulation" ? (
          <div className="mt-4 space-y-4">
            <Section title="Deterministic metrics" badge="Calculated">
              <div className="flex flex-wrap gap-6">
                <Stat label="Total words" value={String(analysis.deterministic.wordCount)} />
                <Stat label="Words per minute" value={String(analysis.deterministic.wpm)} />
                <Stat label="Pace" value={analysis.deterministic.pace.replace("_", " ")} />
                <Stat label="Filler words" value={String(analysis.deterministic.fillers.total)} />
                <Stat label="Long pauses" value={String(analysis.deterministic.longPauses.length)} />
              </div>
            </Section>
            <Section title="Listening" badge="AI-assessed"><p className="text-sm text-slate-600">{analysis.ai.listening}</p></Section>
            <Section title="Pronunciation" badge="AI-assessed from audio">
              {analysis.ai.pronunciation.mispronouncedWords.length > 0 && (
                <ul className="mb-2 space-y-1 text-sm">
                  {analysis.ai.pronunciation.mispronouncedWords.map((w, i) => (
                    <li key={i}><span className="font-medium text-ink-900">{w.word}:</span> <span className="text-slate-600">{w.note}</span></li>
                  ))}
                </ul>
              )}
              <p className="text-sm text-slate-600">{analysis.ai.pronunciation.articulation}</p>
              <p className="text-sm text-slate-600">{analysis.ai.pronunciation.intelligibility}</p>
            </Section>
            <Section title="Fluency" badge="AI-assessed from audio">
              <p className="text-sm text-slate-600">{analysis.ai.fluency.hesitations}</p>
              <p className="text-sm text-slate-600">{analysis.ai.fluency.smoothness}</p>
            </Section>
            <Section title="Professional Tone"><p className="text-sm text-slate-600">{analysis.ai.professionalTone}</p></Section>
            <Section title="Empathy"><p className="text-sm text-slate-600">{analysis.ai.empathy}</p></Section>
            <Section title="Relevance"><p className="text-sm text-slate-600">{analysis.ai.relevance}</p></Section>
            <Section title="Problem Solving"><p className="text-sm text-slate-600">{analysis.ai.problemSolving}</p></Section>
            <Section title="De-escalation"><p className="text-sm text-slate-600">{analysis.ai.deEscalation}</p></Section>
            <Section title="Response Quality"><p className="text-sm text-slate-600">{analysis.ai.responseQuality}</p></Section>
            <Section title="Grammar" badge="AI-assessed">
              {analysis.ai.grammar.issues.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {analysis.ai.grammar.issues.map((issue, i) => (
                    <li key={i} className="rounded-md bg-slate-50 p-3">
                      <p className="text-slate-700">&quot;{issue.excerpt}&quot; - {issue.problem}</p>
                      <p className="mt-1 text-green-700">Correction: {issue.correction}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-600">No specific issues flagged.</p>
              )}
              <p className="mt-2 text-sm text-slate-600">{analysis.ai.grammar.overallComment}</p>
            </Section>
            <Section title="Coaching note" badge="What to try next">
              <p className="text-sm text-slate-600">{analysis.ai.coachingNote}</p>
            </Section>
          </div>
        ) : analysis?.kind === "generic" ? (
          <div className="mt-4 space-y-4">
            <Section title="Relevance"><p className="text-sm text-slate-600">{analysis.ai.relevance}</p></Section>
            <Section title="Response Quality"><p className="text-sm text-slate-600">{analysis.ai.responseQuality}</p></Section>
            <Section title="Customer/Situation Handling"><p className="text-sm text-slate-600">{analysis.ai.customerHandling}</p></Section>
            <Section title="Grammar" badge="AI-assessed">
              {analysis.ai.grammar.issues.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {analysis.ai.grammar.issues.map((issue, i) => (
                    <li key={i} className="rounded-md bg-slate-50 p-3">
                      <p className="text-slate-700">&quot;{issue.excerpt}&quot; - {issue.problem}</p>
                      <p className="mt-1 text-green-700">Correction: {issue.correction}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-600">No specific issues flagged.</p>
              )}
              <p className="mt-2 text-sm text-slate-600">{analysis.ai.grammar.overallComment}</p>
            </Section>
            <Section title="Vocabulary">
              <p className="text-sm text-slate-600">{analysis.ai.vocabulary.assessment}</p>
            </Section>
            <Section title="Coaching note" badge="What to try next">
              <p className="text-sm text-slate-600">{analysis.ai.coachingNote}</p>
            </Section>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">No responses were recorded to analyze.</p>
        )}

        <Link href="/dashboard" className="btn-primary mt-6 inline-block">
          Back to dashboard
        </Link>
      </div>
    );
  }

  // in-conversation
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-center justify-between">
        <Link href="/practice/conversation" className="btn-ghost btn-sm -ml-3">
          <Icon as={ArrowLeft} />
          End without saving
        </Link>
        <span className="text-xs font-medium text-slate-500">{role.replace("_", " ")}</span>
      </div>
      <AccentPicker className="mt-2" />

      <div className="card mt-4 max-h-96 space-y-2 overflow-y-auto p-4">
        {turns.map((t) => (
          <div key={t.id} className={t.speaker === "ai" ? "text-left" : "text-right"}>
            <span
              className={`inline-block max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                t.speaker === "ai" ? "bg-slate-100 text-slate-700" : "bg-brand-600 text-white"
              }`}
            >
              {t.text}
            </span>
          </div>
        ))}
        {aiThinking && <p className="text-left text-xs text-slate-400">Processing your response...</p>}
      </div>

      <div className="mt-4 flex flex-col items-center">
        {recordingState === "recording" && (
          <div className="mb-3 w-full">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-red-400 transition-all duration-100" style={{ width: `${micLevel}%` }} />
            </div>
          </div>
        )}

        {recordingState === "idle" && !aiThinking && (
          <button onClick={startRecording} className="btn-primary">
                <Icon as={Mic} />
            {turns.length === 1 ? "Start speaking" : "Reply"}
          </button>
        )}
        {recordingState === "recording" && (
          <button onClick={stopRecording} className="btn-danger">
                <Icon as={Square} />
            Stop and send
          </button>
        )}
        {recordingState === "uploading" && <p className="text-sm text-slate-500">Sending...</p>}

        {reachedMax && (
          <p className="mt-2 text-xs text-slate-500">You&apos;ve reached the end of this conversation.</p>
        )}

        <button onClick={endConversation} className="btn-secondary mt-4">
          End conversation &amp; see analysis
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-ink-900">{value}</p>
    </div>
  );
}

function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
        {badge && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{badge}</span>}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
