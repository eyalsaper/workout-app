import React, { useEffect, useMemo, useState } from "react";
import { WorkoutContext } from "../state/WorkoutContext";
import { AuthContext } from "../state/AuthContext";
import BottomNav from "../components/BottomNav";
import TodayPage from "../pages/TodayPage";
import RoutinesPage from "../pages/RoutinesPage";
import LiftHistoryPage from "../pages/LiftHistoryPage";
import RoutineEditorPage from "../pages/RoutineEditorPage";
import SessionPage from "../pages/SessionPage";
import SessionSummaryPage from "../pages/SessionSummaryPage";
import ProgramPage from "../pages/ProgramPage";
import PlanBuilderPage from "../pages/PlanBuilderPage";
import ProgressPage from "../pages/ProgressPage";
import AchievementsPage from "../pages/AchievementsPage";
import BodyPage from "../pages/BodyPage";
import MilestonePage from "../pages/MilestonePage";
import SettingsPage from "../pages/SettingsPage";
import ArtLibraryPage from "../pages/ArtLibraryPage";
import FirstRunPage from "../pages/FirstRunPage";
import MovementDetailPage from "../pages/MovementDetailPage";
import LiftLadderPage from "../pages/LiftLadderPage";
import { loadArtLibrary, setArtPreferences } from "../lib/art";
import { advance, nextDay, orderedDays, toScheduleMode } from "../lib/plan";
import { roundProgress } from "../lib/training";
import {
  BODYWEIGHT_LOG,
  DAYS,
  MEASUREMENTS,
  PROGRAM,
  ROUTINES,
  SESSIONS,
  SETTINGS,
  EXERCISE_DETAILS,
  activeSessionFixture,
} from "./fixtures";

/*
 * Dev-only screen harness. Mounts one screen against fixture data with no
 * Firebase account and no sign-in gate, so a screen can be checked against
 * `Iron Log App.dc.html` while it is being built.
 *
 * Reached at /?preview=8a — see main.jsx. Never bundled into a production
 * build, and never imported by the app.
 */

const WORKOUT_SEGMENTS = [
  ["today", "Today"],
  ["routines", "Routines"],
  ["history", "History"],
];

// Poster screens own their own 24px column, so the shell adds none.
const POSTER = new Set(["8f","8g","8h","8i","8p","8j","8k","8l","8m","8o","movement","ledger","container"]);
const NO_TAB_BAR = new Set(["8f", "8g", "8h", "8m", "8o"]);

const TAB_FOR = {
  "8a": "workout",
  "8b": "workout",
  "8c": "workout",
  "8d": "workout",
  "8e": "workout",
  "8g": "workout",
  "8h": "workout",
  "8i": "program",
  "8p": "program",
  "8j": "progress",
  "8k": "progress",
  "8l": "progress",
  "8m": "progress",
  movement: "progress",
  container: "progress",
  ledger: "progress",
};

/** A context value shaped exactly like the real one, backed by fixtures. */
function useFixtureWorkout(screen) {
  const [program, setProgram] = useState(() =>
    screen === "8p" ? toScheduleMode(PROGRAM, new Date(2026, 7, 24)) : PROGRAM
  );
  const [routines, setRoutines] = useState(ROUTINES);
  const [sessions, setSessions] = useState(() => {
    if (screen === "8f") return { ...SESSIONS, ...activeSessionFixture() };
    return SESSIONS;
  });
  const [settings, setSettingsState] = useState(SETTINGS);
  const [bodyweightLog, setBodyweightLog] = useState(BODYWEIGHT_LOG);
  const [measurements, setMeasurements] = useState(MEASUREMENTS);

  const planDays = orderedDays(program);
  const upNext = nextDay(program);
  const roundInfo = roundProgress(program, planDays);
  const getRoutine = (id) => routines[id] || null;

  const patchSession = (id, name, setIdx, patch) =>
    setSessions((prev) => {
      const session = prev[id];
      if (!session) return prev;
      const sets = [...session.entries[name].sets];
      sets[setIdx] = { ...sets[setIdx], ...patch };
      return {
        ...prev,
        [id]: {
          ...session,
          entries: { ...session.entries, [name]: { ...session.entries[name], sets } },
        },
      };
    });

  return useMemo(
    () => ({
      isReady: true,
      program,
      setProgram,
      planDays,
      upNext,
      roundInfo,
      nextRoutine: upNext ? getRoutine(upNext.day.routineId) : null,
      routines,
      getRoutine,
      saveRoutine: (r) => setRoutines((prev) => ({ ...prev, [r.id]: r })),
      addRoutineAsDay: (r) => setRoutines((prev) => ({ ...prev, [r.id]: r })),
      cloneTemplateRoutines: () => [],
      programs: { p1: PROGRAM },
      programIds: ["p1"],
      activeProgramId: "p1",
      createProgram: () => {},
      switchProgram: () => {},
      renameProgram: () => {},
      duplicateProgram: () => {},
      removeProgram: () => {},
      addSetTo: () => {},
      updateSessionNote: () => {},
      updateAltSet: () => {},
      removeBodyweightEntry: () => {},
      removeMeasurementEntry: () => {},
      savedWorkouts: {},
      saveWorkout: () => {},
      deleteWorkout: () => {},
      globalTracker: ["Drink 2L water", "Stretch 10 mins", "Hit protein goal"],
      globalTrackerChecked: { 0: true },
      toggleTrackerItem: () => {},
      resetTracker: () => {},
      updateTrackerItem: () => {},
      addTrackerItem: () => {},
      removeTrackerItem: () => {},
      createProgramFromTemplate: () => {},
      importSessions: () => {},
      sessions,
      settings,
      setSettings: setSettingsState,
      exerciseBank: {},
      exerciseDetails: EXERCISE_DETAILS,
      getDetail: (name) =>
        EXERCISE_DETAILS[name] || { type: "explanation", routine: [], explanation: "", routineChecked: {} },
      updateDetailField: () => {},
      toggleRoutineItem: () => {},
      updateBankField: () => {},
      removeBankExercise: () => {},
      seedLibrary: () => {},
      exerciseAppearsIn: () => [],
      bodyweightKg: 78,
      bodyweightLog,
      measurements,
      logBodyweight: (day, kg) => setBodyweightLog((prev) => ({ ...prev, [day]: kg })),
      logMeasurement: (day, field, value) =>
        setMeasurements((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } })),
      chapterSummaries: { 1: "Twelve weeks of showing up. The squat finally moved." },
      ensureChapterSummary: () => {},
      loggedToday: screen === "8b",
      lastSessionDate: Object.values(sessions).map((s) => s.date).sort().pop(),
      addBankExercise: () => {},
      updateSessionSet: patchSession,
      logSet: (id, name, setIdx, { weight, reps }) =>
        patchSession(id, name, setIdx, { weight, reps, done: true, at: Date.now() }),
      completeSession: (id) => advance(program),
      deleteSession: () => {},
      setPlanDays: (days) =>
        setProgram((prev) => ({ ...prev, days: days.map((d, order) => ({ ...d, order })) })),
      setProgramMode: (mode) =>
        setProgram((prev) =>
          mode === "schedule" ? toScheduleMode(prev, new Date(2026, 7, 24)) : PROGRAM
        ),
      skipCurrentDay: () => setProgram((prev) => ({ ...prev, cursor: advance(prev).cursor })),
      startNextRound: () => program.cursor,
      startPlanDay: () => "s_active",
      dayIdForSession: (s) => s.planDayId || null,
      getLastPerformance: (name) => {
        let best = null;
        Object.values(SESSIONS).forEach((session) => {
          const sets = session.entries?.[name]?.sets;
          if (!sets?.some((s) => s.done)) return;
          if (!best || session.date > best.date) {
            best = { date: session.date, sets: sets.filter((s) => s.done) };
          }
        });
        return best;
      },
    }),
    [program, routines, sessions, settings, bodyweightLog, measurements, screen]
  );
}

function Frame({ children, screen }) {
  const bleed = POSTER.has(screen);
  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: POSTER.has(screen) ? "var(--color-poster)" : "var(--color-page)",
        color: "var(--color-text)",
      }}
    >
      <main
        className="mx-auto w-full max-w-lg"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          padding: bleed ? 0 : "10px 22px 12px",
        }}
      >
        {children}
      </main>
      {!NO_TAB_BAR.has(screen) && (
        <BottomNav activePage={TAB_FOR[screen] || "workout"} onNavigate={() => {}} />
      )}
    </div>
  );
}

export default function Preview({ screen }) {
  const [artReady, setArtReady] = useState(false);
  const value = useFixtureWorkout(screen);
  const [segment, setSegment] = useState("today");

  useEffect(() => {
    // ?art=off exercises the degradation path from §8.4 — every slot falls
    // back to its plain surface and the layout must be unchanged.
    const artOff = new URLSearchParams(window.location.search).get("art") === "off";
    setArtPreferences({ characterArt: !artOff, artOnlyMine: false, hiddenIds: [] });
    loadArtLibrary().then(() => setArtReady(true));
  }, []);

  const segmentControl = (
    <div className="segmented">
      {WORKOUT_SEGMENTS.map(([key, label]) => (
        <button key={key} type="button" onClick={() => setSegment(key)} data-active={segment === key}>
          {label}
        </button>
      ))}
    </div>
  );

  if (!artReady) return null;

  const noop = () => {};

  const SCREENS = {
    "8a": <TodayPage segmentControl={segmentControl} onBeginSession={noop} onOpenSettings={noop} onSwapRoutine={noop} onBuildRoutine={noop} onAddMeasurement={noop} />,
    "8b": <TodayPage segmentControl={segmentControl} onBeginSession={noop} onOpenSettings={noop} onSwapRoutine={noop} onBuildRoutine={noop} onAddMeasurement={noop} />,
    "8c": <RoutinesPage segmentControl={segmentControl} onOpenRoutine={noop} onBuildRoutine={noop} onRunTemplate={noop} />,
    "8d": <RoutineEditorPage routineId="r3" readOnly={false} onBack={noop} />,
    "8e": <LiftHistoryPage segmentControl={segmentControl} onOpenSession={noop} />,
    "8f": <SessionPage sessionKey="s_active" onExit={noop} onFinish={noop} />,
    "8g": <SessionSummaryPage sessionKey="s1" outcome={{ showRoundClosed: false }} onClose={noop} />,
    "8h": <SessionSummaryPage sessionKey="s1" outcome={{ showRoundClosed: true }} onClose={noop} />,
    "8i": <ProgramPage onEditPlan={noop} onOpenRoutine={noop} />,
    "8p": <ProgramPage onEditPlan={noop} onOpenRoutine={noop} />,
    "8j": <ProgressPage segment="charts" onSegmentChange={noop} />,
    "8k": <AchievementsPage segment="records" onSegmentChange={noop} onOpenMilestones={noop} />,
    "8l": <BodyPage segment="body" onSegmentChange={noop} />,
    "8m": <MilestonePage onClose={noop} />,
    "8n": <SettingsPage onBack={noop} onOpenArtLibrary={noop} />,
    "8q": <ArtLibraryPage onBack={noop} />,
    "8o": <FirstRunPage onBuildOwn={noop} />,
    "plan": <PlanBuilderPage onBack={noop} />,
    movement: <MovementDetailPage movementName="Back Squat" onBack={noop} />,
    ledger: <LiftLadderPage onBack={noop} />,
    container: <MovementDetailPage movementName="Core Workout" onBack={noop} />,
  };

  const body = SCREENS[screen] || (
    <div style={{ padding: 24 }}>
      <p className="label">Unknown screen “{screen}”</p>
      <p style={{ fontSize: 13, color: "var(--color-dim)", paddingTop: 8 }}>
        Try: {Object.keys(SCREENS).join(", ")}
      </p>
    </div>
  );

  // Settings and the sign-in gate read the auth context for the account row.
  const auth = { user: { email: "you@example.com", uid: "preview" }, signOut: noop, isResolving: false };

  return (
    <AuthContext.Provider value={auth}>
      <WorkoutContext.Provider value={value}>
        <Frame screen={screen}>{body}</Frame>
      </WorkoutContext.Provider>
    </AuthContext.Provider>
  );
}
