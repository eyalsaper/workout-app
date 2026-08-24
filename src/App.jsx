import React, { useEffect, useState } from "react";
import { Loader2, Settings } from "lucide-react";
import { WorkoutProvider, useWorkout } from "./state/WorkoutContext";
import { AuthProvider, useAuth } from "./state/AuthContext";
import SignInScreen from "./components/SignInScreen";
import BottomNav from "./components/BottomNav";
import WorkoutPage from "./pages/WorkoutPage";
import BuildWorkoutPage from "./pages/BuildWorkoutPage";
import ProgramPage from "./pages/ProgramPage";
import WeekPlannerPage from "./pages/WeekPlannerPage";
import RoutineEditorPage from "./pages/RoutineEditorPage";
import SessionPage from "./pages/SessionPage";
import SessionSummaryPage from "./pages/SessionSummaryPage";
import ProgressPage from "./pages/ProgressPage";
import LiftHistoryPage from "./pages/LiftHistoryPage";
import LibraryPage from "./pages/LibraryPage";
import MovementDetailPage from "./pages/MovementDetailPage";
import SettingsPage from "./pages/SettingsPage";
import FirstRunPage from "./pages/FirstRunPage";
import LiftLadderPage from "./pages/LiftLadderPage";
import MilestonePage from "./pages/MilestonePage";
import PlanBuilderPage from "./pages/PlanBuilderPage";
import { isRestEntry } from "./lib/format";
import { todayDayIndex } from "./lib/training";
import { buildLedger, findSessionMilestone } from "./lib/achievements";

// This file only decides which screen is showing. All the data lives in
// WorkoutContext, and each screen owns its own markup.

/** Resolves settings.theme ("paper" | "night" | "system") to the html data-theme attribute. */
function useThemeEffect(theme) {
  useEffect(() => {
    const pref = theme ?? "system";
    const resolve = () =>
      pref === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "night"
          : "paper"
        : pref;

    const apply = () => document.documentElement.setAttribute("data-theme", resolve());
    apply();

    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
}

function Shell() {
  const {
    isReady,
    settings,
    sessions,
    exerciseBank,
    activePlanId,
    bodyweightKg,
    bodyweightLog,
    ensureDetail,
    startSession,
    startAdHocSession,
    saveWorkout,
  } = useWorkout();

  useThemeEffect(settings.theme);

  const [activePage, setActivePage] = useState("workout");
  const [activeSessionKey, setActiveSessionKey] = useState(null);
  const [finishedSessionKey, setFinishedSessionKey] = useState(null);
  const [summaryReadOnly, setSummaryReadOnly] = useState(false);
  const [routineDayIdx, setRoutineDayIdx] = useState(null);
  const [movementName, setMovementName] = useState(null);
  const [pageBeforeMovement, setPageBeforeMovement] = useState("workout");
  const [pageBeforeSettings, setPageBeforeSettings] = useState("workout");
  const [ladderLift, setLadderLift] = useState(null);
  const [pendingMilestone, setPendingMilestone] = useState(null);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-surface-page flex flex-col items-center justify-center text-accent gap-4">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="stencil">Loading your training</p>
      </div>
    );
  }

  const showFirstRun = !settings.onboarded && Object.keys(sessions).length === 0;
  if (showFirstRun) {
    return <FirstRunPage />;
  }

  const openMovement = (name) => {
    if (isRestEntry(name)) return;
    const exName = name.trim();
    ensureDetail(exName);
    setMovementName(exName);
    setPageBeforeMovement(activePage);
    setActivePage("movementDetail");
  };

  const startDay = (dayIdx) => {
    setActiveSessionKey(startSession(activePlanId, dayIdx));
    setActivePage("session");
  };

  const startAdHoc = (label, exerciseNames) => {
    setActiveSessionKey(startAdHocSession(label, exerciseNames));
    setActivePage("session");
  };

  const finishToSummary = (sessionKey) => {
    setActiveSessionKey(null);
    setFinishedSessionKey(sessionKey);
    setSummaryReadOnly(false);

    // A rank crossing gets the full-screen milestone page, at most one per
    // session — everything else that happened today queues to the ledger
    // silently and shows up next time the record book is opened.
    //
    // `sessions` here still reflects the moment before SessionPage's own
    // finishSession() call lands — React hasn't re-rendered yet — so this
    // session's finishedAt is still null in this snapshot. Stamp it locally
    // before building the ledger, or every finish would look unfinished.
    const session = sessions[sessionKey];
    const sessionsWithFinish = session
      ? { ...sessions, [sessionKey]: { ...session, finishedAt: session.finishedAt || Date.now() } }
      : sessions;
    const milestone = session
      ? findSessionMilestone(
          buildLedger(sessionsWithFinish, bodyweightLog, bodyweightKg, settings.sex),
          session.date
        )
      : null;
    setPendingMilestone(milestone);
    setActivePage(milestone ? "milestone" : "sessionSummary");
  };

  const openSessionSummary = (sessionKey, { readOnly = false } = {}) => {
    setFinishedSessionKey(sessionKey);
    setSummaryReadOnly(readOnly);
    setActivePage("sessionSummary");
  };

  const openRoutineEditor = (dayIdx) => {
    setRoutineDayIdx(dayIdx);
    setActivePage("routineEditor");
  };

  return (
    <div className="min-h-screen bg-surface-page text-ink p-3 sm:p-6 pb-24">
      {/* Powers the autocomplete on every exercise name input. */}
      <datalist id="exercise-bank-list">
        {Object.keys(exerciseBank)
          .filter((key) => !exerciseBank[key].isHidden)
          .map((name) => (
            <option key={name} value={name} />
          ))}
      </datalist>

      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div
            className="text-lg font-extrabold tracking-wide"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Iron Log
          </div>
          <button
            type="button"
            onClick={() => {
              if (activePage !== "settings") setPageBeforeSettings(activePage);
              setActivePage("settings");
            }}
            aria-label="Settings"
            className={`pill-outline flex items-center gap-1.5 transition-colors ${
              activePage === "settings" ? "bg-ink text-accent-ink border-ink" : ""
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </button>
        </div>

        {activePage === "workout" && (
          <WorkoutPage
            onStartDay={startDay}
            onStartAdHoc={startAdHoc}
            onOpenDetail={openMovement}
            onOpenBuilder={() => setActivePage("buildWorkout")}
            onOpenHistorySession={(key) => openSessionSummary(key, { readOnly: true })}
          />
        )}

        {activePage === "buildWorkout" && (
          <BuildWorkoutPage
            onBack={() => setActivePage("workout")}
            onStart={(picked) => startAdHoc("Your workout", picked)}
            onSave={(name, picked) => {
              saveWorkout(name, picked);
              setActivePage("workout");
            }}
          />
        )}

        {activePage === "program" && (
          <ProgramPage
            onRearrange={() => setActivePage("weekPlanner")}
            onEditRoutines={() => openRoutineEditor(todayDayIndex())}
          />
        )}

        {activePage === "weekPlanner" && (
          <WeekPlannerPage
            onStartDay={startDay}
            onEditDay={openRoutineEditor}
            onBack={() => setActivePage("program")}
            onOpenBuilder={() => setActivePage("planBuilder")}
          />
        )}

        {activePage === "planBuilder" && (
          <PlanBuilderPage
            onBack={() => setActivePage("weekPlanner")}
            onDone={() => setActivePage("weekPlanner")}
          />
        )}

        {activePage === "routineEditor" && routineDayIdx !== null && (
          <RoutineEditorPage
            dayIdx={routineDayIdx}
            onOpenDetail={openMovement}
            onBack={() => setActivePage("program")}
          />
        )}

        {activePage === "session" && activeSessionKey && (
          <SessionPage
            sessionKey={activeSessionKey}
            onExit={() => {
              setActiveSessionKey(null);
              setActivePage("workout");
            }}
            onFinish={finishToSummary}
          />
        )}

        {activePage === "progress" && (
          <ProgressPage
            onOpenLift={(name) => {
              setMovementName(name);
              setActivePage("liftHistory");
            }}
            onOpenLadder={(name) => {
              setLadderLift(name);
              setActivePage("liftLadder");
            }}
          />
        )}

        {activePage === "liftHistory" && movementName && (
          <LiftHistoryPage
            exerciseName={movementName}
            onBack={() => setActivePage("progress")}
          />
        )}

        {activePage === "liftLadder" && ladderLift && (
          <LiftLadderPage
            liftName={ladderLift}
            onBack={() => setActivePage("progress")}
          />
        )}

        {/* Library is only ever reached from Settings (per the nav doc — it's
            a Settings row plus the routine editor's own picker overlay), so
            its back target is fixed rather than routed through
            pageBeforeSettings — reusing that state here would overwrite the
            page Settings itself needs to return to. */}
        {activePage === "library" && (
          <LibraryPage
            onOpenDetail={openMovement}
            onBack={() => setActivePage("settings")}
          />
        )}

        {activePage === "settings" && (
          <SettingsPage
            onBack={() => setActivePage(pageBeforeSettings)}
            onOpenLibrary={() => setActivePage("library")}
          />
        )}

        {activePage === "movementDetail" && movementName && (
          <MovementDetailPage
            exerciseName={movementName}
            onBack={() => {
              setActivePage(pageBeforeMovement);
              setMovementName(null);
            }}
            onSeeHistory={() => setActivePage("liftHistory")}
          />
        )}
      </div>

      <BottomNav activePage={activePage} onNavigate={setActivePage} />

      {activePage === "sessionSummary" && finishedSessionKey && (
        <SessionSummaryPage
          sessionKey={finishedSessionKey}
          isReadOnly={summaryReadOnly}
          onClose={() => {
            setFinishedSessionKey(null);
            setActivePage("workout");
          }}
        />
      )}

      {activePage === "milestone" && pendingMilestone && (
        <MilestonePage
          milestone={pendingMilestone}
          onKeep={() => {
            setPendingMilestone(null);
            setFinishedSessionKey(null);
            setActivePage("workout");
          }}
          onViewSummary={() => {
            setPendingMilestone(null);
            setSummaryReadOnly(false);
            setActivePage("sessionSummary");
          }}
        />
      )}
    </div>
  );
}

function LoadingScreen({ message }) {
  return (
    <div className="min-h-screen bg-surface-page flex flex-col items-center justify-center text-accent gap-4">
      <Loader2 className="w-8 h-8 animate-spin" />
      <p className="stencil">{message}</p>
    </div>
  );
}

/** Decides between the sign-in screen and the app itself. */
function Gate() {
  const { user, isResolving } = useAuth();

  if (isResolving) return <LoadingScreen message="Checking your session..." />;
  if (!user) return <SignInScreen />;

  return (
    <WorkoutProvider>
      <Shell />
    </WorkoutProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
