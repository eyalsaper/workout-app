import React, { useState } from "react";
import { AlertTriangle, Check, Copy, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "../state/AuthContext";
import { useWorkout } from "../state/WorkoutContext";
import { findLegacyData, copyLegacyDataToAccount } from "../lib/migrate";

const RULES = `{ "rules": { "users": { "$uid": { ".read": "$uid === auth.uid", ".write": "$uid === auth.uid"
      }
    }
  }
}`;

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      className="text-xs font-medium text-plate-yellow hover:text-plate-yellow-hot flex items-center gap-1"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}

export default function AccountPage() {
  const { user, signOut } = useAuth();
  const { settings, setSettings } = useWorkout();

  const [status, setStatus] = useState("idle"); // idle | checking | found | none | copying | done | error
  const [found, setFound] = useState([]);
  const [error, setError] = useState("");

  const check = async () => {
    setStatus("checking");
    setError("");
    try {
      const results = await findLegacyData();
      setFound(results);
      setStatus(results.length > 0 ? "found" : "none");
    } catch (err) {
      setError( "Couldn't read the old data. If you've already locked the database rules, they're now blocking this — loosen them, migrate, then lock them again."
      );
      setStatus("error");
    }
  };

  const migrate = async () => {
    setStatus("copying");
    try {
      await copyLegacyDataToAccount(user.uid, found);
      setStatus("done");
    } catch (err) {
      setError("The copy failed partway. Nothing was deleted — you can retry safely.");
      setStatus("error");
    }
  };

  return (
    <div className="bg-iron-850 rounded-sm p-6 sm:p-8 border border-iron-700 animate-in fade-in duration-300 max-w-3xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-plate-yellow" /> Account
        </h1>
        <p className="text-chalk-500 text-sm">
          Your plans are stored under this account, so any device you sign in on
          gets the same data.
        </p>
      </div>

      <div className="bg-iron-900 border border-iron-700 rounded p-5 space-y-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-chalk-500">
            Signed in as
          </div>
          <div className="font-medium text-chalk-50">{user.email}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-chalk-500">
            Account ID
          </div>
          <div className="flex items-center gap-3">
            <code className="text-sm text-chalk-200 break-all">{user.uid}</code>
            <CopyButton text={user.uid} label="Copy" />
          </div>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="mt-2 px-4 py-2 bg-iron-850 border border-iron-600 text-chalk-200 hover:bg-iron-800 rounded-sm text-sm font-medium transition-colors flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>

      {/* ---- Training settings ---- */}
      <div>
        <h2 className="text-xl font-bold mb-1">Training settings</h2>
        <p className="text-chalk-500 text-sm mb-4">
          Bodyweight lets the app count bodyweight exercises toward your volume,
          and it's what future strength standards will measure against.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="bodyweight"
              className="block text-sm font-semibold text-chalk-200 mb-1"
            >
              Bodyweight (kg)
            </label>
            <input
              id="bodyweight"
              type="number"
              step="0.1"
              min="0"
              value={settings?.bodyweightKg ?? ""}
              onChange={(e) =>
                setSettings({ ...settings, bodyweightKg: e.target.value })
              }
              className="w-full p-3 border border-iron-600 rounded-sm focus:ring-2 focus:ring-plate-yellow focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="defaultRest"
              className="block text-sm font-semibold text-chalk-200 mb-1"
            >
              Default rest (seconds)
            </label>
            <input
              id="defaultRest"
              type="number"
              step="15"
              min="15"
              value={settings?.defaultRestSeconds ?? 90}
              onChange={(e) =>
                setSettings({ ...settings, defaultRestSeconds: e.target.value })
              }
              className="w-full p-3 border border-iron-600 rounded-sm focus:ring-2 focus:ring-plate-yellow focus:outline-none"
            />
            <p className="text-xs text-chalk-500 mt-1">
              Override per exercise in the Bank.
            </p>
          </div>
        </div>
      </div>

      {/* ---- Migration ---- */}
      <div>
        <h2 className="text-xl font-bold mb-1">Bring over your old workouts</h2>
        <p className="text-chalk-500 text-sm mb-4">
          Data saved before accounts existed sits at the root of the database.
          This copies it into your account. The original is left in place, so
          it's safe to run more than once.
        </p>

        {status === "idle" && (
          <button
            type="button"
            onClick={check}
            className="px-4 py-2 bg-plate-yellow text-iron-950 rounded-sm text-sm font-medium hover:bg-plate-yellow-hot transition-colors"
          >
            Check for old data
          </button>
        )}

        {(status === "checking" || status === "copying") && (
          <div className="flex items-center gap-2 text-chalk-300 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            {status === "checking" ? "Looking..." : "Copying..."}
          </div>
        )}

        {status === "none" && (
          <p className="text-sm text-chalk-300 bg-iron-900 border border-iron-700 rounded-sm p-4">
            Nothing found at the root. Either it's already been migrated or this
            account is starting fresh.
          </p>
        )}

        {status === "found" && (
          <div className="space-y-4">
            <ul className="text-sm border border-iron-700 rounded divide-y divide-iron-800">
              {found.map((item) => (
                <li
                  key={item.path}
                  className="flex justify-between items-center p-3"
                >
                  <span className="font-medium text-chalk-50">{item.label}</span>
                  <span className="text-chalk-500">{item.summary}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-start gap-2 text-sm text-flag-orange bg-flag-orange/10 border border-flag-orange/40 rounded-sm p-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                This replaces the starter data in your account with the above.
              </span>
            </div>
            <button
              type="button"
              onClick={migrate}
              className="px-4 py-2 bg-plate-yellow text-iron-950 rounded-sm text-sm font-medium hover:bg-plate-yellow-hot transition-colors"
            >
              Copy into my account
            </button>
          </div>
        )}

        {status === "done" && (
          <p className="text-sm text-plate-green bg-plate-green/10 border border-plate-green/40 rounded-sm p-4">
            Copied. Reload the app to see your plans, then lock the database
            rules below.
          </p>
        )}

        {status === "error" && (
          <div className="space-y-3">
            <p className="text-sm text-plate-red bg-plate-red/10 border border-plate-red/40 rounded-sm p-4">
              {error}
            </p>
            <button
              type="button"
              onClick={check}
              className="px-4 py-2 bg-iron-850 border border-iron-600 text-chalk-200 rounded-sm text-sm font-medium hover:bg-iron-800"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* ---- Rules ---- */}
      <div>
        <h2 className="text-xl font-bold mb-1">Lock the database</h2>
        <p className="text-chalk-500 text-sm mb-3">
          Last step, and the one that actually protects your data. Paste these
          into Firebase Console → Realtime Database → Rules, then Publish. Do it
          <strong> after</strong> migrating, because these rules block access to
          the old root data.
        </p>
        <div className="relative">
          <pre className="bg-iron-950 text-chalk-50 text-xs rounded p-4 overflow-x-auto">
            {RULES}
          </pre>
          <div className="absolute top-2 right-3">
            <CopyButton text={RULES} label="Copy rules" />
          </div>
        </div>
      </div>
    </div>
  );
}
