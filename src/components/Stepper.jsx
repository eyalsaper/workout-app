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
      <div className="stencil mb-1.5 text-center">
        {label}
      </div>
      <div className="bg-surface-inset rounded-inset p-2.5 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => bump(-step)}
          aria-label={`Decrease ${label}`}
          className="w-[29px] h-[29px] rounded-full bg-surface border border-border-control text-ink-mid flex items-center justify-center flex-shrink-0"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <div className="relative min-w-0">
          <input
            type="number"
            inputMode="decimal"
            aria-label={label}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full min-w-0 bg-transparent text-center readout text-2xl focus:outline-none"
            style={{ maxWidth: "3.2em" }}
          />
          {suffix && (
            <span className="absolute -right-3 bottom-0 text-[10px] text-ink-muted pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => bump(step)}
          aria-label={`Increase ${label}`}
          className="w-[29px] h-[29px] rounded-full bg-surface border border-border-control text-ink-mid flex items-center justify-center flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
