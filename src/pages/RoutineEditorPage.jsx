import React, { useRef, useState } from "react";
import { GripVertical, Search, X } from "lucide-react";
import { useWorkout } from "../state/WorkoutContext";
import { isRestEntry, cleanName, setCountFor, formatReps, formatWeight } from "../lib/format";
import { weekdayLabel, estimateMinutes } from "../lib/training";
import LibraryPage from "./LibraryPage";

function StatTile({ label, value, onChange }) {
  return (
    <div className="flex-1 bg-surface-inset rounded-inset p-2 text-center">
      <div className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
        {label}
      </div>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full bg-transparent text-center readout text-lg focus:outline-none"
      />
    </div>
  );
}

export default function RoutineEditorPage({ dayIdx, onOpenDetail, onBack }) {
  const {
    plans,
    activePlanId,
    exerciseBank,
    updateBankField,
    appendExerciseToDay,
    removeExerciseFrom,
    reorderExercise,
    setDayNote,
    setDayRest,
    setDayProgression,
  } = useWorkout();

  const [expanded, setExpanded] = useState(null);
  const [newMovement, setNewMovement] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  // { index, targetIndex, offsetY, startY, rects } while a row is being dragged.
  const [drag, setDrag] = useState(null);
  const rowRefs = useRef([]);

  const day = plans[activePlanId]?.[dayIdx];
  if (!day) return null;

  const exercises = day.exercises || [];
  const isRest = exercises.length > 0 && exercises.every((ex) => isRestEntry(ex));
  const progression = { auto: true, incrementKg: 2.5, ...day.progression };

  const totalSets = exercises.reduce((sum, ex) => {
    if (isRestEntry(ex)) return sum;
    return sum + setCountFor(exerciseBank[cleanName(ex)]);
  }, 0);
  const minutes = estimateMinutes(day, exerciseBank);

  const addMovement = () => {
    const name = cleanName(newMovement);
    if (!name) return;
    appendExerciseToDay(activePlanId, dayIdx, name);
    setNewMovement("");
  };

  // Drag to reorder — collapses any expanded row first so every row's
  // height is predictable while the list is being measured mid-drag.
  const beginDrag = (index, e) => {
    setExpanded(null);
    const rects = rowRefs.current.map((el) => el?.getBoundingClientRect());
    setDrag({ index, targetIndex: index, offsetY: 0, startY: e.clientY, rects });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onDragMove = (e) => {
    if (!drag) return;
    const offsetY = e.clientY - drag.startY;
    const { rects, index } = drag;
    const draggedCenter = rects[index].top + rects[index].height / 2 + offsetY;

    let target = index;
    for (let i = index - 1; i >= 0; i--) {
      if (draggedCenter < rects[i].top + rects[i].height / 2) target = i;
      else break;
    }
    for (let i = index + 1; i < rects.length; i++) {
      if (draggedCenter > rects[i].top + rects[i].height / 2) target = i;
      else break;
    }
    setDrag((d) => ({ ...d, offsetY, targetIndex: target }));
  };

  const endDrag = () => {
    if (drag && drag.targetIndex !== drag.index) {
      reorderExercise(activePlanId, dayIdx, drag.index, drag.targetIndex);
    }
    setDrag(null);
  };

  /** How far row `i` should visually shift while another row drags past it. */
  const rowTransform = (i) => {
    if (!drag) return "";
    const { index, targetIndex, offsetY, rects } = drag;
    if (i === index) return `translateY(${offsetY}px)`;
    const gap = rects[index].height;
    if (index < targetIndex && i > index && i <= targetIndex) return `translateY(${-gap}px)`;
    if (index > targetIndex && i < index && i >= targetIndex) return `translateY(${gap}px)`;
    return "";
  };

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-in fade-in duration-300 pb-8">
      <div>
        <button type="button" onClick={onBack} className="text-sm text-ink-muted hover:text-accent">
          Program
        </button>
        <h1 className="mt-2.5 text-4xl">{day.name || weekdayLabel(dayIdx)}</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          {weekdayLabel(dayIdx)}
          {!isRest &&
            ` · ${exercises.length} movement${exercises.length === 1 ? "" : "s"} · ${totalSets} set${
              totalSets === 1 ? "" : "s"
            }${minutes > 0 ? ` · ~${minutes} min` : ""}`}
        </p>
      </div>

      <div className="card p-4 flex items-center justify-between">
        <span className="text-sm text-ink-soft">This is a rest day</span>
        <button
          type="button"
          role="switch"
          aria-checked={isRest}
          onClick={() => setDayRest(activePlanId, dayIdx, !isRest)}
          className="switch"
          data-on={isRest}
        >
          <span className="switch-knob" />
        </button>
      </div>

      {isRest ? (
        <input
          type="text"
          value={day.note || ""}
          onChange={(e) => setDayNote(activePlanId, dayIdx, e.target.value)}
          placeholder="Note, e.g. walk 40 min"
          className="w-full p-3 border border-border-control rounded-card bg-surface"
        />
      ) : (
        <>
          <div className="space-y-2.5">
            {exercises.map((ex, i) => {
              const name = cleanName(ex);
              const bankData = exerciseBank[name];
              const isOpen = expanded === i;
              const isDragging = drag?.index === i;
              return (
                <div
                  key={i}
                  ref={(el) => (rowRefs.current[i] = el)}
                  className="card p-4 relative"
                  style={{
                    transform: rowTransform(i),
                    transition: isDragging ? "none" : "transform 150ms ease",
                    zIndex: isDragging ? 10 : 1,
                    boxShadow: isDragging ? "0 10px 24px rgba(43,38,32,.18)" : undefined,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onPointerDown={(e) => beginDrag(i, e)}
                      onPointerMove={onDragMove}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      aria-label={`Reorder ${name}`}
                      className="touch-none cursor-grab active:cursor-grabbing text-ink-faint p-1 -ml-1"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : i)}
                      className="flex-1 text-left"
                    >
                      <div className="text-lg" style={{ fontFamily: "var(--font-heading)" }}>
                        {name}
                      </div>
                      {bankData && !bankData.isHidden && (
                        <div className="text-xs text-ink-muted mt-0.5">
                          {bankData.sets}×{formatReps(bankData.reps, bankData.repsUnit)}{" "}
                          {formatWeight(bankData.weight, bankData.weightUnit)}
                          {bankData.restSeconds
                            ? ` · rest ${Math.floor(bankData.restSeconds / 60)}:${String(
                                bankData.restSeconds % 60
                              ).padStart(2, "0")}`
                            : ""}
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenDetail(name)}
                      className="text-xs text-accent"
                    >
                      Detail
                    </button>
                    <button
                      type="button"
                      onClick={() => removeExerciseFrom(activePlanId, dayIdx, i)}
                      aria-label={`Remove ${name}`}
                      className="text-ink-faint hover:text-negative"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {isOpen && bankData && (
                    <div className="mt-3 flex gap-2">
                      <StatTile
                        label="Sets"
                        value={bankData.sets}
                        onChange={(v) => updateBankField(name, "sets", v)}
                      />
                      <StatTile
                        label="Reps"
                        value={bankData.reps}
                        onChange={(v) => updateBankField(name, "reps", v)}
                      />
                      <StatTile
                        label="Weight"
                        value={bankData.weight}
                        onChange={(v) => updateBankField(name, "weight", v)}
                      />
                      <StatTile
                        label="Rest"
                        value={bankData.restSeconds ?? ""}
                        onChange={(v) => updateBankField(name, "restSeconds", v)}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            <div className="slot-empty p-3 flex gap-2">
              <input
                type="text"
                list="exercise-bank-list"
                value={newMovement}
                onChange={(e) => setNewMovement(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMovement()}
                placeholder="Add movement from library..."
                className="flex-1 bg-transparent focus:outline-none text-sm"
              />
              <button type="button" onClick={addMovement} className="text-sm font-medium text-accent">
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                aria-label="Browse the library"
                className="text-ink-faint hover:text-accent"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {showPicker && (
            <div className="fixed inset-0 z-40 bg-surface-page overflow-y-auto p-3 sm:p-6">
              <LibraryPage
                onPick={(name) => {
                  appendExerciseToDay(activePlanId, dayIdx, name);
                  setShowPicker(false);
                }}
                onBack={() => setShowPicker(false)}
              />
            </div>
          )}

          <div>
            <div className="stencil mb-2.5">Progression</div>
            <div className="card divide-y divide-border">
              <div className="p-4 flex items-center justify-between">
                <span className="text-sm text-ink-soft">Add weight when all reps clear</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={progression.auto}
                  onClick={() =>
                    setDayProgression(activePlanId, dayIdx, { auto: !progression.auto })
                  }
                  className="switch"
                  data-on={progression.auto}
                >
                  <span className="switch-knob" />
                </button>
              </div>
              <div className="p-4 flex items-center justify-between">
                <span className="text-sm text-ink-soft">Increment</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.5"
                    value={progression.incrementKg}
                    onChange={(e) =>
                      setDayProgression(activePlanId, dayIdx, {
                        incrementKg: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-14 text-right bg-transparent focus:outline-none text-sm font-medium text-ink-mid"
                  />
                  <span className="text-sm text-ink-mid">kg</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <button type="button" onClick={onBack} className="btn-ink w-full py-4">
        Save routine
      </button>
    </div>
  );
}
