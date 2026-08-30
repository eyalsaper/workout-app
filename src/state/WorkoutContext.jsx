import React, { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { useFirebaseSync } from "../hooks/useFirebaseSync";
import { containerSteps, isContainer, isRestEntry, cleanName, setCountFor, setDataFor } from "../lib/format";
import {
  dateKey,
  detectNewBests,
  roundProgress,
  sessionId,
  tonnageOf,
  weekKey,
  weekKeyFromDay,
} from "../lib/training";
import { emptyTargets, rolledOver, targetsOverview } from "../lib/targets";
import {
  PROGRAM_VERSION,
  advance,
  currentCursor,
  emptyProgram,
  migrateToPlan,
  nextDay,
  orderedDays,
  countMovements,
  dayAsWorkout,
  dayMovements,
  describeItems,
  expandMovements,
  isRoutineItem,
  routineItem,
  detachDaysFromRoutines,
  reconcileCursor,
  seedDayFromRoutine,
  sessionDayId,
  skipDay,
  toPlanMode,
  toScheduleMode,
} from "../lib/plan";
import { EXERCISE_LIBRARY, libraryEntry } from "../lib/exerciseLibrary";
import { useAuth } from "./AuthContext";
import { userBasePath } from "../firebase";

// Every piece of saved data and every way to change it lives here. Pages read
// from this and never touch Firebase directly, so changing how storage works
// later (adding accounts, moving to Firestore) only means editing this file.

// Exported so the dev preview harness (src/dev/) can mount a single screen
// against fixture data without a Firebase account. Nothing in the app itself
// should consume the context directly — use useWorkout().
export const WorkoutContext = createContext(null);

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

const DEFAULT_SETTINGS = {
  bodyweightKg: "",
  defaultRestSeconds: 90,
  weightUnit: "KG",
  plateIncrementKg: 2.5,
  keepScreenAwake: true,
  restSound: true,
  showRpe: true,
  onboarded: false,
  // Used only to pick which strength-standard table the record book shows —
  // never inferred, never defaulted to either value.
  sex: "",

  // ---- v2 ----
  // Mirrors program.mode and is edited from Settings, which is why it is a
  // setting at all — the programme itself remains the source of truth.
  programMode: "plan",
  // Surfaced in Settings only in schedule mode; the week otherwise just frames
  // the charts, and those are Sunday-based regardless.
  weekStartsOn: "sun",
  // Off means every art slot falls back to its plain surface (§8.4).
  characterArt: true,
  artOnlyMine: false,
  // Shipped images hide, user images delete (§8.6).
  hiddenArtIds: [],
};

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
  // Stored per week ({ [weekKey]: { [idx]: bool } }) so targets start
  // unchecked again each week without anyone having to remember to reset them.
  const [globalTrackerCheckedByWeek, setGlobalTrackerCheckedByWeek, checkedReady] =
    useFirebaseSync(`${base}/globalTrackerChecked`, {});
  const [exerciseDetails, setExerciseDetails, detailsReady] = useFirebaseSync(
    `${base}/exerciseDetails`,
    {}
  );
  const [plans, setPlans, plansReady] = useFirebaseSync(
    `${base}/plans`,
    DEFAULT_PLANS
  );
  const [planNames, setPlanNames, planNamesReady] = useFirebaseSync(
    `${base}/planNames`,
    {}
  );
  const [sessions, setSessions, sessionsReady] = useFirebaseSync(
    `${base}/sessions`,
    {}
  );
  const [rawSettings, setSettings, settingsReady] = useFirebaseSync(
    `${base}/settings`,
    DEFAULT_SETTINGS
  );
  // Existing accounts already have a settings node, so useFirebaseSync won't
  // retroactively add new keys (it only seeds initialValue when the remote
  // node is missing entirely) — merge here so every consumer sees a full object.
  const settings = { ...DEFAULT_SETTINGS, ...rawSettings };

  // Dated bodyweight entries, e.g. { "2026-08-20": 82.5 }. Supersedes the old
  // single settings.bodyweightKg field for accounts that start logging it.
  const [bodyweightLog, setBodyweightLog, bodyweightLogReady] = useFirebaseSync(
    `${base}/bodyweightLog`,
    {}
  );

  // Written once, when a 12-week chapter closes, so it reads the same way
  // forever after — everything else in achievements.js is recomputed live.
  const [chapterSummaries, setChapterSummaries, chapterSummariesReady] = useFirebaseSync(
    `${base}/achievements/chapterSummaries`,
    {}
  );

  // Dated body measurements, e.g. { "2026-08-20": { chestCm, waistCm, armCm } }.
  const [measurements, setMeasurements, measurementsReady] = useFirebaseSync(
    `${base}/measurements`,
    {}
  );

  // User-built single-day workouts saved from the "Build your workout"
  // screen — a personal library alongside the built-in pre-made ones.
  const [savedWorkouts, setSavedWorkouts, savedWorkoutsReady] = useFirebaseSync(
    `${base}/savedWorkouts`,
    {}
  );

  // ---- v2: the programme is a plan, not a calendar ----
  //
  // These are new nodes, written alongside the legacy `plans` / `planNames`
  // rather than over them. The migration below reads the old shape and never
  // writes to it, so nothing existing is lost and the old data stays readable.
  //
  // version 0 is the "never migrated" sentinel: an object rather than null
  // because Firebase deletes a node set to null, which would make the seed
  // fight itself on every load.
  /*
   * Programmes are a MAP, not a single record: an account can hold several
   * blocks and switch between them. One is active at a time, named by
   * settings.activeProgramId, and every screen reads that one.
   *
   * `__v0` is the "never migrated" sentinel — an object rather than null
   * because Firebase deletes a node set to null, which would make the seed
   * fight itself on every load.
   */
  const [programs, setPrograms, programReady] = useFirebaseSync(`${base}/programs`, {
    __v0: { version: 0 },
  });
  // v2's first shape held ONE programme here. Accounts that migrated under it
  // adopt that record into the map below rather than being migrated a second
  // time, which would build a duplicate set of routines.
  const [legacyProgram, , legacyProgramReady] = useFirebaseSync(`${base}/program`, {
    version: 0,
  });
  const [routines, setRoutines, routinesReady] = useFirebaseSync(`${base}/routines`, {});
  const [targets, setTargets, targetsReady] = useFirebaseSync(
    `${base}/targets`,
    emptyTargets()
  );

  const isReady =
    bankReady &&
    trackerReady &&
    checkedReady &&
    detailsReady &&
    plansReady &&
    planNamesReady &&
    sessionsReady &&
    settingsReady &&
    bodyweightLogReady &&
    chapterSummariesReady &&
    measurementsReady &&
    savedWorkoutsReady &&
    programReady &&
    legacyProgramReady &&
    routinesReady &&
    targetsReady;

  /**
   * §7.5 — everyone lands in plan mode, once, silently.
   *
   * Runs after the whole account has loaded so the migration can see the
   * legacy plan, the bank and the session history together. The ref guards
   * StrictMode's double-invoke in dev; the version check guards every load
   * after the first.
   */
  const programIds = Object.keys(programs || {}).filter((id) => id !== "__v0");
  const activeProgramId = programIds.includes(rawSettings?.activeProgramId)
    ? rawSettings.activeProgramId
    : programIds[0];
  const program = (activeProgramId && programs?.[activeProgramId]) || null;

  /** Writes one programme back into the map, leaving the others alone. */
  const setProgram = (updater) =>
    setPrograms((prev) => {
      const id = activeProgramId;
      if (!id) return prev;
      const current = prev?.[id];
      const next = typeof updater === "function" ? updater(current) : updater;
      return { ...prev, [id]: next };
    });

  const migratedRef = useRef(false);
  useEffect(() => {
    if (!isReady || migratedRef.current) return;
    if (program?.version === PROGRAM_VERSION) return;
    migratedRef.current = true;

    const planIds = Object.keys(plans || {}).map(Number).sort((a, b) => a - b);
    const activeId = planIds.includes(Number(rawSettings?.activePlanId))
      ? Number(rawSettings.activePlanId)
      : planIds[0];

    // No legacy plan at all — a brand-new account. It gets an empty programme
    // in plan mode with no prompt, and first run (8O) takes it from there.
    // Adopt the single-programme record from v2's first shape, untouched.
    if (legacyProgram?.version === PROGRAM_VERSION) {
      setPrograms((prev) => {
        const next = { ...prev };
        delete next.__v0;
        return { ...next, [legacyProgram.id]: legacyProgram };
      });
      setSettings((prev) => ({ ...prev, activeProgramId: legacyProgram.id }));
      return;
    }

    const seed = (built) => {
      setPrograms((prev) => {
        const next = { ...prev };
        delete next.__v0;
        return { ...next, [built.id]: built };
      });
      setSettings((prev) => ({ ...prev, activeProgramId: built.id }));
    };

    if (activeId === undefined) {
      seed(emptyProgram());
      return;
    }

    const migrated = migrateToPlan({
      planId: activeId,
      planDays: plans[activeId],
      planName: planNames?.[activeId],
      exerciseBank,
      sessions,
    });
    seed(migrated.program);
    setRoutines((prev) => ({ ...migrated.routines, ...prev }));
  }, [
    isReady,
    programs,
    legacyProgram,
    targets,
    plans,
    planNames,
    exerciseBank,
    sessions,
    rawSettings,
    setPrograms,
    setRoutines,
    setTargets,
  ]);

  /*
   * Containers move out of Movements and into Routines.
   *
   * A movement holding a list of other movements was never an exercise — it
   * was a routine filed in the wrong drawer, which is why it showed up asking
   * for a load and three sets. Converted once, in place: the list becomes a
   * real routine, any plan day that pointed at the movement points at the
   * routine instead, and the movement's nested list is cleared.
   *
   * Runs alongside the programme migration and is likewise additive — no
   * session is touched, and the movement itself survives as a plain exercise.
   */
  const containersRef = useRef(false);
  useEffect(() => {
    if (!isReady || containersRef.current) return;
    if (program?.version !== PROGRAM_VERSION) return;

    const containers = Object.entries(exerciseDetails || {}).filter(([, detail]) =>
      isContainer(detail)
    );
    if (!containers.length) return;
    containersRef.current = true;

    const madeRoutines = {};
    const routineForName = {};
    containers.forEach(([name, detail]) => {
      const steps = containerSteps(detail);
      if (!steps.length) return;

      /*
       * A routine of this name usually already exists — the programme
       * migration built one when the container was a day of the plan, holding
       * the container's own name as its only movement. Fill THAT one rather
       * than making a second routine with the same name.
       */
      const existing = Object.values(routines || {}).find((r) => r.name === name);
      const id = existing?.id || `r_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}${Object.keys(madeRoutines).length}`;
      routineForName[name] = id;
      madeRoutines[id] = {
        id,
        name,
        focus: existing?.focus || "",
        movements: steps.map((step, order) => {
          const bank = exerciseBank?.[step] || {};
          return {
            movementId: step,
            order,
            sets: Math.max(1, parseInt(bank.sets, 10) || 3),
            reps: bank.reps || "",
            targetLoadKg: parseFloat(bank.weight) || 0,
          };
        }),
      };
    });

    if (!Object.keys(madeRoutines).length) return;
    setRoutines((prev) => ({ ...prev, ...madeRoutines }));

    // Clear the nested list so the movement stops reading as a routine.
    setExerciseDetails((prev) => {
      const next = { ...prev };
      Object.keys(routineForName).forEach((name) => {
        next[name] = { ...next[name], type: "explanation", routine: [], routineChecked: {} };
      });
      return next;
    });

    // Point any day that used the movement-as-routine at the real routine.
    const days = orderedDays(program);
    const rebound = days.map((day) => {
      const match = Object.keys(routineForName).find((name) => day.name === name);
      return match ? { ...day, routineId: routineForName[match] } : day;
    });
    if (rebound.some((day, i) => day.routineId !== days[i].routineId)) {
      setPrograms((prev) => ({
        ...prev,
        [activeProgramId]: { ...prev[activeProgramId], days: rebound },
      }));
    }
  }, [
    isReady,
    program,
    activeProgramId,
    exerciseDetails,
    exerciseBank,
    routines,
    setRoutines,
    setExerciseDetails,
    setPrograms,
  ]);

  /*
   * Plan days stop borrowing routines and take their own movement list.
   *
   * A day was never meant to BE a routine — two days pointing at one meant
   * editing Day 3 rewrote Day 5, and every day forced a shelf entry to exist.
   * Copied once; the routines themselves are left on the shelf untouched.
   */
  const detachRef = useRef(false);
  useEffect(() => {
    if (!isReady || detachRef.current) return;
    if (program?.version !== PROGRAM_VERSION) return;
    const days = orderedDays(program);
    if (!days.length || days.every((day) => Array.isArray(day.movements))) return;
    detachRef.current = true;
    setPrograms((prev) => ({
      ...prev,
      [activeProgramId]: {
        ...prev[activeProgramId],
        days: detachDaysFromRoutines(days, routines),
      },
    }));
  }, [isReady, program, activeProgramId, routines, setPrograms]);

  /*
   * An 'onComplete' group rolls over on the next launch after it was filled,
   * not the instant the last target lands — the way a closed round shows you
   * 8H before round 9 begins. You get to see the group finished.
   */
  const rolledRef = useRef(false);
  useEffect(() => {
    if (!isReady || rolledRef.current) return;
    rolledRef.current = true;
    const view = targetsOverview({
      targets,
      sessions,
      exerciseBank,
      routines,
      habits: globalTracker,
    });
    const patch = {};
    if (view.config.habitCycle === "onComplete" && view.habitsComplete) {
      patch.habitState = rolledOver();
    }
    if (view.config.workoutCycle === "onComplete" && view.workoutComplete) {
      patch.workoutState = rolledOver();
    }
    if (Object.keys(patch).length) {
      setTargets((prev) => ({ ...emptyTargets(), ...(prev || {}), ...patch }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

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

    /** First run: replace the primary plan's week with a starter template. */
    const seedPlanFromTemplate = (templateDays) => {
      const primaryPlanId = Math.min(...Object.keys(plans).map(Number));
      setPlans((prev) => ({ ...prev, [primaryPlanId]: clone(templateDays) }));
      setSettings((prevSettings) => ({ ...prevSettings, onboarded: true }));
    };

    const dismissFirstRun = () =>
      setSettings((prevSettings) => ({ ...prevSettings, onboarded: true }));

    const removeExerciseFrom = (planId, dayIdx, exIdx) =>
      setPlans((prev) => {
        const next = clone(prev);
        const day = next[planId][dayIdx];
        // Emptying a day leaves it Open, not Rest — Rest is a deliberate choice.
        day.exercises = (day.exercises || []).filter((_, i) => i !== exIdx);
        return next;
      });

    /** true -> a deliberate Rest day; false -> Open (nothing planned yet). */
    const setDayRest = (planId, dayIdx, isRest) =>
      setPlans((prev) => {
        const next = clone(prev);
        next[planId][dayIdx].exercises = isRest ? ["Rest"] : [];
        return next;
      });

    const reorderExercise = (planId, dayIdx, fromIdx, toIdx) =>
      setPlans((prev) => {
        const next = clone(prev);
        const day = next[planId][dayIdx];
        const exercises = day.exercises || [];
        if (toIdx < 0 || toIdx >= exercises.length) return prev;
        const [moved] = exercises.splice(fromIdx, 1);
        exercises.splice(toIdx, 0, moved);
        return next;
      });

    /** Appends a movement from the Library to a day, clearing a bare Rest slot. */
    const appendExerciseToDay = (planId, dayIdx, name) =>
      setPlans((prev) => {
        const next = clone(prev);
        const day = next[planId][dayIdx];
        const existing = (day.exercises || []).filter((ex) => !isRestEntry(ex));
        day.exercises = [...existing, name];
        return next;
      });

    const setDayNote = (planId, dayIdx, note) =>
      setPlans((prev) => {
        const next = clone(prev);
        next[planId][dayIdx].note = note;
        return next;
      });

    const setDayProgression = (planId, dayIdx, patch) =>
      setPlans((prev) => {
        const next = clone(prev);
        const day = next[planId][dayIdx];
        day.progression = { auto: true, incrementKg: 2.5, ...day.progression, ...patch };
        return next;
      });

    /** Which days (across all plans) include this exercise, for "Appears in". */
    const exerciseAppearsIn = (exName) => {
      // Reads the plan, not the legacy weekday grid: which days of the
      // programme have a routine containing this movement.
      const results = [];
      orderedDays(program).forEach((day, index) => {
        const routine = routines?.[day.routineId];
        const match = (routine?.movements || []).some(
          (movement) => cleanName(movement.movementId) === exName
        );
        if (match) results.push({ dayId: day.id, position: index + 1, dayName: day.name });
      });
      return results;
    };

    // ---- Multiple plans: one is "active" (what Today/the week run off of) ----
    const planIds = Object.keys(plans).map(Number).sort((a, b) => a - b);
    const activePlanId = planIds.includes(Number(settings.activePlanId))
      ? Number(settings.activePlanId)
      : planIds[0];

    const getPlanName = (planId) => planNames[planId]?.trim() || `Plan ${planId}`;

    const setActivePlan = (planId) =>
      setSettings((prevSettings) => ({ ...prevSettings, activePlanId: Number(planId) }));

    const nextPlanId = () => {
      const ids = Object.keys(plans).map(Number);
      return (ids.length ? Math.max(...ids) : 0) + 1;
    };

    /** A fresh, all-Open week — nothing planned yet, no rest days assumed. */
    const createPlan = (name) => {
      const id = nextPlanId();
      const blankWeek = Array.from({ length: 7 }, () => ({ exercises: [] }));
      setPlans((prev) => ({ ...prev, [id]: blankWeek }));
      setPlanNames((prev) => ({ ...prev, [id]: name?.trim() || `Plan ${id}` }));
      setActivePlan(id);
      return id;
    };

    /** Adds bank entries for names the account doesn't have yet, never touching existing ones. */
    const seedBankEntries = (entries) => {
      if (!entries?.length) return;
      setExerciseBank((prev) => {
        const next = { ...prev };
        entries.forEach(({ name, bankData }) => {
          if (!next[name]) next[name] = bankData;
        });
        delete next._empty;
        return next;
      });
    };

    /** A quick-start plan seeded from one of the built-in templates. */
    const createPlanFromTemplate = (name, templateDays) => {
      const id = nextPlanId();
      setPlans((prev) => ({ ...prev, [id]: clone(templateDays) }));
      setPlanNames((prev) => ({ ...prev, [id]: name?.trim() || `Plan ${id}` }));
      setActivePlan(id);
      return id;
    };

    /** A plan generated by the text-description builder, with any exercises it needs. */
    const createPlanFromBuilder = (name, days, newBankEntries) => {
      const id = nextPlanId();
      setPlans((prev) => ({ ...prev, [id]: clone(days) }));
      setPlanNames((prev) => ({ ...prev, [id]: name?.trim() || `Plan ${id}` }));
      seedBankEntries(newBankEntries);
      setActivePlan(id);
      return id;
    };

    const duplicatePlan = (planId) => {
      const id = nextPlanId();
      setPlans((prev) => ({ ...prev, [id]: clone(prev[planId] || []) }));
      setPlanNames((prev) => ({ ...prev, [id]: `${getPlanName(planId)} copy` }));
      setActivePlan(id);
      return id;
    };

    const renamePlan = (planId, name) =>
      setPlanNames((prev) => ({ ...prev, [planId]: name }));

    /** Refuses to delete the last remaining plan — there must always be one. */
    const deletePlan = (planId) => {
      if (planIds.length <= 1) return;
      setPlans((prev) => {
        const next = { ...prev };
        delete next[planId];
        return next;
      });
      setPlanNames((prev) => {
        const next = { ...prev };
        delete next[planId];
        return next;
      });
      if (Number(planId) === activePlanId) {
        const remaining = planIds.filter((id) => id !== Number(planId));
        setActivePlan(Math.min(...remaining));
      }
    };

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

    // ---- Weekly targets — checked state is scoped to the current week ----
    const thisWeek = weekKey();
    const globalTrackerChecked = globalTrackerCheckedByWeek[thisWeek] || {};

    const toggleTrackerItem = (idx) =>
      setGlobalTrackerCheckedByWeek((prev) => ({
        ...prev,
        [thisWeek]: { ...(prev[thisWeek] || {}), [idx]: !(prev[thisWeek] || {})[idx] },
      }));

    const resetTracker = () =>
      setGlobalTrackerCheckedByWeek((prev) => ({ ...prev, [thisWeek]: {} }));

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

    // ---- Body weight ----
    const bodyweightDates = Object.keys(bodyweightLog).sort();
    const latestBodyweightDate = bodyweightDates[bodyweightDates.length - 1];
    const bodyweightKg =
      (latestBodyweightDate && parseFloat(bodyweightLog[latestBodyweightDate])) ||
      parseFloat(settings?.bodyweightKg) ||
      0;

    const logBodyweight = (day, kg) =>
      setBodyweightLog((prev) => ({ ...prev, [day]: kg }));

    const removeBodyweightEntry = (day) =>
      setBodyweightLog((prev) => {
        const next = { ...prev };
        delete next[day];
        return next;
      });

    // ---- Achievements: closed-chapter summaries only; ranks and the
    // ledger are pure functions over sessions (see lib/achievements.js). ----
    const ensureChapterSummary = (number, text) =>
      setChapterSummaries((prev) => (prev[number] ? prev : { ...prev, [number]: text }));

    // ---- Body measurements ----
    const logMeasurement = (day, field, value) =>
      setMeasurements((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));

    const removeMeasurementEntry = (day) =>
      setMeasurements((prev) => {
        const next = { ...prev };
        delete next[day];
        return next;
      });


    // ---- Sessions: the training log, and now the source of truth ----

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

    /**
     * Resumes this week's unfinished session for this plan-day if one
     * exists — no matter which real date it was started on, since you can
     * now open any day from Today, not just today's own slot — otherwise
     * starts a fresh one dated today.
     */
    const startSession = (planId, dayIndex) => {
      const week = weekKeyFromDay(dateKey());
      const resumable = Object.entries(sessions).find(
        ([, s]) =>
          Number(s?.planId) === Number(planId) &&
          Number(s?.dayIndex) === Number(dayIndex) &&
          s?.date &&
          weekKeyFromDay(s.date) === week &&
          !s.finishedAt
      );
      if (resumable) return resumable[0];

      const day = dateKey();
      const id = sessionId(day, planId, dayIndex);
      // Only seed a blank session if today doesn't already have one under
      // this exact id — never overwrite an existing (even finished) one.
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

    /**
     * v2 — starts the session for one day of the plan.
     *
     * The two new session fields are stamped here, at creation: `planDayId`
     * (which day of the plan this was) and `roundNumber` (which round it
     * belonged to). They are what round tonnage and round-close detection
     * read, and they are written once so nothing has to re-derive them later
     * and reach a different answer.
     *
     * Sets, reps and target load come from the ROUTINE, not the global bank —
     * that is the difference between the old model and this one.
     */
    const startPlanDay = (dayId, { isSwap = false } = {}) => {
      const cursor = currentCursor(program);
      const day = orderedDays(program).find((d) => d.id === dayId);
      const routine = day ? dayAsWorkout(day, routines) : null;
      const today = dateKey();

      // Resume an unfinished session for this day in this round rather than
      // starting a second one — the same guard the legacy path has.
      const resumable = Object.entries(sessions).find(
        ([, s]) => s?.planDayId === dayId && s?.roundNumber === cursor.round && !s.finishedAt
      );
      if (resumable) return resumable[0];

      // A swap gets its own id so it never collides with the real day.
      const id = `s_${today}__${dayId}__r${cursor.round}${isSwap ? "__swap" : ""}`;
      if (!sessions[id]) {
        const entries = {};
        // A nested routine contributes its own movements here — the session
        // logs lifts, and a routine is not one.
        expandMovements(routine?.movements, routines).forEach((movement, order) => {
          const name = cleanName(movement.movementId);
          if (!name) return;
          const bankData = exerciseBank?.[name];
          const count = Math.max(1, parseInt(movement.sets, 10) || 1);
          const planned = Array.from({ length: count }, (_, i) => {
            /*
             * Units come from the movement library, never from here.
             *
             * A bodyweight movement has no load to type and a held movement
             * is measured in seconds or minutes — hardcoding "KG" and "Reps"
             * asked for numbers that do not exist, and threw away rep targets
             * the library states as ranges ("8-12") or as words ("FF").
             */
            const fromBank = setDataFor(bankData, i);
            const isBodyweight = fromBank.weightUnit === "Body Wt.";
            return {
              weight: isBodyweight
                ? ""
                : movement.targetLoadKg
                ? String(movement.targetLoadKg)
                : fromBank.weight ?? "",
              weightUnit: fromBank.weightUnit || "KG",
              reps: "",
              repsUnit: fromBank.repsUnit || "Reps",
              // The routine's own target wins when it has one; otherwise the
              // library's, which is where "8-12" and "FF" live.
              targetReps: movement.reps || fromBank.reps || "",
              rpe: "",
              done: false,
              at: null,
            };
          });
          // `order` is stored because Firebase returns object keys sorted
          // alphabetically — without it the session runs in the wrong order.
          if (entries[name]) entries[name].sets.push(...planned);
          // `via` remembers the nested routine this movement came from, so
          // the session can say "Strech Routine · 3 of 7" while you are in it.
          else entries[name] = { order, via: movement.viaName || null, sets: planned };
        });

        setSessions((prev) => ({
          ...prev,
          [id]: {
            date: today,
            planId: null,
            dayIndex: null,
            planDayId: dayId,
            roundNumber: cursor.round,
            // A swapped-in session is trained instead of today's day. It is
            // logged like any other, but it does not move the plan on — §8A.
            isSwap,
            routineId: day?.routineId || null,
            label: day?.name || routine?.name || "Session",
            startedAt: Date.now(),
            finishedAt: null,
            entries,
            note: "",
          },
        }));
      }
      return id;
    };

    /**
     * Starts a session from a list of exercises with no plan/day behind
     * it — "swap in", the Ready-made library, and "Build your workout" all
     * use this so training something other than what's programmed never
     * touches the program itself. Each item is either a plain exercise
     * name (bank defaults apply, as the Ready-made library passes) or an
     * explicit `{name, sets, reps, weight, weightUnit, repsUnit}` override,
     * as the workout builder passes.
     */
    const startAdHocSession = (label, exerciseItems) => {
      const day = dateKey();
      const id = `adhoc__${day}__${sessionId(day, "x", Math.random().toString(36).slice(2))}`;
      const entries = {};
      (exerciseItems || []).forEach((raw) => {
        const item = typeof raw === "string" ? { name: raw } : raw;
        if (!item?.name || isRestEntry(item.name)) return;
        const name = cleanName(item.name);
        const bankData = exerciseBank[name];
        const count = Math.max(1, parseInt(item.sets, 10) || setCountFor(bankData));
        const planned = Array.from({ length: count }, (_, i) => {
          const d = setDataFor(bankData, i);
          return {
            weight: item.weight ?? d.weight ?? "",
            weightUnit: item.weightUnit || d.weightUnit || "KG",
            reps: "",
            repsUnit: item.repsUnit || d.repsUnit || "Reps",
            targetReps: item.reps ?? d.reps ?? "",
            rpe: "",
            done: false,
            at: null,
          };
        });
        if (entries[name]) entries[name].sets.push(...planned);
        else entries[name] = { sets: planned };
      });
      setSessions((prev) => ({
        ...prev,
        [id]: {
          date: day,
          planId: null,
          dayIndex: null,
          label,
          startedAt: Date.now(),
          finishedAt: null,
          entries,
          note: "",
        },
      }));
      return id;
    };

    /** Persists a "Build your workout" pick list for reuse from Pre-made > Yours. */
    const saveWorkout = (name, exercises) => {
      const id = `w_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setSavedWorkouts((prev) => ({
        ...prev,
        [id]: { name: name?.trim() || "My workout", exercises, createdAt: Date.now() },
      }));
      return id;
    };

    const deleteWorkout = (id) =>
      setSavedWorkouts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

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

    /**
     * Saves a session and moves the plan on — the one place both happen.
     *
     * Tonnage and new bests are computed HERE, once, and stored on the record,
     * so 8G and the record book read the same numbers rather than each
     * deriving their own. The cursor advances by exactly one (rule 7.2.2), and
     * the caller is handed which finish screen the session earned so it never
     * has to ask the cursor a second question.
     */
    const completeSession = (id, note = "") => {
      const session = sessions[id];
      if (!session) return null;

      const newBests = detectNewBests(sessions, session, id);
      const tonnageKg = Math.round(tonnageOf([session], bodyweightKg));

      setSessions((prev) => {
        const current = prev[id];
        if (!current) return prev;
        return {
          ...prev,
          [id]: { ...current, finishedAt: Date.now(), note, tonnageKg, newBests },
        };
      });

      // Two kinds of session never move the cursor: an ad-hoc one, which is
      // not a day of the plan at all, and a swapped-in one, which is a day of
      // the plan trained out of turn.
      const isPlanDay = !!session.planDayId && !session.isSwap;
      const result = isPlanDay
        ? advance(program)
        : { cursor: currentCursor(program), roundClosed: false, showRoundClosed: false };
      if (isPlanDay) writeProgram({ cursor: result.cursor });

      /*
       * Auto-progression, if this day has it switched on: the routine's target
       * loads go up so the day is heavier next time round.
       *
       * Only the movements actually completed move — a day you cut short does
       * not get harder as a reward for stopping. Bodyweight movements have no
       * load to raise, so they are left alone.
       */
      const day = orderedDays(program).find((d) => d.id === session.planDayId);
      if (day?.progression?.auto && !session.isSwap) {
        const step = Number(day.progression.incrementKg) || 2.5;
        const routine = routines?.[day.routineId];
        if (routine) {
          const completed = new Set(
            Object.entries(session.entries || {})
              .filter(([, entry]) => (entry.sets || []).every((set) => set?.done))
              .map(([name]) => name)
          );
          saveRoutine({
            ...routine,
            movements: (routine.movements || []).map((movement) =>
              completed.has(movement.movementId) && movement.targetLoadKg > 0
                ? { ...movement, targetLoadKg: Math.round((movement.targetLoadKg + step) * 100) / 100 }
                : movement
            ),
          });
        }
      }

      return { ...result, newBests, tonnageKg, roundNumber: session.roundNumber };
    };

    const updateSessionNote = (id, note) =>
      setSessions((prev) => {
        const session = prev[id];
        if (!session) return prev;
        return { ...prev, [id]: { ...session, note } };
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

    // ---- The plan and its cursor ----
    //
    // Every consumer reads `roundInfo`; nothing recomputes day counts of its
    // own. That is what keeps the Today ring, its caption and the Program
    // screen's segment bar from ever disagreeing (§4.7).

    const planDays = orderedDays(program);
    const upNext = nextDay(program);
    const roundInfo = roundProgress(program, planDays);
    const getRoutine = (routineId) => routines?.[routineId] || null;

    /** The routine behind the day the cursor is on. */
    // The day's own workout, not a shared routine.
    const nextRoutine = upNext
      ? {
          ...dayAsWorkout(upNext.day, routines),
          // Expanded, so "5 movements · 17 sets" counts what a nested routine
          // actually contributes rather than reading it as one line.
          movements: expandMovements(dayMovements(upNext.day, routines), routines),
        }
      : null;

    /** Most recent logged session date, for "waiting N days" (display only). */
    const lastSessionDate =
      Object.values(sessions || {})
        .filter((s) => s?.finishedAt && s?.date)
        .map((s) => s.date)
        .sort()
        .pop() || null;

    /** Has the day the cursor points at already been logged today? Drives 8B. */
    const loggedToday = Object.values(sessions || {}).some(
      (s) => s?.date === dateKey() && s?.finishedAt
    );

    const writeProgram = (patch) =>
      setProgram((prev) => ({ ...(prev || emptyProgram()), ...patch }));

    /**
     * Rule 7.2.2 — called once, when a session is saved. Returns which finish
     * screen the session earned so the caller can route to 8G or 8H without
     * asking the cursor a second question and risking a different answer.
     */
    const advanceCursor = () => {
      const result = advance(program);
      writeProgram({ cursor: result.cursor });
      return result;
    };

    /** Rule 7.2.5 — the only way to move the cursor without training. */
    const skipCurrentDay = () => {
      const result = skipDay(program);
      writeProgram({
        cursor: result.cursor,
        skips: [...(program?.skips || []), result.skip].filter(Boolean),
      });
      return result;
    };

    /** 8H's "START ROUND 9" — the cursor already rolled, this just navigates. */
    const startNextRound = () => currentCursor(program);

    /** Rule 7.2.6 — applied on every plan edit, never on a load. */
    const setPlanDays = (nextDays) => {
      const anchorId = upNext?.day?.id;
      writeProgram({
        days: nextDays.map((day, order) => ({ ...day, order })),
        cursor: reconcileCursor(nextDays, program?.cursor, anchorId),
      });
    };

    /** §7.4 — switching never deletes or rewrites sessions. */
    const setProgramMode = (mode) => {
      if (mode === program?.mode) return;
      if (mode === "schedule") {
        setProgram(toScheduleMode(program));
      } else {
        const week = weekKey();
        const loggedThisWeek = Object.values(sessions || {})
          .filter((s) => s?.date && weekKeyFromDay(s.date) === week)
          .map((s) => sessionDayId(s, program))
          .filter(Boolean);
        setProgram(toPlanMode(program, loggedThisWeek));
      }
      setSettings((prev) => ({ ...prev, programMode: mode }));
    };

    const saveRoutine = (routine) =>
      setRoutines((prev) => ({ ...prev, [routine.id]: routine }));

    /**
     * Routines are deleted for real. Any plan day pointing at one loses that
     * day — a day with no routine has nothing to train — and the cursor is
     * reconciled so the day that was up next stays up next.
     */
    /**
     * Routines are deleted for real. The plan is untouched: a day that was
     * seeded from this routine kept its own copy of the movements, so it
     * carries on working.
     */
    const deleteRoutine = (routineId) => {
      setRoutines((prev) => {
        const next = { ...prev };
        delete next[routineId];
        return next;
      });
    };

    // ---- targets ----

    const targetsView = targetsOverview({
      targets,
      sessions,
      exerciseBank,
      routines,
      habits: globalTracker,
    });

    const writeTargets = (patch) =>
      setTargets((prev) => ({ ...emptyTargets(), ...(prev || {}), ...patch }));

    /**
     * Ticking a habit or a manual target.
     *
     * The write carries `startedAt` because reading may have rolled the cycle
     * over in memory — a weekly group whose week has passed reads as empty,
     * and the first tick of the new week is what commits that.
     */
    const toggleHabit = (index) => {
      const state = targetsView.habitState;
      writeTargets({
        habitState: {
          startedAt: state.startedAt,
          checked: { ...state.checked, [index]: !state.checked[index] },
        },
      });
    };

    const toggleTarget = (id) => {
      const state = targetsView.workoutState;
      writeTargets({
        workoutState: {
          startedAt: state.startedAt,
          checked: { ...state.checked, [id]: !state.checked[id] },
        },
      });
    };

    const addTarget = (target) =>
      writeTargets({ items: [...(targetsView.config.items || []), target] });

    const updateTarget = (id, patch) =>
      writeTargets({
        items: (targetsView.config.items || []).map((t) =>
          t.id === id ? { ...t, ...patch } : t
        ),
      });

    const removeTarget = (id) =>
      writeTargets({
        items: (targetsView.config.items || []).filter((t) => t.id !== id),
      });

    const setTargetCycle = (group, cycle) =>
      writeTargets(
        group === "habits"
          ? { habitCycle: cycle, habitState: rolledOver() }
          : { workoutCycle: cycle, workoutState: rolledOver() }
      );

    /** "Cleared 4 days ago · tap to reset" — start the window again by hand. */
    const resetTargetGroup = (group) =>
      writeTargets(
        group === "habits" ? { habitState: rolledOver() } : { workoutState: rolledOver() }
      );

    const newLocalId = (prefix) =>
      `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

    /**
     * First run (8O) — a ready-made programme, created in plan mode with no
     * prompt. Cursor at Day 1, round 1; the user is never asked about modes.
     */
    const createProgramFromTemplate = (template) => {
      const nextRoutines = {};
      const days = template.days.map((day, order) => {
        const routineId = newLocalId("r");
        nextRoutines[routineId] = {
          id: routineId,
          name: day.name,
          focus: day.focus || "",
          movements: (day.movements || []).map((movement, i) => ({ ...movement, order: i })),
        };
        return { id: newLocalId("d"), order, name: day.name, routineId };
      });

      const built = {
        ...emptyProgram(),
        name: `Block ${programIds.length + 1}`,
        focus: template.name,
        days,
      };
      setRoutines((prev) => ({ ...prev, ...nextRoutines }));
      // Seeds into the map and makes itself active — first run has no active
      // programme yet, so setProgram() would have nowhere to write.
      setPrograms((prev) => {
        const next = { ...prev };
        delete next.__v0;
        return { ...next, [built.id]: built };
      });
      setSettings((prev) => ({
        ...prev,
        onboarded: true,
        programMode: "plan",
        activeProgramId: built.id,
      }));
    };

    /**
     * Clones a ready-made template's days into Yours, without touching the
     * plan. §8C: a template is a read-only starting point, so running or
     * editing one copies it first. Returns the new routine ids.
     */
    const cloneTemplateRoutines = (template) => {
      const cloned = {};
      const ids = [];
      (template.days || []).forEach((day) => {
        const routineId = newLocalId("r");
        ids.push(routineId);
        cloned[routineId] = {
          id: routineId,
          name: day.name,
          focus: day.focus || "",
          movements: (day.movements || []).map((movement, i) => ({ ...movement, order: i })),
        };
      });
      setRoutines((prev) => ({ ...prev, ...cloned }));
      return ids;
    };

    const bankMovement = (movementId, order) => {
      const bank = exerciseBank?.[movementId] || {};
      return {
        movementId,
        order,
        sets: Math.max(1, parseInt(bank.sets, 10) || 3),
        reps: bank.reps || "",
        targetLoadKg: parseFloat(bank.weight) || 0,
      };
    };

    /** Edits one day of the plan in place. The routines shelf is untouched. */
    const updatePlanDay = (dayId, patch) =>
      writeProgram({
        days: orderedDays(program).map((day) =>
          day.id === dayId ? { ...day, ...patch } : day
        ),
      });

    /** Copies a routine's movements onto a day. Editing the day after this
     *  never writes back to the routine. */
    const seedPlanDay = (dayId, routine) =>
      writeProgram({
        days: orderedDays(program).map((day) =>
          day.id === dayId ? seedDayFromRoutine(day, routine) : day
        ),
      });

    /**
     * Sets how many workouts the plan holds. Growing adds empty days for you
     * to fill; shrinking drops from the end, and the cursor is reconciled so
     * the day that was up next stays up next.
     */
    const setPlanLength = (count) => {
      const days = orderedDays(program);
      const anchorId = nextDay(program)?.day?.id;
      let next = days;
      if (count > days.length) {
        next = [
          ...days,
          ...Array.from({ length: count - days.length }, (_, i) => ({
            id: newLocalId("d"),
            order: days.length + i,
            name: `Workout ${days.length + i + 1}`,
            movements: [],
          })),
        ];
      } else if (count < days.length) {
        next = days.slice(0, count);
      }
      next = next.map((day, order) => ({ ...day, order }));
      writeProgram({
        days: next,
        cursor: reconcileCursor(next, program?.cursor, anchorId),
      });
    };

    /** Puts a copy of a plan day on the shelf, so other plans can use it. */
    const saveDayAsRoutine = (dayId, name) => {
      const day = orderedDays(program).find((d) => d.id === dayId);
      if (!day) return null;
      const id = newLocalId("r");
      saveRoutine({
        id,
        name: (name || day.name || "Routine").trim(),
        focus: day.focus || "",
        movements: dayMovements(day, routines).map((m, order) => ({ ...m, order })),
      });
      return id;
    };

    /** A routine built from a picked list of movements, with bank defaults. */
    const saveBuiltRoutine = (name, movementNames) => {
      const id = newLocalId("r");
      saveRoutine({
        id,
        name: name.trim(),
        focus: "",
        movements: (movementNames || []).map((movementId, order) => {
          const bank = exerciseBank?.[movementId] || {};
          return {
            movementId,
            order,
            sets: Math.max(1, parseInt(bank.sets, 10) || 3),
            reps: bank.reps || "",
            targetLoadKg: parseFloat(bank.weight) || 0,
          };
        }),
      });
      return id;
    };

    /** Adds one routine to the plan as its next day. Used by "Build my own". */
    const addRoutineAsDay = (routine) => {
      const dayId = newLocalId("d");
      setRoutines((prev) => ({ ...prev, [routine.id]: routine }));
      const appendDay = (base) => {
        const days = orderedDays(base);
        return {
          ...base,
          days: [
            ...days,
            { id: dayId, order: days.length, name: routine.name, routineId: routine.id },
          ],
        };
      };
      if (activeProgramId && program?.version === PROGRAM_VERSION) {
        setProgram((prev) => appendDay(prev));
      } else {
        // "Build my own" on first run: the routine becomes Day 1 of a new one.
        const built = appendDay(emptyProgram());
        setPrograms((prev) => {
          const next = { ...prev };
          delete next.__v0;
          return { ...next, [built.id]: built };
        });
        setSettings((prev) => ({ ...prev, activeProgramId: built.id }));
      }
      setSettings((prev) => ({ ...prev, onboarded: true }));
    };

    /**
     * CSV import (§10.5). Merges rather than replaces, and never creates a
     * programme — imported history lands with a null planDayId and the user
     * still picks or builds a plan.
     */
    const importSessions = (imported) => {
      if (!imported || !Object.keys(imported).length) return;
      setSessions((prev) => ({ ...imported, ...prev }));
      // Seed any movement the import mentioned that the bank does not have,
      // so history and the library agree about what exists.
      const names = new Set();
      Object.values(imported).forEach((session) => {
        Object.keys(session.entries || {}).forEach((name) => names.add(name));
      });
      setExerciseBank((prev) => {
        const next = { ...prev };
        names.forEach((name) => {
          if (!next[name]) {
            next[name] = {
              sets: 3,
              reps: "",
              repsUnit: "Reps",
              weight: "",
              weightUnit: "KG",
              isAlternative: false,
              altSets: [],
              source: "import",
            };
          }
        });
        delete next._empty;
        return next;
      });
    };

    // ---- several programmes, one active ----
    //
    // Blocks are kept, not replaced: finishing a block and starting the next
    // should not mean losing the shape of the one you just did.

    const createProgram = (name) => {
      const built = { ...emptyProgram(), name: name?.trim() || `Block ${programIds.length + 1}` };
      setPrograms((prev) => {
        const next = { ...prev };
        delete next.__v0;
        return { ...next, [built.id]: built };
      });
      setSettings((prev) => ({ ...prev, activeProgramId: built.id, onboarded: true }));
      return built.id;
    };

    const switchProgram = (id) =>
      setSettings((prev) => ({ ...prev, activeProgramId: id }));

    const renameProgram = (id, name) =>
      setPrograms((prev) => ({ ...prev, [id]: { ...prev[id], name } }));

    /** Copies the days and their routines, so editing the copy is safe. */
    const duplicateProgram = (id) => {
      const source = programs?.[id];
      if (!source) return null;
      const clonedRoutines = {};
      const days = orderedDays(source).map((day, order) => {
        const routine = routines?.[day.routineId];
        const routineId = newLocalId("r");
        if (routine) clonedRoutines[routineId] = { ...routine, id: routineId };
        return { ...day, id: newLocalId("d"), order, routineId };
      });
      const copy = {
        ...emptyProgram(),
        name: `${source.name} copy`,
        focus: source.focus,
        days,
      };
      setRoutines((prev) => ({ ...prev, ...clonedRoutines }));
      setPrograms((prev) => ({ ...prev, [copy.id]: copy }));
      setSettings((prev) => ({ ...prev, activeProgramId: copy.id }));
      return copy.id;
    };

    /** Refuses to delete the last one — there must always be a programme. */
    const removeProgram = (id) => {
      if (programIds.length <= 1) return;
      setPrograms((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (id === activeProgramId) {
        const remaining = programIds.filter((other) => other !== id);
        setSettings((prev) => ({ ...prev, activeProgramId: remaining[0] }));
      }
    };



    return {
      isReady,
      sessions,
      settings,

      // ---- the plan ----
      program,
      programs,
      programIds,
      activeProgramId,
      createProgram,
      switchProgram,
      renameProgram,
      duplicateProgram,
      removeProgram,
      planDays,
      upNext,
      roundInfo,
      nextRoutine,
      routines,
      getRoutine,
      saveRoutine,
      deleteRoutine,
      saveBuiltRoutine,
      cloneTemplateRoutines,
      createProgramFromTemplate,
      addRoutineAsDay,
      importSessions,
      lastSessionDate,
      loggedToday,
      skips: program?.skips || [],

      // ---- targets ----
      targets: targetsView,
      toggleHabit,
      toggleTarget,
      addTarget,
      updateTarget,
      removeTarget,
      setTargetCycle,
      resetTargetGroup,
      advanceCursor,
      skipCurrentDay,
      startNextRound,
      setPlanDays,
      setPlanLength,
      updatePlanDay,
      seedPlanDay,
      saveDayAsRoutine,
      dayMovements: (day) => dayMovements(day, routines),
      // The flat list a session runs, nested routines unpacked.
      dayExercises: (day) => expandMovements(dayMovements(day, routines), routines),
      dayItemCount: (day) => countMovements(dayMovements(day, routines), routines),
      describeDay: (day) => describeItems(dayMovements(day, routines), routines),
      routineItem,
      isRoutineItem,
      bankMovement,
      setProgramMode,
      setProgram,
      dayIdForSession: (session) => sessionDayId(session, program),

      bodyweightKg,
      bodyweightLog,
      logBodyweight,
      removeBodyweightEntry,
      chapterSummaries,
      ensureChapterSummary,
      measurements,
      logMeasurement,
      removeMeasurementEntry,
      setSettings,
      getSession,
      startSession,
      startPlanDay,
      startAdHocSession,
      savedWorkouts,
      saveWorkout,
      deleteWorkout,
      logSet,
      unlogSet,
      addSetTo,
      finishSession,
      completeSession,
      updateSessionNote,
      deleteSession,
      getLastPerformance,
      isDayDoneThisWeek,
      getWeekSession,
      isExerciseLogged,
      exerciseBank,
      plans,
      planIds,
      activePlanId,
      getPlanName,
      setActivePlan,
      createPlan,
      createPlanFromTemplate,
      createPlanFromBuilder,
      duplicatePlan,
      renamePlan,
      deletePlan,
      globalTracker,
      globalTrackerChecked,
      exerciseDetails,
      addBankExercise,
      seedLibrary,
      removeBankExercise,
      updateBankField,
      updateAltSet,
      removeExerciseFrom,
      reorderExercise,
      appendExerciseToDay,
      setDayRest,
      setDayNote,
      setDayProgression,
      exerciseAppearsIn,
      seedPlanFromTemplate,
      dismissFirstRun,
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
    planNames,
    globalTracker,
    globalTrackerCheckedByWeek,
    exerciseDetails,
    sessions,
    rawSettings,
    bodyweightLog,
    chapterSummaries,
    measurements,
    savedWorkouts,
    program,
    routines,
    user,
    setProgram,
    setRoutines,
    setSessions,
    setSettings,
    setExerciseBank,
    setPlans,
    setPlanNames,
    setGlobalTracker,
    setGlobalTrackerCheckedByWeek,
    setExerciseDetails,
    setBodyweightLog,
    setChapterSummaries,
    setMeasurements,
    setSavedWorkouts,
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
