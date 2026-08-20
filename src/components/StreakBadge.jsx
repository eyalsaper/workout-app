import React from "react";
import { Flame } from "lucide-react";

export default function StreakBadge({ streak }) {
  if (!streak) return null;
  return (
    <div className="inline-flex items-center gap-1.5 chip">
      <Flame className="w-3.5 h-3.5 text-accent" />
      {streak}-week streak
    </div>
  );
}
