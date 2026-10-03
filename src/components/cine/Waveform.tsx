// A calm, animated voice waveform (CSS only; still under reduced motion).
// Deterministic bar heights so server and browser render the same thing.
export function Waveform({ bars = 48, className = "", tone = "bg-champagne-300", paused = false }: { bars?: number; className?: string; tone?: string; paused?: boolean }) {
  const heights = Array.from({ length: bars }, (_, i) => 22 + Math.round(Math.abs(Math.sin(i * 1.37) * Math.cos(i * 0.41)) * 78));
  return (
    <div aria-hidden="true" className={`flex items-center gap-[3px] ${className}`}>
      {heights.map((h, i) => (
        <span
          key={i}
          className={`w-full flex-1 origin-center rounded-full ${tone}`}
          style={{ height: `${h}%`, animation: paused ? "none" : `wave-bar ${1.4 + (i % 5) * 0.18}s ease-in-out ${(i % 9) * -0.17}s infinite`, opacity: 0.35 + (h / 100) * 0.6 }}
        />
      ))}
    </div>
  );
}
