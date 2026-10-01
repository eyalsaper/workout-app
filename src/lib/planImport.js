// Plan import — the other half of planExport.js. Reads the two formats the app
// exports (CSV and JSON) and turns them into a plan. Pure: no React, no
// Firebase, no DOM, so the round trip can be tested in node.
//
// Tolerant on purpose, like parseImportCsv: unknown columns are ignored and
// unusable rows are skipped and counted instead of aborting the file.

import { PLAN_EXPORT_FORMAT, PLAN_EXPORT_VERSION } from "./planExport.js";
import { emptyProgram, orderedDays, reconcileCursor } from "./plan.js";
import { EXERCISE_LIBRARY, LIBRARY_BY_NAME, libraryEntry } from "./exerciseLibrary.js";

// ------------------------------------------------------------------ parse

/** Full-text CSV reader: quoted cells may hold commas, quotes and newlines. */
export function parseCsvRecords(text) {
  const src = String(text || "").replace(/^﻿/, "");
  const records = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const endRow = () => {
    row.push(cell);
    cell = "";
    if (row.some((c) => c.trim() !== "")) records.push(row);
    row = [];
  };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      endRow();
    } else cell += ch;
  }
  if (cell !== "" || row.length) endRow();
  return records;
}

const toSets = (value) => {
  const n = parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const toLoad = (value) => {
  const n = parseFloat(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const toGroups = (value) =>
  (Array.isArray(value) ? value : String(value ?? "").split(";"))
    .map((g) => String(g).trim())
    .filter(Boolean);

const failure = (error) => ({ ok: false, error });

function parsePlanCsv(text) {
  const records = parseCsvRecords(text);
  if (records.length < 2) return failure("The file has no rows.");

  const header = records[0].map((h) => h.trim().toLowerCase());
  const col = (name) => header.indexOf(name);
  const iPlan = col("plan");
  const iDay = col("day");
  const iDayName = col("day_name");
  const iOrder = col("order");
  const iMovement = col("movement");
  const iSets = col("sets");
  const iReps = col("reps");
  const iLoad = col("target_load_kg");
  const iGroups = col("muscle_groups");

  if (iMovement === -1 || (iDay === -1 && iDayName === -1)) {
    return failure("This does not look like an Iron Log plan: it needs movement and day columns.");
  }

  const cellOf = (cells, i) => (i === -1 ? "" : String(cells[i] ?? "").trim());
  const dayMap = new Map();
  let planName = "";
  let skipped = 0;

  records.slice(1).forEach((cells, seq) => {
    const name = cellOf(cells, iMovement);
    const dayNo = parseInt(cellOf(cells, iDay), 10);
    const dayName = cellOf(cells, iDayName);
    const hasDayNo = Number.isFinite(dayNo) && dayNo > 0;
    if (!name || (!hasDayNo && !dayName)) {
      skipped++;
      return;
    }
    if (!planName) planName = cellOf(cells, iPlan);

    // Group by day number when there is one, by name otherwise.
    const key = hasDayNo ? `n${dayNo}` : `s${dayName.toLowerCase()}`;
    if (!dayMap.has(key)) {
      dayMap.set(key, { position: hasDayNo ? dayNo : Infinity, seq, name: dayName, rows: [] });
    }
    const day = dayMap.get(key);
    if (!day.name && dayName) day.name = dayName;
    const order = parseInt(cellOf(cells, iOrder), 10);
    day.rows.push({
      seq,
      order: Number.isFinite(order) ? order : Infinity,
      movement: {
        name,
        sets: toSets(cellOf(cells, iSets)),
        reps: cellOf(cells, iReps),
        targetLoadKg: toLoad(cellOf(cells, iLoad)),
        muscleGroups: toGroups(cellOf(cells, iGroups)),
      },
    });
  });

  const days = [...dayMap.values()]
    .sort((a, b) => a.position - b.position || a.seq - b.seq)
    .map((day, index) => ({
      name: day.name || `Workout ${index + 1}`,
      movements: day.rows
        .sort((a, b) => a.order - b.order || a.seq - b.seq)
        .map((r) => r.movement),
    }));

  return { ok: true, source: "csv", name: planName, focus: "", days, skipped, warnings: [] };
}

function parsePlanJson(text) {
  let data;
  try {
    data = JSON.parse(String(text).replace(/^﻿/, ""));
  } catch {
    return failure("The file is not valid JSON.");
  }
  if (data?.format && data.format !== PLAN_EXPORT_FORMAT) {
    return failure(`Unknown format "${data.format}". Expected an Iron Log plan.`);
  }
  const plan = data?.plan;
  if (!plan || !Array.isArray(plan.days)) {
    return failure("This does not look like an Iron Log plan: no plan.days list.");
  }

  const warnings = [];
  if (Number(data.version) > PLAN_EXPORT_VERSION) {
    warnings.push(`File version ${data.version} is newer than this app understands; reading it anyway.`);
  }

  let skipped = 0;
  const days = plan.days
    .filter((d) => d && typeof d === "object")
    .map((d, index) => ({ d, index }))
    .sort((a, b) => (Number(a.d.position) || a.index + 1) - (Number(b.d.position) || b.index + 1))
    .map(({ d }, index) => {
      const rows = (Array.isArray(d.movements) ? d.movements : []).map((m, seq) => ({ m, seq }));
      const movements = [];
      rows
        .sort((a, b) => (Number(a.m?.order) || Infinity) - (Number(b.m?.order) || Infinity) || a.seq - b.seq)
        .forEach(({ m }) => {
          const name = String(m?.name ?? "").trim();
          if (!name) {
            skipped++;
            return;
          }
          movements.push({
            name,
            sets: toSets(m.sets),
            reps: String(m.reps ?? "").trim(),
            targetLoadKg: toLoad(m.targetLoadKg),
            muscleGroups: toGroups(m.muscleGroups),
          });
        });
      return { name: String(d.name ?? "").trim() || `Workout ${index + 1}`, movements };
    });

  return {
    ok: true,
    source: "json",
    name: String(plan.name ?? "").trim(),
    focus: String(plan.focus ?? "").trim(),
    days,
    skipped,
    warnings,
  };
}

/**
 * Reads an exported plan, CSV or JSON (sniffed from the content, so a renamed
 * file still works). Returns { ok:false, error } or
 * { ok:true, source, name, focus, days:[{ name, movements:[{ name, sets,
 * reps, targetLoadKg, muscleGroups }] }], skipped, warnings }.
 */
export function parsePlanFile(text) {
  const trimmed = String(text || "").replace(/^﻿/, "").trim();
  if (!trimmed) return failure("The file is empty.");
  const parsed = trimmed.startsWith("{") ? parsePlanJson(trimmed) : parsePlanCsv(trimmed);
  if (!parsed.ok) return parsed;
  if (!parsed.days.length) return failure("No usable workouts were found in the file.");
  return { ...parsed, name: parsed.name || "Imported plan" };
}

// ------------------------------------------------------------------ apply

const norm = (s) => String(s || "").trim().toLowerCase();

/**
 * Points each imported movement at the name the app already uses (so "bench
 * press" does not become a second exercise next to "Bench Press"), and works
 * out which exercises are missing from the bank.
 *
 * Returns { days, additions } where `additions` is { name: bankEntry }: the
 * stock-library entry when the name is in the library, otherwise a user
 * exercise carrying the file's muscle groups.
 */
export function resolveMovements(days, bank = {}) {
  const known = new Map();
  Object.keys(bank || {}).forEach((key) => {
    if (key !== "_empty") known.set(norm(key), key);
  });
  EXERCISE_LIBRARY.forEach((item) => {
    if (!known.has(norm(item.name))) known.set(norm(item.name), item.name);
  });

  const additions = {};
  const resolved = days.map((day) => ({
    ...day,
    movements: day.movements.map((m) => {
      const name = known.get(norm(m.name)) || m.name;
      if (!known.has(norm(m.name))) known.set(norm(m.name), name);
      if (!bank?.[name] && !additions[name]) {
        additions[name] = LIBRARY_BY_NAME[name]
          ? libraryEntry(LIBRARY_BY_NAME[name])
          : {
              sets: m.sets || 3,
              reps: m.reps || "",
              repsUnit: "Reps",
              weight: "",
              weightUnit: "KG",
              isAlternative: false,
              altSets: [],
              muscleGroups: m.muscleGroups,
              source: "import",
            };
      }
      return { ...m, name };
    }),
  }));
  return { days: resolved, additions };
}

const asMovement = (m, order, previous = {}) => ({
  ...previous,
  movementId: m.name,
  order,
  sets: m.sets,
  reps: m.reps,
  targetLoadKg: m.targetLoadKg,
});

/**
 * Builds the programme the import would save, without saving anything.
 *
 *  - "new":    a fresh programme with fresh ids.
 *  - "update": the existing programme, edited in place. Days are matched to
 *              existing ones (by name first, then by position) and KEEP their
 *              ids, which is what links past sessions to a day. Cursor, round,
 *              weekdays and skips are untouched; days the file no longer has
 *              are dropped and counted.
 *
 * Returns { program, additions, summary } where summary is
 * { mode, kept, added, removed, movements, newMovements: [names] }.
 */
export function planFromImport(parsed, { mode = "new", program = null, bank = {}, newId }) {
  const { days: namedDays, additions } = resolveMovements(parsed.days, bank);
  const movementCount = namedDays.reduce((n, d) => n + d.movements.length, 0);
  const newMovements = Object.keys(additions);

  if (mode === "update" && program) {
    const existing = orderedDays(program);
    const used = new Set();
    const match = namedDays.map((day) => {
      const hit = existing.find((e) => !used.has(e.id) && norm(e.name) === norm(day.name));
      if (hit) used.add(hit.id);
      return hit || null;
    });
    namedDays.forEach((_, i) => {
      if (match[i]) return;
      const byPosition = existing[i];
      if (byPosition && !used.has(byPosition.id)) {
        used.add(byPosition.id);
        match[i] = byPosition;
      }
    });

    const anchorId = existing[Math.min(program?.cursor?.dayIndex ?? 0, existing.length - 1)]?.id;
    const days = namedDays.map((day, order) => {
      const old = match[order];
      const oldMovements = new Map(
        (Array.isArray(old?.movements) ? old.movements : [])
          .filter((m) => m?.movementId)
          .map((m) => [m.movementId, m])
      );
      return {
        ...(old || {}),
        id: old?.id || newId("d"),
        order,
        name: day.name,
        routineId: null,
        movements: day.movements.map((m, i) => asMovement(m, i, oldMovements.get(m.name))),
      };
    });

    return {
      program: {
        ...program,
        name: parsed.name || program.name,
        focus: parsed.focus || program.focus,
        days,
        cursor: reconcileCursor(days, program.cursor, anchorId),
      },
      additions,
      summary: {
        mode,
        kept: match.filter(Boolean).length,
        added: match.filter((m) => !m).length,
        removed: existing.length - used.size,
        movements: movementCount,
        newMovements,
      },
    };
  }

  const days = namedDays.map((day, order) => ({
    id: newId("d"),
    order,
    name: day.name,
    movements: day.movements.map((m, i) => asMovement(m, i)),
  }));
  return {
    program: {
      ...emptyProgram(),
      id: newId("p"),
      name: parsed.name,
      focus: parsed.focus || "Strength",
      mode: "plan",
      days,
    },
    additions,
    summary: {
      mode: "new",
      kept: 0,
      added: days.length,
      removed: 0,
      movements: movementCount,
      newMovements,
    },
  };
}
