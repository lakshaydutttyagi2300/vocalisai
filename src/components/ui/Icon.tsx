// The ONE icon style for the candidate interface: Lucide outline icons
// (24px grid, round caps/joins) at a single stroke weight and a small set
// of sizes, so every icon has the same visual weight and alignment. Use this
// instead of hand-drawn inline SVGs.
//
//   <Icon as={Mic} />                    inline with text (16px)
//   <Icon as={Check} size="xs" />        inside small pills/badges (12px)
//   <IconBadge as={AudioLines} />        feature icon in a tinted tile

import type { LucideIcon } from "lucide-react";

const SIZES = { xs: 12, sm: 16, md: 18, lg: 20, xl: 28 } as const;
export type IconSize = keyof typeof SIZES;

// One weight everywhere. Lucide scales the stroke with the icon, so small
// and large icons look equally heavy relative to their size.
export const ICON_STROKE = 1.75;

export function Icon({ as: Glyph, size = "sm", className = "", label }: { as: LucideIcon; size?: IconSize; className?: string; label?: string }) {
  return (
    <Glyph
      size={SIZES[size]}
      strokeWidth={ICON_STROKE}
      className={`vx-icon shrink-0 ${className}`.trim()}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable="false"
    />
  );
}

const TILE = {
  md: "h-10 w-10 rounded-xl",
  lg: "h-16 w-16 rounded-2xl",
} as const;

// A feature icon on the brand's tinted tile - the same tile everywhere.
export function IconBadge({
  as,
  size = "md",
  tone = "brand",
  className = "",
}: {
  as: LucideIcon;
  size?: keyof typeof TILE;
  tone?: "brand" | "solid";
  className?: string;
}) {
  const colours = tone === "solid" ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-600";
  return (
    <span className={`flex flex-none items-center justify-center ${TILE[size]} ${colours} ${className}`.trim()} aria-hidden="true">
      <Icon as={as} size={size === "lg" ? "xl" : "lg"} />
    </span>
  );
}
