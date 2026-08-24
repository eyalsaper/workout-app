import React, { useMemo, useState } from "react";
import { Check, ChevronDown, Copy, MessageSquarePlus, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useWorkout } from "../state/WorkoutContext";
import ConfirmDialog from "../components/ConfirmDialog";
import { isRestEntry, cleanName } from "../lib/format";
import { weekKey, weekDates, todayDayIndex, weekdayLabel, estimateMinutes } from "../lib/training";
import { TEMPLATES } from "../lib/templates";

function formatRange(dates) {
  const first = new Date(dates[0]);
  const last = new Date(dates[6]);
  const opts = { month: "short", day: "numeric" };
  const firstStr = first.toLocaleDateString(undefined, opts);
  const lastStr = last.toLocaleDateString(undefined, { day: "numeric" });
  return `${firstStr}–${lastStr}`;
}

function PlanSwitcher({ onClose, onOpenBuilder }) {
  const {
    planIds,
    activePlanId,
    getPlanName,
    setActivePlan,
    createPlan,
    createPlanFromTemplate,
    duplicatePlan,
    renamePlan,
    deletePlan,
  } = useWorkout();

  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [newPlanName, setNewPlanName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const useTemplate = (template) => {
    createPlanFromTemplate(template.label, template.days);
    onClose();
  };

  const startRename = (id) => {
    setRenamingId(id);
    setRenameValue(getPlanName(id));
  };

  const saveRename = () => {
    renamePlan(renamingId, renameValue);
    setRenamingId(null);
  };

  const addPlan = () => {
    createPlan(newPlanName);
    setNewPlanName("");
    onClose();
  };

  return (
    <div className="card p-3 space-y-2.5">
      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete this plan?"
          message={`"${getPlanName(confirmDeleteId)}" and its whole week will be gone. Logged sessions aren't affected.`}
          confirmLabel="Delete plan"
          onConfirm={() => {
            deletePlan(confirmDeleteId);
            setConfirmDeleteId(null);
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      <div className="stencil px-1">Plans</div>

      <div className="space-y-1">
        {planIds.map((id) => {
          const isActive = id === activePlanId;
          return (
            <div key={id} className="flex items-center gap-1.5">
              {renamingId === id ? (
                <input
                  type="text"
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveRename()}
                  onBlur={saveRename}
                  className="flex-1 p-2 border border-border-control rounded-card bg-surface text-sm"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setActivePlan(id);
                    onClose();
                  }}
                  className={`flex-1 flex items-center gap-2 p-2 rounded-card text-left text-sm ${
                    isActive ? "bg-surface-wash font-medium text-ink" : "text-ink-soft hover:bg-surface-wash"
                  }`}
                >
                  <Check className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-accent" : "opacity-0"}`} />
                  {getPlanName(id)}
                </button>
              )}
              <button
                type="button"
                onClick={() => startRename(id)}
                aria-label={`Rename ${getPlanName(id)}`}
                className="p-2 text-ink-faint hover:text-accent"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => duplicatePlan(id)}
                aria-label={`Duplicate ${getPlanName(id)}`}
                className="p-2 text-ink-faint hover:text-accent"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              {planIds.length > 1 && (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(id)}
                  aria-label={`Delete ${getPlanName(id)}`}
                  className="p-2 text-ink-faint hover:text-negative"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-border-control space-y-2">
        <div className="stencil px-1">Start a new plan</div>

        <button
          type="button"
          onClick={() => {
            onOpenBuilder();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 p-2.5 rounded-card bg-accent/10 text-accent text-sm font-medium"
        >
          <MessageSquarePlus className="w-4 h-4 flex-shrink-0" />
          Describe what you want and I'll build it
        </button>

        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => useTemplate(t)}
              className="chip"
              title={t.description}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newPlanName}
            onChange={(e) => setNewPlanName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPlan()}
            placeholder="Or a blank plan named..."
            className="flex-1 p-2 border border-border-control rounded-card bg-surface text-sm"
          />
          <button type="button" onClick={addPlan} className="btn-outline px-3 text-sm">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WeekPlannerPage({ onStartDay, onEditDay, onBack, onOpenBuilder }) {
  const { plans, activePlanId, getPlanName, isDayDoneThisWeek, getDayTotalSets, exerciseBank } = useWorkout();
  const [showPlans, setShowPlans] = useState(false);

  const thisWeek = weekKey();
  const dates = useMemo(() => weekDates(), []);
  const todayIdx = todayDayIndex();
  const days = plans[activePlanId] || [];
  const weekNumber = thisWeek.split("-W")[1];

  const rows = days.map((day, dayIdx) => {
    const exercises = (day.exercises || []).filter((ex) => !isRestEntry(ex));
    const isRest = (day.exercises || []).length > 0 && exercises.length === 0;
    const isOpen = (day.exercises || []).length === 0;
    const logged = isDayDoneThisWeek(activePlanId, dayIdx, thisWeek);
    const isToday = dayIdx === todayIdx;
    const totalSets = getDayTotalSets(activePlanId, dayIdx);
    const minutes = estimateMinutes(day, exerciseBank);
    return { day, dayIdx, exercises, isRest, isOpen, logged, isToday, totalSets, minutes };
  });

  const plannedCount = rows.filter((r) => !r.isRest && !r.isOpen).length;
  const doneCount = rows.filter((r) => r.logged?.finished).length;

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-in fade-in duration-300 pb-6">
      <div>
        <button type="button" onClick={onBack} className="text-sm text-ink-muted hover:text-accent">
          Program
        </button>
        <div className="mt-2.5 flex items-baseline justify-between gap-3">
          <h1 className="text-4xl">Week {weekNumber}</h1>
          <button
            type="button"
            onClick={() => setShowPlans((v) => !v)}
            className={`pill-outline flex items-center gap-1.5 text-xs flex-shrink-0 ${
              showPlans ? "bg-ink text-accent-ink border-ink" : ""
            }`}
          >
            {getPlanName(activePlanId)}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="mt-1.5 text-sm text-ink-muted">
          {formatRange(dates)} · {plannedCount} session{plannedCount === 1 ? "" : "s"} planned ·{" "}
          {doneCount} done
        </p>
      </div>

      {showPlans && <PlanSwitcher onClose={() => setShowPlans(false)} onOpenBuilder={onOpenBuilder} />}

      <div className="space-y-2.5">
        {rows.map(({ day, dayIdx, exercises, isRest, isOpen, logged, isToday, totalSets, minutes }) => {
          const label = weekdayLabel(dayIdx);
          const isDone = !!logged?.finished;
          const cardClass = isToday
            ? "card-hero border-[1.5px] border-accent"
            : isDone
            ? "card-done"
            : isRest || isOpen
            ? "slot-empty"
            : "card";

          return (
            <div
              key={dayIdx}
              onClick={() => onEditDay(dayIdx)}
              className={`${cardClass} p-4 cursor-pointer`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className="text-lg"
                  style={{
                    fontFamily: "var(--font-heading)",
                    color: isDone
                      ? "var(--color-positive-ink-strong)"
                      : isRest || isOpen
                      ? "var(--color-ink-muted)"
                      : "var(--color-ink)",
                  }}
                >
                  {label}
                  {!isRest && !isOpen && day.name ? ` · ${day.name}` : ""}
                </span>
                <span
                  className={`text-xs font-medium flex-shrink-0 ${
                    isDone ? "text-positive-ink" : isToday ? "text-accent" : "text-ink-faint"
                  }`}
                >
                  {isDone
                    ? "done ✓"
                    : isToday
                    ? "today"
                    : isRest
                    ? day.note || "rest"
                    : isOpen
                    ? "open"
                    : "planned"}
                </span>
              </div>

              {!isRest && !isOpen && (
                <p className={`mt-1.5 text-sm ${isDone ? "text-positive-ink" : "text-ink-muted"}`}>
                  {exercises.map((ex) => cleanName(ex)).join(", ")} · {totalSets} set
                  {totalSets === 1 ? "" : "s"}
                  {minutes > 0 ? ` · ~${minutes} min` : ""}
                </p>
              )}
              {isOpen && <p className="mt-1.5 text-sm text-ink-faint">Tap to plan something</p>}

              {/* Once finished, this card already reads "done ✓" above like
                  every other completed day — no button, same as them. A
                  session ended early (finishedAt set, sets still unlogged)
                  is still done, not resumable, so it gets no exception. */}
              {isToday && !isRest && !isOpen && !isDone && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartDay(dayIdx);
                  }}
                  className="btn-clay w-full py-3 mt-3"
                >
                  <Play className="w-4 h-4" />
                  {logged ? `Continue · ${logged.done}/${logged.total} done` : "Begin session"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
