// ProActing cloud-provider benchmark: ONE real end-to-end pass.
//
// audio (disclosed synthetic WAV) -> SpeechProvider (real transcription)
//   -> deterministic metrics (duration, word count, WPM, filler count)
//   -> AIAnalysisProvider (real AI analysis of the transcript)
//   -> structured result, printed and saved to benchmark/results/
//
// Uses the same provider modules the real assessment engine will use -
// this script is a consumer of the abstraction, not a one-off script with
// its own inlined API calls.
//
// No mocked responses. If any network call fails, the script throws and
// stops rather than falling back to fake data.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./load-env.mjs";
import { getWavDurationSeconds } from "./wav-duration.mjs";
import { createGroqWhisperProvider } from "../providers/groq-whisper-provider.mjs";
import { createGeminiAnalysisProvider } from "../providers/gemini-analysis-provider.mjs";
import { estimateTranscriptionCostUsd, estimateAnalysisCostUsd } from "../providers/pricing.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

loadEnv(ROOT);

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GROQ_API_KEY || GROQ_API_KEY === "REVOKED_PENDING_ROTATION") {
  throw new Error("GROQ_API_KEY is not set (or still marked revoked) in .env");
}
if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set in .env");

const AUDIO_PATH = path.join(__dirname, "audio", "synthetic_customer_service_01.wav");
const GROUND_TRUTH_PATH = path.join(__dirname, "audio", "synthetic_customer_service_01.txt");

if (!fs.existsSync(AUDIO_PATH)) {
  throw new Error(
    `Synthetic audio not found at ${AUDIO_PATH}. Run generate-synthetic-audio.ps1 first.`
  );
}

const FILLER_WORDS = ["um", "umm", "uh", "uhh", "you know", "like", "actually", "basically"];

function countFillers(transcript) {
  const lower = transcript.toLowerCase();
  const counts = {};
  let total = 0;
  for (const filler of FILLER_WORDS) {
    const re = new RegExp(`\\b${filler.replace(" ", "\\s+")}\\b`, "g");
    const matches = lower.match(re);
    const n = matches ? matches.length : 0;
    if (n > 0) {
      counts[filler] = n;
      total += n;
    }
  }
  return { total, byWord: counts };
}

function classifyPace(wpm) {
  if (wpm < 110) return "too_slow";
  if (wpm <= 160) return "balanced";
  if (wpm <= 190) return "fast";
  return "very_fast";
}

async function main() {
  console.log("=== ProActing Cloud Provider Benchmark (SYNTHETIC audio, real APIs) ===\n");

  const speechProvider = createGroqWhisperProvider(GROQ_API_KEY);
  const analysisProvider = createGeminiAnalysisProvider(GEMINI_API_KEY);

  const groundTruth = fs.existsSync(GROUND_TRUTH_PATH)
    ? fs.readFileSync(GROUND_TRUTH_PATH, "utf8")
    : null;

  const wavDurationSeconds = getWavDurationSeconds(AUDIO_PATH);
  console.log(`Audio duration (from real WAV metadata): ${wavDurationSeconds.toFixed(2)}s`);

  console.log(`\n-> Calling SpeechProvider "${speechProvider.providerName}" (${speechProvider.model})...`);
  const audioBuffer = fs.readFileSync(AUDIO_PATH);
  const transcription = await speechProvider.transcribe({
    audioBuffer,
    filename: "synthetic_customer_service_01.wav",
    mimeType: "audio/wav",
  });
  const durationSeconds = transcription.durationSeconds ?? wavDurationSeconds;
  console.log(`   Latency: ${transcription.latencyMs}ms`);
  console.log(`   Transcript: "${transcription.transcript}"`);

  const wordCount = transcription.transcript.split(/\s+/).filter(Boolean).length;
  const wpm = wordCount / (durationSeconds / 60);
  const pace = classifyPace(wpm);
  const fillers = countFillers(transcription.transcript);

  console.log("\n-> Deterministic metrics (application code, not AI):");
  console.log(`   Word count: ${wordCount}`);
  console.log(`   WPM: ${wpm.toFixed(1)} (${pace})`);
  console.log(`   Filler words detected: ${fillers.total}`, fillers.byWord);

  console.log(`\n-> Calling AIAnalysisProvider "${analysisProvider.providerName}" (pinned: ${analysisProvider.model})...`);
  const analysis = await analysisProvider.analyzeSpeakingResponse({
    transcript: transcription.transcript,
    context: "customer-service response",
  });
  console.log(`   Model actually used: ${analysis.model}${analysis.model !== analysisProvider.model ? " (FAILED OVER FROM PINNED MODEL)" : ""}`);
  console.log(`   Latency: ${analysis.latencyMs}ms`);
  console.log(`   Token usage:`, analysis.tokenUsage);

  const transcriptionCostUsd = estimateTranscriptionCostUsd(durationSeconds);
  const analysisCostUsd = estimateAnalysisCostUsd(analysis.tokenUsage.input, analysis.tokenUsage.output);
  const totalCostUsd = transcriptionCostUsd + analysisCostUsd;
  const INR_PER_USD = 84;

  const result = {
    run_type: "SYNTHETIC_PIPELINE_TEST",
    disclosure:
      "Audio was generated with Windows built-in text-to-speech reading a scripted BPO customer-service line. This is NOT a real candidate recording and must NOT be treated as evidence of real-world pronunciation/accent accuracy. It validates only that the audio -> transcription -> analysis pipeline works end-to-end against real, live cloud APIs, through the same SpeechProvider/AIAnalysisProvider abstraction the real app will use.",
    ground_truth_script: groundTruth,
    audio: {
      file: path.relative(ROOT, AUDIO_PATH),
      duration_seconds: durationSeconds,
    },
    transcription: {
      provider: transcription.providerName,
      model: transcription.model,
      latency_ms: transcription.latencyMs,
      transcript: transcription.transcript,
      language: transcription.language,
    },
    deterministic_metrics: {
      word_count: wordCount,
      wpm: Number(wpm.toFixed(1)),
      pace_classification: pace,
      filler_words: fillers,
    },
    ai_analysis: {
      provider: analysis.providerName,
      model: analysis.model,
      latency_ms: analysis.latencyMs,
      token_usage: analysis.tokenUsage,
      result: analysis.result,
    },
    estimated_cost: {
      transcription_usd: Number(transcriptionCostUsd.toFixed(6)),
      ai_analysis_usd: Number(analysisCostUsd.toFixed(6)),
      total_usd: Number(totalCostUsd.toFixed(6)),
      total_inr_approx: Number((totalCostUsd * INR_PER_USD).toFixed(4)),
    },
    timestamp: new Date().toISOString(),
  };

  const resultsDir = path.join(__dirname, "results");
  fs.mkdirSync(resultsDir, { recursive: true });
  const resultPath = path.join(resultsDir, `run_${Date.now()}.json`);
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));

  console.log(`\n=== DONE. Full structured result saved to: ${path.relative(ROOT, resultPath)} ===`);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("\nBENCHMARK FAILED (real error, not simulated):");
  console.error(err);
  process.exit(1);
});
