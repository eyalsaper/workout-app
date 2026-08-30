import React, { useRef, useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import ArtLayer from "../components/ArtLayer";
import { Kicker, PosterButton, Rule } from "../components/poster";
import { artSeed } from "../lib/art";
import { READY_MADE } from "../lib/templates";
import { parseImportCsv } from "../lib/csv";

/*
 * 8O · First run.
 *
 * No account, or an account with no programme. Ready-made creates a programme
 * in PLAN MODE with its days in order, cursor at Day 1, round 1 — the user
 * chooses nothing about modes.
 *
 * No sign-up wall before this screen; account creation happens at first sync.
 */

const HERO = 430;

export default function FirstRunPage({ onBuildOwn }) {
  const { createProgramFromTemplate, importSessions } = useWorkout();
  const [picking, setPicking] = useState(false);
  const [notice, setNotice] = useState(null);
  const fileRef = useRef(null);

  const runImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const text = await file.text();
    const { sessions, imported, skipped } = parseImportCsv(text);
    importSessions(sessions);
    setNotice(
      `${imported} set${imported === 1 ? "" : "s"} imported${
        skipped ? `, ${skipped} row${skipped === 1 ? "" : "s"} skipped` : ""
      }.`
    );
  };

  return (
    <div
      className="flex-1 min-h-0 flex flex-col"
      style={{ background: "var(--color-poster)", overflowY: "auto" }}
    >
      <div
        className="relative flex-none flex flex-col justify-end"
        style={{ height: HERO, padding: "0 24px 24px" }}
      >
        <ArtLayer mood="welcome" seedKey={artSeed.firstRun()} scrim="poster" />
        <div className="relative flex flex-col gap-[8px]">
          <Kicker>Iron Log</Kicker>
          <span className="poster-title" data-lines="2">
            Pick up
            <br />
            the bar
          </span>
          <span style={{ fontSize: 13, color: "var(--color-muted-poster)" }}>
            a log, a program, and the numbers that matter
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 flex-1" style={{ padding: "0 24px 16px" }}>
        {picking ? (
          <>
            <span className="label">Ready-made</span>
            {READY_MADE.map((template) => (
              <button
                key={template.id}
                type="button"
                className="row-card flex justify-between items-center w-full text-left press"
                onClick={() => createProgramFromTemplate(template)}
              >
                <div className="flex flex-col gap-[2px] min-w-0">
                  <span className="row-title truncate">{template.name}</span>
                  <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>
                    {template.description}
                  </span>
                </div>
                <span className="row-value" style={{ flex: "none" }}>
                  {template.days.length}
                </span>
              </button>
            ))}
            <button type="button" className="btn-secondary" onClick={() => setPicking(false)}>
              Back
            </button>
          </>
        ) : (
          <>
            <PosterButton onClick={() => setPicking(true)}>Start a ready-made program</PosterButton>
            <button type="button" className="btn-secondary btn-poster" onClick={onBuildOwn}>
              Build my own
            </button>

            <div style={{ marginTop: "auto" }}>
              <Rule />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center justify-between w-full text-left gap-3"
                style={{ padding: "14px 0" }}
              >
                <div className="flex flex-col gap-[2px]">
                  <span className="row-title">Already training?</span>
                  <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>
                    pull a CSV from your old app
                  </span>
                </div>
                <span style={{ color: "var(--color-teal)", fontSize: 13, flex: "none" }}>
                  Import
                </span>
              </button>
              {notice && (
                <span style={{ fontSize: 12, color: "var(--color-teal)" }} role="status">
                  {notice}
                </span>
              )}
            </div>
          </>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={runImport}
          style={{ display: "none" }}
        />
      </div>
    </div>
  );
}
