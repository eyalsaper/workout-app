import React, { useState } from "react";
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
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
    <div className="bg-iron-850 rounded-sm p-6 sm:p-8 border border-iron-700">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            ✅ Global Tracker
          </h2>
          <p className="text-chalk-500 text-sm mt-1">
            This list stays the same across all your plans.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={resetTracker}
            className="text-sm px-4 py-2 bg-iron-800 hover:bg-iron-800 text-chalk-200 rounded-sm transition-colors"
          >
            Reset Checkmarks
          </button>
          <button
            type="button"
            onClick={() => setIsEditing((v) => !v)}
            className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
              isEditing
                ? "bg-plate-yellow text-iron-950 hover:bg-plate-yellow-hot"
                : "bg-iron-850 border border-iron-600 text-chalk-200 hover:bg-iron-800"
            }`}
          >
            {isEditing ? "💾 Save Tracker" : "✏️ Edit List"}
          </button>
        </div>
      </div>

      <div className="bg-iron-900 p-4 sm:p-6 rounded border border-iron-800 ">
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
                  className="flex-1 p-2 border border-iron-600 rounded-sm focus:ring-2 focus:ring-plate-yellow focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeTrackerItem(idx)}
                  aria-label="Remove tracker item"
                  className="text-plate-red/80 hover:text-plate-red p-2"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addTrackerItem}
              className="mt-2 px-4 py-2 text-plate-yellow hover:bg-plate-yellow/20 bg-plate-yellow/10 rounded-sm transition-colors inline-flex items-center gap-2 font-medium"
            >
              <Plus className="w-4 h-4" /> Add Item
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
                    className={`flex items-center gap-3 p-2 rounded-sm transition-all text-left ${
                      isChecked
                        ? "opacity-50 bg-transparent"
                        : "bg-iron-850  border border-iron-700 hover:bg-iron-800"
                    }`}
                  >
                    {isChecked ? (
                      <CheckCircle2 className="w-5 h-5 text-plate-green flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-chalk-600 flex-shrink-0 transition-colors" />
                    )}
                    <span
                      className={`flex-1 truncate ${
                        isChecked
                          ? "line-through opacity-70"
                          : "text-chalk-50 font-medium"
                      }`}
                      title={name}
                    >
                      {name}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="col-span-full text-center text-chalk-500 italic py-4">
                Your tracker list is empty.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
