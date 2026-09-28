// On-device face detection for exam proctoring. MediaPipe's BlazeFace model
// (full range: it also finds smaller faces, e.g. someone sitting further back,
// which the short-range model missed in testing) runs inside the candidate's
// browser - no video or image ever leaves their device, and it costs nothing.
// The library and model load only when an exam starts.
//
// If MediaPipe can't load (very old browser, blocked network), the browser's
// own FaceDetector is used where it exists; otherwise there is no detector and
// the exam screen says so plainly instead of guessing.

import type { FaceBox } from "./people-monitor";

/** Must equal the installed @mediapipe/tasks-vision version (a unit test checks). */
export const MEDIAPIPE_VERSION = "1.0.1";
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
export const FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_full_range/float16/1/blaze_face_full_range.tflite";

export interface FaceSampler {
  source: "mediapipe" | "native";
  detect(video: HTMLVideoElement): Promise<FaceBox[]>;
  close(): void;
}

async function mediapipeSampler(): Promise<FaceSampler> {
  const { FilesetResolver, FaceDetector } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
  const detector = await FaceDetector.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: "CPU" },
    runningMode: "VIDEO",
    minDetectionConfidence: 0.5, // people-monitor applies the stricter bar
  });
  let lastTimestamp = 0;
  return {
    source: "mediapipe",
    async detect(video) {
      // VIDEO mode needs strictly increasing timestamps.
      lastTimestamp = Math.max(performance.now(), lastTimestamp + 1);
      const { detections } = detector.detectForVideo(video, lastTimestamp);
      return detections.map((d) => ({
        x: d.boundingBox?.originX ?? 0,
        y: d.boundingBox?.originY ?? 0,
        width: d.boundingBox?.width ?? 0,
        height: d.boundingBox?.height ?? 0,
        score: d.categories[0]?.score ?? 0,
      }));
    },
    close: () => detector.close(),
  };
}

interface NativeFace {
  boundingBox: DOMRectReadOnly;
}

function nativeSampler(): FaceSampler | null {
  const Ctor = (window as unknown as { FaceDetector?: new (o: object) => { detect(v: HTMLVideoElement): Promise<NativeFace[]> } }).FaceDetector;
  if (!Ctor) return null;
  const detector = new Ctor({ fastMode: true, maxDetectedFaces: 5 });
  return {
    source: "native",
    async detect(video) {
      const faces = await detector.detect(video);
      // The native API gives no confidence; its detections are treated as confident.
      return faces.map((f) => ({ x: f.boundingBox.x, y: f.boundingBox.y, width: f.boundingBox.width, height: f.boundingBox.height, score: 1 }));
    },
    close() {},
  };
}

/** A face detector for this browser, or null when none can run. */
export async function createFaceSampler(): Promise<FaceSampler | null> {
  try {
    return await mediapipeSampler();
  } catch (err) {
    console.warn("[proctoring] on-device face detection unavailable:", err instanceof Error ? err.message : err);
    return nativeSampler();
  }
}
