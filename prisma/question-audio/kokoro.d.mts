export const KOKORO_VOICES: Record<"us" | "uk", Record<"female" | "male", string[]>>;
export function kokoroVoicesFor(seed: string, speakers: string[]): Map<string, string>;
export function createKokoroSpeaker(
  toolsDir: string
): Promise<
  (
    turns: { speaker: string; text: string }[],
    options: { seed: string; speechRate?: number; pauseMs?: number; workDir: string }
  ) => Promise<{ buffer: Buffer; seconds: number; voices: Record<string, string> }>
>;
