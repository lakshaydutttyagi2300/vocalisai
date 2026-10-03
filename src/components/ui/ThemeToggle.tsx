"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

// Light (default) or dark, saved in this browser (localStorage "vx-theme")
// and applied before first paint by the script in layout.tsx.
const KEY = "vx-theme";
type Theme = "light" | "dark";

function read(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const o = new MutationObserver(onChange);
  o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => o.disconnect();
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => "light" as Theme);

  function choose(next: Theme) {
    if (next === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Private mode: the choice lasts until the tab closes.
    }
  }

  return (
    <div role="radiogroup" aria-label="Appearance" className="inline-flex rounded-full border border-line bg-surface-muted p-1">
      {(
        [
          ["light", "Light", Sun],
          ["dark", "Dark", Moon],
        ] as const
      ).map(([value, label, glyph]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => choose(value)}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            theme === value ? "bg-surface text-fg shadow-[var(--shadow-sm)]" : "text-fg-muted hover:text-fg"
          }`}
        >
          <Icon as={glyph} />
          {label}
        </button>
      ))}
    </div>
  );
}
