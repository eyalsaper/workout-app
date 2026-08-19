import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB28MoP0FIr-ycdUe30uL7VWqMqtX9XnCY",
  authDomain: "workout-planer-2f8b3.firebaseapp.com",
  databaseURL: "https://workout-planer-2f8b3-default-rtdb.firebaseio.com",
  projectId: "workout-planer-2f8b3",
  storageBucket: "workout-planer-2f8b3.firebasestorage.app",
  messagingSenderId: "672994885635",
  appId: "1:672994885635:web:1bac01acd8c5a38ffe4e36",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const database = getDatabase(firebaseApp);
export const auth = getAuth(firebaseApp);

/** Everything one account owns lives under this path. */
export const userBasePath = (uid) => `users/${uid}`;
