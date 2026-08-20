import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light" | "system";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const applyThemeClass = (theme: Theme) => {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      setTheme: (theme: Theme) => {
        applyThemeClass(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const currentTheme = get().theme;
        const isDark =
          currentTheme === "dark" ||
          (currentTheme === "system" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches);
        const nextTheme: Theme = isDark ? "light" : "dark";
        applyThemeClass(nextTheme);
        set({ theme: nextTheme });
      },
    }),
    {
      name: "church-calendar-theme",
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeClass(state.theme);
        } else {
          applyThemeClass("dark");
        }
      },
    },
  ),
);

if (typeof window !== "undefined") {
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      const currentTheme = useThemeStore.getState().theme;
      if (currentTheme === "system") {
        applyThemeClass("system");
      }
    });
}
