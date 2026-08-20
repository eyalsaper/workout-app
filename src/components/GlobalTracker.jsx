import React, { useState } from "react";
import { CheckCircle2, Circle, ListChecks, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useWorkout } from "../state/WorkoutContext";

export default function GlobalTracker() {
  const {
    globalTracker,
    globalTrackerChecked,
    toggleTrackerItem,
    resetTracker,
    updateTrackerItem,
    addTrackerItem,
    removeTrackerItem,
  } = useWorkout();

  const [isEditing, setIsEditing] = useState(false);
  const items = globalTracker || [];
  const hasVisibleItems = items.some((name) => name.trim() !== "");

  return (
    <div className="card p-6 sm:p-8">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-accent" /> Weekly targets
          </h2>
          <p className="text-ink-muted text-sm mt-1">
            The list stays the same; checkmarks reset every week.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={resetTracker}
            className="text-sm px-4 py-2 bg-surface-wash hover:bg-surface-wash text-ink-soft rounded-card transition-colors"
          >
            Reset checkmarks
          </button>
          <button
            type="button"
            onClick={() => setIsEditing((v) => !v)}
            className={`px-4 py-2 rounded-card text-sm font-medium transition-colors flex items-center gap-1.5 ${
              isEditing
                ? "bg-accent text-accent-ink hover:bg-accent-hot"
                : "bg-surface border border-border-control text-ink-soft hover:bg-surface-wash"
            }`}
          >
            {isEditing ? <Save className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            {isEditing ? "Save list" : "Edit list"}
          </button>
        </div>
      </div>

      <div className="bg-surface-inset p-4 sm:p-6 rounded-card border border-border">
        {isEditing ? (
          <div className="space-y-3 max-w-2xl">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  list="exercise-bank-list"
                  value={item}
                  onChange={(e) => updateTrackerItem(idx, e.target.value)}
                  placeholder="e.g. 10,000 Steps, Stretch..."
                  className="flex-1 p-2 border border-border-control rounded-card focus:ring-2 focus:ring-accent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeTrackerItem(idx)}
                  aria-label="Remove tracker item"
                  className="text-negative/80 hover:text-negative p-2"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addTrackerItem}
              className="mt-2 px-4 py-2 text-accent hover:bg-accent/20 bg-accent/10 rounded-card transition-colors inline-flex items-center gap-2 font-medium"
            >
              <Plus className="w-4 h-4" /> Add item
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-4 sm:grid-cols-2 gap-4">
            {hasVisibleItems ? (
              items.map((name, idx) => {
                if (!name.trim()) return null;
                const isChecked = !!globalTrackerChecked[idx];
                return (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => toggleTrackerItem(idx)}
                    aria-pressed={isChecked}
                    className={`flex items-center gap-3 p-2 rounded-card transition-all text-left ${
                      isChecked
                        ? "opacity-50 bg-transparent"
                        : "bg-surface border border-border hover:bg-surface-wash"
                    }`}
                  >
                    {isChecked ? (
                      <CheckCircle2 className="w-5 h-5 text-positive-ink flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-ink-faint flex-shrink-0 transition-colors" />
                    )}
                    <span
                      className={`flex-1 truncate ${
                        isChecked ? "line-through opacity-70" : "text-ink font-medium"
                      }`}
                      title={name}
                    >
                      {name}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="col-span-full text-center text-ink-muted italic py-4">
                Your tracker list is empty.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
