import React, { useMemo, useState } from "react";
import { ChevronLeft, Plus, Search } from "lucide-react";
import { useWorkout } from "../state/WorkoutContext";
import {
  EXERCISE_LIBRARY,
  LIBRARY_BY_NAME,
  guessPattern,
  categoryFor,
  resolveEquipment,
} from "../lib/exerciseLibrary";
import { exerciseHistory } from "../lib/training";

const CATEGORIES = ["All", "Push", "Pull", "Legs", "Core", "Mine"];
const EQUIPMENT_ORDER = ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Other"];

/**
 * Doubles as the exercise picker: pass `onPick` (RoutineEditorPage does,
 * from an overlay) and rows call it instead of opening the movement's
 * detail page — same list, different tap behaviour.
 */
export default function LibraryPage({ onOpenDetail, onBack, onPick }) {
  const { exerciseBank, sessions, bodyweightKg, seedLibrary, addBankExercise } = useWorkout();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [isAdding, setIsAdding] = useState(false);
  const [draftName, setDraftName] = useState("");

  const missing = EXERCISE_LIBRARY.filter((item) => !exerciseBank[item.name]).length;
  const trainedCount = Object.keys(exerciseBank).filter(
    (name) => !exerciseBank[name].isHidden && exerciseHistory(sessions, name).length > 0
  ).length;

  const movements = useMemo(() => {
    return Object.entries(exerciseBank)
      .filter(([, data]) => !data.isHidden)
      .map(([name, data]) => {
        const pattern = data.pattern || guessPattern(name);
        const best = Math.max(0, ...exerciseHistory(sessions, name, bodyweightKg).map((h) => h.e1rm));
        return {
          name,
          data,
          pattern,
          category: LIBRARY_BY_NAME[name] ? categoryFor(pattern) : "Mine",
          equipment: resolveEquipment(data, name),
          sessionCount: exerciseHistory(sessions, name).length,
          best: Math.round(best),
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
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exerciseBank, sessions, bodyweightKg, category, query]);

  const grouped = useMemo(() => {
    const byEquipment = {};
    movements.forEach((m) => {
      byEquipment[m.equipment] = byEquipment[m.equipment] || [];
      byEquipment[m.equipment].push(m);
    });
    return EQUIPMENT_ORDER.filter((eq) => byEquipment[eq]?.length > 0).map((eq) => ({
      equipment: eq,
      items: byEquipment[eq],
    }));
  }, [movements]);

  const submitAdd = () => {
    const name = draftName.trim();
    if (name && addBankExercise(name)) {
      setDraftName("");
      setIsAdding(false);
      if (onPick) onPick(name);
      else onOpenDetail(name);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-in fade-in duration-300 pb-6">
      <div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-ink-muted hover:text-accent flex items-center gap-1 mb-2.5"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}
        <h1 className="text-4xl">{onPick ? "Add a movement" : "The library"}</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          {Object.keys(exerciseBank).filter((n) => !exerciseBank[n].isHidden).length} movements ·{" "}
          {trainedCount} you've trained.
        </p>
      </div>

      {missing > 0 && (
        <div className="card-hero p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-ink">
              {missing} stock movement{missing === 1 ? "" : "s"} available
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Pre-tagged with muscle groups, rest times and cues.
            </p>
          </div>
          <button type="button" onClick={seedLibrary} className="btn-clay px-4 py-2 text-sm flex-shrink-0">
            Add
          </button>
        </div>
      )}

      <div className="card flex items-center gap-2 px-4 py-3">
        <Search className="w-4 h-4 text-ink-faint flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movements or muscles"
          className="flex-1 bg-transparent focus:outline-none text-sm"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className="chip"
            data-active={category === c}
          >
            {c}
          </button>
        ))}
      </div>

      {grouped.map(({ equipment, items }) => (
        <div key={equipment}>
          <div className="stencil mb-2">{equipment}</div>
          <div className="space-y-2">
            {items.map((m) => (
              <button
                key={m.name}
                type="button"
                onClick={() => (onPick ? onPick(m.name) : onOpenDetail(m.name))}
                className="w-full card p-4 flex items-center gap-3 text-left"
              >
                <div className="flex-1">
                  <div className="text-lg" style={{ fontFamily: "var(--font-heading)" }}>
                    {m.name}
                  </div>
                  <div className="text-xs text-ink-muted mt-0.5">
                    {(m.data.muscleGroups || []).join(" · ")}
                    {m.sessionCount > 0 &&
                      ` · ${m.sessionCount} session${m.sessionCount === 1 ? "" : "s"}`}
                  </div>
                </div>
                {m.best > 0 && (
                  <span className="text-sm font-medium text-accent whitespace-nowrap">{m.best} kg</span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      {movements.length === 0 && (
        <p className="text-sm text-ink-muted italic text-center py-6">
          Nothing matches. Try a different search or filter.
        </p>
      )}

      {isAdding ? (
        <div className="card p-3 flex gap-2">
          <input
            type="text"
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitAdd()}
            placeholder="Movement name..."
            className="flex-1 bg-transparent focus:outline-none text-sm"
          />
          <button type="button" onClick={submitAdd} className="text-sm font-medium text-accent">
            Add
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setIsAdding(true)} className="btn-ink w-full py-3.5 text-sm">
          <Plus className="w-4 h-4" /> Add a movement
        </button>
      )}
    </div>
  );
}
