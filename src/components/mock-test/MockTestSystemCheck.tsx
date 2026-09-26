"use client";

import { useEffect, useState } from "react";
import { SystemCheck } from "@/components/system-check/SystemCheck";
import { ArrowRight, Check } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

type CheckResult = "checking" | "pass" | "warn" | "fail";

interface ExtraChecks {
  browser: { status: CheckResult; detail: string };
  network: { status: CheckResult; detail: string };
  fullscreen: { status: CheckResult; detail: string };
}

function checkBrowserSupport(): { status: CheckResult; detail: string } {
  const hasGetUserMedia = !!navigator.mediaDevices?.getUserMedia;
  const hasMediaRecorder = typeof MediaRecorder !== "undefined";

  if (!hasGetUserMedia || !hasMediaRecorder) {
    return {
      status: "fail",
      detail: "This browser doesn't support the recording APIs this assessment needs. Please use a recent version of Chrome, Edge or Firefox.",
    };
  }
  return { status: "pass", detail: "Your browser supports the required recording features." };
}

async function checkNetwork(): Promise<{ status: CheckResult; detail: string }> {
  try {
    const start = performance.now();
    const res = await fetch("/api/system-check/ping", { cache: "no-store" });
    const ms = Math.round(performance.now() - start);
    if (!res.ok) throw new Error("ping failed");

    if (ms < 200) return { status: "pass", detail: `Good connection (${ms}ms).` };
    if (ms < 600) return { status: "warn", detail: `Connection is a bit slow (${ms}ms). Recording may be affected.` };
    return { status: "warn", detail: `Slow connection (${ms}ms). Consider switching networks before starting.` };
  } catch {
    return { status: "fail", detail: "Couldn't reach the server. Check your internet connection." };
  }
}

function checkFullscreenSupport(): { status: CheckResult; detail: string } {
  const supported = document.fullscreenEnabled ?? false;
  if (!supported) {
    return { status: "warn", detail: "Fullscreen isn't supported in this browser. The test will run in a normal window." };
  }
  return { status: "pass", detail: "Fullscreen is supported and will be used during the test." };
}

export function MockTestSystemCheck({
  onReady,
}: {
  onReady: (streams: { cameraStream: MediaStream | null; micStream: MediaStream | null }) => void;
}) {
  const [camMicReady, setCamMicReady] = useState<{ cameraStream: MediaStream | null; micStream: MediaStream | null } | null>(null);
  const [extra, setExtra] = useState<ExtraChecks | null>(null);

  useEffect(() => {
    if (!camMicReady) return;
    setExtra({
      browser: { status: "checking", detail: "" },
      network: { status: "checking", detail: "" },
      fullscreen: { status: "checking", detail: "" },
    });

    const browser = checkBrowserSupport();
    const fullscreen = checkFullscreenSupport();
    setExtra((prev) => (prev ? { ...prev, browser, fullscreen } : prev));

    checkNetwork().then((network) => {
      setExtra((prev) => (prev ? { ...prev, network } : prev));
    });
  }, [camMicReady]);

  const mandatoryPassed = extra ? extra.browser.status === "pass" : false;
  const canContinue = !!camMicReady && mandatoryPassed && !!extra && extra.network.status !== "checking";

  if (!camMicReady) {
    return <SystemCheck requireCamera onReady={setCamMicReady} />;
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <h1 className="font-display text-2xl font-bold text-ink-950">System check</h1>
      <p className="mt-1 text-sm text-slate-600">Camera and microphone are ready. Checking a few more things.</p>

      <div className="card mt-6 divide-y divide-slate-100 p-0">
        <CheckRow label="Camera" status="pass" detail="Ready" />
        <CheckRow label="Microphone" status="pass" detail="Ready" />
        {extra && (
          <>
            <CheckRow label="Browser" status={extra.browser.status} detail={extra.browser.detail || "Checking..."} />
            <CheckRow label="Network" status={extra.network.status} detail={extra.network.detail || "Checking..."} />
            <CheckRow label="Fullscreen" status={extra.fullscreen.status} detail={extra.fullscreen.detail || "Checking..."} />
          </>
        )}
      </div>

      <button onClick={() => onReady(camMicReady)} disabled={!canContinue} className="btn-primary btn-lg mt-6 w-full">
        Continue to rules
        <Icon as={ArrowRight} />
      </button>
      {!mandatoryPassed && extra && (
        <p className="mt-2 text-center text-xs text-red-600">
          Your browser doesn't meet the minimum requirements for a proctored test.
        </p>
      )}
    </div>
  );
}

function CheckRow({ label, status, detail }: { label: string; status: CheckResult; detail: string }) {
  const styles: Record<CheckResult, string> = {
    checking: "bg-amber-50 text-amber-700",
    pass: "bg-green-50 text-green-700",
    warn: "bg-amber-50 text-amber-700",
    fail: "bg-red-50 text-red-700",
  };
  const labels: Record<CheckResult, string> = {
    checking: "Checking...",
    pass: "Ready",
    warn: "Warning",
    fail: "Failed",
  };
  return (
    <div className="flex items-start justify-between gap-4 p-4">
      <div>
        <p className="font-medium text-ink-900">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
      </div>
      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {status === "pass" && (
          <Icon as={Check} size="xs" />
        )}
        {labels[status]}
      </span>
    </div>
  );
}
