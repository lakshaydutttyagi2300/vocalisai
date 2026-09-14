import path from "node:path";

export const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

export function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "bin";
}
