import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
const THEME_KEY = "openwa_theme";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return isTheme(saved) ? saved : "system";
  });

  const applyTheme = useCallback((newTheme: Theme) => {
    const root = document.documentElement;
    if (newTheme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", newTheme);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme, applyTheme]);

  const setTheme = useCallback((newTheme: Theme) => setThemeState(newTheme), []);
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "light" ? "dark" : prev === "dark" ? "system" : "light"));
  }, []);

  return { theme, setTheme, toggleTheme };
}
