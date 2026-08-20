import React, { useMemo, useState } from "react";
import { ChevronRight, Play } from "lucide-react";
import { useWorkout } from "../state/WorkoutContext";
import WeekStrip from "../components/WeekStrip";
import StreakBadge from "../components/StreakBadge";
import WeeklyTargetsRow from "../components/WeeklyTargetsRow";
import ExerciseLabel from "../components/ExerciseLabel";
import { isRestEntry, cleanName, setCountFor, setDataFor } from "../lib/format";
import { suggestNextLoad, loadIncrement } from "../lib/training";
import {
  weekKey,
  weekDates,
  weekStrip,
  weekSummary,
  computeStreak,
  todayDayIndex,
  weekdayLabel,
} from "../lib/training";

const NUMBER_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];

/** Rough estimate, not a logged number — just enough to size up the day. */
function estimateWorkout(day, exerciseBank, bodyweightKg) {
  let sets = 0;
  let tonnageKg = 0;
  let seconds = 0;
  (day?.exercises || []).forEach((raw) => {
    if (isRestEntry(raw)) return;
    const bankData = exerciseBank[cleanName(raw)];
    if (bankData?.isHidden) return;
    const count = setCountFor(bankData);
    sets += count;
    for (let i = 0; i < count; i++) {
      const d = setDataFor(bankData, i);
      const weight =
        d.weightUnit === "Body Wt." ? bodyweightKg : parseFloat(d.weight) || 0;
      const reps = parseInt(d.reps, 10) || 0;
      tonnageKg += weight * reps;
    }
    seconds += count * ((parseInt(bankData?.restSeconds, 10) || 90) + 40);
  });
  return { sets, tonnageKg: Math.round(tonnageKg), minutes: Math.round(seconds / 60) };
}

export default function TodayPage({ onStartDay, onOpenDetail, onManagePlan }) {
  const {
    plans,
    sessions,
    exerciseBank,
    bodyweightKg,
    primaryPlanId,
    isDayDoneThisWeek,
    getWeekSession,
    isExerciseLogged,
    getLastPerformance,
  } = useWorkout();

  const thisWeek = weekKey();
  const todayIndex = todayDayIndex();
  const dates = useMemo(() => weekDates(), []);

  // null = "following today"; once you tap another day you're browsing it
  // until you jump back.
  const [browsingIdx, setBrowsingIdx] = useState(null);
  const viewedIdx = browsingIdx ?? todayIndex;
  const isViewingToday = viewedIdx === todayIndex;

  const day = plans[primaryPlanId]?.[viewedIdx];
  const exercises = (day?.exercises || []).filter((ex) => !isRestEntry(ex));
  const isRestDay = (day?.exercises || []).length > 0 && exercises.length === 0;

  const strip = useMemo(
    () => weekStrip(plans, sessions, primaryPlanId),
    [plans, sessions, primaryPlanId]
  );
  const streak = useMemo(() => computeStreak(sessions), [sessions]);
  const week = useMemo(
    () => weekSummary(sessions, thisWeek, bodyweightKg),
    [sessions, thisWeek, bodyweightKg]
  );

  const logged = isDayDoneThisWeek(primaryPlanId, viewedIdx, thisWeek);
  const weekSession = getWeekSession(primaryPlanId, viewedIdx, thisWeek);
  const estimate = estimateWorkout(day, exerciseBank, bodyweightKg);
  const dateLine = new Date(dates[viewedIdx]).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const remaining = exercises.filter(
    (ex) => !isExerciseLogged(weekSession, cleanName(ex))
  ).length;

  // One computed aside, real data only — never fabricated coaching copy.
  const aside = useMemo(() => {
    for (const ex of exercises) {
      const name = cleanName(ex);
      const bankData = exerciseBank[name];
      if (!bankData || bankData.isHidden) continue;
      const last = getLastPerformance(name);
      if (!last) continue;
      const unit = last.sets[0]?.weightUnit || "KG";
      const suggestion = suggestNextLoad(bankData, last.sets, unit);
      if (suggestion?.action === "increase") {
        return `You cleared every rep last time — ${name} goes up ${loadIncrement(unit)}${unit} today.`;
      }
    }
    return null;
  }, [exercises, exerciseBank, getLastPerformance]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-6">
      <div>
        <div className="flex items-baseline justify-between">
          <div className="text-accent text-sm">{dateLine}</div>
          {!isViewingToday && (
            <button
              type="button"
              onClick={() => setBrowsingIdx(null)}
              className="text-xs font-medium text-ink-muted hover:text-accent"
            >
              Back to today
            </button>
          )}
        </div>
        <h1 className="mt-2 text-4xl leading-[1.05]">
          {isRestDay
            ? "Rest day. You earned it."
            : remaining === 0
            ? "Every lift logged. Nice work."
            : isViewingToday
            ? `${NUMBER_WORDS[remaining] || remaining} ${
                remaining === 1 ? "lift" : "lifts"
              } to go and the week's yours.`
            : `${NUMBER_WORDS[remaining] || remaining} ${
                remaining === 1 ? "lift" : "lifts"
              } planned.`}
        </h1>
      </div>

      <div className="flex items-center justify-between">
        <StreakBadge streak={streak} />
      </div>

      <div className="card p-5">
        <WeekStrip days={strip} selectedIndex={viewedIdx} onSelect={setBrowsingIdx} />
      </div>

      {isRestDay ? (
        <>
          <div className="card-hero p-5">
            <p className="aside text-base leading-relaxed">
              {week.sets > 0
                ? `${week.sets} sets logged this week already. Rest, eat well, sleep — the next session wants you fresh.`
                : "A clean slate for the week. Rest up before the first session."}
            </p>
            <div className="mt-4 pt-4 border-t border-border flex justify-between">
              <div>
                <div className="stencil mb-1.5">This week</div>
                <div className="readout text-xl">{week.sets} sets</div>
              </div>
              <div>
                <div className="stencil mb-1.5">Volume</div>
                <div className="readout text-xl">
                  {(week.tonnageKg / 1000).toFixed(1)}
                  <span className="text-sm font-body text-ink-muted"> t</span>
                </div>
              </div>
              <div>
                <div className="stencil mb-1.5">Streak</div>
                <div className="readout text-xl">{streak} wk</div>
              </div>
            </div>
          </div>
          <WeeklyTargetsRow />
          {isViewingToday && (
            <button
              type="button"
              onClick={onManagePlan}
              className="btn-outline w-full py-3.5 text-sm"
            >
              Train anyway — pick a routine
            </button>
          )}
        </>
      ) : (
        <>
          <div className="card-hero p-6 sm:p-7 space-y-5">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl" style={{ fontFamily: "var(--font-heading)" }}>
                {day.name || "Workout"}
              </div>
              <div className="text-xs text-ink-muted">
                {estimate.sets} set{estimate.sets === 1 ? "" : "s"} · ~{estimate.minutes} min
              </div>
            </div>

            <div className="space-y-2">
              {exercises.map((ex, i) => {
                const name = cleanName(ex);
                const isDone = isExerciseLogged(weekSession, name);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span
                      className={`w-5 h-5 rounded-full flex-shrink-0 ${
                        isDone ? "bg-ink" : "border-[1.5px] border-border-page"
                      }`}
                    />
                    <div className="flex-1">
                      <ExerciseLabel name={ex} onOpenDetail={onOpenDetail} />
                    </div>
                  </div>
                );
              })}
            </div>

            {aside && isViewingToday && <p className="aside text-sm leading-relaxed">{aside}</p>}

            <button type="button" onClick={() => onStartDay(viewedIdx)} className="btn-ink w-full py-4">
              <Play className="w-4 h-4" />
              {logged
                ? `Continue · ${logged.done}/${logged.total} done`
                : isViewingToday
                ? "Begin session"
                : `Begin ${weekdayLabel(viewedIdx)}'s session`}
            </button>
          </div>

          <WeeklyTargetsRow />
        </>
      )}

      <button
        type="button"
        onClick={onManagePlan}
        className="btn-outline w-full py-3 text-sm"
      >
        Plan the week
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
