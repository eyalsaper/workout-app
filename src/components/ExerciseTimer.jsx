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
      className="flex items-center gap-3 mt-2 bg-iron-800 p-2 rounded-sm w-fit border border-iron-700"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="font-mono text-lg font-bold text-chalk-200 w-16 text-center">
        {formatClock(timeLeft)}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isRunning) stopHere();
          else start();
        }}
        className={`px-3 py-1 text-sm font-medium rounded text-white ${
          isRunning
            ? "bg-flag-orange/100 hover:bg-flag-orange/85"
            : "bg-plate-yellow hover:bg-plate-yellow-hot"
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
        className="px-2 py-1 text-sm text-chalk-500 hover:text-chalk-50 font-medium"
      >
        Reset
      </button>
    </div>
  );
}
