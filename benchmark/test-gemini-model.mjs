import { loadEnv } from "./load-env.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, ".."));

const key = process.env.GEMINI_API_KEY;

async function tryModel(model) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Say OK" }] }] }),
    }
  );
  const text = await res.text();
  console.log(`${model}: ${res.status}`);
  if (res.status !== 200) console.log(text.slice(0, 200));
  console.log("---");
}

await tryModel("gemini-3.5-flash-lite");
await tryModel("gemini-3.1-flash");
await tryModel("gemini-flash-lite-latest");
