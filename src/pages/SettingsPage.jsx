import React, { useState } from "react";
import { ChevronLeft, Download, LogOut, Trash2 } from "lucide-react";
import { useAuth } from "../state/AuthContext";
import { useWorkout } from "../state/WorkoutContext";
import { sessionsToCsv, downloadTextFile } from "../lib/csv";
import { weekKeyFromDay, dateKey } from "../lib/training";
import GlobalTracker from "../components/GlobalTracker";

const APP_VERSION = "1.0";

function Switch({ checked, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={onChange} className="switch" data-on={checked}>
      <span className="switch-knob" />
    </button>
  );
}

function SettingsRow({ label, children }) {
  return (
    <div className="p-4 flex items-center justify-between border-b border-border last:border-0">
      <span className="text-sm text-ink-soft">{label}</span>
      {children}
    </div>
  );
}

function BodyweightLog() {
  const { bodyweightLog, logBodyweight, removeBodyweightEntry } = useWorkout();
  const [kg, setKg] = useState("");
  const dates = Object.keys(bodyweightLog).sort().reverse();

  const add = () => {
    const value = parseFloat(kg);
    if (!value) return;
    logBodyweight(dateKey(), value);
    setKg("");
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2">
        <input
          type="number"
          step="0.1"
          value={kg}
          onChange={(e) => setKg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Today's weight (kg)"
          className="flex-1 p-2 border border-border-control rounded-card bg-surface text-sm"
        />
        <button type="button" onClick={add} className="btn-clay px-4 text-sm">
          Log
        </button>
      </div>
      {dates.length > 0 && (
        <div className="space-y-1.5">
          {dates.slice(0, 10).map((d) => (
            <div key={d} className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">{d}</span>
              <div className="flex items-center gap-3">
                <span className="text-ink-soft font-medium">{bodyweightLog[d]} kg</span>
                <button
                  type="button"
                  onClick={() => removeBodyweightEntry(d)}
                  aria-label="Remove entry"
                  className="text-ink-faint hover:text-negative"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage({ onBack }) {
  const { user, signOut } = useAuth();
  const { settings, setSettings, sessions } = useWorkout();
  const [showBodyweight, setShowBodyweight] = useState(false);

  const weeksLogged = new Set(
    Object.values(sessions)
      .filter((s) => s.finishedAt && s.date)
      .map((s) => weekKeyFromDay(s.date))
  ).size;

  const exportCsv = () => {
    downloadTextFile(`iron-log-${dateKey()}.csv`, sessionsToCsv(sessions));
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-in fade-in duration-300 pb-8">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-ink-muted hover:text-accent flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="mt-2.5 text-4xl">Settings</h1>
        <p className="mt-1.5 text-sm text-ink-muted">Signed in as {user.email}</p>
      </div>

      <div>
        <div className="stencil mb-2">Units and defaults</div>
        <div className="card">
          <SettingsRow label="Weight unit">
            <div className="flex gap-1 bg-surface-inset rounded-pill p-0.5">
              {["KG", "LBS"].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setSettings({ ...settings, weightUnit: u })}
                  className={`px-3 py-1 rounded-pill text-xs font-medium ${
                    settings.weightUnit === u ? "bg-ink text-accent-ink" : "text-ink-faint"
                  }`}
                >
                  {u.toLowerCase()}
                </button>
              ))}
            </div>
          </SettingsRow>
          <SettingsRow label="Default rest">
            <input
              type="number"
              step="15"
              min="15"
              value={settings.defaultRestSeconds}
              onChange={(e) => setSettings({ ...settings, defaultRestSeconds: e.target.value })}
              className="w-16 text-right bg-transparent focus:outline-none text-sm font-medium text-ink-mid"
            />
          </SettingsRow>
          <SettingsRow label="Plate increment">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.5"
                value={settings.plateIncrementKg}
                onChange={(e) => setSettings({ ...settings, plateIncrementKg: parseFloat(e.target.value) || 0 })}
                className="w-12 text-right bg-transparent focus:outline-none text-sm font-medium text-ink-mid"
              />
              <span className="text-sm text-ink-mid">kg</span>
            </div>
          </SettingsRow>
        </div>
      </div>

      <div>
        <div className="stencil mb-2">During a session</div>
        <div className="card">
          <SettingsRow label="Keep screen awake">
            <Switch
              checked={settings.keepScreenAwake}
              onChange={() => setSettings({ ...settings, keepScreenAwake: !settings.keepScreenAwake })}
            />
          </SettingsRow>
          <SettingsRow label="Rest timer sound">
            <Switch
              checked={settings.restSound}
              onChange={() => setSettings({ ...settings, restSound: !settings.restSound })}
            />
          </SettingsRow>
          <SettingsRow label="Ask for RPE">
            <Switch
              checked={settings.showRpe}
              onChange={() => setSettings({ ...settings, showRpe: !settings.showRpe })}
            />
          </SettingsRow>
        </div>
      </div>

      <div>
        <div className="stencil mb-2">Your data</div>
        <div className="card">
          <button type="button" onClick={exportCsv} className="w-full p-4 flex items-center justify-between border-b border-border text-left">
            <span className="text-sm text-ink-soft">Export as CSV</span>
            <Download className="w-4 h-4 text-ink-faint" />
          </button>
          <button
            type="button"
            onClick={() => setShowBodyweight((v) => !v)}
            className="w-full p-4 flex items-center justify-between text-left"
          >
            <span className="text-sm text-ink-soft">Body weight log</span>
            <span className="text-xs text-ink-faint">{showBodyweight ? "Hide" : "Show"}</span>
          </button>
          {showBodyweight && (
            <div className="border-t border-border">
              <BodyweightLog />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={signOut}
          className="btn-outline w-full py-3 mt-3 text-sm"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>

      <GlobalTracker />

      <p className="text-center aside text-sm">
        Iron Log {APP_VERSION} · {weeksLogged} week{weeksLogged === 1 ? "" : "s"} logged
      </p>
    </div>
  );
}
