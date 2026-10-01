// Client-side CSV export. Pure string-building here; the download trigger
// is the only DOM-touching part, isolated at the bottom.

function csvCell(value) {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** One row per logged set, oldest first. */
export function sessionsToCsv(sessions) {
  const header = [
    "date",
    "exercise",
    "set",
    "weight",
    "weight_unit",
    "reps",
    "rpe",
    "finished",
  ];
  const rows = [header];

  Object.values(sessions || {})
    .filter((s) => s?.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((session) => {
      Object.entries(session.entries || {}).forEach(([exName, entry]) => {
        (entry.sets || []).forEach((s, i) => {
          if (!s || !s.done) return;
          rows.push([
            session.date,
            exName,
            i + 1,
            s.weight || "",
            s.weightUnit || "",
            s.reps || "",
            s.rpe || "",
            session.finishedAt ? "yes" : "no",
          ]);
        });
      });
    });

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

/** Triggers a browser download of the given text as a file. */
export function downloadTextFile(filename, text, mimeType = "text/csv") {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ------------------------------------------------------------------- v2
/**
 * The §10.5 export shape — one row per set, carrying the plan day and round
 * so an export can be re-imported without losing where a session sat.
 *
 * `rows` is [[sessionId, session], ...]; `dayNameFor` resolves a planDayId to
 * "Day 3" and is passed in so this file never reaches into the programme.
 */
export function monthCsv(rows, dayNameFor = () => "", { sessionNotes = false } = {}) {
  const header = [
    "date",
    "session_id",
    "routine",
    "plan_day",
    "round",
    "movement",
    "set_index",
    "weight_kg",
    "reps",
  ];
  // Opt-in, and only when some session actually has a note or feeling, so the
  // plain export keeps its exact columns.
  const noteOf = (session) =>
    [session.note, session.feeling].map((t) => String(t ?? "").trim()).filter(Boolean).join(" | ");
  const withNotes = sessionNotes && (rows || []).some(([, s]) => noteOf(s));
  if (withNotes) header.push("session_note");
  const out = [header];

  [...(rows || [])]
    .sort((a, b) => (a[1].date || "").localeCompare(b[1].date || ""))
    .forEach(([id, session]) => {
      Object.entries(session.entries || {}).forEach(([movement, entry]) => {
        (entry.sets || []).forEach((set, index) => {
          if (!set?.done) return;
          out.push([
            session.startedAt ? new Date(session.startedAt).toISOString() : session.date,
            id,
            session.label || "",
            dayNameFor(session.planDayId) || "",
            session.roundNumber ?? "",
            movement,
            index + 1,
            set.weight || "",
            set.reps || "",
            ...(withNotes ? [noteOf(session)] : []),
          ]);
        });
      });
    });

  return out.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function exportMonthCsv(rows, monthKey, dayNameFor) {
  downloadTextFile(`iron-log-${monthKey}.csv`, monthCsv(rows, dayNameFor));
}

/**
 * Import (§10.5). Deliberately tolerant: unknown columns are ignored, unknown
 * movements become user movements, and unparseable rows are skipped and
 * counted rather than aborting the whole file.
 *
 * It never creates a programme — imported history lands with a null
 * planDayId, and the user still picks or builds a plan.
 */
export function parseImportCsv(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length < 2) return { sessions: {}, imported: 0, skipped: 0, movements: [] };

  const split = (line) => {
    const cells = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (ch === '"') quoted = false;
        else cell += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ",") {
        cells.push(cell);
        cell = "";
      } else cell += ch;
    }
    cells.push(cell);
    return cells;
  };

  const header = split(lines[0]).map((h) => h.trim().toLowerCase());
  const col = (name) => header.indexOf(name);
  const iDate = col("date");
  const iMovement = col("movement") === -1 ? col("exercise") : col("movement");
  const iWeight = col("weight_kg") === -1 ? col("weight") : col("weight_kg");
  const iReps = col("reps");

  if (iDate === -1 || iMovement === -1) {
    return { sessions: {}, imported: 0, skipped: lines.length - 1, movements: [] };
  }

  const sessions = {};
  const movements = new Set();
  let imported = 0;
  let skipped = 0;

  lines.slice(1).forEach((line) => {
    const cells = split(line);
    const rawDate = (cells[iDate] || "").trim();
    const date = rawDate.slice(0, 10);
    const movement = (cells[iMovement] || "").trim();
    const weight = (cells[iWeight] || "").trim();
    const reps = (cells[iReps] || "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !movement || !reps) {
      skipped++;
      return;
    }

    movements.add(movement);
    const id = `import_${date}`;
    if (!sessions[id]) {
      sessions[id] = {
        date,
        planId: null,
        dayIndex: null,
        planDayId: null,
        roundNumber: null,
        label: "Imported",
        startedAt: new Date(`${date}T12:00:00`).getTime(),
        finishedAt: new Date(`${date}T13:00:00`).getTime(),
        entries: {},
        note: "",
      };
    }
    const entry = (sessions[id].entries[movement] = sessions[id].entries[movement] || { sets: [] });
    entry.sets.push({
      weight,
      weightUnit: "KG",
      reps,
      repsUnit: "Reps",
      done: true,
      at: sessions[id].startedAt,
    });
    imported++;
  });

  return { sessions, imported, skipped, movements: [...movements] };
}
