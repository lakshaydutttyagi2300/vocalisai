// A neutral initials tile for an assessment or company - never a logo,
// so no organisation's brand mark is reproduced.
export function ExamMonogram({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const words = name.replace(/\(.*?\)/g, "").split(/[\s|/&-]+/).filter(Boolean);
  const initials = (words.length > 1 ? words[0][0] + words[1][0] : words[0]?.slice(0, 2) ?? "?").toUpperCase();
  const box = size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";
  return (
    <span aria-hidden="true" className={`num flex flex-none items-center justify-center rounded-xl bg-brand-50 font-semibold tracking-wide text-brand-700 ring-1 ring-brand-100 ${box}`}>
      {initials}
    </span>
  );
}
