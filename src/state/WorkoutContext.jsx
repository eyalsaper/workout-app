import React, { createContext, useContext, useMemo } from "react";
import { useFirebaseSync } from "../hooks/useFirebaseSync";
import { isRestEntry, cleanName, setCountFor, setDataFor } from "../lib/format";
import { dateKey, sessionId, weekKeyFromDay } from "../lib/training";
import { EXERCISE_LIBRARY, libraryEntry } from "../lib/exerciseLibrary";
import { useAuth } from "./AuthContext";
import { userBasePath } from "../firebase";

// Every piece of saved data and every way to change it lives here. Pages read
// from this and never touch Firebase directly, so changing how storage works
// later (adding accounts, moving to Firestore) only means editing this file.

const WorkoutContext = createContext(null);

const DEFAULT_BANK = {
  Squat: {
    sets: 3,
    reps: "8",
    repsUnit: "Reps",
    weight: "100",
    weightUnit: "KG",
    isAlternative: false,
    altSets: [],
  }, "Bench Press": {
    sets: 3,
    reps: "10",
    repsUnit: "Reps",
    weight: "80",
    weightUnit: "KG",
    isAlternative: false,
    altSets: [],
  },
  Deadlift: {
    sets: 2,
    reps: "6",
    repsUnit: "Reps",
    weight: "120",
    weightUnit: "KG",
    isAlternative: true,
    altSets: [
      { reps: "6", repsUnit: "Reps", weight: "120", weightUnit: "KG" },
      { reps: "8", repsUnit: "Reps", weight: "100", weightUnit: "KG" },
    ],
  },
  Plank: {
    sets: 3,
    reps: "1",
    repsUnit: "Mins",
    weight: "",
    weightUnit: "Body Wt.",
    isAlternative: false,
    altSets: [],
  },
};

const DEFAULT_TRACKER = ["Drink 2L Water", "Stretch 10 mins", "Hit Protein Goal"];

const DEFAULT_PLANS = {
  1: [
    { day: "Day 1", exercises: ["Squat", "Plank"] },
    { day: "Day 2", exercises: ["Rest"] },
    { day: "Day 3", exercises: ["Deadlift", "Bench Press"] },
    { day: "Day 4", exercises: ["Rest"] },
    { day: "Day 5", exercises: ["Bench Press"] },
    { day: "Day 6", exercises: ["Rest"] },
    { day: "Day 7", exercises: ["Rest"] },
  ],
};

const EMPTY_DETAIL = {
  type: "explanation",
  routine: [""],
  routineChecked: {},
  explanation: "",
  files: [],
  links: [],
};

const clone = (value) => JSON.parse(JSON.stringify(value));

export function WorkoutProvider({ children }) {
  // Every path is scoped to the signed-in account. This provider is only ever
  // mounted once a user exists, so the uid is stable for its whole lifetime.
  const { user } = useAuth();
  const base = userBasePath(user.uid);

  const [exerciseBank, setExerciseBank, bankReady] = useFirebaseSync(
    `${base}/exerciseBank`,
    DEFAULT_BANK
  );
  const [globalTracker, setGlobalTracker, trackerReady] = useFirebaseSync(
    `${base}/globalTracker`,
    DEFAULT_TRACKER
  );
  const [globalTrackerChecked, setGlobalTrackerChecked, checkedReady] =
    useFirebaseSync(`${base}/globalTrackerChecked`, {});
  const [exerciseDetails, setExerciseDetails, detailsReady] = useFirebaseSync(
    `${base}/exerciseDetails`,
    {}
  );
  const [plans, setPlans, plansReady] = useFirebaseSync(
    `${base}/plans`,
    DEFAULT_PLANS
  );
  const [sessions, setSessions, sessionsReady] = useFirebaseSync(
    `${base}/sessions`,
    {}
  );
  const [settings, setSettings, settingsReady] = useFirebaseSync(
    `${base}/settings`,
    { bodyweightKg: "", defaultRestSeconds: 90 }
  );

  const isReady =
    bankReady &&
    trackerReady &&
    checkedReady &&
    detailsReady &&
    plansReady &&
    sessionsReady &&
    settingsReady;

  const value = useMemo(() => {
    // ---- Exercise bank ----
    const addBankExercise = (rawName) => {
      const name = cleanName(rawName);
      if (!name || exerciseBank[name]) return false;
      setExerciseBank((prev) => ({
        ...prev,
        [name]: {
          sets: 1,
          reps: "",
          repsUnit: "Reps",
          weight: "",
          weightUnit: "KG",
          isAlternative: false,
          altSets: [],
        },
      }));
      return true;
    };

    /** Merge the stock library in without touching anything already there. */
    const seedLibrary = () =>
      setExerciseBank((prev) => {
        const next = { ...prev };
        EXERCISE_LIBRARY.forEach((item) => {
          if (!next[item.name]) next[item.name] = libraryEntry(item);
        });
        delete next._empty;
        return next;
      });

    const removeBankExercise = (name) => {
      setExerciseBank((prev) => {
        const next = { ...prev };
        delete next[name];
        // Firebase deletes empty objects entirely, which would resurrect the
        // starter exercises on next load. This placeholder keeps the node alive.
        if (Object.keys(next).filter((k) => k !== "_empty").length === 0) {
          next._empty = { isHidden: true, sets: 1, reps: "", repsUnit: "Reps" };
        }
        return next;
      });
    };

    const updateBankField = (exercise, field, fieldValue) =>
      setExerciseBank((prev) => ({
        ...prev,
        [exercise]: { ...prev[exercise], [field]: fieldValue },
      }));

    const updateAltSet = (exercise, index, field, fieldValue) =>
      setExerciseBank((prev) => {
        const exData = prev[exercise];
        const altSets = [...(exData.altSets || [])];
        altSets[index] = {
          reps: "",
          repsUnit: "Reps",
          weight: "",
          weightUnit: "KG",
          ...(altSets[index] || {}),
          [field]: fieldValue,
        };
        return { ...prev, [exercise]: { ...exData, altSets } };
      });

    // ---- Plans ----
    const addPlan = () => {
      const nextId = Math.max(0, ...Object.keys(plans).map(Number)) + 1;
      const schedule = Array.from({ length: 7 }, (_, i) => ({
        day: `Day ${i + 1}`,
        exercises: ["Rest"],
      }));
      setPlans((prev) => ({ ...prev, [nextId]: schedule }));
      return nextId;
    };

    /** Deletes a plan and returns the id that should be selected next. */
    const deletePlan = (planId) => {
      const remaining = Object.keys(plans).filter((k) => Number(k) !== Number(planId));
      if (remaining.length === 0) return Number(planId);

      setPlans((prev) => {
        const next = { ...prev };
        delete next[planId];
        return next;
      });
      // Sessions carry the plan id, so drop that plan's logged history too.
      setSessions((prev) => {
        const next = {};
        Object.entries(prev).forEach(([id, session]) => {
          if (Number(session?.planId) !== Number(planId)) next[id] = session;
        });
        return next;
      });
      return Number(remaining[0]);
    };

    const setExerciseAt = (planId, dayIdx, exIdx, newName) =>
      setPlans((prev) => {
        const next = clone(prev);
        const day = next[planId][dayIdx];
        day.exercises = day.exercises || [];
        day.exercises[exIdx] = newName;
        return next;
      });

    const addExerciseTo = (planId, dayIdx) =>
      setPlans((prev) => {
        const next = clone(prev);
        const day = next[planId][dayIdx];
        day.exercises = [...(day.exercises || []), ""];
        return next;
      });

    const removeExerciseFrom = (planId, dayIdx, exIdx) =>
      setPlans((prev) => {
        const next = clone(prev);
        const day = next[planId][dayIdx];
        const remaining = (day.exercises || []).filter((_, i) => i !== exIdx);
        day.exercises = remaining.length === 0 ? ["Rest"] : remaining;
        return next;
      });

    // ---- Daily progress ----
    const getDayTotalSets = (planId, dayIdx) => {
      const day = plans[planId]?.[dayIdx];
      if (!day) return 0;
      return (day.exercises || []).reduce((total, exName) => {
        if (isRestEntry(exName)) return total;
        const bankData = exerciseBank[cleanName(exName)];
        if (bankData?.isHidden) return total;
        return total + setCountFor(bankData);
      }, 0);
    };

    // ---- Global tracker ----
    const toggleTrackerItem = (idx) =>
      setGlobalTrackerChecked((prev) => ({ ...prev, [idx]: !prev[idx] }));

    const resetTracker = () => setGlobalTrackerChecked({});

    const updateTrackerItem = (idx, text) =>
      setGlobalTracker((prev) => {
        const next = [...(prev || [])];
        next[idx] = text;
        return next;
      });

    const addTrackerItem = () => setGlobalTracker((prev) => [...(prev || []), ""]);

    const removeTrackerItem = (idx) =>
      setGlobalTracker((prev) => {
        const next = (prev || []).filter((_, i) => i !== idx);
        return next.length === 0 ? [""] : next;
      });

    // ---- Per-exercise detail pages ----
    const ensureDetail = (name) => {
      if (exerciseDetails[name]) return;
      setExerciseDetails((prev) => ({ ...prev, [name]: clone(EMPTY_DETAIL) }));
    };

    const updateDetailField = (name, field, fieldValue) =>
      setExerciseDetails((prev) => ({
        ...prev,
        [name]: { ...clone(EMPTY_DETAIL), ...(prev[name] || {}), [field]: fieldValue },
      }));

    const toggleRoutineItem = (name, itemIdx, setIdx = 0) =>
      setExerciseDetails((prev) => {
        const detail = prev[name] || clone(EMPTY_DETAIL);
        const checked = detail.routineChecked || {};
        const key = `${itemIdx}_${setIdx}`;
        return {
          ...prev,
          [name]: {
            ...detail,
            routineChecked: { ...checked, [key]: !checked[key] },
          },
        };
      });

    // ---- Sessions: the training log, and now the source of truth ----
    const bodyweightKg = parseFloat(settings?.bodyweightKg) || 0;

    /** The set list a fresh session starts with, seeded from the plan. */
    const buildEntries = (planId, dayIndex) => {
      const day = plans[planId]?.[dayIndex];
      const entries = {};
      (day?.exercises || []).forEach((raw) => {
        if (isRestEntry(raw)) return;
        const name = cleanName(raw);
        const bankData = exerciseBank[name];
        const count = setCountFor(bankData);
        const planned = Array.from({ length: count }, (_, i) => {
          const d = setDataFor(bankData, i);
          return {
            weight: d.weight ?? "",
            weightUnit: d.weightUnit || "KG",
            reps: "",
            repsUnit: d.repsUnit || "Reps",
            targetReps: d.reps ?? "",
            rpe: "",
            done: false,
            at: null,
          };
        });
        // Same exercise listed twice in a day just means more sets of it.
        if (entries[name]) entries[name].sets.push(...planned);
        else entries[name] = { sets: planned };
      });
      return entries;
    };

    const getSession = (planId, dayIndex, day = dateKey()) =>
      sessions[sessionId(day, planId, dayIndex)] || null;

    const startSession = (planId, dayIndex) => {
      const day = dateKey();
      const id = sessionId(day, planId, dayIndex);
      if (!sessions[id]) {
        setSessions((prev) => ({
          ...prev,
          [id]: {
            date: day,
            planId: Number(planId),
            dayIndex: Number(dayIndex),
            startedAt: Date.now(),
            finishedAt: null,
            entries: buildEntries(planId, dayIndex),
            note: "",
          },
        }));
      }
      return id;
    };

    const updateSessionSet = (id, exName, setIdx, patch) =>
      setSessions((prev) => {
        const session = prev[id];
        if (!session) return prev;
        const entry = session.entries?.[exName];
        if (!entry) return prev;
        const sets = [...(entry.sets || [])];
        if (!sets[setIdx]) return prev;
        sets[setIdx] = { ...sets[setIdx], ...patch };
        return {
          ...prev,
          [id]: {
            ...session,
            entries: { ...session.entries, [exName]: { ...entry, sets } },
          },
        };
      });

    const logSet = (id, exName, setIdx, { weight, reps, rpe }) =>
      updateSessionSet(id, exName, setIdx, {
        weight: weight === undefined ? undefined : String(weight),
        reps: reps === undefined ? undefined : String(reps),
        rpe: rpe === undefined ? undefined : String(rpe),
        done: true,
        at: Date.now(),
      });

    const unlogSet = (id, exName, setIdx) =>
      updateSessionSet(id, exName, setIdx, { done: false, at: null });

    const addSetTo = (id, exName) =>
      setSessions((prev) => {
        const session = prev[id];
        const entry = session?.entries?.[exName];
        if (!entry) return prev;
        const sets = entry.sets || [];
        const template = sets[sets.length - 1] || {
          weight: "",
          weightUnit: "KG",
          repsUnit: "Reps",
        };
        return {
          ...prev,
          [id]: {
            ...session,
            entries: {
              ...session.entries,
              [exName]: {
                ...entry,
                sets: [
                  ...sets,
                  { ...template, reps: "", rpe: "", done: false, at: null },
                ],
              },
            },
          },
        };
      });

    const finishSession = (id, note = "") =>
      setSessions((prev) => {
        const session = prev[id];
        if (!session) return prev;
        return { ...prev, [id]: { ...session, finishedAt: Date.now(), note } };
      });

    const deleteSession = (id) =>
      setSessions((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

    /**
     * The most recent completed sets for an exercise, ignoring the session
     * currently in progress. This is what powers "last time: 100kg x 8".
     */
    const getLastPerformance = (exName, excludeSessionId = null) => {
      let best = null;
      Object.entries(sessions).forEach(([id, session]) => {
        if (id === excludeSessionId) return;
        const sets = session?.entries?.[exName]?.sets;
        if (!sets || !sets.some((x) => x && x.done)) return;
        if (!best || (session.date || "") > (best.date || "")) {
          best = { id, date: session.date, sets: sets.filter((x) => x && x.done) };
        }
      });
      return best;
    };

    /** The session for this plan-day inside the given week, if any. */
    const getWeekSession = (planId, dayIndex, week) =>
      Object.values(sessions).find(
        (session) =>
          Number(session?.planId) === Number(planId) &&
          Number(session?.dayIndex) === Number(dayIndex) &&
          session?.date &&
          weekKeyFromDay(session.date) === week
      ) || null;

    /** Is a specific exercise fully logged in that session? */
    const isExerciseLogged = (session, exName) => {
      const sets = session?.entries?.[exName]?.sets;
      return !!sets && sets.length > 0 && sets.every((s) => s && s.done);
    };

    /** Was this plan-day trained in the current week? */
    const isDayDoneThisWeek = (planId, dayIndex, week) => {
      const match = Object.values(sessions).find(
        (session) =>
          Number(session?.planId) === Number(planId) &&
          Number(session?.dayIndex) === Number(dayIndex) &&
          session?.date &&
          weekKeyFromDay(session.date) === week
      );
      if (!match) return null;
      const all = Object.values(match.entries || {}).flatMap((e) => e.sets || []);
      return {
        date: match.date,
        finished: !!match.finishedAt,
        done: all.filter((x) => x && x.done).length,
        total: all.length,
      };
    };

    return {
      isReady,
      sessions,
      settings,
      bodyweightKg,
      setSettings,
      getSession,
      startSession,
      logSet,
      unlogSet,
      addSetTo,
      finishSession,
      deleteSession,
      getLastPerformance,
      isDayDoneThisWeek,
      getWeekSession,
      isExerciseLogged,
      exerciseBank,
      plans,
      globalTracker,
      globalTrackerChecked,
      exerciseDetails,
      addBankExercise,
      seedLibrary,
      removeBankExercise,
      updateBankField,
      updateAltSet,
      addPlan,
      deletePlan,
      setExerciseAt,
      addExerciseTo,
      removeExerciseFrom,
      getDayTotalSets,
      toggleTrackerItem,
      resetTracker,
      updateTrackerItem,
      addTrackerItem,
      removeTrackerItem,
      ensureDetail,
      updateDetailField,
      toggleRoutineItem,
      getDetail: (name) => exerciseDetails[name] || clone(EMPTY_DETAIL),
    };
  }, [
    isReady,
    exerciseBank,
    plans,
    globalTracker,
    globalTrackerChecked,
    exerciseDetails,
    sessions,
    settings,
    setSessions,
    setSettings,
    setExerciseBank,
    setPlans,
    setGlobalTracker,
    setGlobalTrackerChecked,
    setExerciseDetails,
  ]);

  return (
    <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error("useWorkout must be used inside <WorkoutProvider>");
  return ctx;
}
