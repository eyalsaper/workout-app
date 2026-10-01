// "Export to Obsidian" — the two fixed-name files the weekly review reads.
// Pure builders plus one delivery function; the file names never change so a
// new export overwrites the last one in the vault.

import { monthCsv } from "./csv.js";
import { planToJson } from "./planExport.js";

export const OBSIDIAN_HISTORY_FILE = "iron-log-history.csv";
export const OBSIDIAN_PLAN_FILE = "iron-log-plan.json";

const LAST_EXPORT_KEY = "ironlog.obsidianExportAt";

/** [{ name, text, type }] — everything finished, with notes, plus the plan. */
export function buildObsidianFiles({ sessions, program, routines, exerciseBank, planDays }) {
  const rows = Object.entries(sessions || {}).filter(([, s]) => s?.finishedAt && s?.date);
  // Same "Day N" resolution as History's Export everything.
  const dayNameFor = (planDayId) => {
    const index = (planDays || []).findIndex((day) => day.id === planDayId);
    return index === -1 ? "" : `Day ${index + 1}`;
  };
  return [
    {
      name: OBSIDIAN_HISTORY_FILE,
      text: monthCsv(rows, dayNameFor, { sessionNotes: true }),
      type: "text/csv",
    },
    {
      name: OBSIDIAN_PLAN_FILE,
      text: planToJson(program, routines, exerciseBank),
      type: "application/json",
    },
  ];
}

/** Both files in one share sheet, when the browser can share files at all. */
export function canShareFiles(files) {
  try {
    if (typeof navigator === "undefined" || !navigator.canShare || !navigator.share) return false;
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}

function download(file) {
  const url = URL.createObjectURL(new Blob([file.text], { type: file.type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Shares both files (phone) or downloads them (desktop, or no file sharing).
 * Resolves to "shared" | "downloaded" | "cancelled". Must run straight from a
 * tap: the share sheet is refused outside a user gesture.
 */
export async function deliverObsidianFiles(built) {
  const files = built.map((f) => new File([f.text], f.name, { type: f.type }));
  if (canShareFiles(files)) {
    try {
      await navigator.share({ files, title: "Iron Log" });
      return "shared";
    } catch (err) {
      if (err?.name === "AbortError") return "cancelled";
      // Any other failure: fall through to plain downloads.
    }
  }
  built.forEach((f, i) => setTimeout(() => download(f), i * 300));
  return "downloaded";
}

// Kept on the device, not in Firebase: it is a fact about this device's export.
export function readLastExport() {
  try {
    return Number(localStorage.getItem(LAST_EXPORT_KEY)) || null;
  } catch {
    return null;
  }
}

export function recordExport(at = Date.now()) {
  try {
    localStorage.setItem(LAST_EXPORT_KEY, String(at));
  } catch {
    /* private mode — the button still worked */
  }
  return at;
}
