"use client";

import { useSyncExternalStore } from "react";
import { getTheme, onThemeChange, type Theme } from "@/lib/theme";

/**
 * The page's color theme, live. The server and the hydration pass render "mono", the default,
 * and the client's own value follows, so the markup never mismatches. The 3D scenes do not use
 * this hook: they subscribe with onThemeChange and recolor their materials in place. It is for
 * the text and images that name the robot's eyes.
 */
export function useThemeName(): Theme {
  return useSyncExternalStore(onThemeChange, getTheme, () => "mono");
}

/** What the OLED eyes are called under each theme, for captions and alt text. */
export const EYE_WORD: Record<Theme, string> = { mono: "white", violet: "violet" };
