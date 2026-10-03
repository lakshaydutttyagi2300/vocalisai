import type { ReactNode } from "react";

// Every admin page sits on the same soft gradient band (no hero media):
// a quiet, consistent header area for working screens.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="admin-band">{children}</div>;
}
