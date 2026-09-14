// Lightweight connectivity/auth check for both providers.
// Prints only pass/fail - never prints the key values themselves.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./load-env.mjs";
import { createGroqWhisperProvider } from "../providers/groq-whisper-provider.mjs";
import { createGeminiAnalysisProvider } from "../providers/gemini-analysis-provider.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
loadEnv(ROOT);

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function main() {
  let ok = true;

  if (!GROQ_API_KEY || GROQ_API_KEY === "REVOKED_PENDING_ROTATION") {
    console.log("GROQ:   FAIL - no valid key in .env yet (still placeholder/revoked marker)");
    ok = false;
  } else {
    try {
      await createGroqWhisperProvider(GROQ_API_KEY).verifyConnection();
      console.log("GROQ:   OK - key authenticates successfully");
    } catch (err) {
      console.log(`GROQ:   FAIL - ${err.message}`);
      ok = false;
    }
  }

  if (!GEMINI_API_KEY) {
    console.log("GEMINI: FAIL - no key in .env");
    ok = false;
  } else {
    try {
      const { pinnedAvailable } = await createGeminiAnalysisProvider(GEMINI_API_KEY).verifyConnection();
      console.log(`GEMINI: OK - key authenticates successfully (pinned model available: ${pinnedAvailable})`);
    } catch (err) {
      console.log(`GEMINI: FAIL - ${err.message}`);
      ok = false;
    }
  }

  process.exit(ok ? 0 : 1);
}

main();
