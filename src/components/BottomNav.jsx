import React from "react";

/*
 * Three tabs, fixed, text only. This never grows, and it is never icons-only.
 *
 * A flex child of the app shell rather than `position: fixed`: the shell is a
 * flex column and the bar carries `flex: none`, which is what stops long
 * content either squashing it or painting over it.
 */

const TABS = [
  {
    key: "workout",
    label: "Workout",
    match: ["workout", "session", "sessionSummary", "library", "buildWorkout"],
  },
  {
    key: "program",
    label: "Program",
    match: ["program", "planBuilder", "planDay", "routineEditor", "blocks"],
  },
  {
    key: "progress",
    label: "Progress",
    match: ["progress", "milestone", "ledger", "movementDetail"],
  },
];

export default function BottomNav({ activePage, onNavigate }) {
  return (
    <nav className="tab-bar pb-[env(safe-area-inset-bottom)]" aria-label="Sections">
      {TABS.map(({ key, label, match }) => {
        const isActive = match.includes(activePage);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onNavigate(key)}
            data-active={isActive}
            aria-current={isActive ? "page" : undefined}
            className="tab-item"
          >
            {/* Inactive tabs keep an indicator of the same size, transparent,
                so the labels never shift when the active tab changes. */}
            <span className="tab-indicator" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
