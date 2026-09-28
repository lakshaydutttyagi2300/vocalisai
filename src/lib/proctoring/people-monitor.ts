// Turns raw face detections from the exam camera (one sample a second) into a
// steady answer to "how many people are in frame?", and says when that answer
// changes - so the exam screen can warn at once when someone else appears,
// without false alarms from a single noisy frame.
//
// Pure logic, no browser APIs: src/lib/proctoring/face-detector.ts does the
// detection, src/hooks/useLiveProctoring.ts feeds the samples in.

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Detector confidence, 0-1. */
  score: number;
}

/** Below this the detector is guessing (posters, patterns, shadows). */
export const MIN_FACE_SCORE = 0.6;
/** Faces narrower than this share of the frame are too small to be a real person nearby. */
export const MIN_FACE_WIDTH_RATIO = 0.04;
/** How often the exam camera is checked. */
export const SAMPLE_INTERVAL_MS = 1000;

/** Multiple people: at least this many of the last WINDOW samples show 2+ faces (~2 s). */
export const MULTIPLE_CONFIRM = 2;
export const MULTIPLE_WINDOW = 3;
/** Back to one person after this many samples in a row with at most one face. */
export const MULTIPLE_CLEAR = 3;
/** No face only after this many samples in a row with none - looking down to write is normal. */
export const NONE_CONFIRM = 6;
/** Face back after this many samples in a row with one. */
export const NONE_CLEAR = 2;

function overlapRatio(a: FaceBox, b: FaceBox): number {
  const w = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const h = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  const inter = w * h;
  const smaller = Math.min(a.width * a.height, b.width * b.height);
  return smaller > 0 ? inter / smaller : 0;
}

/**
 * Real, separate faces in one frame: confident enough, big enough to be a
 * person near the camera, and not the same face found twice (overlapping boxes).
 */
export function countFaces(boxes: FaceBox[], frameWidth: number): number {
  const real = boxes
    .filter((b) => b.score >= MIN_FACE_SCORE && b.width >= frameWidth * MIN_FACE_WIDTH_RATIO)
    .sort((a, b) => b.score - a.score);
  const kept: FaceBox[] = [];
  for (const b of real) if (!kept.some((k) => overlapRatio(k, b) > 0.3)) kept.push(b);
  return kept.length;
}

export type PeopleState = "one" | "none" | "multiple";

export type PeopleChange =
  | { kind: "multiple-started"; people: number }
  | { kind: "multiple-ended"; seconds: number }
  | { kind: "face-lost" }
  | { kind: "face-back" };

/** Feed one face count per sample; get the steady state and any change to log. */
export class PeopleMonitor {
  state: PeopleState = "one";
  /** Most people seen at once in the current multiple-people episode. */
  peak = 0;
  private recent: number[] = [];
  private streak = 0;
  private episodeStartedAt = 0;

  push(count: number, now: number = Date.now()): PeopleChange | null {
    this.recent = [...this.recent, count].slice(-MULTIPLE_WINDOW);
    const multipleVotes = this.recent.filter((c) => c >= 2).length;

    if (this.state === "multiple") {
      this.peak = Math.max(this.peak, count);
      this.streak = count <= 1 ? this.streak + 1 : 0;
      if (this.streak >= MULTIPLE_CLEAR) {
        const seconds = Math.round((now - this.episodeStartedAt) / 1000);
        this.enter("one"); // a missing face after this is judged by the usual no-face rule
        return { kind: "multiple-ended", seconds };
      }
      return null;
    }

    // Someone else in frame outranks everything else.
    if (multipleVotes >= MULTIPLE_CONFIRM) {
      this.enter("multiple");
      this.peak = Math.max(...this.recent);
      this.episodeStartedAt = now;
      return { kind: "multiple-started", people: this.peak };
    }

    if (this.state === "one") {
      this.streak = count === 0 ? this.streak + 1 : 0;
      if (this.streak >= NONE_CONFIRM) {
        this.enter("none");
        return { kind: "face-lost" };
      }
      return null;
    }

    // state === "none"
    this.streak = count >= 1 ? this.streak + 1 : 0;
    if (this.streak >= NONE_CLEAR) {
      this.enter("one");
      return { kind: "face-back" };
    }
    return null;
  }

  private enter(state: PeopleState) {
    this.state = state;
    this.streak = 0;
    if (state !== "multiple") this.peak = 0;
  }
}
