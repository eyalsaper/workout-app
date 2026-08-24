import React, { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronUp, Wand2 } from "lucide-react";
import { useWorkout } from "../state/WorkoutContext";
import { buildPlanFromText, POPULAR_EXERCISES } from "../lib/planBuilder";
import { isRestEntry, cleanName } from "../lib/format";
import { weekdayLabel } from "../lib/training";

// A short questionnaire, not a blank page — each question feeds a keyword
// into the same free-text parser the builder already understands, so the
// "Other" boxes and the closing open question just add more words to it.
const GOAL_OPTIONS = [
  { value: "strength", label: "Get stronger", text: "strength" },
  { value: "hypertrophy", label: "Build muscle", text: "build muscle" },
  { value: "fatloss", label: "Lose fat / lean out", text: "lose fat cut" },
  { value: "general", label: "General fitness", text: "general fitness" },
];
const GOAL_LABELS = { strength: "strength", hypertrophy: "muscle gain", fatloss: "fat loss", general: "general fitness" };

const EQUIPMENT_OPTIONS = [
  { value: "Barbell", text: "barbell" },
  { value: "Dumbbell", text: "dumbbell" },
  { value: "Cable", text: "cable" },
  { value: "Machine", text: "machine" },
  { value: "Bodyweight", text: "bodyweight" },
];

const MUSCLE_OPTIONS = [
  { value: "Chest", text: "chest" },
  { value: "Back", text: "back" },
  { value: "Shoulders", text: "shoulders" },
  { value: "Arms", text: "arms" },
  { value: "Legs", text: "legs" },
  { value: "Core", text: "core" },
];

// Sunday-first, matching how the rest of the app lays out a week.
const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

const STEP_TITLES = ["Goal", "Days", "Equipment", "Muscles", "Exercises", "Anything else"];

const DEFAULT_ANSWERS = {
  goals: new Set(),
  goalOther: "",
  days: null,
  daysOther: "",
  specificDays: new Set(),
  equipment: new Set(),
  fullGym: false,
  equipmentOther: "",
  muscles: new Set(),
  noFocus: false,
  musclesOther: "",
  exercises: new Set(),
  exercisesOther: "",
  notes: "",
};

function toggleInSet(set, value) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

/** Turns the survey answers into the same kind of sentence the free-text builder parses. */
function synthesize(a) {
  const parts = [];
  GOAL_OPTIONS.forEach((g) => a.goals.has(g.value) && parts.push(g.text));
  if (a.goalOther) parts.push(a.goalOther);

  if (!a.fullGym) {
    EQUIPMENT_OPTIONS.forEach((eq) => a.equipment.has(eq.value) && parts.push(eq.text));
    if (a.equipmentOther) parts.push(a.equipmentOther);
  }

  if (!a.noFocus) {
    MUSCLE_OPTIONS.forEach((m) => a.muscles.has(m.value) && parts.push(m.text));
    if (a.musclesOther) parts.push(a.musclesOther);
  }

  if (a.exercisesOther) parts.push(a.exercisesOther);
  if (a.notes) parts.push(a.notes);

  return parts.filter(Boolean).join(", ");
}

function resolveDays(a) {
  if (a.specificDays.size > 0) return a.specificDays.size;
  if (a.days === "other") {
    const n = parseInt(a.daysOther, 10);
    return Number.isFinite(n) ? Math.min(6, Math.max(1, n)) : 3;
  }
  return a.days || 3;
}

function resolveTrainingDays(a) {
  return a.specificDays.size > 0 ? [...a.specificDays] : null;
}

function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="chip" data-active={active}>
      {children}
    </button>
  );
}

export default function PlanBuilderPage({ onBack, onDone }) {
  const { exerciseBank, createPlanFromBuilder } = useWorkout();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(DEFAULT_ANSWERS);
  const [showLibrary, setShowLibrary] = useState(false);
  const [result, setResult] = useState(null);
  const [planName, setPlanName] = useState("");

  const patch = (p) => setAnswers((a) => ({ ...a, ...p }));

  const build = () => {
    const generated = buildPlanFromText(synthesize(answers), {
      daysPerWeek: resolveDays(answers),
      trainingDays: resolveTrainingDays(answers),
      extraExercises: [...answers.exercises],
      exerciseBank,
    });
    setResult(generated);
    setPlanName(`${GOAL_LABELS[generated.summary.goal]} plan`);
    setStep(STEP_TITLES.length);
  };

  const goBack = () => {
    if (step === 0) onBack();
    else setStep((s) => s - 1);
  };

  const use = () => {
    createPlanFromBuilder(planName, result.days, result.newBankEntries);
    onDone();
  };

  if (step === STEP_TITLES.length && result) {
    return (
      <div className="max-w-lg mx-auto space-y-5 animate-in fade-in duration-300 pb-8">
        <div>
          <button
            type="button"
            onClick={() => setStep(STEP_TITLES.length - 1)}
            className="text-sm text-ink-muted hover:text-accent flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Edit answers
          </button>
          <h1 className="mt-2.5 text-4xl">Here's the plan</h1>
        </div>

        <p className="aside text-sm leading-relaxed">
          Building for {GOAL_LABELS[result.summary.goal]}, {result.summary.daysPerWeek} day
          {result.summary.daysPerWeek === 1 ? "" : "s"} a week
          {result.summary.muscles.length ? `, focused on ${result.summary.muscles.join(", ")}` : ""}
          {result.summary.equipment.length ? `, using ${result.summary.equipment.join(", ").toLowerCase()}` : ""}.
          {result.summary.explicit.length ? ` Including ${result.summary.explicit.join(", ")}.` : ""}
        </p>

        <input
          type="text"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          placeholder="Name this plan"
          className="w-full p-3 border border-border-control rounded-card bg-surface text-sm font-medium"
        />

        <div className="space-y-2">
          {result.days.map((day, dayIdx) => {
            const exercises = (day.exercises || []).filter((ex) => !isRestEntry(ex));
            const isRest = exercises.length === 0;
            return (
              <div key={dayIdx} className={isRest ? "slot-empty p-3.5" : "card p-3.5"}>
                <span
                  className="text-sm"
                  style={{ fontFamily: "var(--font-heading)", color: isRest ? "var(--color-ink-muted)" : "var(--color-ink)" }}
                >
                  {weekdayLabel(dayIdx)}
                </span>
                <p className="mt-1 text-sm text-ink-muted">
                  {isRest ? "rest" : exercises.map((ex) => cleanName(ex)).join(", ")}
                </p>
              </div>
            );
          })}
        </div>

        <button type="button" onClick={build} className="btn-outline w-full py-3 text-sm">
          Rebuild from these answers
        </button>
        <button type="button" onClick={use} className="btn-clay w-full py-4">
          Use this plan
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-in fade-in duration-300 pb-8">
      <div>
        <button type="button" onClick={goBack} className="text-sm text-ink-muted hover:text-accent flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> {step === 0 ? "Week" : STEP_TITLES[step - 1]}
        </button>
        <div className="mt-3 flex gap-1">
          {STEP_TITLES.map((t, i) => (
            <div
              key={t}
              className="flex-1 h-1.5 rounded-full"
              style={{ background: i <= step ? "var(--color-accent)" : "var(--color-border-control)" }}
            />
          ))}
        </div>
        <p className="mt-2 stencil">
          Question {step + 1} of {STEP_TITLES.length}
        </p>
      </div>

      {step === 0 && (
        <div className="card-hero p-5 space-y-4">
          <h1 className="text-2xl" style={{ fontFamily: "var(--font-heading)" }}>
            What's your main goal?
          </h1>
          <p className="text-sm text-ink-muted">Pick as many as apply.</p>
          <div className="flex flex-wrap gap-2">
            {GOAL_OPTIONS.map((g) => (
              <Chip key={g.value} active={answers.goals.has(g.value)} onClick={() => patch({ goals: toggleInSet(answers.goals, g.value) })}>
                {g.label}
              </Chip>
            ))}
          </div>
          <input
            type="text"
            value={answers.goalOther}
            onChange={(e) => patch({ goalOther: e.target.value })}
            placeholder="Other goal (optional)"
            className="w-full p-3 border border-border-control rounded-card bg-surface text-sm"
          />
        </div>
      )}

      {step === 1 && (
        <div className="card-hero p-5 space-y-4">
          <h1 className="text-2xl" style={{ fontFamily: "var(--font-heading)" }}>
            How many days a week can you train?
          </h1>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Chip key={n} active={!answers.specificDays.size && answers.days === n} onClick={() => patch({ days: n, specificDays: new Set() })}>
                {n}
              </Chip>
            ))}
            <Chip
              active={!answers.specificDays.size && answers.days === "other"}
              onClick={() => patch({ days: "other", specificDays: new Set() })}
            >
              Other
            </Chip>
          </div>
          {answers.days === "other" && !answers.specificDays.size && (
            <input
              type="number"
              autoFocus
              value={answers.daysOther}
              onChange={(e) => patch({ daysOther: e.target.value })}
              placeholder="Days per week"
              className="w-full p-3 border border-border-control rounded-card bg-surface text-sm"
            />
          )}

          <div className="pt-1 border-t border-border-control">
            <p className="mt-3 text-sm text-ink-soft">Or pick the exact days — this overrides the count above.</p>
            <div className="mt-2.5 flex gap-1.5">
              {DAY_LETTERS.map((letter, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => patch({ specificDays: toggleInSet(answers.specificDays, i) })}
                  aria-label={weekdayLabel(i)}
                  aria-pressed={answers.specificDays.has(i)}
                  className="flex-1 h-10 rounded-card text-sm font-medium"
                  style={{
                    background: answers.specificDays.has(i) ? "var(--color-ink)" : "var(--color-surface-wash)",
                    color: answers.specificDays.has(i) ? "var(--color-accent-ink)" : "var(--color-ink-faint)",
                  }}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card-hero p-5 space-y-4">
          <h1 className="text-2xl" style={{ fontFamily: "var(--font-heading)" }}>
            What equipment do you have?
          </h1>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map((eq) => (
              <Chip
                key={eq.value}
                active={!answers.fullGym && answers.equipment.has(eq.value)}
                onClick={() => patch({ fullGym: false, equipment: toggleInSet(answers.equipment, eq.value) })}
              >
                {eq.value}
              </Chip>
            ))}
            <Chip active={answers.fullGym} onClick={() => patch({ fullGym: !answers.fullGym, equipment: new Set() })}>
              Full gym / everything
            </Chip>
          </div>
          {!answers.fullGym && (
            <input
              type="text"
              value={answers.equipmentOther}
              onChange={(e) => patch({ equipmentOther: e.target.value })}
              placeholder="Other equipment (optional)"
              className="w-full p-3 border border-border-control rounded-card bg-surface text-sm"
            />
          )}
        </div>
      )}

      {step === 3 && (
        <div className="card-hero p-5 space-y-4">
          <h1 className="text-2xl" style={{ fontFamily: "var(--font-heading)" }}>
            Any muscles you want to focus on?
          </h1>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_OPTIONS.map((m) => (
              <Chip
                key={m.value}
                active={!answers.noFocus && answers.muscles.has(m.value)}
                onClick={() => patch({ noFocus: false, muscles: toggleInSet(answers.muscles, m.value) })}
              >
                {m.value}
              </Chip>
            ))}
            <Chip active={answers.noFocus} onClick={() => patch({ noFocus: !answers.noFocus, muscles: new Set() })}>
              No particular focus
            </Chip>
          </div>
          {!answers.noFocus && (
            <input
              type="text"
              value={answers.musclesOther}
              onChange={(e) => patch({ musclesOther: e.target.value })}
              placeholder="Other muscles (optional)"
              className="w-full p-3 border border-border-control rounded-card bg-surface text-sm"
            />
          )}
        </div>
      )}

      {step === 4 && (
        <div className="card-hero p-5 space-y-4">
          <h1 className="text-2xl" style={{ fontFamily: "var(--font-heading)" }}>
            Any specific exercises you want included?
          </h1>

          <button
            type="button"
            onClick={() => setShowLibrary((v) => !v)}
            className="w-full flex items-center justify-between p-3 border border-border-control rounded-card bg-surface text-sm"
          >
            <span>
              Choose from your library
              {answers.exercises.size > 0 ? ` · ${answers.exercises.size} selected` : ""}
            </span>
            {showLibrary ? <ChevronUp className="w-4 h-4 text-ink-faint" /> : <ChevronDown className="w-4 h-4 text-ink-faint" />}
          </button>

          {showLibrary && (
            <div className="max-h-64 overflow-y-auto border border-border-control rounded-card divide-y divide-border">
              {POPULAR_EXERCISES.map((name) => (
                <label key={name} className="flex items-center gap-3 p-2.5 text-sm text-ink-soft cursor-pointer">
                  <input
                    type="checkbox"
                    checked={answers.exercises.has(name)}
                    onChange={() => patch({ exercises: toggleInSet(answers.exercises, name) })}
                    className="w-4 h-4 accent-accent flex-shrink-0"
                  />
                  {name}
                </label>
              ))}
            </div>
          )}

          <input
            type="text"
            value={answers.exercisesOther}
            onChange={(e) => patch({ exercisesOther: e.target.value })}
            placeholder="Anything not in the library (optional)"
            className="w-full p-3 border border-border-control rounded-card bg-surface text-sm"
          />
        </div>
      )}

      {step === 5 && (
        <div className="card-hero p-5 space-y-4">
          <h1 className="text-2xl" style={{ fontFamily: "var(--font-heading)" }}>
            Anything you'd like to add?
          </h1>
          <p className="text-sm text-ink-muted">
            Injuries to work around, a schedule quirk, anything the questions above didn't cover.
          </p>
          <textarea
            autoFocus
            value={answers.notes}
            onChange={(e) => patch({ notes: e.target.value })}
            rows={4}
            placeholder="Optional"
            className="w-full p-3 border border-border-control rounded-card bg-surface text-sm resize-none"
          />
        </div>
      )}

      <button
        type="button"
        onClick={step === STEP_TITLES.length - 1 ? build : () => setStep((s) => s + 1)}
        className="btn-ink w-full py-3.5"
      >
        {step === STEP_TITLES.length - 1 ? (
          <>
            <Wand2 className="w-4 h-4" /> Build my plan
          </>
        ) : (
          "Next"
        )}
      </button>
    </div>
  );
}
