import React, { useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import ArtBand from "../components/ArtBand";
import { READY_MADE } from "../lib/templates";
import { routineSummary } from "../lib/training";

/*
 * 8C · Workout / Routines — the shelf.
 *
 * Everything the user can run or edit. Templates are read-only starting
 * points; running or editing one clones it into Yours first.
 */

// Below roughly this many routines the list is shorter than a search field is
// worth, so search stays behind a tap on the band.
const SEARCH_THRESHOLD = 8;

function RoutineRow({ name, sub, count, onClick }) {
  return (
    <button type="button" onClick={onClick} className="row-card flex justify-between items-center w-full text-left press">
      <div className="flex flex-col gap-[3px] min-w-0">
        <span className="row-title truncate">{name}</span>
        <span className="text-[12px] truncate" style={{ color: "var(--color-muted)" }}>
          {sub}
        </span>
      </div>
      <span className="row-value tabular" style={{ flex: "none", paddingLeft: 12 }}>
        {count}
      </span>
    </button>
  );
}

export default function RoutinesPage({
  segmentControl,
  onOpenRoutine,
  onBuildRoutine,
  onRunTemplate,
  onBuildWorkout,
}) {
  const { routines, settings } = useWorkout();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const all = Object.values(routines || {});
  const showSearch = all.length > SEARCH_THRESHOLD;
  const filtered = query
    ? all.filter((r) => r.name?.toLowerCase().includes(query.toLowerCase()))
    : all;

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-[14px]">
      <span className="screen-title flex-none">Workout</span>
      {segmentControl}

      <ArtBand
        screen="routines"
        kicker="Your shelf"
        sub={`${all.length} routine${all.length === 1 ? "" : "s"}, ${READY_MADE.length} templates`}
        right={
          showSearch ? (
            <button
              type="button"
              onClick={() => setSearching((s) => !s)}
              className="link-teal"
              style={{ fontSize: 12 }}
            >
              Search
            </button>
          ) : null
        }
      />

      {searching && (
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a routine"
          className="flex-none"
          style={{
            height: 44,
            borderRadius: "var(--radius-control)",
            background: "var(--color-card-hi)",
            border: "1px solid #24272d",
            padding: "0 14px",
            color: "var(--color-text)",
            outline: "none",
          }}
        />
      )}

      <div className="flex flex-col gap-[8px] min-h-0" style={{ overflowY: "auto" }}>
        <span className="label" style={{ paddingLeft: 2 }}>
          Yours
        </span>
        {filtered.length === 0 ? (
          <span className="text-[13px]" style={{ color: "var(--color-dim)" }}>
            Nothing on the shelf yet
          </span>
        ) : (
          filtered.map((routine) => {
            const summary = routineSummary(routine, settings.defaultRestSeconds);
            return (
              <RoutineRow
                key={routine.id}
                name={routine.name}
                sub={`${routine.focus || summary.label} · ${summary.minutes} min`}
                count={summary.movements}
                onClick={() => onOpenRoutine(routine.id)}
              />
            );
          })
        )}

        <span className="label" style={{ paddingLeft: 2, paddingTop: 6 }}>
          Ready-made
        </span>
        {/* Read-only starting points. Tapping one clones its days into Yours
            before anything can be edited or run (§8C). */}
        {READY_MADE.map((template) => (
          <RoutineRow
            key={template.id}
            name={template.name}
            sub={template.description}
            count={template.days.length}
            onClick={() => onRunTemplate(template)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-[8px]" style={{ marginTop: "auto" }}>
        {/* A one-off is not a routine — it is trained once and never joins
            the plan, so it sits below rather than beside. */}
        <button type="button" className="link-teal text-left" onClick={onBuildWorkout}>
          Train a one-off workout
        </button>
        <button type="button" className="btn-primary" onClick={onBuildRoutine}>
          Build a routine
        </button>
      </div>
    </div>
  );
}
