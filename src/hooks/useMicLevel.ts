"use client";

import { useEffect, useRef, useState } from "react";

// Real-time input level (0-100) computed from an actual MediaStream via the
// Web Audio API - not simulated. Returns 0 whenever stream is null.
export function useMicLevel(stream: MediaStream | null): number {
  const [level, setLevel] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream) {
      setLevel(0);
      return;
    }

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);

    function tick() {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
      setLevel(Math.min(100, Math.round((avg / 255) * 100 * 2.2))); // gentle boost so quiet speech is visible
      frameRef.current = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      source.disconnect();
      audioContext.close();
    };
  }, [stream]);

  return level;
}
