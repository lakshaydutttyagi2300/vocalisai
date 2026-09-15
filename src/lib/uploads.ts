import path from "node:path";

export const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

export function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "bin";
}

// Browsers report MediaRecorder's mimeType with a codec suffix (e.g.
// "audio/webm;codecs=opus"), which is exactly right for local playback
// but has tripped up third-party APIs when passed through as-is (Groq's
// format check keyed off a filename built from it, producing something
// like "recording.webm;codecs=opus" - not a real extension). Send this
// clean, canonical form to any transcription/analysis API instead;
// keep the original raw mimeType for DB storage and browser playback,
// where the codec detail is correct and useful.
export function canonicalAudioMimeType(mimeType: string): string {
  return `audio/${extensionForMimeType(mimeType)}`;
}
