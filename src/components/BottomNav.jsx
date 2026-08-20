import React from "react";
import { Home, ListOrdered, TrendingUp } from "lucide-react";

const TABS = [
  { key: "today", label: "Today", icon: Home, match: ["today", "weekPlanner", "routineEditor", "session", "sessionSummary"] },
  { key: "history", label: "Progress", icon: TrendingUp, match: ["history", "liftHistory"] },
  { key: "library", label: "Library", icon: ListOrdered, match: ["library", "movementDetail"] },
];

/**
 * Fixed bottom tab bar. Settings lives in the header instead of a tab —
 * see Shell's header pill in App.jsx.
 */
export default function BottomNav({ activePage, onNavigate }) {
  return (
    <nav className="tab-bar fixed bottom-0 left-0 right-0 z-30 flex pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-6xl mx-auto w-full flex">
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
