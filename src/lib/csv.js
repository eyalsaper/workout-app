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
