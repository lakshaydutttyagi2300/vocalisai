import type { ElementType, ReactNode } from "react";

// The one page width for every page: max 1280px, centred, with 16 / 32 /
// 48px side padding on phone / tablet / desktop (.page-container in globals.css).
export function PageContainer({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: ElementType }) {
  return <Tag className={`page-container ${className}`}>{children}</Tag>;
}
