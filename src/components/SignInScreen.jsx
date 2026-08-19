import React, { useState } from "react";
import { Dumbbell, Loader2 } from "lucide-react";
import { useAuth } from "../state/AuthContext";

export default function SignInScreen() {
  const { signIn, signUp, readableError } = useAuth();

  const [isCreating, setIsCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setIsBusy(true);
    setError("");
    try {
      if (isCreating) await signUp(email, password);
      else await signIn(email, password);
      // On success the auth listener swaps this screen out.
    } catch (err) {
      setError(readableError(err));
      setIsBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-iron-900 flex items-center justify-center p-4">
      <div className="bg-iron-850 rounded-sm border border-iron-700 p-8 w-full max-w-sm">
        <div className="mb-1">
          <div className="stencil mb-2 flex items-center gap-2">
            <Dumbbell className="w-3.5 h-3.5" /> Training log
          </div>
          <h1 className="text-5xl font-display font-extrabold text-chalk-50 leading-[0.85]">
            Iron
            <br />
            <span className="text-plate-yellow">Log</span>
          </h1>
          <div className="knurl my-4" aria-hidden="true" />
        </div>
        <p className="text-chalk-500 text-sm mb-6">
          {isCreating
            ? "Create the account your training syncs to."
            : "Sign in to load your training on this device."}
        </p>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="stencil block mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="w-full p-3 border border-iron-600 rounded-sm focus:ring-2 focus:ring-plate-yellow focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="stencil block mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isCreating ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="w-full p-3 border border-iron-600 rounded-sm focus:ring-2 focus:ring-plate-yellow focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-sm text-plate-red bg-plate-red/10 border border-plate-red/40 rounded-sm p-3">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={isBusy}
            className="w-full py-3 bg-plate-yellow text-iron-950 rounded-sm font-semibold hover:bg-plate-yellow-hot transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
            {isCreating ? "Create account" : "Sign in"}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsCreating((v) => !v);
              setError("");
            }}
            className="w-full text-sm text-chalk-500 hover:text-plate-yellow font-medium"
          >
            {isCreating
              ? "I already have an account"
              : "First time here? Create an account"}
          </button>
        </div>
      </div>
    </div>
  );
}
