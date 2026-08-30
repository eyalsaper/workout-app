import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Dev-only screen harness: /?preview=8a renders one screen against fixture
// data with no sign-in gate, so a screen can be checked against the design
// file while it is being built. Tree-shaken out of a production build.
const previewScreen = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get("preview")
  : null;

async function mount() {
  const root = createRoot(document.getElementById("root"));
  if (previewScreen) {
    const { default: Preview } = await import("./dev/Preview.jsx");
    root.render(
      <React.StrictMode>
        <Preview screen={previewScreen.toLowerCase()} />
      </React.StrictMode>
    );
    return;
  }
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

mount();

// Registers the offline service worker (see public/sw.js).
//
// Production only. In dev, Vite serves modules at unhashed URLs like
// /src/pages/SettingsPage.jsx, and the worker's cache-first rule would pin
// the first copy it saw forever — every later edit silently ignored. In a
// build the assets are content-hashed, so cache-first is safe there.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
} else if ("serviceWorker" in navigator) {
  // Clean up after a worker registered by an earlier dev session.
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  });
  if (window.caches) caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
}
