import React, { useEffect, useRef, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { playTimerAlarm, unlockAudio } from "../lib/audio";
import { formatClock } from "../lib/format";

/**
 * Rest countdown, pinned above the session footer. Starts itself whenever
 * `startedAt` changes — i.e. every time you log a set — so resting is never
 * something you have to remember to do.
 *
 * Counts to a wall-clock deadline, so locking the screen doesn't pause it.
 */
export default function RestTimer({ startedAt, seconds, onDismiss, onAdjust }) {
  const [remaining, setRemaining] = useState(seconds);
  const alarmedRef = useRef(false);

  useEffect(() => {
    if (!startedAt) return undefined;
    alarmedRef.current = false;
    unlockAudio();

    const deadline = startedAt + seconds * 1000;
    const tick = () => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0 && !alarmedRef.current) {
        alarmedRef.current = true;
        playTimerAlarm();
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [startedAt, seconds]);

  if (!startedAt) return null;

  const isDone = remaining === 0;
  const pct = seconds > 0 ? ((seconds - remaining) / seconds) * 100 : 100;

  return (
    <div
      className={`rounded border p-3 transition-colors ${
        isDone ? "bg-plate-green/10 border-plate-green/50" : "bg-iron-950 border-iron-700"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`font-mono text-2xl font-bold tabular-nums ${
            isDone ? "text-plate-green" : "text-white"
          }`}
        >
          {formatClock(remaining)}
        </span>
        <span
          className={`text-sm font-medium flex-1 ${
            isDone ? "text-plate-green" : "text-chalk-600"
          }`}
        >
          {isDone ? "Rest done — go" : "Resting"}
        </span>

        <button
          type="button"
          onClick={() => onAdjust(-30)}
          aria-label="30 seconds less rest"
          className={`p-1.5 rounded ${
            isDone ? "hover:bg-plate-green/20 text-plate-green" : "hover:bg-iron-700 text-chalk-600"
          }`}
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onAdjust(30)}
          aria-label="30 seconds more rest"
          className={`p-1.5 rounded ${
            isDone ? "hover:bg-plate-green/20 text-plate-green" : "hover:bg-iron-700 text-chalk-600"
          }`}
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Skip rest"
          className={`p-1.5 rounded ${
            isDone ? "hover:bg-plate-green/20 text-plate-green" : "hover:bg-iron-700 text-chalk-600"
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!isDone && (
        <div className="mt-2 h-1 bg-iron-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-plate-yellow transition-all duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
