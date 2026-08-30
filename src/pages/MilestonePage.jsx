import React, { useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import ArtLayer from "../components/ArtLayer";
import { InsetBlock, Kicker, PosterButton, PosterRow } from "../components/poster";
import { artSeed } from "../lib/art";
import { formatTonnage } from "../lib/training";
import { chapterDateRange, getChapterInfo } from "../lib/achievements";

/*
 * 8M · Chapter summary — the long arc.
 *
 * A chapter is ~12 weeks and the user closes it by hand. Auto-computed stats
 * plus ONE written note: no prompts, no templates, no questions — an empty
 * field and the user's own words.
 */

const HERO = 330;

function longDate(day) {
  if (!day) return "";
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "long" });
}

export default function MilestonePage({ onClose }) {
  const { sessions, chapterSummaries, ensureChapterSummary } = useWorkout();

  const chapter = getChapterInfo(sessions);
  const number = chapter?.number ?? 1;
  const range = chapterDateRange(sessions, number);

  const inChapter = Object.values(sessions || {}).filter(
    (s) => s?.finishedAt && s?.date && range && s.date >= range.from && s.date < range.to
  );
  const tonnage = inChapter.reduce((sum, s) => sum + (s.tonnageKg || 0), 0);
  const bests = inChapter.reduce((sum, s) => sum + (s.newBests?.length || 0), 0);

  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(chapterSummaries?.[number] || "");

  const saveNote = () => {
    ensureChapterSummary(number, note);
    setEditing(false);
  };

  return (
    <div
      className="flex-1 min-h-0 flex flex-col"
      style={{ background: "var(--color-poster)", overflowY: "auto" }}
    >
      <div
        className="relative flex-none flex flex-col justify-end"
        style={{ height: HERO, padding: "0 24px 22px" }}
      >
        <ArtLayer mood="triumph" seedKey={artSeed.chapter(number)} scrim="poster" />
        <div className="relative flex flex-col gap-[8px]">
          <Kicker>
            Chapter {number} · 12 weeks
          </Kicker>
          <span className="poster-title">
            Chapter
            <br />
            closed
          </span>
          <span style={{ fontSize: 13, color: "var(--color-muted-poster)" }}>
            {range ? `${longDate(range.from)} — ${longDate(range.to)}` : "not started"}
          </span>
        </div>
      </div>

      <div className="flex flex-col flex-1" style={{ padding: "0 24px 16px" }}>
        <PosterRow label="Sessions" value={inChapter.length} brassRule />
        <PosterRow label="Lifted" value={formatTonnage(tonnage)} />
        <PosterRow label="New bests" value={`${bests} lift${bests === 1 ? "" : "s"}`} />

        <InsetBlock style={{ marginTop: 10 }}>
          <div className="flex flex-col gap-[8px]">
            <span className="label">Your note</span>
            {editing ? (
              <textarea
                autoFocus
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={5}
                style={{
                  background: "transparent",
                  outline: "none",
                  resize: "none",
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "var(--color-text)",
                  fontFamily: "var(--font-body)",
                }}
              />
            ) : (
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--color-text)" }}>
                {note || "—"}
              </p>
            )}
            <button
              type="button"
              className="link-teal text-left"
              onClick={editing ? saveNote : () => setEditing(true)}
            >
              {editing ? "Save note" : "Edit note"}
            </button>
          </div>
        </InsetBlock>

        <div style={{ marginTop: "auto", paddingTop: 20 }}>
          <PosterButton onClick={onClose}>Start chapter {number + 1}</PosterButton>
        </div>
      </div>
    </div>
  );
}
