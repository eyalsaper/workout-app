import React, { useMemo, useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import { exerciseHistory, weeklyVolumeSeries, weekKeyFromDay } from "../lib/training";
import { buildLedger } from "../lib/achievements";
import AchievementsPage from "./AchievementsPage";
import BodyPage from "./BodyPage";

const RANGES = [
  { key: "12w", label: "12 weeks", weeks: 12 },
  { key: "6m", label: "6 months", weeks: 26 },
  { key: "all", label: "All time", weeks: 52 },
];

function shortDate(day) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function ProgressPage({ onOpenLift, onOpenLadder }) {
  const { sessions, exerciseBank, bodyweightKg, bodyweightLog, settings } = useWorkout();
  const [range, setRange] = useState("12w");
  const [tab, setTab] = useState("charts");

  const lately = useMemo(
    () => buildLedger(sessions, bodyweightLog, bodyweightKg, settings.sex).slice(0, 3),
    [sessions, bodyweightLog, bodyweightKg, settings.sex]
  );

  const weeksLogged = useMemo(() => {
    const weeks = new Set(
      Object.values(sessions)
        .filter((s) => s.finishedAt && s.date)
        .map((s) => weekKeyFromDay(s.date))
    );
    return weeks.size;
  }, [sessions]);

  const rangeWeeks = RANGES.find((r) => r.key === range).weeks;
  const series = useMemo(
    () => weeklyVolumeSeries(sessions, bodyweightKg, rangeWeeks),
    [sessions, bodyweightKg, rangeWeeks]
  );
  const maxTonnage = Math.max(1, ...series.map((s) => s.tonnage));

  const insight = useMemo(() => {
    const withData = series.filter((s) => s.tonnage > 0);
    if (withData.length < 2) return null;
    const last = withData[withData.length - 1];
    const prev = withData[withData.length - 2];
    if (prev.tonnage === 0) return null;
    const pct = Math.round(((last.tonnage - prev.tonnage) / prev.tonnage) * 100);
    if (pct === 0) return "This week matches last week's volume.";
    return `This week's volume is ${Math.abs(pct)}% ${pct > 0 ? "higher" : "lower"} than last week.`;
  }, [series]);

  const mainLifts = useMemo(() => {
    const withHistory = Object.keys(exerciseBank)
      .filter((name) => !exerciseBank[name].isHidden)
      .map((name) => ({ name, history: exerciseHistory(sessions, name, bodyweightKg) }))
      .filter((x) => x.history.length > 0)
      .sort((a, b) => b.history.length - a.history.length)
      .slice(0, 4);

    return withHistory.map(({ name, history }) => {
      const latest = history[history.length - 1];
      const prior = history[history.length - 2];
      const delta = prior ? Math.round((latest.e1rm - prior.e1rm) * 10) / 10 : null;
      return { name, latest, delta };
    });
  }, [exerciseBank, sessions, bodyweightKg]);

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-in fade-in duration-300 pb-6">
      <div>
        <h1 className="text-4xl leading-[1.1]">
          {weeksLogged > 0
            ? `${weeksLogged} week${weeksLogged === 1 ? "" : "s"} of steady work.`
            : "Log a session to see progress."}
        </h1>
        <div className="mt-3 flex gap-1.5">
          <button type="button" onClick={() => setTab("charts")} className="chip" data-active={tab === "charts"}>
            Charts
          </button>
          <button type="button" onClick={() => setTab("record")} className="chip" data-active={tab === "record"}>
            Record book
          </button>
          <button type="button" onClick={() => setTab("body")} className="chip" data-active={tab === "body"}>
            Body
          </button>
        </div>
      </div>

      {tab === "record" ? (
        <AchievementsPage onOpenLadder={onOpenLadder} />
      ) : tab === "body" ? (
        <BodyPage />
      ) : (
        <>
          <div className="flex gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className="chip"
                data-active={range === r.key}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="card p-4">
            <div className="flex items-baseline justify-between">
              <span className="stencil">Weekly volume</span>
              <span className="text-xs text-ink-muted">kg lifted</span>
            </div>
            <div className="mt-3.5 h-24 flex items-end gap-1">
              {series.map((s, i) => {
                const third = Math.floor((series.length * 2) / 3);
                const colorClass =
                  i >= third ? "bg-accent" : i >= series.length / 3 ? "bg-positive-bg" : "bg-border-page";
                return (
                  <div
                    key={s.week}
                    className={`flex-1 rounded-t ${colorClass}`}
                    style={{ height: `${Math.max(4, (s.tonnage / maxTonnage) * 100)}%` }}
                    title={`${s.week}: ${s.tonnage}kg`}
                  />
                );
              })}
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-ink-faint">
              <span>W{series[0]?.week.split("-W")[1]}</span>
              <span>W{series[Math.floor(series.length / 2)]?.week.split("-W")[1]}</span>
              <span>this week</span>
            </div>
            {insight && (
              <p className="aside text-sm mt-3.5 pt-3.5 border-t border-border">{insight}</p>
            )}
          </div>

          <div>
            <div className="stencil mb-2.5">Main lifts · estimated 1RM</div>
            <div className="space-y-2">
              {mainLifts.length === 0 && (
                <p className="text-sm text-ink-muted italic">Nothing logged yet.</p>
              )}
              {mainLifts.map(({ name, latest, delta }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onOpenLift(name)}
                  className="w-full card p-4 flex items-center gap-3 text-left"
                >
                  <div className="flex-1">
                    <div className="text-lg" style={{ fontFamily: "var(--font-heading)" }}>
                      {name}
                    </div>
                    <div className="text-xs text-ink-muted mt-0.5">
                      {latest.topSet
                        ? `${latest.topSet.weight}${latest.topSet.weightUnit} × ${latest.topSet.reps} · ${shortDate(latest.date)}`
                        : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="readout text-lg">
                      {Math.round(latest.e1rm)}
                      <span className="text-xs font-body text-ink-muted"> kg</span>
                    </div>
                    {delta != null && (
                      <div className={`text-xs mt-0.5 ${delta === 0 ? "text-ink-faint" : "text-positive-delta"}`}>
                        {delta === 0 ? "flat" : `${delta > 0 ? "+" : ""}${delta}`}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {lately.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between">
                <span className="stencil">Lately</span>
                <button type="button" onClick={() => setTab("record")} className="text-xs font-medium text-accent">
                  Record book ›
                </button>
              </div>
              <div className="mt-1">
                {lately.map((entry, i) => (
                  <div
                    key={`${entry.date}-${i}`}
                    className={`flex items-baseline gap-3 py-2.5 ${
                      i === lately.length - 1 ? "" : "border-b border-dashed border-border-control"
                    }`}
                  >
                    <span className="w-14 flex-shrink-0 text-xs text-ink-faint">{shortDate(entry.date)}</span>
                    <span className="flex-1 text-sm text-ink-soft leading-[1.35]">{entry.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
