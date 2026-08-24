import React, { useEffect, useMemo, useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import {
  STRENGTH_STANDARDS_BY_SEX,
  getAllStandings,
  getChapterInfo,
  chapterDateRange,
  buildLedger,
  summarizeChapter,
} from "../lib/achievements";

const LEDGER_PREVIEW = 5;

function shortDate(day) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function StandardsBar({ liftName, ratio, rankIndex, sex }) {
  const table = STRENGTH_STANDARDS_BY_SEX[sex][liftName];
  const keys = ["novice", "intermediate", "advanced", "elite"];
  const segColor = rankIndex >= 2 ? "var(--color-positive-delta)" : "var(--color-accent)";

  return (
    <div className="mt-3 flex gap-[3px]">
      {keys.map((key, i) => {
        const lower = i === 0 ? 0 : table[keys[i - 1]];
        const upper = table[key];
        const pct = Math.round(Math.min(1, Math.max(0, (ratio - lower) / (upper - lower))) * 100);
        return (
          <div
            key={key}
            className="flex-1 h-[7px]"
            style={{
              borderRadius: i === 0 ? "7px 0 0 7px" : i === keys.length - 1 ? "0 7px 7px 0" : 0,
              background: `linear-gradient(90deg, ${segColor} ${pct}%, var(--color-border-control) ${pct}%)`,
            }}
          />
        );
      })}
    </div>
  );
}

function StandingCard({ standing, sex, onOpen }) {
  const { liftName, e1rmKg, rankIndex, rank, nextRank, kgToNext } = standing;
  return (
    <button type="button" onClick={() => onOpen(liftName)} className="w-full card p-4 text-left">
      <div className="flex items-baseline justify-between">
        <span className="text-lg" style={{ fontFamily: "var(--font-heading)" }}>
          {liftName}
        </span>
        <span className={`text-xs font-medium ${rankIndex >= 2 ? "text-positive-delta" : "text-accent"}`}>
          {rank || "Building"}
        </span>
      </div>
      <StandardsBar liftName={liftName} ratio={standing.ratio} rankIndex={rankIndex} sex={sex} />
      <p className="mt-2.5 text-sm text-ink-mid">
        {Math.round(e1rmKg)} kg estimated
        {nextRank ? ` · ${kgToNext} kg to ${nextRank}` : " · Elite already — the top of this ladder"}
      </p>
    </button>
  );
}

export default function AchievementsPage({ onOpenLadder }) {
  const { sessions, settings, bodyweightKg, bodyweightLog, chapterSummaries, ensureChapterSummary } = useWorkout();
  const [expanded, setExpanded] = useState(false);
  const sex = settings.sex;

  const standings = useMemo(() => getAllStandings(sessions, bodyweightKg, sex), [sessions, bodyweightKg, sex]);
  const ledger = useMemo(
    () => buildLedger(sessions, bodyweightLog, bodyweightKg, sex),
    [sessions, bodyweightLog, bodyweightKg, sex]
  );
  const chapter = useMemo(() => getChapterInfo(sessions), [sessions]);

  const chapterMilestones = useMemo(() => {
    if (!chapter) return 0;
    const range = chapterDateRange(sessions, chapter.number);
    return ledger.filter((e) => e.date >= range.from && e.date < range.to).length;
  }, [chapter, ledger, sessions]);

  const isBestChapterYet = useMemo(() => {
    if (!chapter || chapter.number <= 1 || chapterMilestones === 0) return false;
    for (let n = 1; n < chapter.number; n++) {
      const range = chapterDateRange(sessions, n);
      const count = ledger.filter((e) => e.date >= range.from && e.date < range.to).length;
      if (count >= chapterMilestones) return false;
    }
    return true;
  }, [chapter, chapterMilestones, ledger, sessions]);

  // Write a closed chapter's summary once, the first time it's seen closed.
  useEffect(() => {
    if (!chapter) return;
    for (let n = 1; n < chapter.number; n++) {
      if (chapterSummaries[n]) continue;
      const range = chapterDateRange(sessions, n);
      ensureChapterSummary(n, summarizeChapter(sessions, ledger, range, bodyweightKg));
    }
  }, [chapter, chapterSummaries, ensureChapterSummary, sessions, ledger, bodyweightKg]);

  const pastChapters = chapter
    ? Array.from({ length: chapter.number - 1 }, (_, i) => i + 1).filter((n) => chapterSummaries[n])
    : [];

  const visibleLedger = expanded ? ledger : ledger.slice(0, LEDGER_PREVIEW);

  return (
    <div className="space-y-5">
      {chapter ? (
        <div className="card-hero p-5">
          <div className="flex items-baseline justify-between">
            <span className="stencil">Chapter {chapter.number}</span>
            <span className="text-sm font-medium text-accent">
              week {chapter.weekInChapter} of 12
            </span>
          </div>
          <div className="mt-2 text-2xl" style={{ fontFamily: "var(--font-heading)" }}>
            {chapter.title}
          </div>
          <div className="mt-3 flex gap-1">
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={i}
                className="flex-1 h-2 rounded-full"
                style={{ background: i < chapter.weekInChapter ? "var(--color-accent)" : "var(--color-border-control)" }}
              />
            ))}
          </div>
          <p className="mt-3.5 aside text-sm leading-relaxed">
            {chapter.weeksLeft > 0
              ? `${chapter.weeksLeft} week${chapter.weeksLeft === 1 ? "" : "s"} left. `
              : "Closing this week. "}
            {chapterMilestones} milestone{chapterMilestones === 1 ? "" : "s"} written in so far
            {isBestChapterYet ? " — your best chapter yet." : "."}
          </p>
        </div>
      ) : (
        <div className="slot-empty p-5 text-sm text-ink-muted">
          Log your first session to start chapter one.
        </div>
      )}

      {pastChapters.length > 0 && (
        <div>
          <div className="stencil mb-2">Past chapters</div>
          <div className="space-y-2">
            {pastChapters.map((n) => (
              <div key={n} className="card p-3.5">
                <div className="text-sm font-medium text-ink">Chapter {n}</div>
                <p className="mt-1 text-sm text-ink-muted">{chapterSummaries[n]}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="stencil mb-2.5">Where you stand</div>
        {!sex ? (
          <p className="text-sm text-ink-muted italic">
            Add your sex in Settings to see the strength ladder — it only picks which standards table
            to compare against.
          </p>
        ) : standings.length === 0 ? (
          <p className="text-sm text-ink-muted italic">
            Log Squat, Bench Press, Deadlift, or Overhead Press to see your standing.
          </p>
        ) : (
          <div className="space-y-2">
            {standings.map((s) => (
              <StandingCard key={s.liftName} standing={s} sex={sex} onOpen={onOpenLadder} />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <span className="stencil">The ledger</span>
          <span className="text-sm font-medium text-ink-muted">
            {ledger.length} entr{ledger.length === 1 ? "y" : "ies"}
          </span>
        </div>
        {ledger.length === 0 ? (
          <p className="mt-2.5 text-sm text-ink-muted italic">
            Nothing written in yet — your first milestone will land here.
          </p>
        ) : (
          <>
            <div className="mt-2.5">
              {visibleLedger.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-baseline gap-3 py-2.5 border-b border-dashed border-border-control last:border-0"
                >
                  <span className="w-14 flex-shrink-0 text-xs text-ink-faint">{shortDate(entry.date)}</span>
                  <span className="flex-1 text-sm text-ink">{entry.text}</span>
                  <span
                    className={`text-xs font-medium ${
                      entry.tag === "habit" ? "text-positive-delta" : "text-accent"
                    }`}
                  >
                    {entry.tag}
                  </span>
                </div>
              ))}
            </div>
            {!expanded && ledger.length > LEDGER_PREVIEW && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="btn-outline w-full py-3 mt-3 text-sm"
              >
                Read the whole book
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
