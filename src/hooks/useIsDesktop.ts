import { useSyncExternalStore } from "react";

const query = "(min-width: 1024px)";

const media = () =>
  typeof window.matchMedia === "function" ? window.matchMedia(query) : null;

const subscribe = (onChange: () => void) => {
  const mql = media();
  mql?.addEventListener("change", onChange);
  return () => mql?.removeEventListener("change", onChange);
};

export const useIsDesktop = () =>
  useSyncExternalStore(
    subscribe,
    () => media()?.matches ?? false,
    () => false,
  );
