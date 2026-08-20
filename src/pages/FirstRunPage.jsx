import React, { useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import { TEMPLATES } from "../lib/templates";
import { WEEKDAY_NAMES } from "../lib/training";

const SCRATCH_ID = "scratch";

export default function FirstRunPage() {
  const { seedPlanFromTemplate, dismissFirstRun } = useWorkout();
  const [selected, setSelected] = useState(TEMPLATES[0].id);

  const setUpWeek = () => {
    if (selected === SCRATCH_ID) {
      seedPlanFromTemplate(WEEKDAY_NAMES.map((day) => ({ day, exercises: [] })));
    } else {
      const template = TEMPLATES.find((t) => t.id === selected);
      seedPlanFromTemplate(template.days);
    }
  };

  return (
    <div className="min-h-screen bg-surface-page flex items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-6 animate-in fade-in duration-300">
        <div>
          <div className="text-accent text-sm">Welcome</div>
          <h1 className="mt-2.5 text-5xl leading-[1.05]">
            A notebook
            <br />
            for your lifting.
          </h1>
          <p className="mt-3.5 text-sm text-ink-mid leading-relaxed">
            No streak badges, no shouting. Write down what you lift, and watch the numbers move.
          </p>
        </div>

        <div className="card-hero p-5">
          <div className="stencil mb-3">Start with</div>
          <div className="space-y-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t.id)}
                className={`w-full text-left rounded-card p-3.5 border transition-colors ${
                  selected === t.id ? "border-[1.5px] border-accent bg-accent/5" : "border-border"
                }`}
              >
                <div className="text-lg" style={{ fontFamily: "var(--font-heading)" }}>
                  {t.label}
                </div>
                <div className="text-xs text-ink-muted mt-0.5">{t.description}</div>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelected(SCRATCH_ID)}
              className={`w-full text-center rounded-card p-3.5 text-sm font-medium ${
                selected === SCRATCH_ID
                  ? "border-[1.5px] border-accent bg-accent/5 text-ink"
                  : "slot-empty text-ink-muted"
              }`}
            >
              Build my own from scratch
            </button>
          </div>
        </div>

        <p className="aside text-sm">You can change all of this later — nothing here is locked in.</p>

        <div className="space-y-2.5">
          <button type="button" onClick={setUpWeek} className="btn-ink w-full py-4">
            Set up my week
          </button>
          <button
            type="button"
            onClick={dismissFirstRun}
            className="w-full text-center text-sm font-medium text-ink-muted hover:text-accent"
          >
            I already have data to import
          </button>
        </div>
      </div>
    </div>
  );
}
