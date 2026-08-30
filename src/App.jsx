import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { WorkoutProvider, useWorkout } from "./state/WorkoutContext";
import { AuthProvider, useAuth } from "./state/AuthContext";
import SignInScreen from "./components/SignInScreen";
import BottomNav from "./components/BottomNav";
import { PosterSegments } from "./components/poster";
import TodayPage from "./pages/TodayPage";
import RoutinesPage from "./pages/RoutinesPage";
import TargetsPage from "./pages/TargetsPage";
import LiftHistoryPage from "./pages/LiftHistoryPage";
import RoutineEditorPage from "./pages/RoutineEditorPage";
import SessionPage from "./pages/SessionPage";
import SessionSummaryPage from "./pages/SessionSummaryPage";
import ProgramPage from "./pages/ProgramPage";
import PlanBuilderPage from "./pages/PlanBuilderPage";
import PlanDayEditorPage from "./pages/PlanDayEditorPage";
import ProgressPage from "./pages/ProgressPage";
import AchievementsPage from "./pages/AchievementsPage";
import BodyPage from "./pages/BodyPage";
import MilestonePage from "./pages/MilestonePage";
import SettingsPage from "./pages/SettingsPage";
import ArtLibraryPage from "./pages/ArtLibraryPage";
import FirstRunPage from "./pages/FirstRunPage";
import MovementDetailPage from "./pages/MovementDetailPage";
import LiftLadderPage from "./pages/LiftLadderPage";
import LibraryPage from "./pages/LibraryPage";
import ProgramsPage from "./pages/ProgramsPage";
import BuildWorkoutPage from "./pages/BuildWorkoutPage";
import { loadArtLibrary, setArtPreferences } from "./lib/art";
import { isFresh, loadActiveSession } from "./lib/session";
import { listUserArt } from "./lib/userArt";

// This file only decides which screen is showing. All the data lives in
// WorkoutContext, and each screen owns its own markup.
//
// There is no theme effect and no data-theme attribute. Dark is the only
// theme; the token block in index.css is the whole story.

/**
 * Reads public/art/library.json and the user's own images once, at APP boot
 * rather than inside the shell — the sign-in screen draws art too, and it
 * renders long before any of the shell's state exists.
 *
 * Returns a counter so a mount can re-render when the library lands. Nothing
 * waits on it: no layout depends on art, so screens paint immediately with
 * their plain surfaces and the image appears when it appears.
 */
function useArtBoot() {
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    let alive = true;
    loadArtLibrary()
      .then(() => {
        if (alive) setLoaded((n) => n + 1);
        return listUserArt();
      })
      .then((userImages) => {
        if (!alive || !userImages) return;
        setArtPreferences({ userImages });
        setLoaded((n) => n + 1);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return loaded;
}

/** Keeps the picker's view of the account's art preferences current. */
function useArtPreferences(settings) {
  useEffect(() => {
    setArtPreferences({
      characterArt: settings.characterArt !== false,
      artOnlyMine: !!settings.artOnlyMine,
      hiddenIds: settings.hiddenArtIds || [],
    });
  }, [settings.characterArt, settings.artOnlyMine, settings.hiddenArtIds]);
}

// History moved to Progress — it is a record, not something you act on.
// Targets took its place, because targets are what you are doing this week.
const WORKOUT_SEGMENTS = [
  ["today", "Today"],
  ["routines", "Routines"],
  ["targets", "Targets"],
];

// Four fit at 390px only with the shorter middle label.
const PROGRESS_SEGMENTS = [
  ["charts", "Charts"],
  ["records", "Records"],
  ["body", "Body"],
  ["history", "History"],
];

function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented">
      {options.map(([key, label]) => (
        <button key={key} type="button" data-active={value === key} onClick={() => onChange(key)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function LoadingScreen({ message }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4"
      style={{ height: "100dvh", background: "var(--color-page)", color: "var(--color-brass)" }}
    >
      <Loader2 className="w-8 h-8 animate-spin" />
      <p className="label">{message}</p>
    </div>
  );
}

function Shell() {
  const {
    isReady,
    settings,
    sessions,
    exerciseBank,
    upNext,
    planDays,
    startPlanDay,
    startAdHocSession,
    cloneTemplateRoutines,
    saveBuiltRoutine,
  } = useWorkout();

  useArtPreferences(settings);

  const [activePage, setActivePage] = useState("workout");
  const [workoutSegment, setWorkoutSegment] = useState("today");
  const [progressSegment, setProgressSegment] = useState("charts");
  const [activeSessionKey, setActiveSessionKey] = useState(null);
  const [finished, setFinished] = useState(null); // { key, outcome, readOnly }
  const [editingRoutine, setEditingRoutine] = useState(null); // { id, readOnly }
  const [pageBeforeSettings, setPageBeforeSettings] = useState("workout");
  const [movementName, setMovementName] = useState(null);
  const [ladderLift, setLadderLift] = useState(null);
  const [editingDayId, setEditingDayId] = useState(null);
  const [pageBeforeMovement, setPageBeforeMovement] = useState("progress");
  const [recovered, setRecovered] = useState(false);

  /*
   * Crash recovery (§10.1): a mirror younger than 12 hours drops the user
   * straight back into the session they were in. Older than that it is
   * offered once and then cleared, rather than resurrecting last Tuesday.
   */
  useEffect(() => {
    if (!isReady || recovered) return;
    setRecovered(true);
    const mirror = loadActiveSession();
    if (mirror && isFresh(mirror) && sessions[mirror.id] && !sessions[mirror.id].finishedAt) {
      setActiveSessionKey(mirror.id);
      setActivePage("session");
    }
  }, [isReady, recovered, sessions]);

  if (!isReady) return <LoadingScreen message="Loading your training" />;

  // No programme, or an account that has never trained → first run.
  const showFirstRun = !settings.onboarded && planDays.length === 0;

  const openSettings = () => {
    if (activePage !== "settings") setPageBeforeSettings(activePage);
    setActivePage("settings");
  };

  /** Runs a list of movements now, without touching the programme. */
  const beginAdHoc = (label, names) => {
    setActiveSessionKey(startAdHocSession(label, names));
    setActivePage("session");
  };

  const beginSession = (dayId, options) => {
    const id = dayId ?? upNext?.day?.id;
    if (!id) return;
    setActiveSessionKey(startPlanDay(id, options));
    setActivePage("session");
  };

  const finishToSummary = (sessionKey, outcome) => {
    setActiveSessionKey(null);
    setFinished({ key: sessionKey, outcome, readOnly: false });
    setActivePage("sessionSummary");
  };

  const openSessionSummary = (sessionKey) => {
    setFinished({ key: sessionKey, outcome: null, readOnly: true });
    setActivePage("sessionSummary");
  };

  const closeSummary = () => {
    setFinished(null);
    setActivePage("workout");
    setWorkoutSegment("today");
  };

  /*
   * Poster screens own their own 24px column and run their heroes edge to
   * edge, so the shell must not add the card screens' 22px on top — that
   * double padding is what pushed 8P's link under the tab bar.
   */
  const POSTER_PAGES = new Set([
    "session",
    "sessionSummary",
    "program",
    "progress",
    "milestone",
    "movementDetail",
    "ledger",
  ]);
  const isPoster = showFirstRun || POSTER_PAGES.has(activePage);
  /*
   * Screens with no tab bar. The finish screens and the chapter close are part
   * of the session flow rather than places you navigate from — the design file
   * draws all of them without one, and 8G/8H do not fit at 800px with one.
   */
  const hideTabBar =
    showFirstRun ||
    ["session", "sessionSummary", "milestone"].includes(activePage);

  const workoutChips = (
    <Segmented options={WORKOUT_SEGMENTS} value={workoutSegment} onChange={setWorkoutSegment} />
  );

  const openMovement = (name, from) => {
    setMovementName(name);
    setPageBeforeMovement(from);
    setActivePage("movementDetail");
  };

  const progressSegments = (
    <PosterSegments
      options={PROGRESS_SEGMENTS}
      value={progressSegment}
      onChange={setProgressSegment}
    />
  );

  const progressPages = {
    charts: (
      <ProgressPage
        segments={progressSegments}
        onCloseChapter={() => setActivePage("milestone")}
      />
    ),
    records: (
      <AchievementsPage
        segments={progressSegments}
        onOpenMilestones={() => {
          setLadderLift(null);
          setActivePage("ledger");
        }}
        onOpenLadder={(name) => {
          setLadderLift(name);
          setActivePage("ledger");
        }}
      />
    ),
    body: <BodyPage segments={progressSegments} />,
    history: (
      <LiftHistoryPage
        segments={progressSegments}
        onOpenSession={openSessionSummary}
        onOpenMovement={(name) => openMovement(name, "progress")}
      />
    ),
  };

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--color-page)",
        color: "var(--color-text)",
      }}
    >
      {/* Powers the autocomplete on every movement name input. */}
      <datalist id="exercise-bank-list">
        {Object.keys(exerciseBank)
          .filter((key) => !exerciseBank[key].isHidden)
          .map((name) => (
            <option key={name} value={name} />
          ))}
      </datalist>

      <div style={{ flex: "none", height: "env(safe-area-inset-top)" }} />

      {/*
        The content column needs BOTH min-height: 0 and overflow: hidden, and
        the tab bar needs flex: none. Without all three, long content either
        squashes the bar or paints over it.
      */}
      <main
        className="mx-auto w-full max-w-lg"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          padding: isPoster ? 0 : "10px 22px 12px",
          background: isPoster ? "var(--color-poster)" : "var(--color-page)",
        }}
      >
        {showFirstRun ? (
          <FirstRunPage
            onBuildOwn={() => {
              setEditingRoutine({ id: null, readOnly: false, asFirstDay: true });
              setActivePage("routineEditor");
            }}
          />
        ) : (
          <>
            {activePage === "workout" && workoutSegment === "today" && (
              <TodayPage
                segmentControl={workoutChips}
                onBeginSession={beginSession}
                onOpenSettings={openSettings}
                onOpenMovement={(name) => openMovement(name, "workout")}
                onRunRoutine={(routine) =>
                  beginAdHoc(routine.name, (routine.movements || []).map((m) => m.movementId))
                }
                onBuildRoutine={() => setActivePage("buildWorkout")}
                onAddMeasurement={() => {
                  setProgressSegment("body");
                  setActivePage("progress");
                }}
              />
            )}

            {activePage === "workout" && workoutSegment === "routines" && (
              <RoutinesPage
                segmentControl={workoutChips}
                onBuild={() => setActivePage("buildWorkout")}
                onRunRoutine={(routine) => beginAdHoc(routine.name, routine.movements.map((m) => m.movementId))}
                onRunPremade={(w) => beginAdHoc(w.name, w.exercises)}
                onOpenRoutine={(id) => {
                  setEditingRoutine({ id, readOnly: true });
                  setActivePage("routineEditor");
                }}
                onRunTemplate={(template) => {
                  // A template is read-only: clone it into Yours, then open
                  // the first routine so the user is editing their own copy.
                  const [first] = cloneTemplateRoutines(template);
                  setEditingRoutine({ id: first, readOnly: true });
                  setActivePage("routineEditor");
                }}
              />
            )}

            {activePage === "workout" && workoutSegment === "targets" && (
              <TargetsPage segmentControl={workoutChips} />
            )}

            {activePage === "routineEditor" && (
              <RoutineEditorPage
                routineId={editingRoutine?.id}
                readOnly={editingRoutine?.readOnly}
                asFirstDay={editingRoutine?.asFirstDay}
                onBack={() => {
                  setEditingRoutine(null);
                  setActivePage("workout");
                }}
              />
            )}

            {activePage === "session" && activeSessionKey && (
              <SessionPage
                sessionKey={activeSessionKey}
                onOpenMovement={(name) => openMovement(name, "session")}
                onExit={() => {
                  setActiveSessionKey(null);
                  setActivePage("workout");
                }}
                onFinish={finishToSummary}
              />
            )}

            {activePage === "sessionSummary" && finished && (
              <SessionSummaryPage
                sessionKey={finished.key}
                outcome={finished.outcome}
                isReadOnly={finished.readOnly}
                onClose={closeSummary}
              />
            )}

            {activePage === "program" && (
              <ProgramPage
                onEditPlan={() => setActivePage("planBuilder")}
                onOpenBlocks={() => setActivePage("blocks")}
                onOpenRoutine={(day) => {
                  setEditingDayId(day.id);
                  setActivePage("planDay");
                }}
              />
            )}

            {activePage === "planBuilder" && (
              <PlanBuilderPage
                onBack={() => setActivePage("program")}
                onEditDay={(dayId) => {
                  setEditingDayId(dayId);
                  setActivePage("planDay");
                }}
              />
            )}

            {activePage === "planDay" && editingDayId && (
              <PlanDayEditorPage
                dayId={editingDayId}
                onBack={() => {
                  setEditingDayId(null);
                  setActivePage("planBuilder");
                }}
              />
            )}

            {activePage === "blocks" && (
              <ProgramsPage onBack={() => setActivePage("program")} />
            )}

            {activePage === "progress" && progressPages[progressSegment]}

            {activePage === "milestone" && (
              <MilestonePage onClose={() => setActivePage("progress")} />
            )}

            {activePage === "settings" && (
              <SettingsPage
                onBack={() => setActivePage(pageBeforeSettings)}
                onOpenArtLibrary={() => setActivePage("artLibrary")}
                onOpenMovementLibrary={() => setActivePage("library")}
              />
            )}

            {activePage === "library" && (
              <LibraryPage
                onBack={() => setActivePage("settings")}
                onOpenMovement={(name) => openMovement(name, "library")}
              />
            )}

            {activePage === "artLibrary" && (
              <ArtLibraryPage onBack={() => setActivePage("settings")} />
            )}

            {activePage === "ledger" && (
              <LiftLadderPage
                liftName={ladderLift}
                onBack={() => {
                  setLadderLift(null);
                  setActivePage("progress");
                }}
              />
            )}

            {activePage === "buildWorkout" && (
              <BuildWorkoutPage
                onBack={() => setActivePage("workout")}
                onStartOneOff={(names) => beginAdHoc("Your workout", names)}
                onSaveRoutine={(name, names) => {
                  saveBuiltRoutine(name, names);
                  setActivePage("workout");
                  setWorkoutSegment("routines");
                }}
              />
            )}

            {activePage === "movementDetail" && movementName && (
              <MovementDetailPage
                movementName={movementName}
                onBack={() => {
                  setMovementName(null);
                  setActivePage(pageBeforeMovement);
                }}
              />
            )}
          </>
        )}
      </main>

      {!hideTabBar && <BottomNav activePage={activePage} onNavigate={setActivePage} />}
    </div>
  );
}

/** Decides between the sign-in screen and the app itself. */
function Gate() {
  const { user, isResolving } = useAuth();

  if (isResolving) return <LoadingScreen message="Checking your session" />;
  if (!user) return <SignInScreen />;

  return (
    <WorkoutProvider>
      <Shell />
    </WorkoutProvider>
  );
}

export default function App() {
  // Loaded here so the sign-in screen has art too, not only the signed-in app.
  useArtBoot();

  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
