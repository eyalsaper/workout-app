import React, { useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import { StepperTile, LibrarySheet } from "./RoutineEditorPage";

/*
 * Editing one workout of the plan.
 *
 * The day owns these movements outright. Seeding from a routine copies them
 * in and then lets go — editing here never rewrites the routine, and a day
 * built from scratch never has to become a shelf item at all.
 */

export default function PlanDayEditorPage({ dayId, onBack }) {
  const {
    planDays,
    routines,
    settings,
    exerciseBank,
    dayMovements,
    updatePlanDay,
    seedPlanDay,
    saveDayAsRoutine,
    bankMovement,
    routineItem,
    isRoutineItem,
  } = useWorkout();

  const day = planDays.find((d) => d.id === dayId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [nesting, setNesting] = useState(false);
  const [savingAs, setSavingAs] = useState(false);
  const [saveName, setSaveName] = useState("");

  if (!day) return null;

  const movements = dayMovements(day);
  const loadStep = settings.plateIncrementKg || 2.5;
  const position = planDays.findIndex((d) => d.id === dayId) + 1;

  const write = (next) =>
    updatePlanDay(dayId, { movements: next.map((m, order) => ({ ...m, order })) });

  const patch = (index, field, value) =>
    write(movements.map((m, i) => (i === index ? { ...m, [field]: value } : m)));

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-[14px]">
      <div className="flex items-center justify-between flex-none">
        <button type="button" className="link-teal" onClick={onBack}>
          Back
        </button>
        <span
          className="uppercase"
          style={{ fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, color: "var(--color-muted)" }}
        >
          Workout {position}
        </span>
        <button
          type="button"
          style={{ fontSize: 13, color: "var(--color-brass)" }}
          onClick={() => {
            setSaveName(day.name || "");
            setSavingAs(true);
          }}
        >
          Keep
        </button>
      </div>

      <div className="card flex-none flex flex-col gap-[6px]" style={{ padding: 16 }}>
        <span className="label">Name</span>
        <input
          value={day.name || ""}
          onChange={(e) => updatePlanDay(dayId, { name: e.target.value })}
          placeholder={`Workout ${position}`}
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

        {movements.length === 0 && (
          <span style={{ fontSize: 13, color: "var(--color-dim)" }}>
            Empty. Add movements, or start from something on the shelf.
          </span>
        )}

        {movements.map((item, index) => {
          /*
           * A nested routine is ONE line, not its movements spread out. It has
           * no sets or load of its own — it is run in full, in place — so it
           * shows what it contains instead of three steppers.
           */
          if (isRoutineItem(item)) {
            const inner = routines?.[item.routineId];
            const names = (inner?.movements || []).map((m) => m.movementId);
            return (
              <div
                key={`${item.routineId}-${index}`}
                className="card flex flex-col gap-[6px]"
                style={{ padding: 14, borderColor: "var(--color-border-hi)" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-[2px] min-w-0">
                    <span className="label">Routine</span>
                    <span className="row-title truncate">{inner?.name || item.name}</span>
                  </div>
                  <button
                    type="button"
                    style={{ fontSize: 13, color: "var(--color-dim)", flex: "none" }}
                    onClick={() => write(movements.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                </div>
                <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>
                  {names.length
                    ? `${names.length} movements · ${names.join(", ")}`
                    : "this routine is empty"}
                </span>
              </div>
            );
          }

          return (
            <div
              key={`${item.movementId}-${index}`}
              className="card flex flex-col gap-[8px]"
              style={{ padding: 14 }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="row-title truncate">{item.movementId}</span>
                <button
                  type="button"
                  style={{ fontSize: 13, color: "var(--color-dim)", flex: "none" }}
                  onClick={() => write(movements.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
              <div className="flex gap-[8px]">
                <StepperTile
                  label="Sets"
                  value={item.sets}
                  min={1}
                  onChange={(v) => patch(index, "sets", v)}
                />
                <StepperTile
                  label="Reps"
                  value={Number(item.reps) || 0}
                  min={1}
                  onChange={(v) => patch(index, "reps", String(v))}
                />
                <StepperTile
                  label="Load"
                  value={item.targetLoadKg}
                  step={loadStep}
                  onChange={(v) => patch(index, "targetLoadKg", v)}
                />
              </div>
            </div>
          );
        })}

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

        {/* Adding a routine keeps it whole; seeding copies its movements in
            loose and forgets where they came from. Different things. */}
        <button
          type="button"
          onClick={() => setNesting(true)}
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
          Add a whole routine
        </button>

        <button type="button" className="link-teal text-left" onClick={() => setSeeding(true)}>
          Replace everything with a saved routine
        </button>
      </div>

      {pickerOpen && (
        <LibrarySheet
          onPick={(name) => {
            write([...movements, bankMovement(name, movements.length)]);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {nesting && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.6)" }}>
          <button
            type="button"
            style={{ flex: 1 }}
            onClick={() => setNesting(false)}
            aria-label="Close"
          />
          <div
            className="w-full max-w-lg mx-auto flex flex-col gap-2"
            style={{
              background: "var(--color-card)",
              borderTop: "1px solid var(--color-border)",
              padding: 22,
              maxHeight: "70dvh",
              overflowY: "auto",
            }}
          >
            <span className="label">Add a routine to this workout</span>
            <span className="text-[12px]" style={{ color: "var(--color-dim)", paddingBottom: 4 }}>
              It stays one line here and runs in full. Edit the routine itself
              and this workout follows.
            </span>
            {Object.values(routines || {}).length === 0 && (
              <span style={{ fontSize: 13, color: "var(--color-dim)" }}>
                Nothing on the shelf yet.
              </span>
            )}
            {Object.values(routines || {}).map((routine) => (
              <button
                key={routine.id}
                type="button"
                onClick={() => {
                  write([...movements, routineItem(routine, movements.length)]);
                  setNesting(false);
                }}
                className="row-card flex justify-between items-center w-full text-left"
              >
                <span className="row-title truncate">{routine.name}</span>
                <span className="text-[12px]" style={{ color: "var(--color-muted)", flex: "none" }}>
                  {(routine.movements || []).length} movements
                </span>
              </button>
            ))}
            <button type="button" className="btn-secondary" onClick={() => setNesting(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {seeding && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.6)" }}>
          <button type="button" style={{ flex: 1 }} onClick={() => setSeeding(false)} aria-label="Close" />
          <div
            className="w-full max-w-lg mx-auto flex flex-col gap-2"
            style={{
              background: "var(--color-card)",
              borderTop: "1px solid var(--color-border)",
              padding: 22,
              maxHeight: "70dvh",
              overflowY: "auto",
            }}
          >
            <span className="label">Copy a routine in</span>
            <span className="text-[12px]" style={{ color: "var(--color-dim)", paddingBottom: 4 }}>
              This replaces what is here. The routine itself is not linked and
              never changes when you edit this workout.
            </span>
            {Object.values(routines || {}).length === 0 && (
              <span style={{ fontSize: 13, color: "var(--color-dim)" }}>
                Nothing on the shelf yet.
              </span>
            )}
            {Object.values(routines || {}).map((routine) => (
              <button
                key={routine.id}
                type="button"
                onClick={() => {
                  seedPlanDay(dayId, routine);
                  setSeeding(false);
                }}
                className="row-card flex justify-between items-center w-full text-left"
              >
                <span className="row-title truncate">{routine.name}</span>
                <span
                  className="text-[12px]"
                  style={{ color: "var(--color-muted)", flex: "none" }}
                >
                  {(routine.movements || []).length} movements
                </span>
              </button>
            ))}
            <button type="button" className="btn-secondary" onClick={() => setSeeding(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {savingAs && (
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
              Keep this on the shelf?
            </span>
            <span style={{ fontSize: 13, color: "var(--color-muted)" }}>
              Saves a copy as a routine you can run one-off or start another
              plan day from. This workout stays exactly as it is.
            </span>
            <input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Name it"
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
            <button
              type="button"
              className="btn-primary"
              disabled={!saveName.trim()}
              onClick={() => {
                saveDayAsRoutine(dayId, saveName.trim());
                setSavingAs(false);
              }}
            >
              Save as a routine
            </button>
            <button type="button" className="btn-secondary" onClick={() => setSavingAs(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
