import { useCallback, useEffect, useSyncExternalStore } from "react";

export const THEMES = ["light", "dark", "system", "girly-pink"] as const;
export type Theme = (typeof THEMES)[number];

export function isTheme(value: string): value is Theme {
  return (THEMES as readonly string[]).includes(value);
}

function subscribe(cb: () => void) {
  window.addEventListener("theme-change", cb);
  return () => window.removeEventListener("theme-change", cb);
}

const getTheme = (): Theme => {
  const stored = localStorage.getItem("theme");
  if (stored && isTheme(stored)) return stored;
  return "system";
};

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "theme-girly-pink");
  if (theme === "girly-pink") {
    root.classList.add("theme-girly-pink");
  } else if (
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    root.classList.add("dark");
  }
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme);

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem("theme", next);
    apply(next);
    window.dispatchEvent(new Event("theme-change"));
  }, []);

  // Follow OS changes while in system mode
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => getTheme() === "system" && apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return { theme, setTheme };
}
