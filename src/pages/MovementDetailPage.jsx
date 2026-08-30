import React, { useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import { BarAxis, Bars, InsetBlock, PosterRow, Rule } from "../components/poster";
import { containerSteps, isContainer } from "../lib/format";
import {
  EQUIPMENT_OPTIONS,
  LIBRARY_BY_NAME,
  PATTERN_LABELS,
  guessPattern,
  resolveEquipment,
} from "../lib/exerciseLibrary";
import {
  MUSCLE_GROUPS,
  exerciseHistory,
  formatTonnage,
  friendlyDate,
  liftStats,
} from "../lib/training";
import { getStanding, standardsKeyFor } from "../lib/achievements";

/*
 * Movement detail — the info page for one movement.
 *
 * Reached by tapping a row in the movement library, in History, or in the
 * Record book. Holds everything the app knows about a movement: the user's
 * own notes, the coaching cues, its muscle groups and equipment, its bank
 * defaults, its history — and, for a CONTAINER movement, the list of
 * sub-movements it holds.
 *
 * A container ("Core Workout") is not a lift. It is a checklist of movements
 * you work through, so it never shows a load or a rep target.
 */

const REPS_UNITS = ["Reps", "Secs", "Mins"];
const WEIGHT_UNITS = ["KG", "LBS", "Body Wt."];

function Chip({ children }) {
  return (
    <span
      style={{
        borderRadius: 999,
        padding: "5px 11px",
        fontSize: 12,
        background: "var(--color-poster-card)",
        color: "var(--color-muted-poster)",
        flex: "none",
      }}
    >
      {children}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-[5px]">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  height: 42,
  borderRadius: "var(--radius-control)",
  background: "var(--color-card-hi)",
  border: "1px solid #24272d",
  padding: "0 12px",
  color: "var(--color-text)",
  outline: "none",
  width: "100%",
};

export default function MovementDetailPage({ movementName, onBack }) {
  const {
    exerciseBank,
    sessions,
    bodyweightKg,
    settings,
    getDetail,
    updateDetailField,
    toggleRoutineItem,
    updateBankField,
    updateAltSet,
    removeBankExercise,
    exerciseAppearsIn,
    routines,
    saveRoutine,
  } = useWorkout();

  const [editing, setEditing] = useState(false);
  const [addingTo, setAddingTo] = useState(false);

  const bankData = exerciseBank?.[movementName];
  const detail = getDetail(movementName);
  const container = isContainer(detail);
  const steps = containerSteps(detail);

  const cues = LIBRARY_BY_NAME[movementName]?.cues || [];
  const pattern = bankData?.pattern || guessPattern(movementName);
  const equipment = resolveEquipment(bankData, movementName);
  const rest = parseInt(bankData?.restSeconds, 10) || settings.defaultRestSeconds || 90;
  const groups = bankData?.muscleGroups || [];

  const points = exerciseHistory(sessions, movementName, bodyweightKg);
  const recent = points.slice(-8);
  const stats = liftStats(sessions, movementName, bodyweightKg);
  const appearsIn = exerciseAppearsIn(movementName);

  const standardsKey = standardsKeyFor(movementName);
  const standing =
    standardsKey && settings.sex
      ? getStanding(standardsKey, sessions, bodyweightKg, settings.sex)
      : null;

  const totalTonnage = points.reduce((sum, p) => sum + p.tonnage, 0);

  const toggleGroup = (group) =>
    updateBankField(
      movementName,
      "muscleGroups",
      groups.includes(group) ? groups.filter((g) => g !== group) : [...groups, group]
    );

  const links = detail.links || [];

  const setLink = (index, value) => {
    const next = [...links];
    next[index] = value;
    updateDetailField(movementName, "links", next.filter((v, i) => v || i < next.length - 1));
  };

  /** Appends this movement to a routine, with the bank's defaults. */
  const addToRoutine = (routine) => {
    const bank = bankData || {};
    saveRoutine({
      ...routine,
      movements: [
        ...(routine.movements || []),
        {
          movementId: movementName,
          order: (routine.movements || []).length,
          sets: Math.max(1, parseInt(bank.sets, 10) || 3),
          reps: bank.reps || "5",
          targetLoadKg: parseFloat(bank.weight) || 0,
        },
      ],
    });
    setAddingTo(false);
  };

  return (
    <div
      className="flex-1 min-h-0 flex flex-col"
      style={{ background: "var(--color-poster)", overflowY: "auto", padding: "6px 24px 16px" }}
    >
      <div className="flex items-center justify-between flex-none" style={{ marginBottom: 10 }}>
        <button type="button" className="link-teal" onClick={onBack}>
          Back
        </button>
        <span className="kicker">{container ? "Routine" : "Movement"}</span>
        <button
          type="button"
          style={{ fontSize: 13, color: "var(--color-brass)" }}
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      <span className="poster-title" data-lines={movementName.length > 14 ? "2" : "1"}>
        {movementName}
      </span>

      {/* The user's own words. Empty field, no prompts. */}
      {editing ? (
        <textarea
          value={detail.explanation || ""}
          onChange={(e) => updateDetailField(movementName, "explanation", e.target.value)}
          placeholder="What this is, how it should feel…"
          rows={3}
          style={{
            ...inputStyle,
            height: "auto",
            padding: 12,
            marginTop: 12,
            resize: "none",
            fontFamily: "var(--font-body)",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        />
      ) : (
        detail.explanation && (
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--color-text)",
              paddingTop: 12,
            }}
          >
            {detail.explanation}
          </p>
        )
      )}

      {!container && (
        <div className="flex flex-wrap gap-[6px]" style={{ paddingTop: 14 }}>
          {groups.length > 0 && <Chip>{groups.join(" · ")}</Chip>}
          {PATTERN_LABELS[pattern] && <Chip>{PATTERN_LABELS[pattern]}</Chip>}
          <Chip>{equipment}</Chip>
          <Chip>
            Rest {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}
          </Chip>
        </div>
      )}

      {/*
        A movement that still holds a nested list, only until the one-time
        conversion has run. Routines live in Routines now — there is no way
        to make a new one here.
      */}
      {container && (
        <div style={{ paddingTop: 20 }}>
          <span className="label">In this routine · {steps.length}</span>
          <InsetBlock style={{ marginTop: 10 }}>
            <div className="flex flex-col gap-[10px]">
              {steps.map((step, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleRoutineItem(movementName, index)}
                    className="flex items-center gap-3 text-left"
                    style={{ minHeight: 32 }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        flex: "none",
                        borderRadius: 5,
                        border: detail.routineChecked?.[`${index}_0`]
                          ? "1px solid var(--color-teal)"
                          : "1px solid #33363d",
                        background: detail.routineChecked?.[`${index}_0`]
                          ? "var(--color-teal)"
                          : "transparent",
                        color: "#0e0f12",
                        fontSize: 12,
                        lineHeight: "16px",
                        textAlign: "center",
                      }}
                    >
                      {detail.routineChecked?.[`${index}_0`] ? "✓" : ""}
                    </span>
                    <span style={{ fontSize: 14, color: "var(--color-text)" }}>{step}</span>
                  </button>
              ))}
            </div>
          </InsetBlock>
        </div>
      )}

      {/* ---- cues ---- */}
      {!container && cues.length > 0 && !editing && (
        <div style={{ paddingTop: 22 }}>
          <span className="label">Cues</span>
          <ul className="flex flex-col gap-[8px]" style={{ paddingTop: 10 }}>
            {cues.map((cue, i) => (
              <li key={i} className="flex gap-3" style={{ fontSize: 14, color: "var(--color-text)" }}>
                <span
                  className="tabular"
                  style={{ color: "var(--color-brass)", fontFamily: "var(--font-display)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {cue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- bank defaults, editable ---- */}
      {editing && bankData && (
        <div className="flex flex-col gap-[12px]" style={{ paddingTop: 22 }}>
          <span className="label">Muscle groups</span>
          <div className="flex flex-wrap gap-[6px]">
            {MUSCLE_GROUPS.map((group) => (
              <button
                key={group}
                type="button"
                className="mode-chip"
                data-active={groups.includes(group)}
                onClick={() => toggleGroup(group)}
              >
                {group}
              </button>
            ))}
          </div>

          <Field label="Equipment">
            <select
              value={bankData.equipment || ""}
              onChange={(e) => updateBankField(movementName, "equipment", e.target.value)}
              style={inputStyle}
            >
              <option value="">Auto ({equipment})</option>
              {EQUIPMENT_OPTIONS.map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex gap-2">
            <Field label="Sets">
              <input
                type="number"
                min="1"
                value={bankData.sets ?? ""}
                onChange={(e) => updateBankField(movementName, "sets", e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Rest (s)">
              <input
                type="number"
                min="15"
                step="15"
                value={bankData.restSeconds ?? ""}
                onChange={(e) => updateBankField(movementName, "restSeconds", e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          {/* A container has no load and no rep target — it has steps. */}
          {!container && (
            <div className="flex gap-2">
              <Field label="Reps">
                <div className="flex">
                  <input
                    value={bankData.reps ?? ""}
                    onChange={(e) => updateBankField(movementName, "reps", e.target.value)}
                    style={{ ...inputStyle, borderRadius: "14px 0 0 14px" }}
                  />
                  <select
                    value={bankData.repsUnit ?? "Reps"}
                    onChange={(e) => updateBankField(movementName, "repsUnit", e.target.value)}
                    style={{ ...inputStyle, width: 74, borderRadius: "0 14px 14px 0", borderLeft: "none" }}
                  >
                    {REPS_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
              <Field label="Weight">
                <div className="flex">
                  <input
                    type="number"
                    disabled={bankData.weightUnit === "Body Wt."}
                    value={bankData.weightUnit === "Body Wt." ? "" : bankData.weight ?? ""}
                    onChange={(e) => updateBankField(movementName, "weight", e.target.value)}
                    style={{ ...inputStyle, borderRadius: "14px 0 0 14px" }}
                  />
                  <select
                    value={bankData.weightUnit ?? "KG"}
                    onChange={(e) => updateBankField(movementName, "weightUnit", e.target.value)}
                    style={{ ...inputStyle, width: 90, borderRadius: "0 14px 14px 0", borderLeft: "none" }}
                  >
                    {WEIGHT_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>
          )}

          {/*
            Alternative sets: every set carries its own numbers, which is what
            a pyramid or a drop set is. Off by default — most movements are
            straight sets and a per-set table would be noise.
          */}
          {!container && (
            <>
              <button
                type="button"
                className="mode-chip"
                data-active={!!bankData.isAlternative}
                style={{ alignSelf: "flex-start" }}
                onClick={() =>
                  updateBankField(movementName, "isAlternative", !bankData.isAlternative)
                }
              >
                Different numbers per set
              </button>

              {bankData.isAlternative && (
                <div className="flex flex-col gap-[8px]">
                  {Array.from({ length: Math.max(1, parseInt(bankData.sets, 10) || 1) }).map(
                    (_, i) => {
                      const alt = bankData.altSets?.[i] || {};
                      return (
                        <div key={i} className="flex items-center gap-2">
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
                            {i + 1}
                          </span>
                          <input
                            value={alt.reps ?? ""}
                            placeholder="reps"
                            onChange={(e) => updateAltSet(movementName, i, "reps", e.target.value)}
                            style={{ ...inputStyle, height: 38 }}
                          />
                          <input
                            value={alt.weight ?? ""}
                            placeholder="kg"
                            inputMode="decimal"
                            onChange={(e) =>
                              updateAltSet(movementName, i, "weight", e.target.value)
                            }
                            style={{ ...inputStyle, height: 38 }}
                          />
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </>
          )}

          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              removeBankExercise(movementName);
              onBack();
            }}
          >
            Remove from library
          </button>
        </div>
      )}

      {/* ---- links ---- */}
      {(links.length > 0 || editing) && (
        <div style={{ paddingTop: 22 }}>
          <span className="label">Links</span>
          <div className="flex flex-col gap-[8px]" style={{ paddingTop: 10 }}>
            {(editing ? [...links, ""] : links).map((link, index) =>
              editing ? (
                <input
                  key={index}
                  value={link}
                  onChange={(e) => setLink(index, e.target.value)}
                  placeholder="https://…"
                  style={{ ...inputStyle, height: 38 }}
                />
              ) : (
                <a
                  key={index}
                  href={link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="link-teal truncate"
                  style={{ display: "block" }}
                >
                  {link}
                </a>
              )
            )}
          </div>
        </div>
      )}

      {!editing && Object.keys(routines || {}).length > 0 && (
        <button
          type="button"
          className="link-teal text-left"
          style={{ paddingTop: 20 }}
          onClick={() => setAddingTo(true)}
        >
          Add to a routine
        </button>
      )}

      {addingTo && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.6)" }}>
          <button type="button" style={{ flex: 1 }} onClick={() => setAddingTo(false)} aria-label="Close" />
          <div
            className="w-full max-w-lg mx-auto flex flex-col gap-2"
            style={{
              background: "var(--color-card)",
              borderTop: "1px solid var(--color-border)",
              padding: 22,
              maxHeight: "70dvh",
              overflowY: "auto",
            }}
          >
            <span className="label">Add {movementName} to</span>
            {Object.values(routines).map((routine) => (
              <button
                key={routine.id}
                type="button"
                onClick={() => addToRoutine(routine)}
                className="row-card text-left row-title"
              >
                {routine.name}
              </button>
            ))}
            <button type="button" className="btn-secondary" onClick={() => setAddingTo(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ---- history ---- */}
      {!editing && (
        <>
          {points.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--color-dim)", paddingTop: 22 }}>
              Nothing logged yet. Its history lands here after the first session.
            </p>
          ) : (
            <>
              {!container && recent.length > 1 && (
                <div style={{ paddingTop: 22 }}>
                  <span className="label">Estimated one-rep max</span>
                  <div style={{ paddingTop: 14 }}>
                    <Bars
                      // Two sessions can share a date, so the index disambiguates.
                      series={recent.map((p, i) => ({
                        key: `${p.date}-${i}`,
                        value: Math.round(p.e1rm),
                      }))}
                      height={110}
                      label={`Estimated one-rep max over the last ${recent.length} sessions`}
                    />
                    <BarAxis
                      from={recent.length >= 8 ? "8 sessions ago" : "first logged"}
                      to="latest"
                    />
                  </div>
                </div>
              )}

              <div style={{ paddingTop: 22 }}>
                <PosterRow label="Sessions" value={points.length} brassRule />
                {!container && stats.heaviestWeight > 0 && (
                  <PosterRow
                    label="Heaviest set"
                    value={`${stats.heaviestWeight} × ${stats.heaviestReps}`}
                  />
                )}
                <PosterRow label="Lifted" value={formatTonnage(totalTonnage)} />
                {standing && (
                  <PosterRow
                    label="Tier"
                    value={standing.rank || "unranked"}
                    valueColor="var(--color-teal)"
                  />
                )}
              </div>
            </>
          )}

          {appearsIn.length > 0 && (
            <div style={{ paddingTop: 22 }}>
              <span className="label">Appears in</span>
              <div style={{ paddingTop: 8 }}>
                {appearsIn.map((entry) => (
                  <React.Fragment key={entry.dayId}>
                    <Rule />
                    <div style={{ padding: "12px 0", fontSize: 14, color: "var(--color-text)" }}>
                      Day {entry.position} · {entry.dayName}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
