import React, { useState } from "react";
import { Loader2, Settings } from "lucide-react";
import { WorkoutProvider, useWorkout } from "./state/WorkoutContext";
import { AuthProvider, useAuth } from "./state/AuthContext";
import SignInScreen from "./components/SignInScreen";
import BottomNav from "./components/BottomNav";
import TodayPage from "./pages/TodayPage";
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
import { isRestEntry } from "./lib/format";

// This file only decides which screen is showing. All the data lives in
// WorkoutContext, and each screen owns its own markup.

function Shell() {
  const {
    isReady,
    settings,
    sessions,
    exerciseBank,
    primaryPlanId,
    ensureDetail,
    startSession,
  } = useWorkout();

  const [activePage, setActivePage] = useState("today");
  const [activeSessionKey, setActiveSessionKey] = useState(null);
  const [finishedSessionKey, setFinishedSessionKey] = useState(null);
  const [routineDayIdx, setRoutineDayIdx] = useState(null);
  const [movementName, setMovementName] = useState(null);
  const [pageBeforeMovement, setPageBeforeMovement] = useState("today");
  const [pageBeforeSettings, setPageBeforeSettings] = useState("today");

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
    setActiveSessionKey(startSession(primaryPlanId, dayIdx));
    setActivePage("session");
  };

  const finishToSummary = (sessionKey) => {
    setActiveSessionKey(null);
    setFinishedSessionKey(sessionKey);
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

      <div className="max-w-6xl mx-auto space-y-6">
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

        {activePage === "today" && (
          <TodayPage
            onStartDay={startDay}
            onOpenDetail={openMovement}
            onManagePlan={() => setActivePage("weekPlanner")}
          />
        )}

        {activePage === "weekPlanner" && (
          <WeekPlannerPage
            onStartDay={startDay}
            onEditDay={openRoutineEditor}
            onBack={() => setActivePage("today")}
          />
        )}

        {activePage === "routineEditor" && routineDayIdx !== null && (
          <RoutineEditorPage
            dayIdx={routineDayIdx}
            onOpenDetail={openMovement}
            onBack={() => setActivePage("weekPlanner")}
          />
        )}

        {activePage === "session" && activeSessionKey && (
          <SessionPage
            sessionKey={activeSessionKey}
            onExit={() => {
              setActiveSessionKey(null);
              setActivePage("today");
            }}
            onFinish={finishToSummary}
          />
        )}

        {activePage === "sessionSummary" && finishedSessionKey && (
          <SessionSummaryPage
            sessionKey={finishedSessionKey}
            onClose={() => {
              setFinishedSessionKey(null);
              setActivePage("today");
            }}
          />
        )}

        {activePage === "history" && (
          <ProgressPage
            onOpenLift={(name) => {
              setMovementName(name);
              setActivePage("liftHistory");
            }}
          />
        )}

        {activePage === "liftHistory" && movementName && (
          <LiftHistoryPage
            exerciseName={movementName}
            onBack={() => setActivePage("history")}
          />
        )}

        {activePage === "library" && <LibraryPage onOpenDetail={openMovement} />}

        {activePage === "settings" && (
          <SettingsPage onBack={() => setActivePage(pageBeforeSettings)} />
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
