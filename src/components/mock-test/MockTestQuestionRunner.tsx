"use client";

import { useEffect, useRef, useState } from "react";
import { useMicLevel } from "@/hooks/useMicLevel";
import { getModeByCategory, isVoiceCategory } from "@/lib/practice-taxonomy";

interface TemplateSection {
  order: number;
  category: string;
  difficulty: string;
  questionCount: number;
}

interface Question {
  id: string;
  category: string;
  difficulty: string;
  type: string;
  prompt: string;
  passage: string | null;
  options: string[] | null;
  timeLimitSeconds: number;
}

type Phase = "loading-section" | "section-intro" | "answering" | "submitting" | "error" | "all-done";
type RecordingState = "idle" | "recording" | "recorded" | "uploading";

export function MockTestQuestionRunner({
  sections,
  mockTestSessionId,
  micStream,
  onAllSectionsComplete,
}: {
  sections: TemplateSection[];
  mockTestSessionId: string;
  micStream: MediaStream | null;
  onAllSectionsComplete: () => void;
}) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading-section");
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [responseText, setResponseText] = useState("");
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [answeredCount, setAnsweredCount] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef(0);
  const questionStartRef = useRef(Date.now());
  const micLevel = useMicLevel(recordingState === "recording" ? micStream : null);

  const section = sections[sectionIndex];
  const currentQuestion = questions[questionIndex];
  const totalQuestions = sections.reduce((sum, s) => sum + s.questionCount, 0);

  useEffect(() => {
    if (!section) {
      setPhase("all-done");
      onAllSectionsComplete();
      return;
    }
    setPhase("section-intro");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionIndex]);

  useEffect(() => {
    if (phase !== "answering" || !currentQuestion) return;
    setSecondsLeft(currentQuestion.timeLimitSeconds);
    questionStartRef.current = Date.now();

    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          if (recorderRef.current?.state === "recording") {
            stopRecording();
          } else {
            submitAnswer(true);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, questionIndex]);

  async function startSection() {
    setPhase("loading-section");
    setError(null);
    try {
      const res = await fetch(
        `/api/practice/questions?category=${section.category}&difficulty=${section.difficulty}&count=${section.questionCount}`
      );
      const data = await res.json();
      if (!res.ok || !data.questions?.length) {
        setError(data.error || "No questions available for this section.");
        setPhase("error");
        return;
      }
      setQuestions(data.questions);
      setQuestionIndex(0);
      setResponseText("");
      setRecordingState("idle");
      setPhase("answering");
    } catch {
      setError("Network error loading this section.");
      setPhase("error");
    }
  }

  function startRecording() {
    if (!micStream) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(micStream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      submitAnswer(false, blob);
    };
    recorder.start();
    recorderRef.current = recorder;
    recordStartRef.current = Date.now();
    setRecordingState("recording");
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function submitAnswer(timedOut: boolean, recordingBlob?: Blob) {
    if (!currentQuestion) return;
    setPhase("submitting");
    setRecordingState("uploading");

    const timeTakenSeconds = Math.round((Date.now() - questionStartRef.current) / 1000);

    try {
      let recordingId: string | undefined;
      if (recordingBlob) {
        const form = new FormData();
        form.append("file", recordingBlob, "recording.webm");
        form.append("durationSeconds", String(Math.max(1, Math.round((Date.now() - recordStartRef.current) / 1000))));
        const uploadRes = await fetch("/api/practice/recordings", { method: "POST", body: form });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Recording upload failed.");
        recordingId = uploadData.recordingId;
      }

      const attemptRes = await fetch("/api/practice/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          responseText: recordingId ? undefined : timedOut ? responseText || "" : responseText,
          recordingId,
          timeTakenSeconds,
          mockTestSessionId,
        }),
      });
      const attemptData = await attemptRes.json();
      if (!attemptRes.ok) throw new Error(attemptData.error || "Couldn't save your answer.");

      setAnsweredCount((c) => c + 1);
      advance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("error");
    } finally {
      setRecordingState("idle");
    }
  }

  function advance() {
    if (questionIndex + 1 < questions.length) {
      setQuestionIndex((i) => i + 1);
      setResponseText("");
      setPhase("answering");
    } else {
      setSectionIndex((i) => i + 1);
    }
  }

  if (phase === "all-done") return null;

  if (phase === "error") {
    return (
      <div className="text-center text-white">
        <p role="alert" className="rounded-md bg-red-500/20 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
        <button onClick={() => setPhase("answering")} className="btn-secondary mt-4">
          Continue
        </button>
      </div>
    );
  }

  if (phase === "section-intro") {
    const modeDef = getModeByCategory(section.category);
    return (
      <div className="text-center text-white">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          Section {sectionIndex + 1} of {sections.length}
        </p>
        <h2 className="mt-2 text-xl font-semibold">{modeDef?.label ?? section.category}</h2>
        <p className="mt-2 text-sm text-slate-300">{modeDef?.description}</p>
        <p className="mt-1 text-xs text-slate-400">{section.questionCount} questions</p>
        <button onClick={startSection} className="btn-primary mt-6">
          Start section
        </button>
      </div>
    );
  }

  if (phase === "loading-section" || !currentQuestion) {
    return (
      <div className="text-center">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  const voice = isVoiceCategory(currentQuestion.category);
  const isChoice = currentQuestion.options && currentQuestion.options.length > 0;

  return (
    <div className="w-full max-w-xl">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          Section {sectionIndex + 1}/{sections.length} - Question {questionIndex + 1}/{questions.length}
        </span>
        <span>
          Overall: {answeredCount}/{totalQuestions}
        </span>
        <span className={secondsLeft <= 10 ? "font-semibold text-red-400" : ""}>{secondsLeft}s</span>
      </div>

      <div className="mt-3 rounded-lg bg-white p-6 text-ink-900">
        {currentQuestion.passage && (
          <p className="mb-4 rounded-md bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
            {currentQuestion.passage}
          </p>
        )}
        <h3 className="font-medium">{currentQuestion.prompt}</h3>

        {!voice ? (
          isChoice ? (
            <div className="mt-4 space-y-2">
              {currentQuestion.options!.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setResponseText(opt)}
                  className={`block w-full rounded-md border px-4 py-2 text-left text-sm transition ${
                    responseText === opt ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              rows={4}
              placeholder="Type your response..."
              className="input-field mt-4"
            />
          )
        ) : (
          <div className="mt-4">
            {recordingState === "idle" && (
              <button onClick={startRecording} className="btn-primary">
                Start recording
              </button>
            )}
            {recordingState === "recording" && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
                  Recording...
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-red-400 transition-all duration-100" style={{ width: `${micLevel}%` }} />
                </div>
                <button onClick={stopRecording} className="btn-secondary mt-3">
                  Stop and submit
                </button>
              </div>
            )}
            {recordingState === "uploading" && <p className="text-sm text-slate-500">Saving...</p>}
          </div>
        )}

        {!voice && (
          <button
            onClick={() => submitAnswer(false)}
            disabled={phase === "submitting" || !responseText.trim()}
            className="btn-primary mt-6"
          >
            {phase === "submitting" ? "Submitting..." : "Submit"}
          </button>
        )}
      </div>
    </div>
  );
}
