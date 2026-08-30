import React, { useMemo, useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import { READY_MADE } from "../lib/templates";
import {
  EQUIPMENT_FILTERS,
  MUSCLE_FILTERS,
  PREMADE_WORKOUTS,
  workoutEquipment,
  workoutMuscles,
} from "../lib/workoutLibrary";
import { routineSummary } from "../lib/training";

/*
 * Workout / Routines — the shelf.
 *
 * Build sits at the top, because building is what you came for; the filters
 * and the list are for finding something you already made. Everything on the
 * shelf is runnable: yours, the ready-made programmes, and the pre-made
 * one-off workouts.
 */

const DURATION_FILTERS = [
  ["quick", "Under 25 min"],
  ["medium", "25–45 min"],
  ["long", "45 min+"],
];

const estimateMinutes = (count) => Math.max(5, Math.round((count * 9) / 5) * 5);
const durationBucket = (minutes) =>
  minutes < 25 ? "quick" : minutes <= 45 ? "medium" : "long";

function Chips({ options, isActive, onToggle }) {
  return (
    <div className="flex flex-wrap gap-[6px]">
      {options.map((opt) => {
        const [key, label] = Array.isArray(opt) ? opt : [opt, opt];
        return (
          <button
            key={key}
            type="button"
            className="mode-chip"
            data-active={isActive(key)}
            onClick={() => onToggle(key)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Row({ name, sub, value, onClick, onDelete }) {
  return (
    <div className="row-card flex justify-between items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        className="flex flex-col gap-[3px] min-w-0 text-left"
        style={{ flex: 1 }}
      >
        <span className="row-title truncate">{name}</span>
        <span className="text-[12px] truncate" style={{ color: "var(--color-muted)" }}>
          {sub}
        </span>
      </button>
      <div className="flex items-center gap-3" style={{ flex: "none" }}>
        <span className="row-value tabular">{value}</span>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${name}`}
            style={{ fontSize: 12, color: "var(--color-dim)" }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default function RoutinesPage({
  segmentControl,
  onOpenRoutine,
  onBuild,
  onRunRoutine,
  onRunPremade,
  onRunTemplate,
}) {
  const { routines, settings, exerciseBank, deleteRoutine } = useWorkout();

  const [query, setQuery] = useState("");
  const [muscles, setMuscles] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [duration, setDuration] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const toggle = (list, setList, key) =>
    setList(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

  const matches = (names, minutes) => {
    if (duration && durationBucket(minutes) !== duration) return false;
    if (muscles.length && !workoutMuscles(names, exerciseBank).some((m) => muscles.includes(m))) {
      return false;
    }
    if (
      equipment.length &&
      !workoutEquipment(names, exerciseBank).some((e) => equipment.includes(e))
    ) {
      return false;
    }
    return true;
  };

  const mine = useMemo(
    () =>
      Object.values(routines || {})
        .map((routine) => {
          const summary = routineSummary(routine, settings.defaultRestSeconds);
          const names = (routine.movements || []).map((m) => m.movementId);
          return { routine, summary, names };
        })
        .filter(({ routine, summary, names }) => {
          if (query.trim() && !routine.name?.toLowerCase().includes(query.trim().toLowerCase()))
            return false;
          return matches(names, summary.minutes);
        })
        .sort((a, b) => a.routine.name.localeCompare(b.routine.name)),
    [routines, settings, query, muscles, equipment, duration, exerciseBank]
  );

  const premade = useMemo(
    () =>
      PREMADE_WORKOUTS.map((w) => ({ ...w, minutes: estimateMinutes(w.exercises.length) })).filter(
        (w) => {
          if (query.trim() && !w.name.toLowerCase().includes(query.trim().toLowerCase()))
            return false;
          return matches(w.exercises, w.minutes);
        }
      ),
    [query, muscles, equipment, duration, exerciseBank]
  );

  const templates = useMemo(
    () =>
      READY_MADE.filter(
        (t) => !query.trim() || t.name.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [query]
  );

  const filtersOn = muscles.length || equipment.length || duration;

  /*
   * Yours first, then the built-in workouts, then the ready-made programmes
   * — one list, because at the point of choosing what to train the origin of
   * a workout is not what you are sorting by.
   */
  const shelf = [
    ...mine.map(({ routine, summary }) => ({
      key: routine.id,
      name: routine.name,
      sub: (routine.movements || []).map((m) => m.movementId).join(" · "),
      minutes: summary.minutes,
      onRun: () => onRunRoutine(routine),
      onDelete: () => setConfirmDelete(routine),
    })),
    ...premade.map((w) => ({
      key: w.id,
      name: w.name,
      sub: w.exercises.join(" · "),
      minutes: w.minutes,
      onRun: () => onRunPremade(w),
    })),
    ...(filtersOn
      ? []
      : templates.map((t) => ({
          key: t.id,
          name: t.name,
          sub: `${t.description} · ${t.days.length} workouts`,
          minutes: null,
          onRun: () => onRunTemplate(t),
        }))),
  ];

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-[12px]">
      <span className="screen-title flex-none">Workout</span>
      {segmentControl}

      {/* Building is the reason you came here, so it leads. */}
      <button type="button" className="btn-primary flex-none" onClick={onBuild}>
        Build your workout for today
      </button>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find a workout"
        className="flex-none"
        style={{
          height: 44,
          borderRadius: "var(--radius-control)",
          background: "var(--color-card-hi)",
          border: "1px solid #24272d",
          padding: "0 14px",
          color: "var(--color-text)",
          outline: "none",
        }}
      />

      {/* Three labelled groups, in the order you narrow by: what you want to
          train, what you have to train it with, how long you have. */}
      <div className="flex flex-col gap-[10px] flex-none">
        <div className="flex flex-col gap-[6px]">
          <span className="label" style={{ paddingLeft: 2 }}>
            Muscles
          </span>
          <Chips
            options={MUSCLE_FILTERS}
            isActive={(k) => muscles.includes(k)}
            onToggle={(k) => toggle(muscles, setMuscles, k)}
          />
        </div>
        <div className="flex flex-col gap-[6px]">
          <span className="label" style={{ paddingLeft: 2 }}>
            Equipment you have
          </span>
          <Chips
            options={EQUIPMENT_FILTERS}
            isActive={(k) => equipment.includes(k)}
            onToggle={(k) => toggle(equipment, setEquipment, k)}
          />
        </div>
        <div className="flex flex-col gap-[6px]">
          <span className="label" style={{ paddingLeft: 2 }}>
            Time
          </span>
          <Chips
            options={DURATION_FILTERS}
            isActive={(k) => duration === k}
            onToggle={(k) => setDuration(duration === k ? null : k)}
          />
        </div>
      </div>

      {/* One list. Yours and the built-ins together, because when you are
          looking for something to train you do not care which it is. */}
      <div className="flex flex-col gap-[8px] min-h-0" style={{ overflowY: "auto" }}>
        <span className="label" style={{ paddingLeft: 2 }}>
          Pre-made
        </span>

        {shelf.length === 0 && (
          <span className="text-[13px]" style={{ color: "var(--color-dim)" }}>
            {filtersOn || query ? "Nothing matches." : "Nothing on the shelf yet."}
          </span>
        )}

        {shelf.map((item) => (
          <Row
            key={item.key}
            name={item.name}
            sub={item.sub}
            value={item.minutes ? `~${item.minutes} min` : ""}
            onClick={item.onRun}
            onDelete={item.onDelete}
          />
        ))}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div
            className="w-full max-w-lg mx-auto flex flex-col gap-3"
            style={{
              background: "var(--color-card)",
              borderTop: "1px solid var(--color-border)",
              padding: 22,
            }}
          >
            <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600 }}>
              Delete {confirmDelete.name}?
            </span>
            <span style={{ fontSize: 13, color: "var(--color-muted)" }}>
              Any plan day using it loses that day. Every session you logged
              stays exactly where it is.
            </span>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                deleteRoutine(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete routine
            </button>
            <button type="button" className="btn-primary" onClick={() => setConfirmDelete(null)}>
              Keep it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
