import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "../state/AuthContext";
import ArtLayer from "./ArtLayer";
import { Kicker } from "./poster";
import { artSeed } from "../lib/art";

/*
 * The sign-in gate, styled as a poster screen so it belongs to 8O rather than
 * standing outside the app. A `welcome` draw, seeded once and never re-rolled.
 */

function Field({ id, label, type, autoComplete, value, onChange, onEnter }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter()}
        style={{
          height: 52,
          borderRadius: "var(--radius-control)",
          background: "var(--color-card-hi)",
          border: "1px solid #24272d",
          padding: "0 14px",
          color: "var(--color-text)",
          outline: "none",
        }}
      />
    </div>
  );
}

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
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--color-poster)",
        color: "var(--color-text)",
        overflowY: "auto",
      }}
    >
      <div className="mx-auto w-full max-w-lg flex flex-col flex-1 min-h-0">
        <div
          className="relative flex-none flex flex-col justify-end"
          style={{ height: 300, padding: "0 24px 22px" }}
        >
          <ArtLayer mood="welcome" seedKey={artSeed.firstRun()} scrim="poster" />
          <div className="relative flex flex-col gap-[8px]">
            <Kicker>Iron Log</Kicker>
            <span className="poster-title" data-lines="2">
              Pick up
              <br />
              the bar
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4" style={{ padding: "0 24px 24px" }}>
          <p style={{ fontSize: 13, color: "var(--color-muted-poster)" }}>
            {isCreating
              ? "Create the account your training syncs to."
              : "Sign in to load your training on this device."}
          </p>

          <Field
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            onEnter={submit}
          />
          <Field
            id="password"
            label="Password"
            type="password"
            autoComplete={isCreating ? "new-password" : "current-password"}
            value={password}
            onChange={setPassword}
            onEnter={submit}
          />

          {error && (
            <p style={{ fontSize: 13, color: "var(--color-text)" }} role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={isBusy}
            className="btn-primary btn-poster w-full"
            style={{ gap: 8 }}
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
            className="link-teal"
          >
            {isCreating ? "I already have an account" : "First time here? Create an account"}
          </button>
        </div>
      </div>
    </div>
  );
}
