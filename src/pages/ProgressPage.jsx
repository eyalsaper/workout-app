import React, { useMemo, useState } from "react";
import { Calendar, TrendingUp, Trash2, BarChart3 } from "lucide-react";
import { useWorkout } from "../state/WorkoutContext";
import LineChart from "../components/LineChart";
import {
  MUSCLE_GROUPS,
  exerciseHistory,
  friendlyDate,
  setsByMuscle,
  toKg,
  volumeByMuscle,
  weekKey,
  weekKeyFromDay,
} from "../lib/training";

const TABS = [
  { id: "history", label: "History", icon: Calendar },
  { id: "strength", label: "Strength", icon: TrendingUp },
  { id: "volume", label: "Volume", icon: BarChart3 },
];

function HistoryTab({ sessions, deleteSession, bodyweightKg }) {
  const ordered = useMemo(
    () =>
      Object.entries(sessions)
        .filter(([, s]) => s?.date)
        .sort((a, b) => (b[1].date || "").localeCompare(a[1].date || ""))
        .slice(0, 40),
    [sessions]
  );

  if (ordered.length === 0) {
    return (
      <p className="text-chalk-500 text-sm bg-iron-900 border border-iron-700 rounded p-6 text-center">
        No sessions logged yet. Start a day from the planner and your history
        builds itself.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {ordered.map(([id, session]) => {
        const entries = Object.entries(session.entries || {});
        const done = entries.flatMap(([, e]) => (e.sets || []).filter((s) => s.done));
        const tonnage = done.reduce(
          (sum, s) => sum + toKg(s.weight, s.weightUnit, bodyweightKg) * (Number(s.reps) || 0),
          0
        );

        return (
          <div
            key={id}
            className="border border-iron-700 rounded p-4 bg-iron-850"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="font-bold text-chalk-50">
                  {friendlyDate(session.date)}
                  {!session.finishedAt && (
                    <span className="ml-2 text-xs font-semibold text-flag-orange bg-flag-orange/10 border border-flag-orange/40 rounded px-1.5 py-0.5">
                      in progress
                    </span>
                  )}
                </div>
                <div className="text-xs text-chalk-500">
                  Plan {session.planId} · Day {Number(session.dayIndex) + 1} ·{" "}
                  {done.length} sets
                  {tonnage > 0 && ` · ${Math.round(tonnage).toLocaleString()} kg total`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => deleteSession(id)}
                aria-label="Delete this session"
                className="p-1.5 text-chalk-600 hover:text-plate-red"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 text-sm">
              {entries.map(([name, entry]) => {
                const doneSets = (entry.sets || []).filter((s) => s.done);
                if (doneSets.length === 0) return null;
                return (
                  <div key={name} className="flex gap-2">
                    <span className="font-medium text-chalk-200 min-w-[100px]">
                      {name}
                    </span>
                    <span className="text-chalk-500">
                      {doneSets
                        .map((s) => `${s.weight || "BW"}${s.weight ? s.weightUnit : ""}×${s.reps}`)
                        .join(", ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StrengthTab({ sessions, exerciseBank, bodyweightKg }) {
  const trained = useMemo(() => {
    const names = new Set();
    Object.values(sessions).forEach((s) =>
      Object.entries(s.entries || {}).forEach(([name, entry]) => {
        if ((entry.sets || []).some((x) => x.done)) names.add(name);
      })
    );
    return [...names].sort();
  }, [sessions]);

  const [selected, setSelected] = useState(null);
  const active = selected && trained.includes(selected) ? selected : trained[0];

  const history = useMemo(
    () => (active ? exerciseHistory(sessions, active, bodyweightKg) : []),
    [sessions, active, bodyweightKg]
  );

  if (trained.length === 0) {
    return (
      <p className="text-chalk-500 text-sm bg-iron-900 border border-iron-700 rounded p-6 text-center">
        Log a few sessions and your strength curve shows up here.
      </p>
    );
  }

  const points = history.map((h) => ({
    value: Math.round(h.e1rm * 10) / 10,
    label: friendlyDate(h.date),
  }));
  const first = points[0]?.value;
  const latest = points[points.length - 1]?.value;
  const delta = first && latest ? latest - first : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {trained.map((name) => (
          <button
            type="button"
            key={name}
            onClick={() => setSelected(name)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              active === name
                ? "bg-plate-yellow text-iron-950"
                : "bg-iron-800 text-chalk-300 hover:bg-iron-800"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {points.length < 2 ? (
        <p className="text-chalk-500 text-sm bg-iron-900 border border-iron-700 rounded p-6 text-center">
          One session logged for {active}. The chart needs at least two.
        </p>
      ) : (
        <div className="border border-iron-700 rounded p-4 bg-iron-850">
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="font-bold text-chalk-50">{active}</h3>
            <span
              className={`text-sm font-semibold ${
                delta >= 0 ? "text-plate-green" : "text-plate-red"
              }`}
            >
              {delta >= 0 ? "+" : ""}
              {Math.round(delta * 10) / 10} kg
            </span>
          </div>
          <p className="text-xs text-chalk-500 mb-2">
            Estimated 1RM · {points.length} sessions
          </p>
          <LineChart points={points} />
          <p className="text-xs text-chalk-500 mt-2">
            Estimated from your logged sets (Epley). Reliable to about 10 reps —
            higher-rep sets read optimistically.
          </p>
        </div>
      )}
    </div>
  );
}

function VolumeTab({ sessions, exerciseBank, bodyweightKg }) {
  const thisWeek = weekKey();
  const lastWeekDate = new Date();
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const lastWeek = weekKey(lastWeekDate);

  const nowSets = setsByMuscle(sessions, exerciseBank, thisWeek);
  const prevSets = setsByMuscle(sessions, exerciseBank, lastWeek);
  const nowVol = volumeByMuscle(sessions, exerciseBank, thisWeek, bodyweightKg);

  const untagged = useMemo(() => {
    const names = new Set();
    Object.values(sessions).forEach((s) => {
      if (!s?.date || weekKeyFromDay(s.date) !== thisWeek) return;
      Object.entries(s.entries || {}).forEach(([name, entry]) => {
        if (!(entry.sets || []).some((x) => x.done)) return;
        if ((exerciseBank[name]?.muscleGroups || []).length === 0) names.add(name);
      });
    });
    return [...names];
  }, [sessions, exerciseBank, thisWeek]);

  const maxSets = Math.max(1, ...Object.values(nowSets));
  const anyData = Object.keys(nowSets).length > 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-chalk-500">
        Working sets per muscle group this week, with last week for comparison.
        Compounds split their credit across the groups you tag them with.
      </p>

      {untagged.length > 0 && (
        <div className="text-sm bg-flag-orange/10 border border-flag-orange/40 text-flag-orange rounded p-3">
          Not counted, because they have no muscle groups set:{" "}
          <strong>{untagged.join(", ")}</strong>. Tag them in the Exercise Bank.
        </div>
      )}

      {!anyData ? (
        <p className="text-chalk-500 text-sm bg-iron-900 border border-iron-700 rounded p-6 text-center">
          Nothing logged this week yet.
        </p>
      ) : (
        <div className="space-y-2">
          {MUSCLE_GROUPS.filter((g) => nowSets[g] || prevSets[g]).map((group) => {
            const now = nowSets[group] || 0;
            const prev = prevSets[group] || 0;
            const diff = now - prev;
            return (
              <div key={group} className="border border-iron-700 rounded p-3 bg-iron-850">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="font-semibold text-chalk-50">{group}</span>
                  <span className="text-sm text-chalk-500">
                    {now} sets
                    {prev > 0 && (
                      <span
                        className={`ml-2 text-xs font-semibold ${
                          diff > 0
                            ? "text-plate-green"
                            : diff < 0
                            ? "text-flag-orange"
                            : "text-chalk-500"
                        }`}
                      >
                        {diff > 0 ? "+" : ""}
                        {diff} vs last week
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2 bg-iron-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-plate-yellow"
                    style={{ width: `${(now / maxSets) * 100}%` }}
                  />
                </div>
                {nowVol[group] > 0 && (
                  <p className="text-xs text-chalk-500 mt-1">
                    {Math.round(nowVol[group]).toLocaleString()} kg lifted
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ProgressPage() {
  const { sessions, exerciseBank, deleteSession, bodyweightKg } = useWorkout();
  const [tab, setTab] = useState("history");

  return (
    <div className="bg-iron-850 rounded-sm p-5 sm:p-8 border border-iron-700 animate-in fade-in duration-300 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">
        <TrendingUp className="w-8 h-8 text-plate-yellow" /> Progress
      </h1>

      <div className="flex gap-1 border-b border-iron-700 mb-6 -mx-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 text-sm ${
              tab === id
                ? "border-plate-yellow text-plate-yellow"
                : "border-transparent text-chalk-500 hover:text-chalk-50"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "history" && (
        <HistoryTab
          sessions={sessions}
          deleteSession={deleteSession}
          bodyweightKg={bodyweightKg}
        />
      )}
      {tab === "strength" && (
        <StrengthTab
          sessions={sessions}
          exerciseBank={exerciseBank}
          bodyweightKg={bodyweightKg}
        />
      )}
      {tab === "volume" && (
        <VolumeTab
          sessions={sessions}
          exerciseBank={exerciseBank}
          bodyweightKg={bodyweightKg}
        />
      )}
    </div>
  );
}
