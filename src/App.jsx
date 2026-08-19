import React, { useState } from "react";
import {
  CalendarDays,
  ListOrdered,
  Loader2,
  Plus,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { WorkoutProvider, useWorkout } from "./state/WorkoutContext";
import { AuthProvider, useAuth } from "./state/AuthContext";
import SignInScreen from "./components/SignInScreen";
import AccountPage from "./pages/AccountPage";
import ConfirmDialog from "./components/ConfirmDialog";
import PlannerPage from "./pages/PlannerPage";
import SessionPage from "./pages/SessionPage";
import ProgressPage from "./pages/ProgressPage";
import ExerciseBankPage from "./pages/ExerciseBankPage";
import DetailPage from "./pages/DetailPage";
import { isRestEntry } from "./lib/format";

// This file now only decides which screen is showing. All the data lives in
// WorkoutContext, and each screen owns its own markup.

function Shell() {
  const {
    isReady,
    exerciseBank,
    plans,
    addPlan,
    deletePlan,
    ensureDetail,
    startSession,
  } = useWorkout();

  const [activePage, setActivePage] = useState("planner");
  const [selectedPlan, setSelectedPlan] = useState(1);
  const [activeSessionKey, setActiveSessionKey] = useState(null);
  const [detailExercise, setDetailExercise] = useState(null);
  const [pageBeforeDetail, setPageBeforeDetail] = useState("planner");
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-iron-950 flex flex-col items-center justify-center text-plate-yellow gap-4">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="stencil">Loading your training</p>
      </div>
    );
  }

  const openDetail = (name) => {
    if (isRestEntry(name)) return;
    const exName = name.trim();
    ensureDetail(exName);
    setDetailExercise(exName);
    setPageBeforeDetail(activePage);
    setActivePage("detail");
  };

  const startDay = (dayIdx) => {
    setActiveSessionKey(startSession(selectedPlan, dayIdx));
    setActivePage("session");
  };

  const confirmDelete = () => {
    setSelectedPlan(deletePlan(selectedPlan));
    setIsEditing(false);
    setShowDeleteConfirm(false);
  };

  const showPlanTabs = activePage === "planner";

  return (
    <div className="min-h-screen bg-iron-950 text-chalk-50 p-3 sm:p-6">
      {/* Powers the autocomplete on every exercise name input. */}
      <datalist id="exercise-bank-list">
        {Object.keys(exerciseBank)
          .filter((key) => !exerciseBank[key].isHidden)
          .map((name) => (
            <option key={name} value={name} />
          ))}
      </datalist>

      {showDeleteConfirm && (
        <ConfirmDialog
          title={`Delete Plan ${selectedPlan}?`}
          message="This deletes the plan and its checked-off sets. It cannot be undone."
          confirmLabel="Delete Plan"
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        <nav className="bg-iron-850 rounded-sm p-2 border border-iron-700 flex gap-2">
          <button
            type="button"
            onClick={() => setActivePage("planner")}
            className={`flex-1 py-2.5 rounded-sm font-display font-bold uppercase tracking-wide text-sm flex items-center justify-center gap-1.5 transition-all ${
              activePage === "planner" || activePage === "session"
                ? "bg-plate-yellow text-iron-950 shadow-lg shadow-black/50"
                : "text-chalk-300 hover:bg-iron-800"
            }`}
          >
            <CalendarDays className="w-4 h-4" /> Planner
          </button>
          <button
            type="button"
            onClick={() => setActivePage("history")}
            className={`flex-1 py-2.5 rounded-sm font-display font-bold uppercase tracking-wide text-sm flex items-center justify-center gap-1.5 transition-all ${
              activePage === "history"
                ? "bg-plate-yellow text-iron-950 shadow-lg shadow-black/50"
                : "text-chalk-300 hover:bg-iron-800"
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Progress
          </button>
          <button
            type="button"
            onClick={() => setActivePage("progress")}
            className={`flex-1 py-2.5 rounded-sm font-display font-bold uppercase tracking-wide text-sm flex items-center justify-center gap-1.5 transition-all ${
              activePage === "progress"
                ? "bg-plate-yellow text-iron-950 shadow-lg shadow-black/50"
                : "text-chalk-300 hover:bg-iron-800"
            }`}
          >
            <ListOrdered className="w-4 h-4" /> Bank
          </button>
          <button
            type="button"
            onClick={() => setActivePage("account")}
            aria-label="Account"
            className={`px-3 py-2.5 rounded-sm transition-all flex items-center justify-center ${
              activePage === "account"
                ? "bg-plate-yellow text-iron-950 shadow-lg shadow-black/50"
                : "text-chalk-300 hover:bg-iron-800"
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
          </button>
        </nav>

        {showPlanTabs && (
          <div className="flex flex-wrap gap-2 bg-iron-800 p-1.5 rounded w-fit mx-auto justify-center">
            {Object.keys(plans).map((num) => (
              <button
                type="button"
                key={num}
                onClick={() => {
                  setSelectedPlan(Number(num));
                  setIsEditing(false);
                }}
                className={`px-6 sm:px-8 py-2 rounded-sm font-display font-bold uppercase tracking-wide transition-all ${
                  selectedPlan === Number(num)
                    ? "bg-plate-yellow text-iron-950"
                    : "text-chalk-300 hover:text-chalk-50 hover:bg-iron-700"
                }`}
              >
                Plan {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setSelectedPlan(addPlan());
                setIsEditing(true);
              }}
              className="px-4 py-2 rounded-sm font-medium text-chalk-300 hover:text-chalk-50 hover:bg-iron-700 transition-all flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Plan
            </button>
          </div>
        )}

        {activePage === "planner" && (
          <PlannerPage
            selectedPlan={selectedPlan}
            isEditing={isEditing}
            onToggleEditing={() => setIsEditing((v) => !v)}
            onStartDay={startDay}
            onOpenDetail={openDetail}
            onRequestDelete={() => setShowDeleteConfirm(true)}
          />
        )}

        {activePage === "session" && activeSessionKey && (
          <SessionPage
            sessionKey={activeSessionKey}
            onExit={() => {
              setActiveSessionKey(null);
              setActivePage("planner");
            }}
          />
        )}

        {activePage === "history" && <ProgressPage />}

        {activePage === "progress" && <ExerciseBankPage />}

        {activePage === "account" && <AccountPage />}

        {activePage === "detail" && detailExercise && (
          <DetailPage
            exerciseName={detailExercise}
            onBack={() => {
              setActivePage(pageBeforeDetail);
              setDetailExercise(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function LoadingScreen({ message }) {
  return (
    <div className="min-h-screen bg-iron-950 flex flex-col items-center justify-center text-plate-yellow gap-4">
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
