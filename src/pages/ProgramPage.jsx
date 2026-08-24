import React, { useMemo } from "react";
import { useWorkout } from "../state/WorkoutContext";
import { getChapterInfo, chapterDateRange } from "../lib/achievements";
import {
  weekKey,
  weekKeyFromDay,
  todayDayIndex,
  weekdayLabel,
  weeklyVolumeSeries,
} from "../lib/training";
import { isRestEntry } from "../lib/format";

const CHAPTER_WEEKS = 12;

function fmtDate(day) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "long" });
}

/**
 * The account's rolling 12-week chapter (see lib/achievements) stands in
 * for "the block you're in" — there's no separate plan start/end date in
 * the data model, and this is the one real, already-computed concept that
 * plays the same role. Omitted entirely for a brand-new account with no
 * sessions yet, same as everywhere else a fact can't be derived.
 */
export default function ProgramPage({ onRearrange, onEditRoutines }) {
  const { plans, sessions, activePlanId, getPlanName, isDayDoneThisWeek, bodyweightKg } = useWorkout();

  const days = plans[activePlanId] || [];
  const todayIdx = todayDayIndex();
  const thisWeek = weekKey();

  const workingDays = days.filter((d) => (d.exercises || []).filter((ex) => !isRestEntry(ex)).length > 0);

  const chapter = useMemo(() => getChapterInfo(sessions), [sessions]);
  const range = useMemo(
    () => (chapter ? chapterDateRange(sessions, chapter.number) : null),
    [chapter, sessions]
  );

  const finishedWeeks = useMemo(
    () =>
      new Set(
        Object.values(sessions || {})
          .filter((s) => s.finishedAt && s.date)
          .map((s) => weekKeyFromDay(s.date))
      ),
    [sessions]
  );

  const rows = days.map((day, dayIdx) => {
    const exercises = (day.exercises || []).filter((ex) => !isRestEntry(ex));
    const isRest = (day.exercises || []).length > 0 && exercises.length === 0;
    const isOpen = (day.exercises || []).length === 0;
    const logged = isDayDoneThisWeek(activePlanId, dayIdx, thisWeek);
    return { day, dayIdx, isRest, isOpen, isToday: dayIdx === todayIdx, done: !!logged?.finished };
  });

  const thisWeekDone = rows.filter((r) => r.done).length;
  const thisWeekPlanned = rows.filter((r) => !r.isRest && !r.isOpen).length;
  const thisWeekFraction = thisWeekPlanned > 0 ? thisWeekDone / thisWeekPlanned : 0;

  const weekSegments = useMemo(() => {
    if (!range || !chapter) return [];
    const [y, m, d] = range.from.split("-").map(Number);
    const start = new Date(y, m - 1, d);
    return Array.from({ length: CHAPTER_WEEKS }, (_, i) => {
      const weekStart = new Date(start);
      weekStart.setDate(start.getDate() + i * 7);
      const wk = weekKey(weekStart);
      const isCurrent = i + 1 === chapter.weekInChapter;
      const isFuture = i + 1 > chapter.weekInChapter;
      return { isCurrent, isFuture, isDone: !isFuture && !isCurrent && finishedWeeks.has(wk) };
    });
  }, [range, chapter, finishedWeeks]);

  const aside = useMemo(() => {
    const series = weeklyVolumeSeries(sessions, bodyweightKg, 8);
    const withData = series.filter((s) => s.tonnage > 0);
    if (withData.length < 3) return null;
    const last = withData[withData.length - 1];
    const priorAvg =
      withData.slice(0, -1).reduce((sum, s) => sum + s.tonnage, 0) / (withData.length - 1);
    if (priorAvg <= 0) return null;
    const pct = Math.round(((last.tonnage - priorAvg) / priorAvg) * 100);
    if (Math.abs(pct) < 5) return "This week's volume is holding steady with your recent average.";
    return `This week's volume is running ${Math.abs(pct)}% ${pct > 0 ? "above" : "below"} your recent average.`;
  }, [sessions, bodyweightKg]);

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-in fade-in duration-300 pb-6">
      <div>
        {chapter && (
          <div className="text-accent text-xs font-medium uppercase tracking-[0.14em]">
            Week {chapter.weekInChapter} of {CHAPTER_WEEKS}
          </div>
        )}
        <h1 className={`${chapter ? "mt-2" : ""} text-4xl leading-[1.08]`}>{getPlanName(activePlanId)}</h1>
        <p className="mt-1.5 text-sm text-ink-muted leading-relaxed">
          {workingDays.length} day{workingDays.length === 1 ? "" : "s"} a week.
          {range ? ` Started ${fmtDate(range.from)}.` : ""}
        </p>
      </div>

      {chapter && (
        <div className="card-hero p-[18px] py-5">
          <div className="flex gap-1">
            {weekSegments.map((seg, i) => (
              <div
                key={i}
                className="flex-1"
                style={{
                  height: 8,
                  borderRadius: i === 0 ? "8px 0 0 8px" : i === weekSegments.length - 1 ? "0 8px 8px 0" : 0,
                  background: seg.isDone
                    ? "var(--color-positive-delta)"
                    : seg.isCurrent
                    ? `linear-gradient(90deg, var(--color-accent) ${Math.round(thisWeekFraction * 100)}%, var(--color-surface-wash) ${Math.round(thisWeekFraction * 100)}%)`
                    : "var(--color-surface-wash)",
                }}
              />
            ))}
          </div>
          <div className="mt-2.5 flex justify-between text-[10.5px] text-ink-faint">
            <span>Wk 1</span>
            <span>Wk {CHAPTER_WEEKS}</span>
          </div>
          {aside && (
            <p className="aside mt-3.5 pt-3.5 text-[13.5px] leading-relaxed border-t border-border">{aside}</p>
          )}
        </div>
      )}

      <div>
        <div className="stencil mb-2">This week</div>
        <div>
          {rows.map(({ day, dayIdx, isRest, isOpen, isToday, done }, i) => (
            <div
              key={dayIdx}
              className={`flex items-center gap-3 py-3 ${
                i === rows.length - 1 ? "" : "border-b border-dashed border-border-control"
              }`}
            >
              <span
                className="w-[34px] flex-shrink-0 text-[11px] font-medium uppercase"
                style={{ color: isToday ? "var(--color-accent)" : "var(--color-ink-faint)" }}
              >
                {weekdayLabel(dayIdx).slice(0, 3).toUpperCase()}
              </span>
              <span
                className="flex-1 text-[15px]"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: isToday ? 500 : 400,
                  fontStyle: isRest ? "italic" : "normal",
                  color: isToday ? "var(--color-ink)" : isRest || isOpen ? "var(--color-ink-faint)" : "var(--color-ink-mid)",
                }}
              >
                {isRest ? "Rest" : isOpen ? "Open" : day.name || weekdayLabel(dayIdx)}
              </span>
              {done ? (
                <span className="w-[18px] h-[18px] rounded-full bg-positive-bg flex-shrink-0" />
              ) : isToday ? (
                <span className="text-[11px] font-medium text-accent whitespace-nowrap">today</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2.5">
        <button type="button" onClick={onRearrange} className="btn-outline flex-1 py-3.5 text-[13.5px]">
          Rearrange the week
        </button>
        <button type="button" onClick={onEditRoutines} className="btn-outline flex-1 py-3.5 text-[13.5px]">
          Edit routines & exercises
        </button>
      </div>
    </div>
  );
}
