import React, { useMemo, useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import ArtBand from "../components/ArtBand";
import { Rule } from "../components/poster";
import { countSets } from "../lib/session";
import { dateKey, formatTonnage } from "../lib/training";
import { exportMonthCsv } from "../lib/csv";

/*
 * 8E · Workout / History — what actually happened, by month.
 *
 * The calendar is a real month grid, not a strip of chips. A day with a
 * logged session is a brass fill; every other day is dim on transparent.
 * Nothing else is encoded — not tonnage, not duration, not which routine.
 * The pattern of brass against ink is the point: at a glance you see the
 * rhythm of the month, and in plan mode that rhythm is irregular on purpose.
 */

// Sunday first by default. Schedule mode can move the week start, and the
// grid follows it — the columns have to line up with the weekdays the plan
// is actually bound to, or the pattern of brass reads wrong.
const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

/** Rotates the weekday columns so `startsOn` (0=Sunday) is the first one. */
function columnsFrom(startsOn) {
  return Array.from({ length: 7 }, (_, i) => WEEKDAY_INITIALS[(startsOn + i) % 7]);
}

function monthLabel(year, month) {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function shortDate(day) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function LiftHistoryPage({ segments, onOpenSession, onOpenMovement }) {
  const { sessions, settings, planDays, dayIdForSession } = useWorkout();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const { year, month } = cursor;
  const today = dateKey();

  const monthSessions = useMemo(
    () =>
      Object.entries(sessions || {})
        .filter(([, s]) => {
          if (!s?.date || !s?.finishedAt) return false;
          const [y, m] = s.date.split("-").map(Number);
          return y === year && m === month + 1;
        })
        .sort((a, b) => (b[1].date || "").localeCompare(a[1].date || "")),
    [sessions, year, month]
  );

  const loggedDays = new Set(monthSessions.map(([, s]) => s.date));
  const recentMovements = [
    ...new Set(monthSessions.flatMap(([, s]) => Object.keys(s.entries || {}))),
  ].slice(0, 6);
  const monthTonnage = monthSessions.reduce((sum, [, s]) => sum + (s.tonnageKg || 0), 0);

  // Sunday unless schedule mode says otherwise.
  const startsOn = settings.weekStartsOn === "mon" ? 1 : 0;
  const columns = columnsFrom(startsOn);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Offset the 1st into its real column, relative to the week start.
  const firstWeekday = (new Date(year, month, 1).getDay() - startsOn + 7) % 7;
  // Sized for the worst case — a 31-day month starting on Saturday needs six
  // rows — so the card never clips when the month changes.
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const step = (delta) => {
    const next = new Date(year, month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  };

  const exportMonth = () => {
    const rows = monthSessions.map(([id, s]) => [id, s]);
    // Resolve planDayId to "Day 3" so an export can be read — and re-imported
    // — without the programme beside it.
    const dayNameFor = (planDayId) => {
      const index = planDays.findIndex((day) => day.id === planDayId);
      return index === -1 ? "" : `Day ${index + 1}`;
    };
    exportMonthCsv(rows, `${year}-${String(month + 1).padStart(2, "0")}`, dayNameFor);
  };

  /** The whole log, not just the month on screen. */
  const exportAll = () => {
    const rows = Object.entries(sessions || {}).filter(([, s]) => s?.finishedAt && s?.date);
    const dayNameFor = (planDayId) => {
      const index = planDays.findIndex((day) => day.id === planDayId);
      return index === -1 ? "" : `Day ${index + 1}`;
    };
    exportMonthCsv(rows, "all", dayNameFor);
  };

  return (
    <div
      className="flex-1 min-h-0 flex flex-col gap-[14px]"
      style={{ background: "var(--color-poster)", overflowY: "auto", padding: "6px 24px 16px" }}
    >
      {/* A Progress screen now, so it wears the poster shell and the same
          segment row as Charts, Records and Body. */}
      <div className="flex flex-col gap-[6px] flex-none">
        <span className="kicker">History</span>
        <span className="big-number tabular">{monthSessions.length}</span>
        <span style={{ fontSize: 13, color: "var(--color-muted-poster)" }}>
          {/* The band below names the month, so this line does not. */}
          {monthSessions.length
            ? `session${monthSessions.length === 1 ? "" : "s"} · ${formatTonnage(monthTonnage)} moved`
            : "nothing logged this month"}
        </span>
      </div>

      <Rule />
      {segments}

      {/* The band IS the month header — the card below must not repeat it. */}
      <ArtBand
        screen="history"
        height={70}
        kicker={monthLabel(year, month)}
        sub={
          monthSessions.length
            ? `${monthSessions.length} session${
                monthSessions.length === 1 ? "" : "s"
              }, ${formatTonnage(monthTonnage)} moved`
            : "nothing logged"
        }
        right={
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous month"
              style={{ padding: 8, color: "var(--color-muted)" }}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next month"
              style={{ padding: 8, color: "var(--color-muted)" }}
            >
              ›
            </button>
          </div>
        }
      />

      <div className="card flex-none" style={{ padding: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 5,
            marginBottom: 6,
          }}
        >
          {columns.map((initial, i) => (
            <span
              key={i}
              className="text-center uppercase"
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "var(--color-dim)",
              }}
            >
              {initial}
            </span>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
          {cells.map((day, index) => {
            if (day === null) return <span key={`blank-${index}`} style={{ height: 26 }} />;
            const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const logged = loggedDays.has(key);
            const isToday = key === today;
            return (
              <button
                key={key}
                type="button"
                disabled={!logged}
                onClick={() => {
                  const match = monthSessions.find(([, s]) => s.date === key);
                  if (match) onOpenSession(match[0]);
                }}
                style={{
                  height: 26,
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: "var(--font-display)",
                  background: logged ? "var(--color-brass)" : "transparent",
                  color: logged ? "var(--color-on-brass)" : "var(--color-dim)",
                  fontWeight: logged ? 700 : 400,
                  // Today unlogged gets a ring, never a fill — a fill would
                  // claim a session that has not happened.
                  border: isToday && !logged ? "1px solid var(--color-track-next)" : "none",
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-[8px] min-h-0" style={{ overflowY: "auto" }}>
        <span className="label" style={{ paddingLeft: 2 }}>
          Recent
        </span>
        {/* Tapping a movement name opens its own history (§6). */}
        {recentMovements.length > 0 && (
          <div className="flex flex-wrap gap-[6px]" style={{ paddingBottom: 2 }}>
            {recentMovements.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onOpenMovement?.(name)}
                className="mode-chip"
                style={{ textTransform: "none", letterSpacing: 0 }}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        {monthSessions.length === 0 ? (
          <span className="text-[13px]" style={{ color: "var(--color-dim)" }}>
            Nothing logged yet. Your first session lands here.
          </span>
        ) : (
          monthSessions.slice(0, 2).map(([id, session]) => {
            const { done } = countSets(session.entries);
            const minutes = session.finishedAt
              ? Math.max(1, Math.round((session.finishedAt - session.startedAt) / 60000))
              : null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onOpenSession(id)}
                className="row-card flex justify-between items-center w-full text-left press"
              >
                <div className="flex flex-col gap-[3px] min-w-0">
                  <span className="row-title truncate">{session.label || "Session"}</span>
                  <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>
                    {shortDate(session.date)}
                    {minutes ? ` · ${minutes} min` : ""} · {done} sets
                  </span>
                </div>
                <span className="row-value tabular" style={{ flex: "none", paddingLeft: 12 }}>
                  {formatTonnage(session.tonnageKg || 0)}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Export lives here, where the data is — not in Settings. */}
      <div className="flex items-center justify-between gap-3" style={{ marginTop: "auto" }}>
        <button
          type="button"
          className="link-teal text-left"
          onClick={exportMonth}
          disabled={monthSessions.length === 0}
        >
          Export this month
        </button>
        <button
          type="button"
          style={{ fontSize: 12, color: "var(--color-dim)", flex: "none" }}
          onClick={exportAll}
        >
          Export everything
        </button>
      </div>
    </div>
  );
}
