import React from "react";
import { useWorkout } from "../state/WorkoutContext";
import { BarAxis, Bars, PosterSegments, Rule } from "../components/poster";
import { eightWeekSeries, exerciseHistory, formatTonnage } from "../lib/training";
import { getChapterInfo } from "../lib/achievements";

/*
 * 8J · Progress / Charts.
 *
 * Deliberately carries NO art — a portrait at this size read as a smear, and
 * the number is the subject.
 *
 * The header delta and the last two bars come from one call to
 * eightWeekSeries(). A caption disagreeing with the bar above it was the
 * single most common bug in the last version.
 */

const SEGMENTS = [
  ["charts", "Charts"],
  ["records", "Record book"],
  ["body", "Body"],
];

/** Lifts whose top set has climbed most over the window. */
function movingUp(sessions, bodyweightKg, weeks = 8) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeks * 7);
  const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(cutoff.getDate()).padStart(2, "0")}`;

  const names = new Set();
  Object.values(sessions || {}).forEach((s) => {
    Object.keys(s?.entries || {}).forEach((name) => names.add(name));
  });

  return [...names]
    .map((name) => {
      const points = exerciseHistory(sessions, name, bodyweightKg);
      const inWindow = points.filter((p) => p.date >= cutoffKey);
      if (inWindow.length < 2) return null;
      const first = parseFloat(inWindow[0].topSet?.weight) || 0;
      const last = parseFloat(inWindow[inWindow.length - 1].topSet?.weight) || 0;
      const gain = Math.round((last - first) * 10) / 10;
      if (gain <= 0) return null;
      return { name, current: last, gain };
    })
    .filter(Boolean)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 3);
}

export default function ProgressPage({ segment = "charts", onSegmentChange, onCloseChapter }) {
  const { sessions, bodyweightKg, program, roundInfo } = useWorkout();

  const { series, thisWeekKg, deltaPct } = eightWeekSeries(sessions, bodyweightKg);
  const chapter = getChapterInfo(sessions);
  const climbing = movingUp(sessions, bodyweightKg);

  // Fewer than two weeks with data and the chart says so rather than drawing
  // a flat line that looks like a bug.
  const weeksWithData = series.filter((point) => point.value > 0).length;

  return (
    <div
      className="flex-1 min-h-0 flex flex-col"
      style={{ background: "var(--color-poster)", overflowY: "auto", padding: "6px 24px 16px" }}
    >
      <div className="flex flex-col gap-[6px]">
        <span className="kicker">
          {program?.name || "Block 1"} · round {roundInfo.round}
        </span>
        <span className="big-number tabular">{formatTonnage(thisWeekKg)}</span>
        <span style={{ fontSize: 13, color: "var(--color-muted-poster)" }}>
          lifted this week
          {deltaPct !== null && (
            <>
              {" · "}
              {/* Teal only for a positive delta; a drop is just a number. */}
              <span style={{ color: deltaPct > 0 ? "var(--color-teal)" : "var(--color-muted-poster)" }}>
                {deltaPct > 0 ? "+" : ""}
                {deltaPct}% on last
              </span>
            </>
          )}
        </span>
      </div>

      <Rule style={{ margin: "16px 0" }} />

      <PosterSegments options={SEGMENTS} value={segment} onChange={onSegmentChange} />

      <div style={{ paddingTop: 20 }}>
        <span className="label">Last eight weeks</span>
        {weeksWithData < 2 ? (
          <p style={{ fontSize: 13, color: "var(--color-dim)", paddingTop: 14 }}>
            Two weeks of sessions and this fills in.
          </p>
        ) : (
          <div style={{ paddingTop: 14 }}>
            <Bars
              series={series}
              height={120}
              label={`Weekly tonnage, ${formatTonnage(thisWeekKg)} this week`}
            />
            <BarAxis />
          </div>
        )}
      </div>

      {/*
        §10.4 — the app never closes a chapter itself. Past eight weeks it
        offers, once, and the user decides. This is an offer, not a nag: it is
        a teal link at the bottom, never a banner.
      */}
      {chapter && chapter.weekInChapter >= 8 && (
        <button
          type="button"
          className="link-teal text-left"
          style={{ paddingTop: 22 }}
          onClick={onCloseChapter}
        >
          Close chapter {chapter.number} — {chapter.weekInChapter} weeks in
        </button>
      )}

      {climbing.length > 0 && (
        <div style={{ paddingTop: 24 }}>
          <span className="label">Moving up</span>
          <div style={{ paddingTop: 8 }}>
            {climbing.map((lift) => (
              <React.Fragment key={lift.name}>
                <Rule />
                <div
                  className="flex items-center justify-between gap-3"
                  style={{ padding: "13px 0" }}
                >
                  <span
                    className="truncate"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 16,
                      fontWeight: 600,
                      color: "var(--color-muted-poster)",
                    }}
                  >
                    {lift.name}
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
                      {lift.current}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--color-teal)" }}>
                      +{lift.gain} kg in 8 weeks
                    </span>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
