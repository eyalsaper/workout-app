import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from "firebase/auth";
import { auth } from "../firebase";

// Exported so the dev preview harness can mount a screen without a real
// Firebase session. Nothing in the app consumes it directly — use useAuth().
export const AuthContext = createContext(null);

// Firebase error codes are not something to show a person mid-workout.
const MESSAGES = { "auth/invalid-email": "That doesn't look like an email address.", "auth/invalid-credential": "Wrong email or password.", "auth/wrong-password": "Wrong email or password.", "auth/user-not-found": "No account with that email yet.", "auth/email-already-in-use": "That email already has an account. Sign in instead.", "auth/weak-password": "Passwords need at least 6 characters.", "auth/too-many-requests": "Too many attempts. Wait a minute and try again.", "auth/network-request-failed": "No connection. Check your signal and try again.", "auth/operation-not-allowed": "Email sign-in isn't switched on yet. Enable it in Firebase Console → Authentication → Sign-in method.",
};

const readableError = (error) =>
  MESSAGES[error?.code] || "Something went wrong signing in. Try again.";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isResolving, setIsResolving] = useState(true);

  useEffect(() => {
    // Stay signed in across app restarts — nobody wants to type a password
    // between sets.
    setPersistence(auth, browserLocalPersistence).catch(() => {});

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsResolving(false);
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      isResolving,
      signIn: (email, password) =>
        signInWithEmailAndPassword(auth, email.trim(), password),
      signUp: (email, password) =>
        createUserWithEmailAndPassword(auth, email.trim(), password),
      signOut: () => fbSignOut(auth),
      readableError,
    }),
    [user, isResolving]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
