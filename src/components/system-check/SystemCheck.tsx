"use client";

import { useEffect, useRef, useState } from "react";
import { describeMediaError } from "@/lib/media-errors";
import { useMicLevel } from "@/hooks/useMicLevel";
import { ArrowRight, Check, Mic, Video } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

type DeviceStatus = "idle" | "checking" | "ready" | "error";

export function SystemCheck({
  requireCamera = false,
  onReady,
}: {
  requireCamera?: boolean;
  onReady: (streams: { cameraStream: MediaStream | null; micStream: MediaStream | null }) => void;
}) {
  const [cameraStatus, setCameraStatus] = useState<DeviceStatus>(requireCamera ? "idle" : "ready");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const [micStatus, setMicStatus] = useState<DeviceStatus>("idle");
  const [micError, setMicError] = useState<string | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const micLevel = useMicLevel(micStream);
  // Once the candidate clicks Continue, the parent takes ownership of the
  // streams and is responsible for stopping them when IT is done. Without
  // this flag, this component's own unmount (which happens the instant the
  // parent swaps it out for the next screen) would kill the very stream it
  // just handed off.
  const handedOffRef = useRef(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  // Release camera/mic if the candidate abandons the check without ever
  // continuing (navigates away mid-check) - but not if they did continue.
  useEffect(() => {
    return () => {
      if (!handedOffRef.current) {
        cameraStream?.getTracks().forEach((t) => t.stop());
        micStream?.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleContinue() {
    handedOffRef.current = true;
    onReady({ cameraStream, micStream });
  }

  async function checkCamera() {
    setCameraStatus("checking");
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setCameraStatus("ready");
    } catch (err) {
      setCameraStatus("error");
      setCameraError(describeMediaError(err, "camera"));
    }
  }

  async function checkMic() {
    setMicStatus("checking");
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);
      setMicStatus("ready");
    } catch (err) {
      setMicStatus("error");
      setMicError(describeMediaError(err, "microphone"));
    }
  }

  const canContinue = micStatus === "ready" && (!requireCamera || cameraStatus === "ready");

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <h1 className="font-display text-2xl font-bold text-ink-950">System check</h1>
      <p className="mt-1 text-sm text-slate-600">
        {requireCamera
          ? "We need to confirm your camera and microphone are working before you start."
          : "We need to confirm your microphone is working before you start."}
      </p>

      {requireCamera && (
        <div className="card mt-6 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-ink-900">Camera</h2>
            <StatusBadge status={cameraStatus} />
          </div>

          <div className="mt-3 aspect-video overflow-hidden rounded-md bg-ink-950">
            {cameraStream ? (
              <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                No preview yet
              </div>
            )}
          </div>

          {cameraError && (
            <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {cameraError}
            </p>
          )}

          {cameraStatus !== "ready" && (
            <button onClick={checkCamera} data-loading={cameraStatus === "checking" || undefined} className="btn-secondary btn-sm mt-3">
              <Icon as={Video} />
              {cameraStatus === "checking" ? "Requesting access..." : "Enable camera"}
            </button>
          )}
        </div>
      )}

      <div className="card mt-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-ink-900">Microphone</h2>
          <StatusBadge status={micStatus} />
        </div>

        <div className="mt-3">
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-brand-500 transition-all duration-100"
              style={{ width: `${micStream ? micLevel : 0}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {micStream ? "Speak to see the input level move." : "Input level will appear here once enabled."}
          </p>
        </div>

        {micError && (
          <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {micError}
          </p>
        )}

        {micStatus !== "ready" && (
          <button onClick={checkMic} data-loading={micStatus === "checking" || undefined} className="btn-secondary btn-sm mt-3">
            <Icon as={Mic} />
            {micStatus === "checking" ? "Requesting access..." : "Enable microphone"}
          </button>
        )}
      </div>

      <button onClick={handleContinue} disabled={!canContinue} className="btn-primary btn-lg mt-6 w-full">
        Continue
        <Icon as={ArrowRight} />
      </button>
      {!canContinue && (
        <p className="mt-2 text-center text-xs text-slate-500">
          {requireCamera ? "Camera and microphone" : "Microphone"} access is required to continue.
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: DeviceStatus }) {
  const styles: Record<DeviceStatus, string> = {
    idle: "bg-slate-100 text-slate-500",
    checking: "bg-amber-50 text-amber-700",
    ready: "bg-green-50 text-green-700",
    error: "bg-red-50 text-red-700",
  };
  const labels: Record<DeviceStatus, string> = {
    idle: "Not checked",
    checking: "Checking...",
    ready: "Ready",
    error: "Failed",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {status === "ready" && (
        <Icon as={Check} size="xs" />
      )}
      {labels[status]}
    </span>
  );
}
