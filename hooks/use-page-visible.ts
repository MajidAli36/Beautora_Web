"use client";

import { useEffect, useState } from "react";

/** True when the document tab is visible (Document Visibility API). */
export function usePageVisible() {
  const [visible, setVisible] = useState(() =>
    typeof document === "undefined" ? true : document.visibilityState === "visible"
  );

  useEffect(() => {
    function onChange() {
      setVisible(document.visibilityState === "visible");
    }
    document.addEventListener("visibilitychange", onChange);
    window.addEventListener("focus", onChange);
    window.addEventListener("blur", onChange);
    return () => {
      document.removeEventListener("visibilitychange", onChange);
      window.removeEventListener("focus", onChange);
      window.removeEventListener("blur", onChange);
    };
  }, []);

  return visible;
}

/** Run `tick` on an interval only while the page is visible. */
export function useVisibleInterval(tick: () => void, ms: number, enabled = true) {
  const visible = usePageVisible();

  useEffect(() => {
    if (!enabled || !visible || ms <= 0) return;
    const run = () => tick();
    run();
    const id = window.setInterval(run, ms);
    return () => window.clearInterval(id);
  }, [visible, ms, enabled, tick]);
}
