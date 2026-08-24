import React, { useMemo } from "react";
import { ChevronLeft } from "lucide-react";
import { useWorkout } from "../state/WorkoutContext";
import { RANKS, STRENGTH_STANDARDS_BY_SEX, getStanding, buildLedger } from "../lib/achievements";

export default function LiftLadderPage({ liftName, onBack }) {
  const { sessions, settings, bodyweightKg, bodyweightLog } = useWorkout();
  const sex = settings.sex;

  const standing = useMemo(
    () => getStanding(liftName, sessions, bodyweightKg, sex),
    [liftName, sessions, bodyweightKg, sex]
  );
  const table = sex ? STRENGTH_STANDARDS_BY_SEX[sex][liftName] : null;
  const ledger = useMemo(
    () => buildLedger(sessions, bodyweightLog, bodyweightKg, sex),
    [sessions, bodyweightLog, bodyweightKg, sex]
  );

  if (!standing || !table) return null;

  const rows = ["novice", "intermediate", "advanced", "elite"].map((key, i) => {
    const thresholdKg = Math.round(table[key] * bodyweightKg);
    const crossing = ledger.find((e) => e.kind === "rank" && e.liftName === liftName && e.rankIndex === i);
    const state =
      i < standing.rankIndex ? "past" : i === standing.rankIndex ? "current" : "future";
    return { rank: RANKS[i], thresholdKg, crossing, state };
  });

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-in fade-in duration-300 pb-6">
      <div>
        <button type="button" onClick={onBack} className="text-sm text-ink-muted hover:text-accent flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Record book
        </button>
        <h1 className="mt-2.5 text-4xl">{liftName} ladder</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Thresholds scale with your bodyweight — {Math.round(bodyweightKg)} kg today.
        </p>
      </div>

      <div className="card overflow-hidden">
        {rows.map(({ rank, thresholdKg, crossing, state }, i) => (
          <div
            key={rank}
            className={`p-4 flex items-center gap-3.5 ${i > 0 ? "border-t border-border" : ""}`}
            style={{ background: state === "current" ? "var(--color-positive-bg)" : "transparent" }}
          >
            <div className="flex-1">
              <div
                className="text-lg"
                style={{
                  fontFamily: "var(--font-heading)",
                  color: state === "future" ? "var(--color-ink-muted)" : "var(--color-ink)",
                }}
              >
                {rank}
              </div>
              <div className="mt-1 text-xs" style={{ color: state === "current" ? "var(--color-positive-ink)" : "var(--color-ink-faint)" }}>
                {state === "past" && crossing ? `crossed ${shortMonth(crossing.date)}` : null}
                {state === "current" ? "you are here" : null}
                {state === "future" ? `${thresholdKg - Math.round(standing.e1rmKg)} kg away` : null}
              </div>
            </div>
            <span className="readout text-base" style={{ color: state === "future" ? "var(--color-ink-faint)" : "var(--color-ink)" }}>
              {thresholdKg} kg
            </span>
          </div>
        ))}
      </div>

      <p className="aside text-sm leading-relaxed">
        Standards use bodyweight ratios, so getting leaner moves you up too — and a heavier bodyweight
        without a heavier lift can move you back down.
      </p>
    </div>
  );
}

function shortMonth(day) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}
