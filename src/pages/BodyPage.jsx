import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { useWorkout } from "../state/WorkoutContext";
import { useAuth } from "../state/AuthContext";
import { getPhoto, savePhoto, deletePhoto } from "../lib/localPhotos";
import { dateKey, monthKey, monthLabel } from "../lib/training";

const MEASUREMENT_FIELDS = [
  { key: "chestCm", label: "Chest" },
  { key: "waistCm", label: "Waist" },
  { key: "armCm", label: "Arm" },
];

function shortDate(day) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function BodyweightChart({ bodyweightLog }) {
  const series = useMemo(() => {
    const dates = Object.keys(bodyweightLog).sort();
    return dates.slice(-12).map((d) => ({ date: d, kg: parseFloat(bodyweightLog[d]) || 0 }));
  }, [bodyweightLog]);

  if (series.length === 0) {
    return <p className="text-sm text-ink-muted italic">Log your weight to see the trend.</p>;
  }

  const min = Math.min(...series.map((s) => s.kg));
  const max = Math.max(...series.map((s) => s.kg));
  const span = Math.max(1, max - min);
  const latest = series[series.length - 1];
  const earliest = series[0];
  const delta = Math.round((latest.kg - earliest.kg) * 10) / 10;

  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between">
        <span className="stencil">Bodyweight</span>
        <span className="text-xs text-ink-muted">
          {latest.kg} kg
          {series.length > 1 && (
            <span className={delta === 0 ? "text-ink-faint" : "text-positive-delta"}>
              {" "}
              · {delta === 0 ? "steady" : `${delta > 0 ? "+" : ""}${delta} since ${shortDate(earliest.date)}`}
            </span>
          )}
        </span>
      </div>
      <div className="mt-3.5 h-20 flex items-end gap-1.5">
        {series.map((s) => (
          <div
            key={s.date}
            className="flex-1 rounded-t bg-accent"
            style={{ height: `${Math.max(6, ((s.kg - min) / span) * 100)}%` }}
            title={`${shortDate(s.date)}: ${s.kg} kg`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * One month's slot: the photo if it has one, otherwise a tap-to-add tile.
 * Photos live in this browser's IndexedDB (see lib/localPhotos) — there's
 * no Firebase Storage involved, so they don't sync to other devices.
 */
function PhotoTile({ uid, monthKey: key }) {
  const [url, setUrl] = useState(null);
  const inputRef = useRef(null);
  const urlRef = useRef(null);

  const refresh = async () => {
    const blob = await getPhoto(uid, key);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const next = blob ? URL.createObjectURL(blob) : null;
    urlRef.current = next;
    setUrl(next);
  };

  useEffect(() => {
    refresh();
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, key]);

  if (url) {
    return (
      <div className="relative flex-1 h-32 rounded-card overflow-hidden bg-surface-wash">
        <img src={url} alt={`Progress photo, ${monthLabel(key)}`} className="w-full h-full object-cover" />
        <div className="absolute bottom-2 left-2 text-xs font-medium text-accent-ink bg-ink/60 rounded-pill px-2 py-0.5">
          {monthLabel(key)}
        </div>
        <button
          type="button"
          onClick={async () => {
            await deletePhoto(uid, key);
            refresh();
          }}
          aria-label={`Remove ${monthLabel(key)} photo`}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-ink/60 text-accent-ink flex items-center justify-center"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="slot-empty flex-1 h-32 flex flex-col items-center justify-center gap-1 text-ink-faint"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) {
            await savePhoto(uid, key, file);
            refresh();
          }
        }}
      />
      <Plus className="w-5 h-5" />
      <span className="text-xs">{monthLabel(key)}</span>
    </button>
  );
}

function MonthlyPhotos() {
  const { user } = useAuth();

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 4 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (3 - i), 1);
      return monthKey(d);
    });
  }, []);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2.5">
        <span className="stencil">Monthly photo</span>
        <span className="text-xs text-ink-muted">stored on this device only</span>
      </div>
      <div className="flex gap-2.5">
        {months.map((m) => (
          <PhotoTile key={m} uid={user.uid} monthKey={m} />
        ))}
      </div>
    </div>
  );
}

export default function BodyPage() {
  const {
    bodyweightLog,
    logBodyweight,
    removeBodyweightEntry,
    measurements,
    logMeasurement,
    removeMeasurementEntry,
  } = useWorkout();

  const [draft, setDraft] = useState({ weightKg: "", chestCm: "", waistCm: "", armCm: "" });

  const measurementDates = Object.keys(measurements).sort().reverse();
  const latestMeasurementDate = measurementDates[0];
  const latest = latestMeasurementDate ? measurements[latestMeasurementDate] : {};

  const save = () => {
    const day = dateKey();
    const weight = parseFloat(draft.weightKg);
    if (weight) logBodyweight(day, weight);
    MEASUREMENT_FIELDS.forEach(({ key }) => {
      const value = parseFloat(draft[key]);
      if (value) logMeasurement(day, key, value);
    });
    setDraft({ weightKg: "", chestCm: "", waistCm: "", armCm: "" });
  };

  return (
    <div className="space-y-5">
      <BodyweightChart bodyweightLog={bodyweightLog} />

      <MonthlyPhotos />

      <div>
        <div className="stencil mb-2.5">Measurements</div>
        <div className="grid grid-cols-3 gap-2.5">
          {MEASUREMENT_FIELDS.map(({ key, label }) => (
            <div key={key} className="card p-3.5 text-center">
              <div className="stencil">{label}</div>
              <div className="mt-1.5 readout text-lg">
                {latest[key] ?? "—"}
                {latest[key] != null && <span className="text-xs font-body text-ink-muted"> cm</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="stencil">Log today</div>
        <div className="grid grid-cols-2 gap-2.5">
          <input
            type="number"
            step="0.1"
            value={draft.weightKg}
            onChange={(e) => setDraft((d) => ({ ...d, weightKg: e.target.value }))}
            placeholder="Weight (kg)"
            className="p-2.5 border border-border-control rounded-card bg-surface text-sm"
          />
          {MEASUREMENT_FIELDS.map(({ key, label }) => (
            <input
              key={key}
              type="number"
              step="0.5"
              value={draft[key]}
              onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
              placeholder={`${label} (cm)`}
              className="p-2.5 border border-border-control rounded-card bg-surface text-sm"
            />
          ))}
        </div>
        <button type="button" onClick={save} className="btn-clay w-full py-3">
          Save today's numbers
        </button>
      </div>

      {measurementDates.length > 0 && (
        <div>
          <div className="stencil mb-2.5">History</div>
          <div className="space-y-1.5">
            {measurementDates.slice(0, 10).map((d) => (
              <div key={d} className="flex items-center justify-between text-sm py-1">
                <span className="text-ink-muted">{shortDate(d)}</span>
                <div className="flex items-center gap-3">
                  <span className="text-ink-soft">
                    {MEASUREMENT_FIELDS.map(({ key, label }) =>
                      measurements[d][key] != null ? `${label} ${measurements[d][key]}` : null
                    )
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMeasurementEntry(d)}
                    aria-label="Remove entry"
                    className="text-ink-faint hover:text-negative"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
