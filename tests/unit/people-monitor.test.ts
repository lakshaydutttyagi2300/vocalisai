import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { countFaces, PeopleMonitor, NONE_CONFIRM, type FaceBox } from "@/lib/proctoring/people-monitor";
import { MEDIAPIPE_VERSION } from "@/lib/proctoring/face-detector";
import { PROCTORING_EVENT_LABELS } from "@/lib/proctoring-events";

// Exam proctoring: only one person may be in the camera frame. These pin the
// rules that decide when to warn - fast when someone else appears, and never
// from a single noisy frame when only the candidate is there.
const face = (x: number, width = 120, score = 0.9): FaceBox => ({ x, y: 80, width, height: width, score });
const FRAME = 640;

describe("counting faces in one frame", () => {
  it("counts separate, confident, person-sized faces", () => {
    expect(countFaces([], FRAME)).toBe(0);
    expect(countFaces([face(100)], FRAME)).toBe(1);
    expect(countFaces([face(40), face(400)], FRAME)).toBe(2);
    expect(countFaces([face(10, 100), face(250, 90), face(480, 80)], FRAME)).toBe(3);
  });

  it("ignores low-confidence and tiny detections (posters, patterns, noise)", () => {
    expect(countFaces([face(100), face(400, 120, 0.45)], FRAME)).toBe(1);
    expect(countFaces([face(100), face(400, 12)], FRAME)).toBe(1); // 12px wide on a 640px frame
  });

  it("does not count the same face twice when boxes overlap", () => {
    expect(countFaces([face(100, 120, 0.95), face(110, 115, 0.8)], FRAME)).toBe(1);
  });
});

function run(counts: number[]) {
  const m = new PeopleMonitor();
  const changes = counts.map((c, i) => m.push(c, i * 1000)).filter(Boolean);
  return { state: m.state, changes, monitor: m };
}

describe("deciding when to warn", () => {
  it("only the candidate, all the time: never a warning", () => {
    expect(run(Array(120).fill(1))).toMatchObject({ state: "one", changes: [] });
  });

  it("a single noisy frame with two faces does not warn", () => {
    expect(run([1, 1, 2, 1, 1, 1, 1, 2, 1, 1])).toMatchObject({ state: "one", changes: [] });
  });

  it("warns within about two seconds when a second person appears, and logs it once", () => {
    const { state, changes } = run([1, 1, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(state).toBe("multiple");
    expect(changes).toEqual([{ kind: "multiple-started", people: 2 }]);
    const m = new PeopleMonitor();
    m.push(1, 0);
    expect(m.push(2, 1000)).toBeNull();
    expect(m.push(2, 2000)).toEqual({ kind: "multiple-started", people: 2 }); // the second sample
  });

  it("clears once only the candidate is back, reporting how long it lasted", () => {
    const { state, changes } = run([2, 2, 3, 2, 1, 1, 1, 1]);
    expect(state).toBe("one");
    expect(changes).toEqual([{ kind: "multiple-started", people: 2 }, { kind: "multiple-ended", seconds: 5 }]); // confirmed at 1 s, cleared at 6 s
  });

  it("records the most people seen during the episode", () => {
    const { monitor } = run([2, 2, 3, 4, 2]);
    expect(monitor.peak).toBe(4);
  });

  it("a second person appearing again later is a new, separately logged episode", () => {
    const { changes } = run([2, 2, 1, 1, 1, 1, 2, 2]);
    expect(changes.map((c) => c!.kind)).toEqual(["multiple-started", "multiple-ended", "multiple-started"]);
  });

  it("looking down for a few seconds is not 'face not visible'; a longer absence is", () => {
    expect(run([1, 0, 0, 0, 0, 1, 1]).changes).toEqual([]);
    const gone = run([1, ...Array(NONE_CONFIRM).fill(0), 1, 1]);
    expect(gone.changes).toEqual([{ kind: "face-lost" }, { kind: "face-back" }]);
    expect(gone.state).toBe("one");
  });

  it("someone else appearing while the candidate's face is lost still warns", () => {
    const { state, changes } = run([...Array(NONE_CONFIRM).fill(0), 2, 2]);
    expect(changes.map((c) => c!.kind)).toEqual(["face-lost", "multiple-started"]);
    expect(state).toBe("multiple");
  });
});

describe("wiring", () => {
  it("loads the same MediaPipe version as the installed package", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../node_modules/@mediapipe/tasks-vision/package.json"), "utf8"));
    expect(MEDIAPIPE_VERSION).toBe(pkg.version);
  });

  it("the server accepts both events the camera check logs", () => {
    expect(PROCTORING_EVENT_LABELS.MULTIPLE_FACES).toBe("Multiple people detected");
    expect(PROCTORING_EVENT_LABELS.MULTIPLE_FACES_CLEARED).toBeTruthy();
  });
});
