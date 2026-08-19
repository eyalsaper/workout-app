import { useCallback, useEffect, useRef, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { database } from "../firebase";

// Wait this long after the last change before writing to Firebase.
// Typing "Bulgarian Split Squat" used to fire 22 separate whole-object
// writes; now it fires one.
const WRITE_DELAY_MS = 400;

// Firebase rejects `undefined`. Round-tripping through JSON drops those keys.
const sanitize = (value) => JSON.parse(JSON.stringify(value ?? null));

/**
 * Two-way sync between a piece of React state and one Firebase path.
 *
 * Returns [value, setValue, isLoaded] — setValue takes a value or an
 * updater function, exactly like useState.
 */
export function useFirebaseSync(path, initialValue) {
  const [data, setData] = useState(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // Refs mirror state so setValue can read the current value without being
  // re-created on every render, and without doing work inside a state updater.
  const dataRef = useRef(initialValue);
  const initialRef = useRef(initialValue);
  const loadedRef = useRef(false);
  const timerRef = useRef(null);
  const hasPendingWriteRef = useRef(false);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!hasPendingWriteRef.current) return;
    hasPendingWriteRef.current = false;
    set(ref(database, path), sanitize(dataRef.current)).catch((error) => {
      console.error(`Could not save "${path}" to Firebase:`, error);
    });
  }, [path]);

  // Subscribe to remote changes.
  useEffect(() => {
    const dbRef = ref(database, path);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      // Ignore incoming data while we're holding an unsent local edit,
      // otherwise the server echo fights the cursor mid-typing.
      if (hasPendingWriteRef.current) return;

      if (snapshot.exists()) {
        const value = snapshot.val();
        dataRef.current = value;
        setData(value);
      } else {
        dataRef.current = initialRef.current;
        setData(initialRef.current);
        set(dbRef, sanitize(initialRef.current)).catch(() => {});
      }

      loadedRef.current = true;
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, [path]);

  // Don't lose the last few hundred milliseconds of edits when the phone
  // sleeps, the tab is backgrounded, or the app is closed at the gym.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [flush]);

  const setValue = useCallback(
    (newValue) => {
      const next =
        typeof newValue === "function" ? newValue(dataRef.current) : newValue;

      dataRef.current = next;
      setData(next);

      if (!loadedRef.current) return;

      hasPendingWriteRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, WRITE_DELAY_MS);
    },
    [flush]
  );

  return [data, setValue, isLoaded];
}
