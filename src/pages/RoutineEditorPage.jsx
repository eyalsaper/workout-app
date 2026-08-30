import React, { useEffect, useRef, useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import { EXERCISE_LIBRARY } from "../lib/exerciseLibrary";
import { containerSteps, isContainer } from "../lib/format";

/*
 * 8D · Workout / Routine builder.
 *
 * Scope is deliberately small: sets × reps × target load only. No supersets,
 * no progression rules, no per-movement notes — those are cut, not deferred.
 *
 * Read mode is the same layout with the steppers inert.
 */

const newId = (prefix) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/**
 * A 46px stepper tile inside a 48px row, so the touch target clears 44px even
 * though the tile reads as 46. Tap either half to step; tap the value to type.
 */
export function StepperTile({ label, value, onChange, step = 1, min = 0, readOnly }) {
  const [editing, setEditing] = useState(false);
  const holdRef = useRef(null);

  const bump = (delta) => {
    if (readOnly) return;
    const next = Math.max(min, Math.round((Number(value) + delta * step) * 100) / 100);
    onChange(next);
  };

  // Press and hold repeats, so 110 kg is not 44 taps from zero.
  const startHold = (delta) => {
    if (readOnly) return;
    bump(delta);
    holdRef.current = setTimeout(function repeat() {
      bump(delta);
      holdRef.current = setTimeout(repeat, 90);
    }, 420);
  };
  const endHold = () => clearTimeout(holdRef.current);
  useEffect(() => () => clearTimeout(holdRef.current), []);

  return (
    <div className="flex-1" style={{ height: 48, display: "flex", alignItems: "center" }}>
      <div
        className="relative w-full"
        style={{
          height: 46,
          borderRadius: 12,
          background: "var(--color-card-hi)",
          border: "1px solid #24272d",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
        }}
      >
        {editing ? (
          <input
            autoFocus
            inputMode="decimal"
            defaultValue={value}
            onBlur={(e) => {
              onChange(Math.max(min, Number(e.target.value) || 0));
              setEditing(false);
            }}
            style={{
              width: "70%",
              textAlign: "center",
              background: "transparent",
              outline: "none",
              fontFamily: "var(--font-display)",
              fontSize: 15,
              fontWeight: 700,
              color: "var(--color-brass-text)",
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => !readOnly && setEditing(true)}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 15,
              fontWeight: 700,
              color: "var(--color-brass-text)",
              lineHeight: 1.1,
            }}
          >
            {value}
          </button>
        )}
        <span
          className="uppercase"
          style={{ fontSize: 9, letterSpacing: "0.12em", color: "var(--color-dim)" }}
        >
          {label}
        </span>

        {!readOnly && (
          <>
            <button
              type="button"
              aria-label={`Less ${label}`}
              onPointerDown={() => startHold(-1)}
              onPointerUp={endHold}
              onPointerLeave={endHold}
              style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "34%" }}
            />
            <button
              type="button"
              aria-label={`More ${label}`}
              onPointerDown={() => startHold(1)}
              onPointerUp={endHold}
              onPointerLeave={endHold}
              style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "34%" }}
            />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * A text tile, same shape as a stepper but holding words.
 *
 * Rep targets are not always numbers: the library states them as ranges
 * ("8-12") and sometimes as instructions ("FF" — to failure). A numeric
 * stepper silently turned both into 0 the moment the editor opened.
 */
export function TextTile({ label, value, onChange, readOnly, placeholder }) {
  return (
    <div className="flex-1" style={{ height: 48, display: "flex", alignItems: "center" }}>
      <div
        className="w-full flex flex-col items-center justify-center"
        style={{
          height: 46,
          borderRadius: 12,
          background: "var(--color-card-hi)",
          border: "1px solid #24272d",
          gap: 1,
        }}
      >
        <input
          value={value ?? ""}
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "76%",
            textAlign: "center",
            background: "transparent",
            outline: "none",
            fontFamily: "var(--font-display)",
            fontSize: 15,
            fontWeight: 700,
            color: "var(--color-brass-text)",
          }}
        />
        <span
          className="uppercase"
          style={{ fontSize: 9, letterSpacing: "0.12em", color: "var(--color-dim)" }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

/** Search, then everything grouped by body part, then "Create movement". */
export function LibrarySheet({ onPick, onClose }) {
  const { exerciseBank, addBankExercise } = useWorkout();
  const [query, setQuery] = useState("");

  const names = [
    ...new Set([...Object.keys(exerciseBank || {}), ...EXERCISE_LIBRARY.map((e) => e.name)]),
  ].filter((name) => name !== "_empty" && !exerciseBank?.[name]?.isHidden);

  const groups = {};
  names.forEach((name) => {
    if (query && !name.toLowerCase().includes(query.toLowerCase())) return;
    const part =
      exerciseBank?.[name]?.muscleGroups?.[0] ||
      EXERCISE_LIBRARY.find((e) => e.name === name)?.muscleGroups?.[0] ||
      "Other";
    (groups[part] = groups[part] || []).push(name);
  });

  const create = () => {
    const name = query.trim();
    if (!name) return;
    addBankExercise(name);
    onPick(name);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.6)" }}>
      <button type="button" style={{ flex: 1 }} onClick={onClose} aria-label="Close" />
      <div
        className="w-full max-w-lg mx-auto flex flex-col gap-3"
        style={{
          background: "var(--color-card)",
          borderTop: "1px solid var(--color-border)",
          padding: 22,
          maxHeight: "72dvh",
        }}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a movement"
          style={{
            height: 44,
            flex: "none",
            borderRadius: "var(--radius-control)",
            background: "var(--color-card-hi)",
            border: "1px solid #24272d",
            padding: "0 14px",
            color: "var(--color-text)",
            outline: "none",
          }}
        />
        <div className="flex flex-col gap-2 min-h-0" style={{ overflowY: "auto" }}>
          {Object.entries(groups).map(([part, list]) => (
            <div key={part} className="flex flex-col gap-1">
              <span className="label" style={{ paddingLeft: 2 }}>
                {part}
              </span>
              {list.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onPick(name)}
                  className="row-card text-left row-title"
                >
                  {name}
                </button>
              ))}
            </div>
          ))}
        </div>
        {query.trim() && (
          <button type="button" className="btn-secondary" onClick={create}>
            Create “{query.trim()}”
          </button>
        )}
      </div>
    </div>
  );
}

export default function RoutineEditorPage({
  routineId,
  readOnly: initialReadOnly,
  // "Build my own" on first run: the routine it makes also becomes Day 1.
  asFirstDay,
  onBack,
}) {
  const { getRoutine, saveRoutine, addRoutineAsDay, settings, exerciseBank, getDetail } =
    useWorkout();
  const existing = routineId ? getRoutine(routineId) : null;

  const [readOnly, setReadOnly] = useState(!!initialReadOnly && !!existing);
  const [name, setName] = useState(existing?.name || "");
  const [movements, setMovements] = useState(existing?.movements || []);
  const [pickerOpen, setPickerOpen] = useState(false);

  const loadStep = settings.plateIncrementKg || 2.5;
  const isValid = name.trim().length > 0 && movements.length > 0;

  const patch = (index, field, value) =>
    setMovements((prev) =>
      prev.map((movement, i) => (i === index ? { ...movement, [field]: value } : movement))
    );

  const add = (movementId) => {
    const bank = exerciseBank?.[movementId] || {};
    setMovements((prev) => [
      ...prev,
      {
        movementId,
        order: prev.length,
        sets: Math.max(1, parseInt(bank.sets, 10) || 3),
        reps: bank.reps || "5",
        targetLoadKg: parseFloat(bank.weight) || 0,
      },
    ]);
    setPickerOpen(false);
  };

  const save = () => {
    if (!isValid) return;
    const routine = {
      id: existing?.id || newId("r"),
      name: name.trim(),
      focus: existing?.focus || "",
      movements: movements.map((movement, order) => ({ ...movement, order })),
    };
    if (asFirstDay) addRoutineAsDay(routine);
    else saveRoutine(routine);
    onBack();
  };

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-[14px]">
      <div className="flex items-center justify-between flex-none">
        <button type="button" className="link-teal" onClick={onBack}>
          {readOnly ? "Back" : "Cancel"}
        </button>
        <span
          className="uppercase"
          style={{ fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, color: "var(--color-muted)" }}
        >
          {readOnly ? "Routine" : existing ? "Edit routine" : "New routine"}
        </span>
        {readOnly ? (
          <button
            type="button"
            style={{ fontSize: 13, color: "var(--color-brass)" }}
            onClick={() => setReadOnly(false)}
          >
            Edit
          </button>
        ) : (
          <button
            type="button"
            onClick={save}
            disabled={!isValid}
            style={{
              fontSize: 13,
              // Dim and inert until the routine has a name and a movement.
              color: isValid ? "var(--color-brass)" : "var(--color-dim)",
            }}
          >
            Save
          </button>
        )}
      </div>

      <div className="card flex-none flex flex-col gap-[6px]" style={{ padding: 16 }}>
        <span className="label">Name</span>
        <input
          value={name}
          readOnly={readOnly}
          onChange={(e) => setName(e.target.value)}
          placeholder="Lower A"
          style={{
            background: "transparent",
            outline: "none",
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--color-text-strong)",
            caretColor: "var(--color-brass)",
          }}
        />
      </div>

      <div className="flex flex-col gap-[8px] min-h-0" style={{ overflowY: "auto" }}>
        <span className="label" style={{ paddingLeft: 2 }}>
          Movements
        </span>

        {movements.map((movement, index) => {
          // A container holds sub-movements rather than a load, so it gets a
          // set count and its own list — never a Reps or Load stepper.
          const detail = getDetail(movement.movementId);
          const container = isContainer(detail);
          const steps = containerSteps(detail);

          return (
            <div
              key={`${movement.movementId}-${index}`}
              className="card flex flex-col gap-[8px]"
              style={{ padding: 14 }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="row-title truncate">{movement.movementId}</span>
                {!readOnly && (
                  <button
                    type="button"
                    style={{ fontSize: 13, color: "var(--color-dim)", flex: "none" }}
                    onClick={() => setMovements((prev) => prev.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                )}
              </div>

              {container && (
                <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>
                  {steps.length} movement{steps.length === 1 ? "" : "s"} · {steps.join(", ")}
                </span>
              )}

              <div className="flex gap-[8px]">
                <StepperTile
                  label="Sets"
                  value={movement.sets}
                  min={1}
                  readOnly={readOnly}
                  onChange={(v) => patch(index, "sets", v)}
                />
                {!container && (
                  <>
                    <StepperTile
                      label="Reps"
                      value={Number(movement.reps) || 0}
                      min={1}
                      readOnly={readOnly}
                      onChange={(v) => patch(index, "reps", String(v))}
                    />
                    <StepperTile
                      label="Load"
                      value={movement.targetLoadKg}
                      step={loadStep}
                      readOnly={readOnly}
                      onChange={(v) => patch(index, "targetLoadKg", v)}
                    />
                  </>
                )}
              </div>
            </div>
          );
        })}

        {!readOnly && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            style={{
              height: 52,
              flex: "none",
              borderRadius: "var(--radius-row)",
              border: "1px dashed #3a3f48",
              color: "var(--color-brass)",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Add from library
          </button>
        )}
      </div>

      {!readOnly && (
        <button
          type="button"
          className="btn-primary"
          style={{ marginTop: "auto" }}
          onClick={save}
          disabled={!isValid}
        >
          Save routine
        </button>
      )}

      {pickerOpen && <LibrarySheet onPick={add} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}
