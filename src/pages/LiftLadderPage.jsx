import React, { useMemo } from "react";
import { useWorkout } from "../state/WorkoutContext";
import { Rule } from "../components/poster";
import {
  RANKS,
  buildLedger,
  getStanding,
  nextBodyweightMultipleGoal,
  standardsKeyFor,
} from "../lib/achievements";
import { friendlyDate } from "../lib/training";

/*
 * Two views behind one screen, both reached from the Record book:
 *
 *   liftName given — the LADDER for that lift: the four tiers, where you sit,
 *   what the next rung costs in kilograms.
 *   no liftName   — the LEDGER: every first-ever thing the account has done.
 *
 * Both are computed from session history each time. Nothing here is awarded
 * or stored: these are facts about what happened, not badges.
 */

const TAG_COLOUR = {
  PR: "var(--color-teal)",
  rank: "var(--color-brass)",
  habit: "var(--color-dim)",
};

function Ladder({ liftName, onBack }) {
  const { sessions, bodyweightKg, settings } = useWorkout();
  const key = standardsKeyFor(liftName) || liftName;
  const standing = settings.sex ? getStanding(key, sessions, bodyweightKg, settings.sex) : null;
  const goal = standing
    ? nextBodyweightMultipleGoal(key, standing.ratio, bodyweightKg)
    : null;

  return (
    <div
      className="flex-1 min-h-0 flex flex-col"
      style={{ background: "var(--color-poster)", overflowY: "auto", padding: "6px 24px 16px" }}
    >
      <div className="flex items-center justify-between flex-none" style={{ marginBottom: 10 }}>
        <button type="button" className="link-teal" onClick={onBack}>
          Record book
        </button>
        <span className="kicker">Ladder</span>
      </div>

      <span className="poster-title" data-lines={liftName.length > 14 ? "2" : "1"}>
        {liftName}
      </span>

      {!standing ? (
        <p style={{ fontSize: 13, color: "var(--color-dim)", paddingTop: 18 }}>
          {settings.sex
            ? "Nothing logged for this lift yet."
            : "Set your sex in Settings to see where this sits."}
        </p>
      ) : (
        <>
          <span style={{ fontSize: 13, color: "var(--color-muted-poster)", paddingTop: 8 }}>
            {Math.round(standing.e1rmKg)} kg estimated max ·{" "}
            {(standing.ratio || 0).toFixed(2)}× bodyweight
          </span>

          <div style={{ paddingTop: 22 }}>
            <span className="label">The four rungs</span>
            <div style={{ paddingTop: 8 }}>
              {RANKS.map((rank, index) => {
                const reached = index <= standing.rankIndex;
                const isNext = index === standing.rankIndex + 1;
                return (
                  <React.Fragment key={rank}>
                    <Rule brass={reached} />
                    <div
                      className="flex items-baseline justify-between gap-3"
                      style={{ padding: "13px 0" }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 17,
                          fontWeight: reached ? 700 : 600,
                          textTransform: "uppercase",
                          color: reached
                            ? "var(--color-text-strong)"
                            : "var(--color-muted-poster)",
                        }}
                      >
                        {rank}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: reached
                            ? "var(--color-teal)"
                            : isNext
                            ? "var(--color-brass)"
                            : "var(--color-dim)",
                          flex: "none",
                        }}
                      >
                        {reached
                          ? "reached"
                          : isNext
                          ? `${standing.kgToNext} kg away`
                          : "—"}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {goal && (
            <div style={{ paddingTop: 20 }}>
              <span className="label">Next round number</span>
              <p style={{ fontSize: 14, color: "var(--color-text)", paddingTop: 8 }}>
                {goal.multiple}× bodyweight — {goal.kgAway} kg away.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Ledger({ onBack }) {
  const { sessions, bodyweightLog, bodyweightKg, settings } = useWorkout();

  const ledger = useMemo(
    () => buildLedger(sessions, bodyweightLog, bodyweightKg, settings.sex),
    [sessions, bodyweightLog, bodyweightKg, settings.sex]
  );

  return (
    <div
      className="flex-1 min-h-0 flex flex-col"
      style={{ background: "var(--color-poster)", overflowY: "auto", padding: "6px 24px 16px" }}
    >
      <div className="flex items-center justify-between flex-none" style={{ marginBottom: 10 }}>
        <button type="button" className="link-teal" onClick={onBack}>
          Record book
        </button>
        <span className="kicker">Milestones</span>
      </div>

      <span className="poster-title" data-lines="2">
        Firsts
        <br />
        and bests
      </span>
      <span style={{ fontSize: 13, color: "var(--color-muted-poster)", paddingTop: 8 }}>
        {ledger.length ? `${ledger.length} written in so far` : "nothing written in yet"}
      </span>

      <div style={{ paddingTop: 22 }}>
        {ledger.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--color-dim)" }}>
            Log a few sessions and your firsts land here.
          </p>
        ) : (
          ledger.map((entry, index) => (
            <React.Fragment key={`${entry.date}-${index}`}>
              <Rule brass={index === 0} />
              <div
                className="flex items-baseline justify-between gap-3"
                style={{ padding: "13px 0" }}
              >
                <div className="flex flex-col gap-[3px] min-w-0">
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--color-text)",
                    }}
                  >
                    {entry.text}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--color-dim)" }}>
                    {friendlyDate(entry.date)}
                  </span>
                </div>
                <span
                  className="uppercase"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    fontWeight: 700,
                    color: TAG_COLOUR[entry.tag] || "var(--color-dim)",
                    flex: "none",
                  }}
                >
                  {entry.tag}
                </span>
              </div>
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
}

export default function LiftLadderPage({ liftName, onBack }) {
  return liftName ? <Ladder liftName={liftName} onBack={onBack} /> : <Ledger onBack={onBack} />;
}
