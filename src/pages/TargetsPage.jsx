import React, { useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import ArtLayer from "../components/ArtLayer";
import { artSeed } from "../lib/art";
import { daysAgo } from "../lib/training";
import {
  CYCLES,
  CYCLE_BLURB,
  KIND_HINT,
  KIND_LABEL,
  TARGET_KINDS,
  newTargetId,
} from "../lib/targets";
import { MUSCLE_GROUPS } from "../lib/training";

/*
 * Workout / Targets — what you are trying to hit, and when the slate wipes.
 *
 * Two groups, each with its own cycle, neither tied to the programme's mode:
 * habits clear weekly by default, workout targets clear when you finish them.
 *
 * Nothing here nags. A cycle that ends unmet just starts again — there is no
 * streak, no penalty, and no record of the miss.
 */

/** One target's progress, as pills when the goal is small, a bar when it is not. */
function Pills({ done, goal }) {
  if (goal > 6) {
    return (
      <div style={{ width: 74, height: 6, borderRadius: 999, background: "var(--color-track)" }}>
        <div
          style={{
            width: `${(done / goal) * 100}%`,
            height: 6,
            borderRadius: 999,
            background: "var(--color-brass)",
          }}
        />
      </div>
    );
  }
  return (
    <div className="flex gap-[4px]" style={{ flex: "none" }}>
      {Array.from({ length: goal }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 14,
            height: 6,
            borderRadius: 999,
            background: i < done ? "var(--color-brass)" : "var(--color-track)",
          }}
        />
      ))}
    </div>
  );
}

function GroupHeader({ title, blurb, met, total, cycle, onCycle }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-[2px] min-w-0">
        <span className="label">{title}</span>
        <button
          type="button"
          onClick={onCycle}
          className="text-left"
          style={{ fontSize: 12, color: "var(--color-dim)" }}
        >
          {CYCLE_BLURB[cycle]}
        </button>
      </div>
      <span
        className="tabular"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 13,
          color: "var(--color-muted)",
          flex: "none",
        }}
      >
        {met} of {total}
      </span>
    </div>
  );
}

function Tick({ on }) {
  return (
    <span
      style={{
        width: 18,
        height: 18,
        flex: "none",
        borderRadius: 5,
        border: on ? "1px solid var(--color-teal)" : "1px solid #33363d",
        background: on ? "var(--color-teal)" : "transparent",
        color: "#0e0f12",
        fontSize: 12,
        lineHeight: "16px",
        textAlign: "center",
      }}
    >
      {on ? "✓" : ""}
    </span>
  );
}

/** Add or edit one workout target. */
function TargetSheet({ target, exerciseBank, routines, onSave, onRemove, onClose }) {
  const [kind, setKind] = useState(target?.kind || "exercise");
  const [ref, setRef] = useState(target?.ref || "");
  const [goal, setGoal] = useState(target?.goal || 2);
  const [manual, setManual] = useState(!!target?.manual);
  const [query, setQuery] = useState("");

  const options =
    kind === "exercise"
      ? Object.keys(exerciseBank || {})
          .filter((n) => n !== "_empty" && !exerciseBank[n].isHidden)
          .sort()
      : kind === "muscle"
      ? MUSCLE_GROUPS
      : kind === "routine"
      ? Object.values(routines || {}).map((r) => r.id)
      : [];

  const shown = options.filter(
    (o) => !query.trim() || String(labelFor(o)).toLowerCase().includes(query.trim().toLowerCase())
  );

  function labelFor(value) {
    return kind === "routine" ? routines?.[value]?.name || value : value;
  }

  const valid = kind === "sessions" || !!ref;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.6)" }}>
      <button type="button" style={{ flex: 1 }} onClick={onClose} aria-label="Close" />
      <div
        className="w-full max-w-lg mx-auto flex flex-col gap-3"
        style={{
          background: "var(--color-card)",
          borderTop: "1px solid var(--color-border)",
          padding: 22,
          maxHeight: "82dvh",
          overflowY: "auto",
        }}
      >
        <span className="label">What am I aiming at</span>
        <div className="flex flex-wrap gap-[6px]">
          {TARGET_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              className="mode-chip"
              data-active={kind === k}
              onClick={() => {
                setKind(k);
                setRef("");
              }}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>

        {kind !== "sessions" && (
          <>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Find a ${KIND_LABEL[kind].toLowerCase()}`}
              style={{
                height: 42,
                borderRadius: "var(--radius-control)",
                background: "var(--color-card-hi)",
                border: "1px solid #24272d",
                padding: "0 12px",
                color: "var(--color-text)",
                outline: "none",
              }}
            />
            <div
              className="flex flex-col gap-[6px]"
              style={{ maxHeight: 190, overflowY: "auto" }}
            >
              {shown.slice(0, 60).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRef(option)}
                  className="row-card text-left row-title"
                  style={{
                    borderColor: ref === option ? "var(--color-brass)" : "var(--color-border)",
                  }}
                >
                  {labelFor(option)}
                </button>
              ))}
            </div>
          </>
        )}

        <span className="label">How many times</span>
        <div className="flex gap-[6px]">
          {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
            <button
              key={n}
              type="button"
              className="mode-chip"
              data-active={Number(goal) === n}
              onClick={() => setGoal(n)}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Some targets the app cannot observe. Ticking by hand is the point. */}
        <button
          type="button"
          className="row-card flex justify-between items-center w-full text-left"
          onClick={() => setManual((v) => !v)}
        >
          <div className="flex flex-col gap-[2px]">
            <span className="row-title">I tick this myself</span>
            <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>
              instead of counting it from logged sessions
            </span>
          </div>
          <span className="row-value">{manual ? "On" : "Off"}</span>
        </button>

        <button
          type="button"
          className="btn-primary"
          disabled={!valid}
          onClick={() =>
            onSave({
              id: target?.id || newTargetId(),
              kind,
              ref: kind === "sessions" ? null : ref,
              goal: Number(goal) || 1,
              manual,
            })
          }
        >
          {target ? "Save target" : "Add target"}
        </button>
        {target && (
          <button type="button" className="btn-secondary" onClick={() => onRemove(target.id)}>
            Remove
          </button>
        )}
        <button type="button" className="link-teal" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function TargetsPage({ segmentControl }) {
  const {
    targets,
    exerciseBank,
    routines,
    globalTracker,
    toggleHabit,
    toggleTarget,
    addTarget,
    updateTarget,
    removeTarget,
    setTargetCycle,
    resetTargetGroup,
    updateTrackerItem,
    addTrackerItem,
    removeTrackerItem,
  } = useWorkout();

  const [sheet, setSheet] = useState(null); // null | {} | target
  const [editingHabits, setEditingHabits] = useState(false);
  const [cycleFor, setCycleFor] = useState(null); // 'habits' | 'workout'

  const view = targets;
  const cleared = view.workoutState.startedAt ? daysAgo(view.workoutState.startedAt) : null;

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-[14px]">
      <span className="screen-title flex-none">Workout</span>
      {segmentControl}

      {/* Header: the count, and the same fraction as a bar under it. */}
      <div
        className="relative overflow-hidden flex-none"
        style={{
          borderRadius: "var(--radius-hero)",
          border: "1px solid var(--color-border-hi)",
          background: "var(--color-hero-a)",
          padding: 20,
        }}
      >
        <ArtLayer
          mood={view.total && view.met === view.total ? "triumph" : "charge"}
          seedKey={artSeed.band("targets")}
          scrim="heroCard"
        />
        <div className="relative flex flex-col gap-[8px]">
          <span className="label">Targets met</span>
          <span className="big-number tabular">
            {view.met} of {view.total}
          </span>
          <span style={{ fontSize: 13, color: "#a3a09a" }}>
            {view.total === 0
              ? "Nothing set yet. Add one below."
              : `across ${view.habits.length ? "habits and " : ""}${
                  view.items.length
                } workout target${view.items.length === 1 ? "" : "s"}`}
          </span>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              background: "var(--color-track)",
              marginTop: 4,
            }}
          >
            <div
              style={{
                width: `${view.progress * 100}%`,
                height: 8,
                borderRadius: 999,
                background: "var(--grad-brass)",
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-[12px] min-h-0" style={{ overflowY: "auto" }}>
        {/* ---- habits ---- */}
        <div className="card flex flex-col gap-[12px]" style={{ padding: 16 }}>
          <GroupHeader
            title="Every week"
            met={view.habitsMet}
            total={view.habits.length}
            cycle={view.config.habitCycle}
            onCycle={() => setCycleFor("habits")}
          />

          {editingHabits ? (
            <div className="flex flex-col gap-[8px]">
              {(globalTracker || []).map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    value={item}
                    onChange={(e) => updateTrackerItem(index, e.target.value)}
                    placeholder="Drink 2L water"
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: "var(--radius-control)",
                      background: "var(--color-card-hi)",
                      border: "1px solid #24272d",
                      padding: "0 12px",
                      color: "var(--color-text)",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeTrackerItem(index)}
                    style={{ fontSize: 12, color: "var(--color-dim)", flex: "none" }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <button type="button" className="mode-chip" onClick={addTrackerItem}>
                  Add a habit
                </button>
                <button
                  type="button"
                  className="mode-chip"
                  data-active
                  onClick={() => setEditingHabits(false)}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-[8px]">
                {view.habits.length === 0 && (
                  <span style={{ fontSize: 13, color: "var(--color-dim)" }}>
                    No habits yet.
                  </span>
                )}
                {view.habits.map((habit) => (
                  <button
                    key={habit.index}
                    type="button"
                    onClick={() => toggleHabit(habit.index)}
                    className="flex items-center gap-2"
                    style={{
                      borderRadius: 999,
                      padding: "7px 14px",
                      fontSize: 13,
                      border: habit.done
                        ? "1px solid var(--color-brass)"
                        : "1px solid #33363d",
                      background: habit.done ? "rgba(217,176,99,0.14)" : "transparent",
                      color: habit.done ? "var(--color-brass-text)" : "var(--color-text)",
                    }}
                  >
                    {habit.done && <span style={{ fontSize: 11 }}>✓</span>}
                    {habit.text}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="link-teal text-left"
                style={{ fontSize: 12 }}
                onClick={() => setEditingHabits(true)}
              >
                Edit habits
              </button>
            </>
          )}
        </div>

        {/* ---- workout targets ---- */}
        <div className="card flex flex-col gap-[12px]" style={{ padding: 16 }}>
          <GroupHeader
            title="Workout targets"
            met={view.workoutMet}
            total={view.items.length}
            cycle={view.config.workoutCycle}
            onCycle={() => setCycleFor("workout")}
          />

          {view.items.length === 0 && (
            <span style={{ fontSize: 13, color: "var(--color-dim)" }}>
              Nothing set. A target is a lift, a muscle group, a routine, or
              simply turning up.
            </span>
          )}

          {view.items.map(({ target, label, progress }) => (
            <button
              key={target.id}
              type="button"
              onClick={() =>
                target.manual ? toggleTarget(target.id) : setSheet(target)
              }
              className="flex items-center justify-between gap-3 w-full text-left"
              style={{ minHeight: 40 }}
            >
              <div className="flex items-center gap-3 min-w-0">
                {target.manual && <Tick on={progress.done >= progress.goal} />}
                <div className="flex flex-col gap-[2px] min-w-0">
                  <span className="row-title truncate">{label}</span>
                  <span className="text-[12px]" style={{ color: "var(--color-dim)" }}>
                    {target.manual ? "I tick this myself" : KIND_HINT[target.kind]}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3" style={{ flex: "none" }}>
                {!target.manual && <Pills done={progress.done} goal={progress.goal} />}
                <span
                  className="tabular"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 13,
                    color:
                      progress.done >= progress.goal
                        ? "var(--color-teal)"
                        : "var(--color-muted)",
                  }}
                >
                  {progress.done} / {progress.goal}
                </span>
              </div>
            </button>
          ))}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="link-teal text-left"
              style={{ fontSize: 12 }}
              onClick={() => setSheet({})}
            >
              Add a target
            </button>
            {view.config.workoutCycle === "onComplete" && cleared !== null && (
              <button
                type="button"
                style={{ fontSize: 12, color: "var(--color-dim)", flex: "none" }}
                onClick={() => resetTargetGroup("workout")}
              >
                {cleared === 0 ? "Cleared today" : `Cleared ${cleared}d ago`} · tap to reset
              </button>
            )}
          </div>
        </div>

        <span
          style={{ fontSize: 12, color: "var(--color-dim)", paddingLeft: 2, paddingBottom: 4 }}
        >
          Each group picks its own cycle. Neither follows your program mode.
        </span>
      </div>

      {sheet && (
        <TargetSheet
          target={sheet.id ? sheet : null}
          exerciseBank={exerciseBank}
          routines={routines}
          onSave={(target) => {
            if (sheet.id) updateTarget(target.id, target);
            else addTarget(target);
            setSheet(null);
          }}
          onRemove={(id) => {
            removeTarget(id);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}

      {cycleFor && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div
            className="w-full max-w-lg mx-auto flex flex-col gap-2"
            style={{
              background: "var(--color-card)",
              borderTop: "1px solid var(--color-border)",
              padding: 22,
            }}
          >
            <span className="label">
              {cycleFor === "habits" ? "Habits clear" : "Workout targets clear"}
            </span>
            {CYCLES.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setTargetCycle(cycleFor, key);
                  setCycleFor(null);
                }}
                className="row-card flex flex-col gap-[2px] w-full text-left"
                style={{
                  borderColor:
                    (cycleFor === "habits" ? view.config.habitCycle : view.config.workoutCycle) ===
                    key
                      ? "var(--color-brass)"
                      : "var(--color-border)",
                }}
              >
                <span className="row-title">{label}</span>
                <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>
                  {CYCLE_BLURB[key]}
                </span>
              </button>
            ))}
            <span style={{ fontSize: 12, color: "var(--color-dim)" }}>
              Changing this starts the cycle again from today.
            </span>
            <button type="button" className="btn-secondary" onClick={() => setCycleFor(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
