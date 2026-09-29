import { useRef, useCallback } from "react";
import toast from "react-hot-toast";

export function useTapUnlock({
  targetTaps = 7,
  onUnlock,
  enabled = true,
  timeoutMs = 1000,
} = {}) {
  const tapCount = useRef(0);
  const tapTimer = useRef(null);

  return useCallback(() => {
    if (!enabled || !onUnlock) return;

    tapCount.current++;
    clearTimeout(tapTimer.current);

    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, timeoutMs);

    const current = tapCount.current;
    const remaining = targetTaps - current;

    if (current >= 3 && current < targetTaps) {
      toast(`Còn ${remaining} lần nữa...`, {
        icon: "🔓",
        duration: 1000,
        style: { fontSize: "12.5px" },
      });
    }

    if (current >= targetTaps) {
      tapCount.current = 0;
      clearTimeout(tapTimer.current);
      onUnlock();
    }
  }, [enabled, onUnlock, targetTaps, timeoutMs]);
}

export default useTapUnlock;