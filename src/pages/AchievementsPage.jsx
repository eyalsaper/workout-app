import React from "react";
import { useWorkout } from "../state/WorkoutContext";
import ArtLayer from "../components/ArtLayer";
import { PosterSegments, Rule } from "../components/poster";
import { artSeed } from "../lib/art";
import {
  RANKS,
  STRENGTH_STANDARDS_BY_SEX,
  getStanding,
} from "../lib/achievements";

/*
 * 8K · Progress / Record book.
 *
 * All four core lifts, always. A lift with no data shows an em dash and an
 * empty tier bar — the gap is the information, so it is never hidden.
 *
 * The overall tier is the LOWEST of the four, because a chain is as strong as
 * its weakest link and that is the honest reading.
 */

const SEGMENTS = [
  ["charts", "Charts"],
  ["records", "Record book"],
  ["body", "Body"],
];

const CORE_LIFTS = ["Squat", "Bench Press", "Deadlift", "Overhead Press"];

function TierBar({ rankIndex }) {
  return (
    <div className="flex gap-[4px]" style={{ margin: "8px 0" }}>
      {RANKS.map((rank, index) => (
        <span
          key={rank}
          style={{
            flex: 1,
            height: 5,
            background: index <= rankIndex ? "var(--color-brass)" : "var(--color-rule)",
          }}
        />
      ))}
    </div>
  );
}

export default function AchievementsPage({ segments, onOpenMilestones, onOpenLadder }) {
  const { sessions, bodyweightKg, settings } = useWorkout();
  const sex = settings.sex;

  const standings = CORE_LIFTS.map((name) => ({
    name,
    standing: sex ? getStanding(name, sessions, bodyweightKg, sex) : null,
  }));

  // The lowest tier across the four. A lift with no data has no tier, so it
  // holds the overall reading at its floor rather than being skipped.
  const ranked = standings.map((s) => (s.standing ? s.standing.rankIndex : -1));
  const overallIndex = Math.min(...ranked);
  const overall = overallIndex >= 0 ? RANKS[overallIndex] : "Unranked";

  const latestPrId = Object.values(sessions || {})
    .filter((s) => s?.newBests?.length)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .pop()?.date;

  return (
    <div
      className="flex-1 min-h-0 flex flex-col"
      style={{ background: "var(--color-poster)", overflowY: "auto" }}
    >
      {/* The draw owns the whole header rather than a side crop — a 116px
          strip of a portrait read as a sliver of someone's shoulder. Full
          bleed with the poster scrim, so the tier sits on the opaque end. */}
      <div className="relative flex-none" style={{ height: 240, padding: "0 24px" }}>
        <ArtLayer mood="triumph" seedKey={artSeed.record(latestPrId)} scrim="poster" />
        <div className="relative flex flex-col justify-end gap-[6px]" style={{ height: "100%", paddingBottom: 18 }}>
          <span className="kicker">Record book</span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "var(--color-text-strong)",
            }}
          >
            {overall}
          </span>
          <span style={{ fontSize: 13, color: "var(--color-muted-poster)" }}>
            {sex
              ? `across four lifts at ${Math.round(bodyweightKg) || "—"} kg bodyweight`
              : "set your sex in Settings to see tiers"}
          </span>
        </div>
      </div>

      <div className="flex flex-col flex-1" style={{ padding: "0 24px 16px" }}>
        {segments}

        <div style={{ paddingTop: 18 }}>
          {standings.map(({ name, standing }, index) => (
            <React.Fragment key={name}>
              <Rule brass={index === 0} />
              <button
                type="button"
                className="flex flex-col w-full text-left"
                style={{ padding: "14px 0" }}
                onClick={() => onOpenLadder?.(name)}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 19,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: "var(--color-text-strong)",
                    }}
                  >
                    {name}
                  </span>
                  <span
                    className="tabular"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 19,
                      fontWeight: 700,
                      color: "var(--color-brass-text)",
                      flex: "none",
                    }}
                  >
                    {standing ? `${Math.round(standing.e1rmKg)} kg` : "—"}
                  </span>
                </div>
                <TierBar rankIndex={standing ? standing.rankIndex : -1} />
                <span style={{ fontSize: 12, color: "var(--color-dim)" }}>
                  {!standing
                    ? sex
                      ? "nothing logged yet"
                      : "needs a bodyweight and a sex"
                    : standing.nextRank
                    ? `${standing.rank?.toLowerCase() || "unranked"} · ${standing.kgToNext} kg to ${standing.nextRank.toLowerCase()}`
                    : `${standing.rank?.toLowerCase()} · top of the ladder`}
                </span>
              </button>
            </React.Fragment>
          ))}
        </div>

        <button
          type="button"
          className="link-teal text-left"
          style={{ marginTop: "auto", paddingTop: 18 }}
          onClick={onOpenMilestones}
        >
          Milestones and firsts
        </button>
      </div>
    </div>
  );
}
