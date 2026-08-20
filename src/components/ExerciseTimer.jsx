import React, { useEffect, useRef, useState } from "react";
import { playTimerAlarm, unlockAudio } from "../lib/audio";
import { formatClock } from "../lib/format";

/**
 * Countdown for timed sets (planks, holds).
 *
 * Counts against a wall-clock deadline rather than decrementing once per
 * setInterval tick, because browsers throttle timers in background tabs —
 * the old version silently paused the moment the phone screen locked.
 */
export default function ExerciseTimer({ totalSeconds }) {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const deadlineRef = useRef(null);

  // If the planned duration changes in the bank, pick up the new value.
  useEffect(() => {
    setTimeLeft(totalSeconds);
    setIsRunning(false);
    deadlineRef.current = null;
  }, [totalSeconds]);

  useEffect(() => {
    if (!isRunning) return undefined;

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.round((deadlineRef.current - Date.now()) / 1000)
      );
      setTimeLeft(remaining);
      if (remaining === 0) {
        setIsRunning(false);
        deadlineRef.current = null;
        playTimerAlarm();
      }
    };

    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [isRunning]);

  if (totalSeconds <= 0) return null;

  const start = () => {
    unlockAudio(); // must happen inside the tap, or iOS stays silent
    deadlineRef.current = Date.now() + timeLeft * 1000;
    setIsRunning(true);
  };

  const stopHere = () => {
    setIsRunning(false);
    deadlineRef.current = null;
  };

  const reset = () => {
    setIsRunning(false);
    deadlineRef.current = null;
    setTimeLeft(totalSeconds);
  };

  return (
    <div
      className="flex items-center gap-3 mt-2 bg-surface-wash p-2 rounded-card w-fit"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="readout text-lg w-16 text-center">
        {formatClock(timeLeft)}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isRunning) stopHere();
          else start();
        }}
        className={`px-3 py-1 text-sm font-medium rounded-card text-accent-ink ${
          isRunning ? "bg-ink hover:bg-ink-hot" : "bg-accent hover:bg-accent-hot"
        }`}
      >
        {isRunning ? "Pause" : "Start"}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          reset();
        }}
        className="px-2 py-1 text-sm text-ink-muted hover:text-ink font-medium"
      >
        Reset
      </button>
    </div>
  );
}
