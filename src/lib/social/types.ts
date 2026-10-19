// Shared types for the Social Autopilot. Dates are plain Date objects; JSON
// columns are stored as strings and parsed at the edges (see store.ts).

export type Platform = "telegram" | "bluesky" | "linkedin" | "x" | "instagram" | "youtube";
export type Mode = "draft" | "supervised" | "autopilot";

export type TaskStatus = "QUEUED" | "RUNNING" | "DONE" | "FAILED" | "BLOCKED" | "CANCELLED";
export type PostStatus =
  | "IDEA" | "DRAFT" | "NEEDS_REVIEW" | "APPROVED" | "SCHEDULED"
  | "PUBLISHING" | "PUBLISHED" | "REJECTED" | "FAILED";

export interface Task {
  id: string;
  kind: string;
  agent: string;
  status: TaskStatus;
  dedupeKey: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  maxAttempts: number;
  depth: number;
  runAfter: Date;
  lockedAt: Date | null;
  lockedBy: string | null;
  parentId: string | null;
  postId: string | null;
  durationMs: number | null;
  createdAt: Date;
  finishedAt: Date | null;
}

export interface NewTask {
  kind: string;
  agent: string;
  dedupeKey: string;
  payload?: Record<string, unknown>;
  runAfter?: Date;
  maxAttempts?: number;
  depth?: number;
  parentId?: string | null;
  postId?: string | null;
}

// The creative direction is chosen by code (directions.ts), not by the model,
// so no two posts get the same combination and the mix is auditable.
export interface Direction {
  hookType: string;
  narrative: string;
  characters: string[]; // cast for dialogue-style pieces
  angle?: string; // the specific take the strategist chose
  evidence?: { title: string; url?: string; date?: string }[]; // research behind the topic
  feedback?: string; // revision request from a reviewing agent
  visualStyle: string;
  cta: string;
  pillar: string;
  voiceStyle: string;
}

export interface VideoScene {
  speaker: string;
  line: string;
  visual: string;
  sfx?: string;
}

export interface PostContent {
  hook: string;
  body: string; // the text that is published
  hashtags: string[];
  link?: string;
  cardText?: string; // headline for the generated image card
  alt?: string; // image description (accessibility)
  visualNotes?: string; // creative director's brief
  mediaChecked?: boolean;
  video?: { scenes: VideoScene[]; music: string; durationSec: number; renderStatus?: "spec-only" | "rendered" };
  sources: { title: string; url: string }[];
  claims: { text: string; source?: string }[];
}

export interface Post {
  id: string;
  platform: Platform;
  status: PostStatus;
  format: string;
  topic: string;
  direction: Partial<Direction>;
  content: Partial<PostContent>;
  hookText: string;
  fingerprint: string;
  qa: Record<string, unknown> | null;
  revisionCount: number;
  scheduledFor: Date | null;
  publishedAt: Date | null;
  externalId: string | null;
  externalUrl: string | null;
  clicks: number;
  decidedBy: string | null;
  error: string | null;
  createdAt: Date;
}

export interface NewPost {
  platform: Platform;
  format: string;
  topic: string;
  direction: Partial<Direction>;
}

export interface Metric {
  postId: string;
  collectedAt: Date;
  likes: number | null; // null = not reported by the platform
  replies: number | null;
  shares: number | null;
  saves: number | null;
  views: number | null;
}

export type NoteKind = "RESEARCH" | "AUDIENCE" | "DECISION" | "EXPERIMENT" | "REPORT" | "COMMENT" | "ALERT";
export interface Note {
  id: string;
  kind: NoteKind;
  title: string;
  body: string;
  sourceUrl: string | null;
  verified: boolean;
  dedupeKey: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}
export type NewNote = Omit<Note, "id" | "createdAt" | "sourceUrl" | "verified" | "dedupeKey" | "expiresAt"> &
  Partial<Pick<Note, "sourceUrl" | "verified" | "dedupeKey" | "expiresAt">>;
