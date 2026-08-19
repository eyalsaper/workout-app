import { useEffect, useRef, useState } from "react";

/**
 * Keeps the screen awake while a workout is in progress.
 *
 * Supported in Chrome/Android and Safari 16.4+. Where it isn't, this quietly
 * does nothing and reports `supported: false` so the UI can say so rather than
 * pretending. The lock is also re-acquired when you come back to the tab,
 * because the browser drops it whenever the page is hidden.
 */
export function useWakeLock(active) {
  const sentinelRef = useRef(null);
  const [isHeld, setIsHeld] = useState(false);
  const supported =
    typeof navigator !== "undefined" && "wakeLock" in navigator;

  useEffect(() => {
    if (!supported || !active) return undefined;

    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
        setIsHeld(true);
        sentinel.addEventListener("release", () => setIsHeld(false));
      } catch {
        setIsHeld(false); // usually a low-battery refusal
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !sentinelRef.current) acquire();
    };

    acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (sentinelRef.current) {
        sentinelRef.current.release().catch(() => {});
        sentinelRef.current = null;
      }
      setIsHeld(false);
    };
  }, [supported, active]);

  return { supported, isHeld };
}
