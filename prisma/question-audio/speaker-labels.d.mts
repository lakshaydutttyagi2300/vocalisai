export interface Turn {
  speaker: string;
  text: string;
}
export function parseDialogueText(text: string | null | undefined): Turn[] | null;
export function rewriteSpeakerRefs(text: string | null | undefined, speakingOrder: string[]): { text: string | null | undefined; unknown: string[] };
export function dialogueToSpec(turns: Turn[], difficulty: string): { audio: Record<string, unknown> };
export function speakingOrderOf(passage: string | null | undefined): string[];
