"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";

type ProgressContextValue = {
  completed: string[];
  isCompleted: (slug: string) => boolean;
  toggleCompleted: (slug: string) => void;
  clearProgress: () => void;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);
const STORAGE_KEY = "kotlin-android-learning-progress-v1";
const CHANGE_EVENT = "kotlin-learning-progress-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) ?? "[]";
}

function getServerSnapshot() {
  return "[]";
}

function saveProgress(value: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const completed = useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(snapshot);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  }, [snapshot]);

  const value = useMemo<ProgressContextValue>(
    () => ({
      completed,
      isCompleted: (slug) => completed.includes(slug),
      toggleCompleted: (slug) => saveProgress(
        completed.includes(slug)
          ? completed.filter((item) => item !== slug)
          : [...completed, slug],
      ),
      clearProgress: () => saveProgress([]),
    }),
    [completed],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const value = useContext(ProgressContext);
  if (!value) throw new Error("useProgress must be used inside ProgressProvider");
  return value;
}
