import React, { useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import { useAuth } from "../state/AuthContext";
import ArtBand from "../components/ArtBand";
import { libraryCount } from "../lib/art";
import { switchModeCopy } from "../lib/plan";
import {
  buildObsidianFiles,
  deliverObsidianFiles,
  readLastExport,
  recordExport,
} from "../lib/obsidianExport";

/*
 * 8N · Settings.
 *
 * Program mode is the first row because it changes the meaning of three other
 * screens. There is NO theme row — dark is the only theme. CSV export is not
 * here either; it lives on History, where the data is.
 */

function Row({ label, sub, value, onClick, children }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`row-card flex justify-between items-center gap-3 w-full text-left${
        onClick ? " press" : ""
      }`}
    >
      <div className="flex flex-col gap-[2px] min-w-0">
        <span className="row-title truncate">{label}</span>
        {sub && (
          <span className="text-[12px] truncate" style={{ color: "var(--color-muted)" }}>
            {sub}
          </span>
        )}
      </div>
      {children || (
        <span className="row-value truncate" style={{ flex: "none", maxWidth: "45%" }}>
          {value}
        </span>
      )}
    </Tag>
  );
}

/** A small inline choice, for the two-value settings. */
function Choice({ options, value, onChange }) {
  return (
    <div className="flex gap-1" style={{ flex: "none" }}>
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          style={{
            padding: "5px 11px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            background: value === key ? "var(--color-brass)" : "transparent",
            color: value === key ? "var(--color-on-brass)" : "var(--color-muted)",
            border: value === key ? "1px solid var(--color-brass)" : "1px solid #33363d",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage({ onBack, onOpenArtLibrary, onOpenMovementLibrary }) {
  const { settings, setSettings, program, setProgramMode, exerciseBank, sessions, routines, planDays } =
    useWorkout();
  const [lastExport, setLastExport] = useState(readLastExport);
  const [exportState, setExportState] = useState("");

  const exportToObsidian = async () => {
    setExportState("working");
    const built = buildObsidianFiles({ sessions, program, routines, exerciseBank, planDays });
    const result = await deliverObsidianFiles(built);
    if (result === "cancelled") return setExportState("");
    setLastExport(recordExport());
    setExportState(result);
  };
  const movementCount = Object.keys(exerciseBank || {}).filter(
    (name) => name !== "_empty" && !exerciseBank[name].isHidden
  ).length;
  const { user, signOut } = useAuth();
  const [pendingMode, setPendingMode] = useState(null);

  const mode = program?.mode === "schedule" ? "schedule" : "plan";
  const patch = (next) => setSettings({ ...settings, ...next });

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-[10px]">
      <div className="flex items-center justify-between flex-none">
        <span className="screen-title">Settings</span>
        <button type="button" className="link-teal" onClick={onBack}>
          Done
        </button>
      </div>

      <ArtBand screen="settings" height={64} kicker="Iron Log" sub="v2 · dark only" />

      <div className="flex flex-col gap-[10px] min-h-0" style={{ overflowY: "auto" }}>
        <span className="label" style={{ paddingLeft: 2 }}>
          Training
        </span>

        <Row
          label="Program mode"
          sub={mode === "plan" ? "day by day, not weekdays" : "days bound to weekdays"}
          onClick={() => setPendingMode(mode === "plan" ? "schedule" : "plan")}
          value={mode === "plan" ? "Plan" : "Schedule"}
        />

        <Row label="Default rest">
          <input
            type="number"
            step="15"
            min="15"
            value={settings.defaultRestSeconds}
            onChange={(e) => patch({ defaultRestSeconds: e.target.value })}
            aria-label="Default rest in seconds"
            style={{
              width: 58,
              textAlign: "right",
              background: "transparent",
              outline: "none",
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 700,
              color: "var(--color-brass-text)",
            }}
          />
        </Row>

        {/*
          Sex picks which strength-standard table the record book reads. The
          app never guesses it, so without it 8K shows every lift unranked.
        */}
        <Row label="Sex" sub="picks the record book's standards">
          <Choice
            options={[
              ["male", "Male"],
              ["female", "Female"],
            ]}
            value={settings.sex}
            onChange={(sex) => patch({ sex })}
          />
        </Row>

        {/* Only meaningful in schedule mode — in plan mode the week just frames
            the charts, and those are Sunday-based regardless. */}
        {mode === "schedule" && (
          <Row label="Week starts">
            <Choice
              options={[
                ["sun", "Sunday"],
                ["mon", "Monday"],
              ]}
              value={settings.weekStartsOn}
              onChange={(weekStartsOn) => patch({ weekStartsOn })}
            />
          </Row>
        )}

        <span className="label" style={{ paddingLeft: 2, paddingTop: 4 }}>
          App
        </span>

        <Row label="Character art" sub="random draw, every screen">
          <Choice
            options={[
              ["on", "On"],
              ["off", "Off"],
            ]}
            value={settings.characterArt === false ? "off" : "on"}
            onChange={(v) => patch({ characterArt: v === "on" })}
          />
        </Row>

        <Row
          label="Movements"
          sub="notes, cues and defaults"
          value={`${movementCount}`}
          onClick={onOpenMovementLibrary}
        />

        <Row
          label="Art library"
          sub="add your own images"
          value={`${libraryCount()} images`}
          onClick={onOpenArtLibrary}
        />

        <span className="label" style={{ paddingLeft: 2, marginTop: 6 }}>
          Obsidian
        </span>
        <Row
          label="Export to Obsidian"
          sub={
            exportState === "working"
              ? "preparing…"
              : lastExport
              ? `last export ${new Date(lastExport).toLocaleString(undefined, {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}${exportState === "downloaded" ? " · saved to Downloads" : ""}`
              : "history + plan, two files, same names every time"
          }
          value="Export"
          onClick={exportToObsidian}
        />

        <Row label="Account" value={user?.email || "—"} />
      </div>

      <button type="button" className="btn-secondary" style={{ marginTop: "auto" }} onClick={signOut}>
        Sign out
      </button>

      {pendingMode && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div
            className="w-full max-w-lg mx-auto flex flex-col gap-3"
            style={{
              background: "var(--color-card)",
              borderTop: "1px solid var(--color-border)",
              padding: 22,
            }}
          >
            <span style={{ fontSize: 14 }}>{switchModeCopy(pendingMode)}</span>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setProgramMode(pendingMode);
                setPendingMode(null);
              }}
            >
              Switch to {pendingMode === "schedule" ? "Schedule" : "Plan"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setPendingMode(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
