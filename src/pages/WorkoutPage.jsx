import React, { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useWorkout } from "../state/WorkoutContext";
import TodayPage from "./TodayPage";
import { weekdayLabel, monthLabel, estimateMinutes } from "../lib/training";
import {
  PREMADE_WORKOUTS,
  MUSCLE_FILTERS,
  EQUIPMENT_FILTERS,
  workoutMuscles,
  workoutEquipment,
} from "../lib/workoutLibrary";

const SEGMENTS = [
  ["today", "Today"],
  ["workouts", "Workouts"],
  ["history", "History"],
];

const DURATION_FILTERS = [
  ["quick", "Under 25 min"],
  ["medium", "25–45 min"],
  ["long", "45 min+"],
];

function SegmentChips({ segment, setSegment }) {
  return (
    <div className="flex gap-1.5">
      {SEGMENTS.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => setSegment(key)}
          className="chip"
          data-active={segment === key}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function FilterChips({ options, isActive, onToggle }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const key = Array.isArray(opt) ? opt[0] : opt;
        const label = Array.isArray(opt) ? opt[1] : opt;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            className="chip"
            data-active={isActive(key)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function toggleInSet(set, value) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function WorkoutsSegment({ segmentControl, onStartAdHoc, onOpenBuilder }) {
  const { savedWorkouts, deleteWorkout, exerciseBank } = useWorkout();
  const [query, setQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState(null);
  const [equipmentHave, setEquipmentHave] = useState(() => new Set());
  const [durationFilter, setDurationFilter] = useState(null);

  const yours = Object.entries(savedWorkouts || {}).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));

  const premade = useMemo(
    () =>
      PREMADE_WORKOUTS.map((w) => ({
        ...w,
        muscles: workoutMuscles(w.exercises),
        equipment: workoutEquipment(w.exercises),
        minutes: estimateMinutes({ exercises: w.exercises }, exerciseBank),
      })),
    [exerciseBank]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return premade.filter((w) => {
      if (q && !w.name.toLowerCase().includes(q) && !w.exercises.some((e) => e.toLowerCase().includes(q))) {
        return false;
      }
      if (muscleFilter && !w.muscles.has(muscleFilter)) return false;
      // "Equipment I have" — every piece the workout needs must be in the
      // selected set, not just any overlap, or a barbell day would still
      // show up when someone only ticked "Bodyweight".
      if (equipmentHave.size > 0 && ![...w.equipment].every((e) => equipmentHave.has(e))) return false;
      if (durationFilter === "quick" && w.minutes >= 25) return false;
      if (durationFilter === "medium" && (w.minutes < 25 || w.minutes > 45)) return false;
      if (durationFilter === "long" && w.minutes <= 45) return false;
      return true;
    });
  }, [premade, query, muscleFilter, equipmentHave, durationFilter]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-6">
      <div>
        <h1 className="text-[2rem] leading-[1.08]">Pick something else</h1>
        <p className="mt-1.5 text-sm text-ink-muted leading-relaxed">
          Nothing on the plan, or want a change? Build one from scratch or grab a pre-made workout —
          your program stays untouched.
        </p>
      </div>

      {segmentControl}

      <button type="button" onClick={onOpenBuilder} className="btn-clay w-full py-4">
        Build your workout for today
      </button>

      <div className="space-y-2.5">
        <div className="card flex items-center gap-2 px-4 py-3">
          <Search className="w-4 h-4 text-ink-faint flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or exercise"
            className="flex-1 bg-transparent focus:outline-none text-sm"
          />
        </div>
        <div>
          <div className="stencil mb-1.5">Muscles</div>
          <FilterChips
            options={MUSCLE_FILTERS}
            isActive={(k) => muscleFilter === k}
            onToggle={(k) => setMuscleFilter((prev) => (prev === k ? null : k))}
          />
        </div>
        <div>
          <div className="stencil mb-1.5">Equipment you have</div>
          <FilterChips
            options={EQUIPMENT_FILTERS}
            isActive={(k) => equipmentHave.has(k)}
            onToggle={(k) => setEquipmentHave((prev) => toggleInSet(prev, k))}
          />
        </div>
        <div>
          <div className="stencil mb-1.5">Time</div>
          <FilterChips
            options={DURATION_FILTERS}
            isActive={(k) => durationFilter === k}
            onToggle={(k) => setDurationFilter((prev) => (prev === k ? null : k))}
          />
        </div>
      </div>

      {yours.length > 0 && (
        <div>
          <div className="stencil mb-2.5">Yours</div>
          <div className="space-y-2">
            {yours.map(([id, w]) => (
              <div key={id} className="card px-[17px] py-[15px] rounded-[18px]">
                <div className="flex items-baseline justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onStartAdHoc(w.name, w.exercises)}
                    className="text-left flex-1"
                  >
                    <span className="text-lg" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>
                      {w.name}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteWorkout(id)}
                    aria-label={`Delete ${w.name}`}
                    className="text-ink-faint hover:text-negative flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onStartAdHoc(w.name, w.exercises)}
                  className="block w-full text-left mt-1.5 text-sm text-ink-muted leading-relaxed"
                >
                  {(w.exercises || []).map((e) => (typeof e === "string" ? e : e.name)).join(" · ")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="stencil mb-2.5">Pre-made</div>
        {filtered.length === 0 ? (
          <p className="text-sm text-ink-muted italic text-center py-6">Nothing matches those filters.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => onStartAdHoc(w.name, w.exercises)}
                className="w-full bg-surface-inset rounded-[18px] px-[17px] py-3.5 text-left"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[17px]" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>
                    {w.name}
                  </span>
                  <span className="text-xs text-ink-muted whitespace-nowrap">~{w.minutes} min</span>
                </div>
                <p className="mt-1.5 text-sm text-ink-muted leading-relaxed">{w.exercises.join(" · ")}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function shortDate(day) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}

function HistorySegment({ segmentControl, onOpenSession }) {
  const { sessions, plans } = useWorkout();

  const finished = Object.entries(sessions)
    .filter(([, s]) => s.finishedAt && s.date)
    .sort((a, b) => b[1].finishedAt - a[1].finishedAt);

  const groups = {};
  finished.forEach(([id, s]) => {
    const key = s.date.slice(0, 7);
    (groups[key] = groups[key] || []).push([id, s]);
  });
  const orderedKeys = Object.keys(groups).sort().reverse();

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-6">
      <div>
        <h1 className="text-[2rem] leading-[1.08]">History</h1>
      </div>

      {segmentControl}

      {orderedKeys.length === 0 && (
        <p className="text-sm text-ink-muted italic text-center py-6">Nothing logged yet.</p>
      )}

      {orderedKeys.map((key) => (
        <div key={key}>
          <div className="stencil mb-1">{monthLabel(key)}</div>
          <div>
            {groups[key].map(([id, s], i) => {
              const dayLabel = s.planId != null ? plans[s.planId]?.[s.dayIndex] : null;
              const name = s.label || dayLabel?.name || (s.dayIndex != null ? weekdayLabel(s.dayIndex) : "Workout");
              const totalSets = Object.values(s.entries || {}).flatMap((e) => e.sets || []).filter((x) => x && x.done).length;
              const minutes =
                s.startedAt && s.finishedAt ? Math.round((s.finishedAt - s.startedAt) / 60000) : null;
              const isLast = i === groups[key].length - 1;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onOpenSession(id)}
                  className={`w-full flex items-center gap-3 py-[13px] text-left ${
                    isLast ? "" : "border-b border-dashed border-border-control"
                  }`}
                >
                  <span className="w-[52px] flex-shrink-0 text-[11.5px] text-ink-faint">{shortDate(s.date)}</span>
                  <span className="flex-1 text-[15px]" style={{ fontFamily: "var(--font-heading)" }}>
                    {name}
                  </span>
                  <span className="text-[11.5px] text-ink-muted whitespace-nowrap">
                    {totalSets} set{totalSets === 1 ? "" : "s"}
                    {minutes != null ? ` · ${minutes} min` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WorkoutPage({ onStartDay, onStartAdHoc, onOpenDetail, onOpenBuilder, onOpenHistorySession }) {
  const [segment, setSegment] = useState("today");
  const chips = <SegmentChips segment={segment} setSegment={setSegment} />;

  if (segment === "workouts") {
    return <WorkoutsSegment segmentControl={chips} onStartAdHoc={onStartAdHoc} onOpenBuilder={onOpenBuilder} />;
  }
  if (segment === "history") {
    return <HistorySegment segmentControl={chips} onOpenSession={onOpenHistorySession} />;
  }
  return (
    <TodayPage
      segmentControl={chips}
      onStartDay={onStartDay}
      onOpenDetail={onOpenDetail}
      onSwitchToWorkouts={() => setSegment("workouts")}
    />
  );
}
