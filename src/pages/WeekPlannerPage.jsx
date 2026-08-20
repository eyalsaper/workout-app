import React, { useMemo } from "react";
import { Play } from "lucide-react";
import { useWorkout } from "../state/WorkoutContext";
import { isRestEntry, cleanName } from "../lib/format";
import { weekKey, weekDates, todayDayIndex, weekdayLabel } from "../lib/training";

function formatRange(dates) {
  const first = new Date(dates[0]);
  const last = new Date(dates[6]);
  const opts = { month: "short", day: "numeric" };
  const firstStr = first.toLocaleDateString(undefined, opts);
  const lastStr = last.toLocaleDateString(undefined, { day: "numeric" });
  return `${firstStr}–${lastStr}`;
}

export default function WeekPlannerPage({ onStartDay, onEditDay, onBack }) {
  const { plans, primaryPlanId, isDayDoneThisWeek, getDayTotalSets } = useWorkout();

  const thisWeek = weekKey();
  const dates = useMemo(() => weekDates(), []);
  const todayIdx = todayDayIndex();
  const days = plans[primaryPlanId] || [];
  const weekNumber = thisWeek.split("-W")[1];

  const rows = days.map((day, dayIdx) => {
    const exercises = (day.exercises || []).filter((ex) => !isRestEntry(ex));
    const isRest = (day.exercises || []).length > 0 && exercises.length === 0;
    const isOpen = (day.exercises || []).length === 0;
    const logged = isDayDoneThisWeek(primaryPlanId, dayIdx, thisWeek);
    const isToday = dayIdx === todayIdx;
    const totalSets = getDayTotalSets(primaryPlanId, dayIdx);
    return { day, dayIdx, exercises, isRest, isOpen, logged, isToday, totalSets };
  });

  const plannedCount = rows.filter((r) => !r.isRest && !r.isOpen).length;
  const doneCount = rows.filter((r) => r.logged?.finished).length;

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-in fade-in duration-300 pb-6">
      <div>
        <button type="button" onClick={onBack} className="text-sm text-ink-muted hover:text-accent">
          Today
        </button>
        <h1 className="mt-2.5 text-4xl">Week {weekNumber}</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          {formatRange(dates)} · {plannedCount} session{plannedCount === 1 ? "" : "s"} planned ·{" "}
          {doneCount} done
        </p>
      </div>

      <div className="space-y-2.5">
        {rows.map(({ day, dayIdx, exercises, isRest, isOpen, logged, isToday, totalSets }) => {
          const label = weekdayLabel(dayIdx);
          const cardClass = isToday
            ? "card-hero border-[1.5px] border-accent"
            : isRest || isOpen
            ? "slot-empty"
            : "card";

          return (
            <div
              key={dayIdx}
              onClick={() => onEditDay(dayIdx)}
              className={`${cardClass} p-4 cursor-pointer`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className="text-lg"
                  style={{ fontFamily: "var(--font-heading)", color: isRest || isOpen ? "var(--color-ink-muted)" : "var(--color-ink)" }}
                >
                  {label}
                  {!isRest && !isOpen && day.name ? ` · ${day.name}` : ""}
                </span>
                <span
                  className={`text-xs font-medium flex-shrink-0 ${
                    logged?.finished
                      ? "text-positive-ink"
                      : isToday
                      ? "text-accent"
                      : "text-ink-faint"
                  }`}
                >
                  {logged?.finished
                    ? "done ✓"
                    : isToday
                    ? "today"
                    : isRest
                    ? day.note || "rest"
                    : isOpen
                    ? "open"
                    : "planned"}
                </span>
              </div>

              {!isRest && !isOpen && (
                <p className="mt-1.5 text-sm text-ink-muted">
                  {exercises.map((ex) => cleanName(ex)).join(", ")} · {totalSets} set
                  {totalSets === 1 ? "" : "s"}
                </p>
              )}
              {isOpen && <p className="mt-1.5 text-sm text-ink-faint">Tap to plan something</p>}

              {isToday && !isRest && !isOpen && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartDay(dayIdx);
                  }}
                  className="btn-clay w-full py-3 mt-3"
                >
                  <Play className="w-4 h-4" />
                  {logged ? `Continue · ${logged.done}/${logged.total} done` : "Begin session"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
