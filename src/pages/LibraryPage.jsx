import React, { useMemo, useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import {
  EXERCISE_LIBRARY,
  LIBRARY_BY_NAME,
  categoryFor,
  guessPattern,
  resolveEquipment,
} from "../lib/exerciseLibrary";
import { containerSteps, isContainer } from "../lib/format";
import { exerciseHistory } from "../lib/training";

/*
 * The movement library — every movement the account knows about.
 *
 * Reached from Settings, and it doubles as the picker: pass `onPick` and rows
 * call that instead of opening the movement's own page. Same list, different
 * tap behaviour, so there is only one place that knows how to list movements.
 */

const CATEGORIES = ["All", "Push", "Pull", "Legs", "Core", "Mine"];
// Containers group under their own heading — they are lists of movements,
// not a piece of equipment.
const EQUIPMENT_ORDER = [
  "Routines",
  "Barbell",
  "Dumbbell",
  "Cable",
  "Machine",
  "Bodyweight",
  "Other",
];

export default function LibraryPage({ onOpenMovement, onBack, onPick }) {
  const { exerciseBank, exerciseDetails, sessions, bodyweightKg, seedLibrary, addBankExercise } =
    useWorkout();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [draftName, setDraftName] = useState("");
  const [adding, setAdding] = useState(false);

  const missing = EXERCISE_LIBRARY.filter((item) => !exerciseBank[item.name]).length;

  const movements = useMemo(
    () =>
      /*
       * The bank is not the whole story: a container like "Core Workout"
       * exists only in exerciseDetails, because it was never a lift with a
       * load. Listing the bank alone hides them, which is what made them look
       * deleted. Union the two, bank entry or not.
       */
      [...new Set([...Object.keys(exerciseBank || {}), ...Object.keys(exerciseDetails || {})])]
        .filter((name) => name !== "_empty" && !exerciseBank?.[name]?.isHidden)
        .map((name) => {
          const data = exerciseBank?.[name] || {};
          return {
            name,
            data,
            detail: exerciseDetails?.[name],
            category: LIBRARY_BY_NAME[name]
              ? categoryFor(data.pattern || guessPattern(name))
              : "Mine",
            equipment: isContainer(exerciseDetails?.[name])
              ? "Routines"
              : resolveEquipment(data, name),
            sessionCount: exerciseHistory(sessions, name).length,
          };
        })
        .filter((m) => {
          if (category !== "All" && m.category !== category) return false;
          if (!query.trim()) return true;
          const q = query.trim().toLowerCase();
          return (
            m.name.toLowerCase().includes(q) ||
            (m.data.muscleGroups || []).some((g) => g.toLowerCase().includes(q))
          );
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [exerciseBank, exerciseDetails, sessions, category, query]
  );

  const grouped = useMemo(() => {
    const byEquipment = {};
    movements.forEach((m) => {
      (byEquipment[m.equipment] = byEquipment[m.equipment] || []).push(m);
    });
    return EQUIPMENT_ORDER.filter((eq) => byEquipment[eq]?.length).map((eq) => ({
      equipment: eq,
      items: byEquipment[eq],
    }));
  }, [movements]);

  const create = () => {
    const name = draftName.trim();
    if (!name) return;
    addBankExercise(name);
    setDraftName("");
    setAdding(false);
    if (!onPick) onOpenMovement?.(name);
    else onPick(name);
  };

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-[12px]">
      <div className="flex items-center justify-between flex-none">
        <button type="button" className="link-teal" onClick={onBack}>
          {onPick ? "Cancel" : "Settings"}
        </button>
        <span
          className="uppercase"
          style={{ fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, color: "var(--color-muted)" }}
        >
          Movements
        </span>
        <button
          type="button"
          style={{ fontSize: 13, color: "var(--color-brass)" }}
          onClick={() => setAdding((v) => !v)}
        >
          Add
        </button>
      </div>

      <div className="flex flex-col gap-[4px] flex-none">
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            fontWeight: 700,
            color: "var(--color-text-strong)",
          }}
        >
          {movements.length} movement{movements.length === 1 ? "" : "s"}
        </span>
        <span style={{ fontSize: 13, color: "var(--color-muted)" }}>
          {onPick ? "Tap one to add it." : "Tap one for its notes, cues and history."}
        </span>
      </div>

      {adding && (
        <div className="flex gap-2 flex-none">
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="New movement name"
            style={{
              flex: 1,
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
            onClick={create}
            className="mode-chip"
            data-active={!!draftName.trim()}
            style={{ flex: "none" }}
          >
            Create
          </button>
        </div>
      )}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find a movement"
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

      <div className="flex gap-[6px] flex-none" style={{ overflowX: "auto" }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className="mode-chip"
            data-active={category === cat}
            style={{ flex: "none" }}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-[10px] min-h-0" style={{ overflowY: "auto" }}>
        {grouped.length === 0 && (
          <span style={{ fontSize: 13, color: "var(--color-dim)" }}>
            Nothing matches. Add it with the button up top.
          </span>
        )}

        {grouped.map(({ equipment, items }) => (
          <div key={equipment} className="flex flex-col gap-[8px]">
            <span className="label" style={{ paddingLeft: 2 }}>
              {equipment}
            </span>
            {items.map((m) => {
              const steps = isContainer(m.detail) ? containerSteps(m.detail) : null;
              return (
                <button
                  key={m.name}
                  type="button"
                  onClick={() => (onPick ? onPick(m.name) : onOpenMovement(m.name))}
                  className="row-card flex justify-between items-center w-full text-left press"
                >
                  <div className="flex flex-col gap-[3px] min-w-0">
                    <span className="row-title truncate">{m.name}</span>
                    <span className="text-[12px] truncate" style={{ color: "var(--color-muted)" }}>
                      {/* A container says what it holds, never a load. */}
                      {steps
                        ? `${steps.length} step${steps.length === 1 ? "" : "s"} · ${steps.join(", ")}`
                        : (m.data.muscleGroups || []).join(" · ") ||
                          // A name with no bank entry and no steps is not a
                          // movement missing its tags — it is a movement that
                          // was never filled in. Say the useful thing.
                          (m.data.sets ? "no muscle groups yet" : "nothing in it yet — tap to set it up")}
                    </span>
                  </div>
                  <span
                    className="tabular"
                    style={{
                      flex: "none",
                      paddingLeft: 12,
                      fontFamily: "var(--font-display)",
                      fontSize: 13,
                      color: m.sessionCount ? "var(--color-brass-text)" : "var(--color-dim)",
                    }}
                  >
                    {m.sessionCount || "—"}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {missing > 0 && !onPick && (
        <button type="button" className="btn-secondary flex-none" onClick={seedLibrary}>
          Add {missing} missing stock movements
        </button>
      )}
    </div>
  );
}
