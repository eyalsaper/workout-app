import React, { useRef, useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import { downloadTextFile } from "../lib/csv";
import { planToJson, planToCsv, planFilename } from "../lib/planExport";
import { parsePlanFile, planFromImport } from "../lib/planImport";

/*
 * The plan editor — how many workouts, in what order, and what is in each.
 *
 * A plan day is NOT a routine. It owns its own movements, so editing Workout 3
 * never rewrites Workout 5 and no day has to exist on the shelf first. A
 * routine can be copied into a day as a starting point, and that is where the
 * link ends.
 *
 * Reordering runs through reconcileCursor, so the workout that was up next
 * stays up next wherever it lands, and no edit resets a round.
 */

export default function PlanBuilderPage({ onBack, onEditDay }) {
  const { planDays, setPlanDays, setPlanLength, dayItemCount, describeDay, program } =
    useWorkout();
  const { routines, exerciseBank, applyPlanImport } = useWorkout();
  const fileRef = useRef(null);
  // A file that has been read but not saved yet: { parsed, mode } or { error }.
  const [pending, setPending] = useState(null);
  const [notice, setNotice] = useState("");

  const hasPlan = !!program && planDays.length > 0;

  const readFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setNotice("");
    const parsed = parsePlanFile(await file.text());
    if (!parsed.ok) return setPending({ error: parsed.error, fileName: file.name });
    setPending({ parsed, fileName: file.name, mode: hasPlan ? "update" : "new" });
  };

  const preview = pending?.parsed
    ? planFromImport(pending.parsed, {
        mode: pending.mode,
        program,
        bank: exerciseBank,
        newId: (prefix) => `${prefix}_preview`,
      })
    : null;

  const saveImport = () => {
    const summary = applyPlanImport(pending.parsed, pending.mode);
    setPending(null);
    setNotice(
      summary.mode === "update"
        ? `Plan updated: ${summary.movements} movements across ${pending.parsed.days.length} workouts.`
        : `New plan "${pending.parsed.name}" saved and made active.`
    );
  };

  // Shrinking the plan drops days off the end for good, so a day that has
  // movements in it is never dropped without asking first.
  const chooseLength = (n) => {
    const dropped = planDays.slice(n).filter((day) => dayItemCount(day) > 0);
    if (dropped.length) {
      const names = dropped.map((day) => day.name || "Workout").join(", ");
      const ok = window.confirm(
        `This removes ${dropped.length} workout${dropped.length === 1 ? "" : "s"} that ` +
          `${dropped.length === 1 ? "has" : "have"} movements in ${dropped.length === 1 ? "it" : "them"}: ${names}.

` +
          "It cannot be undone. Export the plan first if you want a copy. Remove anyway?"
      );
      if (!ok) return;
    }
    setPlanLength(n);
  };

  const exportPlan = (ext) => {
    const text =
      ext === "json"
        ? planToJson(program, routines, exerciseBank)
        : planToCsv(program, routines, exerciseBank);
    downloadTextFile(
      planFilename(program, ext),
      text,
      ext === "json" ? "application/json" : "text/csv"
    );
  };

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= planDays.length) return;
    const next = [...planDays];
    [next[index], next[target]] = [next[target], next[index]];
    setPlanDays(next);
  };

  const count = planDays.length;

  if (pending) {
    const p = pending.parsed;
    const sum = preview?.summary;
    return (
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-[12px]">
        <span className="screen-title flex-none">Import plan</span>

        {pending.error ? (
          <>
            <div className="card flex-none" style={{ padding: 16, fontSize: 14 }}>
              {pending.error}
              <div style={{ fontSize: 12, color: "var(--color-dim)", marginTop: 6 }}>
                {pending.fileName}
              </div>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setPending(null)}>
              Back
            </button>
          </>
        ) : (
          <>
            <div className="card flex-none flex flex-col gap-[6px]" style={{ padding: 14 }}>
              <span className="row-title">{p.name}</span>
              <span style={{ fontSize: 12, color: "var(--color-muted)" }}>
                {p.days.length} workout{p.days.length === 1 ? "" : "s"} · {sum.movements} movements ·{" "}
                {pending.fileName}
              </span>
              <span style={{ fontSize: 12, color: "var(--color-muted)" }}>
                {p.skipped
                  ? `${p.skipped} row${p.skipped === 1 ? "" : "s"} skipped (unreadable)`
                  : "No rows skipped"}
              </span>
              {p.warnings.map((w) => (
                <span key={w} style={{ fontSize: 12, color: "var(--color-muted)" }}>
                  {w}
                </span>
              ))}
              {sum.newMovements.length > 0 && (
                <span style={{ fontSize: 12, color: "var(--color-muted)" }}>
                  New exercises to create ({sum.newMovements.length}): {sum.newMovements.join(", ")}
                </span>
              )}
            </div>

            {hasPlan && (
              <div className="flex flex-col gap-[6px] flex-none">
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="mode-chip"
                    data-active={pending.mode === "update"}
                    onClick={() => setPending({ ...pending, mode: "update" })}
                  >
                    Update current plan
                  </button>
                  <button
                    type="button"
                    className="mode-chip"
                    data-active={pending.mode === "new"}
                    onClick={() => setPending({ ...pending, mode: "new" })}
                  >
                    New plan
                  </button>
                </div>
                <span style={{ fontSize: 12, color: "var(--color-dim)" }}>
                  {pending.mode === "update"
                    ? `"${program.name}" keeps its history. ${sum.kept} workout${
                        sum.kept === 1 ? "" : "s"
                      } matched, ${sum.added} added${
                        sum.removed ? `, ${sum.removed} no longer in the file removed` : ""
                      }.`
                    : "Saved next to your current plan, which stays as it is."}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-[8px] min-h-0" style={{ overflowY: "auto" }}>
              {preview.program.days.map((day, i) => (
                <div key={i} className="card flex flex-col gap-[4px]" style={{ padding: 12 }}>
                  <span className="row-title">
                    {i + 1}. {day.name}
                  </span>
                  {day.movements.length === 0 && (
                    <span style={{ fontSize: 12, color: "var(--color-dim)" }}>empty</span>
                  )}
                  {day.movements.map((m, j) => (
                    <span key={j} className="tabular" style={{ fontSize: 12, color: "var(--color-muted)" }}>
                      {m.movementId}
                      {m.sets || m.reps ? ` · ${m.sets ?? "?"}×${m.reps || "?"}` : ""}
                      {m.targetLoadKg ? ` @ ${m.targetLoadKg} kg` : ""}
                    </span>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 flex-none" style={{ marginTop: "auto" }}>
              <button type="button" className="btn-primary" onClick={saveImport}>
                {pending.mode === "update" ? "Update plan" : "Save as new plan"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

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
          {program?.name || "Plan"}
        </span>
        <span style={{ width: 40 }} />
      </div>

      {/* How long is the pass through the plan. Everything else follows. */}
      <div className="card flex-none flex flex-col gap-[10px]" style={{ padding: 16 }}>
        <span className="label">Workouts in this plan</span>
        <div className="flex flex-wrap gap-[6px]">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <button
              key={n}
              type="button"
              className="mode-chip"
              data-active={count === n}
              onClick={() => chooseLength(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: "var(--color-dim)" }}>
          One pass through all {count} is a round. Adding or removing never
          resets the round you are in.
        </span>
      </div>

      <div className="flex flex-col gap-[8px] min-h-0" style={{ overflowY: "auto" }}>
        <span className="label" style={{ paddingLeft: 2 }}>
          The order
        </span>

        {planDays.map((day, index) => {
          const movementCount = dayItemCount(day);
          return (
            <div key={day.id} className="card flex items-center gap-2" style={{ padding: 12 }}>
              <span
                className="tabular"
                style={{
                  width: 20,
                  flex: "none",
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                  color: "var(--color-dim)",
                }}
              >
                {index + 1}
              </span>

              <button
                type="button"
                onClick={() => onEditDay(day.id)}
                className="flex flex-col gap-[2px] min-w-0 text-left"
                style={{ flex: 1 }}
              >
                <span className="row-title truncate">{day.name || `Workout ${index + 1}`}</span>
                <span className="text-[12px] truncate" style={{ color: "var(--color-muted)" }}>
                  {movementCount ? describeDay(day) : "empty — tap to build it"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => move(index, -1)}
                aria-label={`Move ${day.name} up`}
                style={{ width: 32, height: 34, flex: "none", color: "var(--color-muted)" }}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                aria-label={`Move ${day.name} down`}
                style={{ width: 32, height: 34, flex: "none", color: "var(--color-muted)" }}
              >
                ↓
              </button>
            </div>
          );
        })}

        {count === 0 && (
          <span style={{ fontSize: 13, color: "var(--color-dim)" }}>
            No workouts yet. Pick a number above.
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 flex-none" style={{ marginTop: "auto" }}>
        <button type="button" className="mode-chip" onClick={() => exportPlan("json")}>
          Export plan (JSON)
        </button>
        <button type="button" className="mode-chip" onClick={() => exportPlan("csv")}>
          Export plan (CSV)
        </button>
        <button type="button" className="mode-chip" onClick={() => fileRef.current?.click()}>
          Import plan
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.json,text/csv,application/json,text/plain"
          style={{ display: "none" }}
          onChange={readFile}
        />
      </div>
      <span style={{ fontSize: 12, color: notice ? "var(--color-text)" : "var(--color-dim)" }}>
        {notice || "Tap a workout to build or edit it."}
      </span>
    </div>
  );
}
