import React, { useMemo } from "react";
import { useWorkout } from "../state/WorkoutContext";
import {
  RANKS,
  getStanding,
  getChapterInfo,
  buildLedger,
  bodyweightAt,
  nextBodyweightMultipleGoal,
} from "../lib/achievements";

function monthYear(day) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export default function MilestonePage({ milestone, onKeep, onViewSummary }) {
  const { sessions, settings, bodyweightLog, bodyweightKg } = useWorkout();
  const { liftName, rankIndex, date } = milestone;
  const sex = settings.sex;

  const standing = useMemo(
    () => getStanding(liftName, sessions, bodyweightKg, sex),
    [liftName, sessions, bodyweightKg, sex]
  );
  const chapter = useMemo(() => getChapterInfo(sessions), [sessions]);
  const ledger = useMemo(
    () => buildLedger(sessions, bodyweightLog, bodyweightKg, sex),
    [sessions, bodyweightLog, bodyweightKg, sex]
  );

  if (!standing) return null;

  const nowBodyweight = bodyweightAt(date, bodyweightLog, bodyweightKg);
  const previousCrossing = ledger.find(
    (e) => e.kind === "rank" && e.liftName === liftName && e.rankIndex === rankIndex - 1
  );
  const wasLabel = rankIndex > 0 ? RANKS[rankIndex - 1] : "Getting started";
  const wasDate = previousCrossing?.date || null;
  const wasBodyweight = wasDate ? bodyweightAt(wasDate, bodyweightLog, bodyweightKg) : null;

  const bwGoal = nextBodyweightMultipleGoal(liftName, standing.ratio, nowBodyweight);

  const nextItems = [
    standing.nextRank && { label: `${liftName} ${standing.nextRank}`, value: `${standing.kgToNext} kg away` },
    chapter && chapter.weeksLeft > 0 && {
      label: `Chapter ${chapter.number} closes`,
      value: `${chapter.weeksLeft} week${chapter.weeksLeft === 1 ? "" : "s"}`,
    },
    bwGoal && { label: `${liftName} × ${bwGoal.multiple} bodyweight`, value: `${bwGoal.kgAway} kg away` },
  ].filter(Boolean);

  return (
    <div
      className="surface-inverse fixed inset-0 z-40 overflow-y-auto animate-in fade-in"
      style={{ animationDuration: "260ms", "--enter-y": "6px" }}
    >
      <div className="max-w-lg mx-auto px-6 pt-16 pb-10">
        <div className="text-xs font-medium uppercase tracking-[0.16em]" style={{ color: "var(--inv-eyebrow)" }}>
          Written into the book
        </div>
        <div
          className="mt-5 text-5xl leading-[1.05]"
          style={{ fontFamily: "var(--font-heading)", color: "var(--inv-title)" }}
        >
          {liftName},<br />
          {RANKS[rankIndex]}.
        </div>
        <p className="mt-5 text-base leading-relaxed aside" style={{ color: "var(--inv-aside)" }}>
          {Math.round(standing.e1rmKg)} kg estimated, at {Math.round(nowBodyweight)} kg bodyweight — progress
          that's yours to keep.
        </p>

        <div
          className="mt-8 flex justify-between py-5"
          style={{ borderTop: "1px solid var(--inv-btn-secondary-border)", borderBottom: "1px solid var(--inv-btn-secondary-border)" }}
        >
          <div>
            <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--inv-tile-label)" }}>
              Was
            </div>
            <div className="mt-2 text-xl" style={{ fontFamily: "var(--font-heading)", color: "var(--inv-aside)" }}>
              {wasLabel}
            </div>
            {wasDate && (
              <div className="mt-1 text-xs" style={{ color: "var(--inv-tile-label)" }}>
                {monthYear(wasDate)} · {Math.round(wasBodyweight)} kg
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--inv-tile-label)" }}>
              Now
            </div>
            <div className="mt-2 text-xl" style={{ fontFamily: "var(--font-heading)", color: "var(--inv-title)" }}>
              {RANKS[rankIndex]}
            </div>
            <div className="mt-1 text-xs" style={{ color: "var(--inv-eyebrow)" }}>
              {monthYear(date)} · {Math.round(nowBodyweight)} kg
            </div>
          </div>
        </div>

        {nextItems.length > 0 && (
          <div className="mt-7">
            <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--inv-tile-label)" }}>
              Next in the book
            </div>
            <div className="mt-3 space-y-2.5">
              {nextItems.map((item) => (
                <div key={item.label} className="flex items-baseline justify-between gap-3">
                  <span className="text-sm" style={{ color: "var(--inv-aside)" }}>
                    {item.label}
                  </span>
                  <span className="text-sm font-medium" style={{ color: "var(--inv-title)" }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-9 space-y-2.5">
          <button
            type="button"
            onClick={onKeep}
            className="w-full py-4 rounded-card font-medium text-sm"
            style={{ background: "var(--inv-btn-primary-bg)", color: "var(--inv-btn-primary-label)" }}
          >
            Keep it — back to Workout
          </button>
          <button
            type="button"
            onClick={onViewSummary}
            className="w-full py-3.5 rounded-card font-medium text-sm"
            style={{ border: "1px solid var(--inv-btn-secondary-border)", color: "var(--inv-btn-secondary-label)", background: "transparent" }}
          >
            See this session's summary
          </button>
        </div>
      </div>
    </div>
  );
}
