import React from "react";
import { Dumbbell, CalendarDays, TrendingUp } from "lucide-react";

const TABS = [
  {
    key: "workout",
    label: "Workout",
    icon: Dumbbell,
    match: ["workout", "buildWorkout", "session", "sessionSummary", "movementDetail"],
  },
  {
    key: "program",
    label: "Program",
    icon: CalendarDays,
    match: ["program", "weekPlanner", "routineEditor", "planBuilder"],
  },
  {
    key: "progress",
    label: "Progress",
    icon: TrendingUp,
    match: ["progress", "liftHistory", "liftLadder"],
  },
];

/**
 * Fixed bottom tab bar. Settings lives in the header instead of a tab —
 * see Shell's header pill in App.jsx.
 */
export default function BottomNav({ activePage, onNavigate }) {
  return (
    <nav className="tab-bar fixed bottom-0 left-0 right-0 z-30 flex pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-lg mx-auto w-full flex">
        {TABS.map(({ key, label, icon: Icon, match }) => {
          const isActive = match.includes(activePage);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              data-active={isActive}
              className="tab-item flex-1 py-3 flex flex-col items-center gap-1 font-medium text-xs transition-colors"
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
