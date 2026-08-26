import React, { useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import { orderedDays } from "../lib/plan";

/*
 * The blocks shelf — every programme the account holds, one of them active.
 *
 * Reached from the Program screen's title. Switching never touches sessions:
 * history is keyed by date and by plan day, not by which block is on top, so
 * moving between blocks costs nothing and loses nothing.
 */

export default function ProgramsPage({ onBack }) {
  const {
    programs,
    programIds,
    activeProgramId,
    routines,
    sessions,
    createProgram,
    switchProgram,
    renameProgram,
    duplicateProgram,
    removeProgram,
  } = useWorkout();

  const [renaming, setRenaming] = useState(null);
  const [draft, setDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const sessionsIn = (program) => {
    const dayIds = new Set(orderedDays(program).map((day) => day.id));
    return Object.values(sessions || {}).filter(
      (s) => s?.finishedAt && dayIds.has(s.planDayId)
    ).length;
  };

  const startRename = (id) => {
    setRenaming(id);
    setDraft(programs[id]?.name || "");
  };

  const commitRename = () => {
    if (draft.trim()) renameProgram(renaming, draft.trim());
    setRenaming(null);
  };

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-[12px]">
      <div className="flex items-center justify-between flex-none">
        <button type="button" className="link-teal" onClick={onBack}>
          Program
        </button>
        <span
          className="uppercase"
          style={{ fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, color: "var(--color-muted)" }}
        >
          Blocks
        </span>
        <button
          type="button"
          style={{ fontSize: 13, color: "var(--color-brass)" }}
          onClick={() => createProgram()}
        >
          New
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
          {programIds.length} block{programIds.length === 1 ? "" : "s"}
        </span>
        <span style={{ fontSize: 13, color: "var(--color-muted)" }}>
          One is active. Switching keeps every session you have logged.
        </span>
      </div>

      <div className="flex flex-col gap-[8px] min-h-0" style={{ overflowY: "auto" }}>
        {programIds.map((id) => {
          const program = programs[id];
          const days = orderedDays(program);
          const isActive = id === activeProgramId;

          return (
            <div
              key={id}
              className="card flex flex-col gap-[10px]"
              style={{
                padding: 16,
                // The active block is the only brass thing on this screen.
                borderColor: isActive ? "var(--color-brass)" : "var(--color-border)",
              }}
            >
              <div className="flex items-baseline justify-between gap-3">
                {renaming === id ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && commitRename()}
                    onBlur={commitRename}
                    className="row-title"
                    style={{
                      flex: 1,
                      background: "transparent",
                      outline: "none",
                      caretColor: "var(--color-brass)",
                    }}
                  />
                ) : (
                  <span className="row-title truncate">{program.name}</span>
                )}
                {isActive && (
                  <span className="kicker" style={{ flex: "none" }}>
                    Active
                  </span>
                )}
              </div>

              <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>
                {days.length} day{days.length === 1 ? "" : "s"} · round{" "}
                {program.cursor?.round ?? 1} · {sessionsIn(program)} session
                {sessionsIn(program) === 1 ? "" : "s"} logged
              </span>

              <div className="flex flex-wrap gap-[6px]">
                {!isActive && (
                  <button
                    type="button"
                    className="mode-chip"
                    data-active
                    onClick={() => switchProgram(id)}
                  >
                    Make active
                  </button>
                )}
                <button type="button" className="mode-chip" onClick={() => startRename(id)}>
                  Rename
                </button>
                <button type="button" className="mode-chip" onClick={() => duplicateProgram(id)}>
                  Duplicate
                </button>
                {programIds.length > 1 && (
                  <button
                    type="button"
                    className="mode-chip"
                    onClick={() => setConfirmDelete(id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div
            className="w-full max-w-lg mx-auto flex flex-col gap-3"
            style={{
              background: "var(--color-card)",
              borderTop: "1px solid var(--color-border)",
              padding: 22,
            }}
          >
            <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600 }}>
              Delete {programs[confirmDelete]?.name}?
            </span>
            {/* Worth saying plainly: the block goes, the training does not. */}
            <span style={{ fontSize: 13, color: "var(--color-muted)" }}>
              The block and its day list go. Every session you logged stays, and
              so do the routines.
            </span>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                removeProgram(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Delete block
            </button>
            <button type="button" className="btn-primary" onClick={() => setConfirmDelete(null)}>
              Keep it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
