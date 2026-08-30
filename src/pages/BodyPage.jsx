import React, { useEffect, useMemo, useRef, useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import { useAuth } from "../state/AuthContext";
import { BarAxis, Bars, PosterButton, PosterSegments, Rule } from "../components/poster";
import { dateKey, friendlyDate, monthKey, monthLabel } from "../lib/training";
import { deletePhoto, getPhoto, savePhoto } from "../lib/localPhotos";

/*
 * 8L · Progress / Body.
 *
 * Three measurement rows is what fits above the button. More sites scroll,
 * and the screen scrolls as one column rather than growing an inner scroll.
 */

const SEGMENTS = [
  ["charts", "Charts"],
  ["records", "Record book"],
  ["body", "Body"],
];

const SITES = [
  ["chestCm", "Chest"],
  ["waistCm", "Waist"],
  ["armCm", "Arm"],
];

/** Eight weekly points, oldest first — the last logged weight in each week. */
function weightSeries(bodyweightLog, weeks = 8) {
  const dates = Object.keys(bodyweightLog || {}).sort();
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date();
    end.setDate(end.getDate() - i * 7);
    const endKey = dateKey(end);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const startKey = dateKey(start);
    const inWeek = dates.filter((d) => d >= startKey && d <= endKey);
    const last = inWeek[inWeek.length - 1];
    out.push({ key: endKey, value: last ? parseFloat(bodyweightLog[last]) || 0 : 0 });
  }
  return out;
}

/**
 * One month's slot: the photo if it has one, otherwise a tap-to-add tile.
 *
 * Photos live in this browser's IndexedDB (lib/localPhotos) — no Firebase
 * Storage, which would need a paid plan. The tradeoff is deliberate and the
 * label says so: they stay on this device and do not sync.
 */
function PhotoTile({ uid, month }) {
  const [url, setUrl] = useState(null);
  const inputRef = useRef(null);
  const urlRef = useRef(null);

  const refresh = async () => {
    const blob = await getPhoto(uid, month);
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
  }, [uid, month]);

  if (url) {
    return (
      <div
        className="relative flex-1 overflow-hidden"
        style={{ height: 96, borderRadius: 12, border: "1px solid var(--color-border-hi)" }}
      >
        <img
          src={url}
          alt={`Progress photo, ${monthLabel(month)}`}
          className="w-full h-full"
          style={{ objectFit: "cover" }}
        />
        <span
          className="absolute uppercase"
          style={{
            left: 8,
            bottom: 6,
            fontSize: 10,
            letterSpacing: "0.12em",
            fontWeight: 700,
            color: "var(--color-text)",
            textShadow: "0 1px 3px rgba(0,0,0,0.8)",
          }}
        >
          {monthLabel(month)}
        </span>
        <button
          type="button"
          onClick={async () => {
            await deletePhoto(uid, month);
            refresh();
          }}
          aria-label={`Remove ${monthLabel(month)} photo`}
          className="absolute flex items-center justify-center"
          style={{
            top: 5,
            right: 5,
            width: 22,
            height: 22,
            borderRadius: 999,
            background: "rgba(14,15,18,0.7)",
            color: "var(--color-text)",
            fontSize: 13,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="flex-1 flex flex-col items-center justify-center gap-1"
      style={{
        height: 96,
        borderRadius: 12,
        border: "1px dashed #3a3f48",
        color: "var(--color-dim)",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          await savePhoto(uid, month, file);
          refresh();
        }}
      />
      <span style={{ fontSize: 16, color: "var(--color-brass)" }}>+</span>
      <span className="uppercase" style={{ fontSize: 10, letterSpacing: "0.12em" }}>
        {monthLabel(month)}
      </span>
    </button>
  );
}

/** The last four months, oldest first. One photo slot per calendar month. */
function MonthlyPhotos() {
  const { user } = useAuth();

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 4 }, (_, i) =>
      monthKey(new Date(now.getFullYear(), now.getMonth() - (3 - i), 1))
    );
  }, []);

  return (
    <div style={{ paddingTop: 24 }}>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 10 }}>
        <span className="label">Monthly photo</span>
        <span style={{ fontSize: 11, color: "var(--color-dim)" }}>this device only</span>
      </div>
      <div className="flex gap-2">
        {months.map((month) => (
          <PhotoTile key={month} uid={user?.uid || "preview"} month={month} />
        ))}
      </div>
    </div>
  );
}

function monthName(day) {
  const [, m] = (day || "").split("-").map(Number);
  if (!m) return "";
  return new Date(2000, m - 1, 1).toLocaleDateString(undefined, { month: "long" });
}

export default function BodyPage({ segments }) {
  const {
    bodyweightLog,
    measurements,
    logBodyweight,
    logMeasurement,
    removeBodyweightEntry,
    removeMeasurementEntry,
  } = useWorkout();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [draft, setDraft] = useState({ weight: "", chestCm: "", waistCm: "", armCm: "" });

  const dates = Object.keys(bodyweightLog || {}).sort();
  const latestDate = dates[dates.length - 1];
  const latest = latestDate ? parseFloat(bodyweightLog[latestDate]) : null;

  const series = weightSeries(bodyweightLog);
  const withData = series.filter((p) => p.value > 0);
  const eightWeeksAgo = withData[0]?.value;
  const delta =
    latest && eightWeeksAgo ? Math.round((latest - eightWeeksAgo) * 10) / 10 : null;

  const measurementDates = Object.keys(measurements || {}).sort();
  const latestMeasure = measurementDates[measurementDates.length - 1];
  const firstMeasure = measurementDates[0];

  const save = () => {
    const day = dateKey();
    if (draft.weight) logBodyweight(day, draft.weight);
    SITES.forEach(([field]) => {
      if (draft[field]) logMeasurement(day, field, draft[field]);
    });
    setDraft({ weight: "", chestCm: "", waistCm: "", armCm: "" });
    setSheetOpen(false);
  };

  return (
    <div
      className="flex-1 min-h-0 flex flex-col"
      style={{ background: "var(--color-poster)", overflowY: "auto", padding: "6px 24px 16px" }}
    >
      <div className="flex flex-col gap-[6px]">
        <span className="kicker">Body</span>
        <span className="big-number tabular">
          {latest ? Math.round(latest * 10) / 10 : "—"}
          <span style={{ fontSize: 22, color: "var(--color-muted-poster)", marginLeft: 6 }}>
            kg
          </span>
        </span>
        <span style={{ fontSize: 13, color: "var(--color-muted-poster)" }}>
          {latestDate ? `measured ${friendlyDate(latestDate)}` : "nothing measured yet"}
          {delta !== null && delta !== 0 && (
            <>
              {" · "}
              <span style={{ color: delta > 0 ? "var(--color-teal)" : "var(--color-muted-poster)" }}>
                {delta > 0 ? "+" : ""}
                {delta} kg in 8 weeks
              </span>
            </>
          )}
        </span>
      </div>

      <Rule style={{ margin: "16px 0" }} />
      {segments}

      <div style={{ paddingTop: 20 }}>
        <span className="label">Weight · 8 weeks</span>
        {withData.length < 2 ? (
          <p style={{ fontSize: 13, color: "var(--color-dim)", paddingTop: 14 }}>
            Two measurements and this fills in.
          </p>
        ) : (
          <div style={{ paddingTop: 14 }}>
            <Bars series={series} height={94} label={`Bodyweight, ${latest} kg now`} />
            <BarAxis />
          </div>
        )}
      </div>

      <div style={{ paddingTop: 24 }}>
        <span className="label">Measurements</span>
        <div style={{ paddingTop: 8 }}>
          {SITES.map(([field, label]) => {
            const now = latestMeasure ? measurements[latestMeasure]?.[field] : null;
            const then = firstMeasure ? measurements[firstMeasure]?.[field] : null;
            const change =
              now && then ? Math.round((parseFloat(now) - parseFloat(then)) * 10) / 10 : null;
            return (
              <React.Fragment key={field}>
                <Rule />
                <div
                  className="flex items-baseline justify-between gap-3"
                  style={{ padding: "13px 0" }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 16,
                      fontWeight: 600,
                      color: "var(--color-muted-poster)",
                    }}
                  >
                    {label}
                  </span>
                  <div className="flex items-baseline gap-3" style={{ flex: "none" }}>
                    <span
                      className="tabular"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 17,
                        fontWeight: 700,
                        color: "var(--color-brass-text)",
                      }}
                    >
                      {now ? `${now} cm` : "—"}
                    </span>
                    {change !== null && change !== 0 && (
                      <span
                        style={{
                          fontSize: 12,
                          color: change > 0 ? "var(--color-teal)" : "var(--color-dim)",
                        }}
                      >
                        {change > 0 ? "+" : ""}
                        {change} since {monthName(firstMeasure)}
                      </span>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Every dated entry, so a typo can be taken back out. */}
      <div style={{ paddingTop: 22 }}>
        <button
          type="button"
          className="link-teal text-left"
          onClick={() => setHistoryOpen((v) => !v)}
        >
          {historyOpen ? "Hide entries" : `All entries · ${dates.length}`}
        </button>
        {historyOpen && (
          <div style={{ paddingTop: 8 }}>
            {[...new Set([...dates, ...measurementDates])].sort().reverse().map((day) => (
              <React.Fragment key={day}>
                <Rule />
                <div
                  className="flex items-baseline justify-between gap-3"
                  style={{ padding: "11px 0" }}
                >
                  <span style={{ fontSize: 13, color: "var(--color-muted-poster)" }}>
                    {friendlyDate(day)}
                  </span>
                  <div className="flex items-baseline gap-3" style={{ flex: "none" }}>
                    <span
                      className="tabular"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 15,
                        color: "var(--color-brass-text)",
                      }}
                    >
                      {bodyweightLog[day] ? `${bodyweightLog[day]} kg` : "—"}
                    </span>
                    <button
                      type="button"
                      style={{ fontSize: 12, color: "var(--color-dim)" }}
                      onClick={() => {
                        if (bodyweightLog[day]) removeBodyweightEntry(day);
                        if (measurements[day]) removeMeasurementEntry(day);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <MonthlyPhotos />

      <div style={{ marginTop: "auto", paddingTop: 20 }}>
        <PosterButton onClick={() => setSheetOpen(true)}>Add a measurement</PosterButton>
      </div>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div
            className="w-full max-w-lg mx-auto flex flex-col gap-3"
            style={{
              background: "var(--color-card)",
              borderTop: "1px solid var(--color-border)",
              padding: 22,
            }}
          >
            <span className="label">Today</span>
            {[["weight", "Weight (kg)"], ...SITES.map(([f, l]) => [f, `${l} (cm)`])].map(
              ([field, label]) => (
                <div key={field} className="row-card flex items-center justify-between">
                  <span className="row-title">{label}</span>
                  <input
                    inputMode="decimal"
                    value={draft[field]}
                    onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
                    placeholder="—"
                    style={{
                      width: 70,
                      textAlign: "right",
                      background: "transparent",
                      outline: "none",
                      fontFamily: "var(--font-display)",
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--color-brass-text)",
                    }}
                  />
                </div>
              )
            )}
            <button type="button" className="btn-primary" onClick={save}>
              Save
            </button>
            <button type="button" className="btn-secondary" onClick={() => setSheetOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
