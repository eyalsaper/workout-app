import React from "react";
import { useWorkout } from "../state/WorkoutContext";
import ArtLayer from "../components/ArtLayer";
import DayStrip from "../components/DayStrip";
import { InsetBlock, Kicker, PosterButton, PosterRow } from "../components/poster";
import { artSeed } from "../lib/art";
import { orderedDays } from "../lib/plan";
import { countSets } from "../lib/session";
import { formatTonnage, roundProgress } from "../lib/training";
import { getChapterInfo } from "../lib/achievements";

/*
 * 8G · session finished mid-round, and 8H · round closed.
 *
 * Same skeleton, dialled up. 8H fires when the session just logged was the
 * LAST DAY OF THE PLAN — not on a Sunday, not on a calendar boundary — and it
 * is the app's one celebration. A one-day plan never reaches it, because a
 * celebration that fires every session means nothing.
 */

const HERO_MID = 380;
const HERO_CLOSED = 396;

function bestLabel(best) {
  return `${best.movementId} ${best.weightKg} × ${best.reps}`;
}

export default function SessionSummaryPage({
  sessionKey,
  outcome,
  isReadOnly = false,
  onClose,
}) {
  const { sessions, program, planDays, settings } = useWorkout();
  const session = sessions[sessionKey];
  if (!session) return null;

  const roundClosed = !!outcome?.showRoundClosed;
  const newBests = session.newBests || outcome?.newBests || [];
  const { done: setsLogged } = countSets(session.entries);
  const minutes = session.finishedAt
    ? Math.max(1, Math.round((session.finishedAt - session.startedAt) / 60000))
    : null;

  const days = orderedDays(program);
  const roundNumber = session.roundNumber ?? program?.cursor?.round ?? 1;
  const chapter = getChapterInfo(sessions);

  /*
   * Which day this session WAS — not where the cursor is now.
   *
   * completeSession has already advanced the cursor by the time this screen
   * renders, so reading roundInfo here would report the next day and tell the
   * user they just finished Day 4 when they finished Day 3.
   */
  const completedIndex = days.findIndex((day) => day.id === session.planDayId);
  const completedPosition = completedIndex === -1 ? null : completedIndex + 1;

  // On 8G the strip shows where the round now stands. On 8H every pill is
  // done, because the round it is reporting on is over.
  const strip = roundClosed
    ? {
        ...roundProgress(program, days),
        pills: days.map((day) => ({ id: day.id, name: day.name, state: "done" })),
        progress: 1,
        a11y: `Round ${roundNumber} closed, all ${days.length} days`,
      }
    : roundProgress(program, days);

  const nextDayName = days[program?.cursor?.dayIndex ?? 0]?.name;
  const daysLeft = days.length - (program?.cursor?.dayIndex ?? 0);

  // ---- 8H · round closed ------------------------------------------------
  if (roundClosed) {
    // Days of the plan completed this round — keyed by planDayId, so a day
    // logged twice counts once and an ad-hoc session counts not at all.
    const roundDayIds = new Set(
      Object.values(sessions)
        .filter(
          (s) => s?.finishedAt && s?.planDayId && Number(s.roundNumber) === Number(roundNumber)
        )
        .map((s) => s.planDayId)
    );
    const roundSessions = Object.values(sessions).filter(
      (s) => s?.finishedAt && Number(s.roundNumber) === Number(roundNumber)
    );
    const roundTonnage = roundSessions.reduce((sum, s) => sum + (s.tonnageKg || 0), 0);
    const roundBests = roundSessions.reduce((sum, s) => sum + (s.newBests?.length || 0), 0);

    return (
      <div
        className="flex-1 min-h-0 flex flex-col"
        style={{ background: "var(--color-poster)", overflowY: "auto" }}
      >
        <div
          className="relative flex-none flex flex-col justify-end"
          style={{ height: HERO_CLOSED, padding: "0 24px 22px" }}
        >
          <ArtLayer mood="triumph" seedKey={artSeed.finish(sessionKey)} scrim="poster" />
          <div className="relative flex flex-col gap-[8px]">
            <Kicker>
              Round {roundNumber} · {days.length} days
            </Kicker>
            <span className="poster-title">
              Round
              <br />
              closed
            </span>
            <span style={{ fontSize: 13, color: "var(--color-muted-poster)" }}>
              all {days.length} days, nothing skipped
            </span>
          </div>
        </div>

        <div className="flex flex-col" style={{ padding: "0 24px" }}>
          <PosterRow label="Round tonnage" value={formatTonnage(roundTonnage)} brassRule />
          <PosterRow label="Sessions" value={`${roundDayIds.size} of ${days.length}`} />
          <PosterRow
            label="New bests"
            value={`${roundBests} lift${roundBests === 1 ? "" : "s"}`}
          />

          <InsetBlock style={{ marginTop: 10 }}>
            <div className="flex flex-col gap-[10px]">
              <span className="label">
                Round {roundNumber} · {days.length} of {days.length}
              </span>
              <DayStrip roundInfo={strip} showLabels={false} />
              {/* What the next round STARTS WITH — never when. */}
              <span style={{ fontSize: 12, color: "var(--color-dim)" }}>
                Round {roundNumber + 1} starts at Day 1 — {days[0]?.name}.
              </span>
            </div>
          </InsetBlock>

          <div style={{ marginTop: "auto", paddingTop: 20, paddingBottom: 16 }}>
            <PosterButton onClick={onClose}>Start round {roundNumber + 1}</PosterButton>
          </div>
        </div>
      </div>
    );
  }

  // ---- 8G · mid-round ---------------------------------------------------
  return (
    <div
      className="flex-1 min-h-0 flex flex-col"
      style={{ background: "var(--color-poster)", overflowY: "auto" }}
    >
      <div
        className="relative flex-none flex flex-col justify-end"
        style={{ height: HERO_MID, padding: "0 24px 22px" }}
      >
        <ArtLayer mood="triumph" seedKey={artSeed.finish(sessionKey)} scrim="poster" />
        <div className="relative flex flex-col gap-[8px]">
          <Kicker>
            Round {roundNumber}
            {completedPosition ? ` · Day ${completedPosition} of ${days.length}` : ""}
            {minutes ? ` · ${minutes} min` : ""}
          </Kicker>
          <span className="poster-title" data-lines="2">
            {session.label || "Session"}
            <br />
            is done
          </span>
        </div>
      </div>

      <div className="flex flex-col" style={{ padding: "0 24px" }}>
        <PosterRow label="Lifted" value={formatTonnage(session.tonnageKg || 0)} brassRule />
        <PosterRow label="Sets logged" value={setsLogged} />
        {/* Only when there is one. Never fabricated, and never a row saying
            there wasn't one. */}
        {newBests.length > 0 && (
          <PosterRow
            label={newBests.length === 1 ? "New best" : "New bests"}
            value={newBests.length === 1 ? bestLabel(newBests[0]) : `${newBests.length} lifts`}
            valueColor="var(--color-teal)"
          />
        )}

        {strip.total > 0 && (
          <InsetBlock style={{ marginTop: 10 }}>
            <div className="flex flex-col gap-[10px]">
              <span className="label">
                Round {roundNumber} · {strip.done} of {strip.total}
              </span>
              <DayStrip roundInfo={strip} showLabels={false} />
              <span style={{ fontSize: 12, color: "var(--color-dim)" }}>
                {daysLeft === 1
                  ? `One day left — ${nextDayName}, whenever you're next in.`
                  : `${daysLeft} days left — ${nextDayName} is up next.`}
              </span>
            </div>
          </InsetBlock>
        )}

        <div style={{ marginTop: "auto", paddingTop: 20, paddingBottom: 16 }}>
          <PosterButton onClick={onClose}>
            {isReadOnly
              ? "Back"
              : `Save to chapter ${chapter?.number ?? 1}`}
          </PosterButton>
        </div>
      </div>
    </div>
  );
}
