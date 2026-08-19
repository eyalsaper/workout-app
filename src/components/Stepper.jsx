import React from "react";
import { Minus, Plus } from "lucide-react";

/**
 * A big +/- stepper. Typing into a tiny field with chalky hands between sets is
 * miserable, so the tap targets are deliberately oversized — but the field is
 * still directly editable when you need an odd number.
 */
export default function Stepper({ label, value, onChange, step = 1, min = 0, suffix }) {
  const numeric = value === "" || value === null ? "" : Number(value);

  const bump = (delta) => {
    const base = numeric === "" ? 0 : numeric;
    const next = Math.max(min, Math.round((base + delta) * 100) / 100);
    onChange(String(next));
  };

  return (
    <div className="flex-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-chalk-500 mb-1.5 text-center">
        {label}
      </div>
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => bump(-step)}
          aria-label={`Decrease ${label}`}
          className="px-3 bg-iron-800 hover:bg-iron-800 active:bg-iron-600 border border-iron-600 rounded-l-lg text-chalk-200 flex items-center"
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className="flex-1 relative">
          <input
            type="number"
            inputMode="decimal"
            aria-label={label}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-full min-w-0 p-3 text-center text-xl font-bold border-y border-iron-600 focus:ring-2 focus:ring-plate-yellow focus:outline-none bg-iron-850 text-chalk-50"
          />
          {suffix && (
            <span className="absolute right-2 bottom-1 text-[10px] text-chalk-500 pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => bump(step)}
          aria-label={`Increase ${label}`}
          className="px-3 bg-iron-800 hover:bg-iron-800 active:bg-iron-600 border border-iron-600 rounded-r-lg text-chalk-200 flex items-center"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
