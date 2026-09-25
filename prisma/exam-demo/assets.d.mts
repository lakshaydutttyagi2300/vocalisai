// Types for assets.mjs, so TypeScript tests can import its pure helpers.
export function canGenerateAssets(): boolean;
export function voiceMapFor(script: [string, string][]): Map<string, string>;
export function synthRateFor(speechRate: number | undefined | null): number;
export function generateListeningWav(script: [string, string][], outPath: string, opts?: { speechRate?: number; pauseMs?: number }): Promise<Buffer>;
export function uploadAsset(buffer: Buffer, ext: string, mimeType: string, prefix?: string): Promise<string>;
export function buildGroupAsset(group: unknown): Promise<{ key: string | null; reason: string | null }>;
