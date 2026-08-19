import React, { useState } from "react";
import {
  ArrowLeft,
  FileText,
  Link2,
  ListOrdered,
  Paperclip,
  Plus,
  Trash2,
} from "lucide-react";
import { useWorkout } from "../state/WorkoutContext";
import SetRow from "../components/SetRow";
import ExerciseAnimation from "../components/ExerciseAnimation";
import { cleanName, setCountFor } from "../lib/format";
import { guessPattern, LIBRARY_BY_NAME, PATTERN_LABELS } from "../lib/exerciseLibrary";

export default function DetailPage({ exerciseName, onBack }) {
  const {
    exerciseBank,
    getDetail,
    updateDetailField,
    toggleRoutineItem,
  } = useWorkout();

  const [isEditingRoutine, setIsEditingRoutine] = useState(false);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");

  const detail = getDetail(exerciseName);
  const bankEntry = exerciseBank[exerciseName];
  const pattern = bankEntry?.pattern || guessPattern(exerciseName);
  const cues = LIBRARY_BY_NAME[exerciseName]?.cues || [];
  const isBankExercise = !!bankEntry && !bankEntry.isHidden;
  // Bank exercises get their sets from the bank, so they only show notes.
  const activeTab = isBankExercise ? "explanation" : detail.type || "explanation";

  const setField = (field, value) => updateDetailField(exerciseName, field, value);

  const routine = detail.routine || [];
  const files = detail.files || [];
  const links = detail.links || [];

  const saveLink = () => {
    const trimmed = linkDraft.trim();
    if (trimmed) setField("links", [...links, trimmed]);
    setLinkDraft("");
    setIsAddingLink(false);
  };

  return (
    <div className="bg-iron-850 rounded-sm p-6 sm:p-8 border border-iron-700 animate-in fade-in zoom-in-95 duration-200">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-chalk-500 hover:text-plate-yellow transition-colors mb-6 font-medium bg-iron-800 hover:bg-iron-800 px-4 py-2 rounded-sm w-fit"
      >
        <ArrowLeft className="w-5 h-5" /> Back
      </button>

      <h1 className="text-3xl font-bold mb-2 text-chalk-50">
        Elaboration: <span className="text-plate-yellow">{exerciseName}</span>
      </h1>

      <div className="flex gap-2 border-b border-iron-700 mb-6 mt-4">
        {!isBankExercise && (
          <button
            type="button"
            onClick={() => setField("type", "routine")}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "routine"
                ? "border-plate-yellow text-plate-yellow"
                : "border-transparent text-chalk-500 hover:text-chalk-50"
            }`}
          >
            <ListOrdered className="w-4 h-4" /> Routine Checklist
          </button>
        )}
        <button
          type="button"
          onClick={() => setField("type", "explanation")}
          className={`px-6 py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "explanation"
              ? "border-plate-yellow text-plate-yellow"
              : "border-transparent text-chalk-500 hover:text-chalk-50"
          }`}
        >
          <FileText className="w-4 h-4" /> Explanation & Notes
        </button>
      </div>

      {activeTab === "routine" && !isBankExercise && (
        <div className="space-y-4 max-w-3xl">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <p className="text-chalk-300 text-sm">
              Build a custom routine. Tap items to cross them off during a workout.
            </p>
            <button
              type="button"
              onClick={() => setIsEditingRoutine((v) => !v)}
              className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
                isEditingRoutine
                  ? "bg-plate-yellow text-iron-950"
                  : "bg-iron-850 border border-iron-600 text-chalk-200"
              }`}
            >
              {isEditingRoutine ? "💾 Save Routine" : "✏️ Edit List"}
            </button>
          </div>

          {isEditingRoutine ? (
            <>
              {routine.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 bg-iron-900 p-2 rounded border border-iron-800"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-plate-yellow/20 text-plate-yellow flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <input
                    type="text"
                    list="exercise-bank-list"
                    value={item}
                    onChange={(e) => {
                      const next = [...routine];
                      next[idx] = e.target.value;
                      setField("routine", next);
                    }}
                    className="w-full p-2.5 border border-iron-600 rounded-sm focus:ring-2 focus:ring-plate-yellow"
                    placeholder="Type exercise..."
                  />
                  <button
                    type="button"
                    aria-label="Remove routine item"
                    onClick={() => {
                      const next = routine.filter((_, i) => i !== idx);
                      setField("routine", next.length === 0 ? [""] : next);
                    }}
                    className="p-3 text-plate-red/80 hover:text-plate-red"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setField("routine", [...routine, ""])}
                className="mt-4 px-4 py-3 text-plate-yellow border border-dashed border-plate-yellow/40 rounded w-full flex justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> Add Item
              </button>
            </>
          ) : (
            <div className="bg-iron-900 border border-iron-700 rounded p-4 sm:p-6 space-y-3">
              {routine.map((item, itemIdx) => {
                if (!item || item.trim() === "") return null;
                const name = cleanName(item);
                const bankData = exerciseBank[name];
                const numSets = setCountFor(bankData);

                return Array.from({ length: numSets }).map((_, setIdx) => {
                  const key = `${itemIdx}_${setIdx}`;
                  return (
                    <SetRow
                      key={key}
                      name={name}
                      setIdx={setIdx}
                      numSets={numSets}
                      bankData={bankData}
                      showSetLabel={numSets > 1}
                      isChecked={!!detail.routineChecked?.[key]}
                      onToggle={() =>
                        toggleRoutineItem(exerciseName, itemIdx, setIdx)
                      }
                    />
                  );
                });
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "explanation" && (
        <div className="space-y-8 max-w-3xl">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <h3 className="stencil mb-2">Form · {PATTERN_LABELS[pattern] || "Movement"}</h3>
              <ExerciseAnimation pattern={pattern} label={exerciseName} />
              <p className="text-xs text-chalk-600 mt-2">
                Drawn animation, not footage. It shows the movement pattern — add
                a video link below for the specific lift.
              </p>
            </div>

            {cues.length > 0 && (
              <div>
                <h3 className="stencil mb-2">Cues</h3>
                <ul className="space-y-2">
                  {cues.map((cue, i) => (
                    <li
                      key={i}
                      className="text-sm text-chalk-200 flex gap-2.5 leading-snug"
                    >
                      <span className="font-data text-plate-yellow text-xs mt-0.5">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {cue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="exercise-notes"
              className="block text-sm font-semibold text-chalk-200 mb-2"
            >
              Instructions / Notes
            </label>
            <textarea
              id="exercise-notes"
              value={detail.explanation || ""}
              onChange={(e) => setField("explanation", e.target.value)}
              placeholder="Write instructions..."
              className="w-full p-4 border border-iron-600 rounded min-h-[150px] bg-iron-900"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-chalk-200 mb-3 flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-chalk-500" /> Attached Media &
                Files
              </h3>
              <div className="space-y-3">
                {files.map((fileObj, idx) => {
                  const fileName =
                    typeof fileObj === "string" ? fileObj : fileObj.name;
                  const fileUrl = typeof fileObj === "string" ? null : fileObj.url;
                  const fileType =
                    typeof fileObj === "string" ? "" : fileObj.type || "";
                  const isImage = fileType.startsWith("image/");
                  const isVideo = fileType.startsWith("video/");

                  return (
                    <div
                      key={idx}
                      className="flex flex-col bg-iron-800 p-3 rounded text-sm text-chalk-200 border border-iron-700"
                    >
                      <div className="flex justify-between items-center mb-2">
                        {fileUrl && !isImage && !isVideo ? (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate text-plate-yellow hover:underline font-medium"
                          >
                            {fileName}
                          </a>
                        ) : (
                          <span className="truncate font-medium">{fileName}</span>
                        )}
                        <button
                          type="button"
                          aria-label={`Remove ${fileName}`}
                          onClick={() =>
                            setField( "files",
                              files.filter((_, i) => i !== idx)
                            )
                          }
                          className="text-chalk-500 hover:text-plate-red"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {fileUrl && isImage && (
                        <img
                          src={fileUrl}
                          alt={fileName}
                          className="max-w-full max-h-[300px] object-contain rounded border border-iron-700 bg-iron-850"
                        />
                      )}
                      {fileUrl && isVideo && (
                        <video
                          src={fileUrl}
                          controls
                          className="max-w-full max-h-[300px] rounded border border-iron-700 bg-black"
                        />
                      )}
                    </div>
                  );
                })}

                <label className="text-sm text-plate-yellow font-medium hover:underline flex items-center gap-1 cursor-pointer w-fit mt-2">
                  <Plus className="w-3 h-3" /> Browse Device Files
                  <input
                    type="file"
                    accept="image/*,video/*,.pdf,.doc,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setField("files", [
                          ...files,
                          {
                            name: file.name,
                            url: URL.createObjectURL(file),
                            type: file.type,
                          },
                        ]);
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
                <p className="text-xs text-flag-orange mt-1">
                  Heads up: attachments still use temporary browser links, so they
                  stop loading after a refresh. Firebase Storage is the fix — see
                  the README.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-chalk-200 mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-chalk-500" /> Reference Links
              </h3>
              <div className="space-y-2">
                {links.map((link, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-iron-800 p-2 px-3 rounded text-sm"
                  >
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-plate-yellow hover:underline truncate mr-2"
                    >
                      {link}
                    </a>
                    <button
                      type="button"
                      aria-label="Remove link"
                      onClick={() =>
                        setField( "links",
                          links.filter((_, i) => i !== idx)
                        )
                      }
                      className="text-chalk-500 hover:text-plate-red"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {isAddingLink ? (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={linkDraft}
                      onChange={(e) => setLinkDraft(e.target.value)}
                      placeholder="e.g. https://youtube.com/..."
                      className="flex-1 p-1.5 text-sm border border-iron-600 rounded focus:ring-1 focus:ring-plate-yellow outline-none bg-iron-850"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && saveLink()}
                    />
                    <button
                      type="button"
                      onClick={saveLink}
                      className="text-xs bg-plate-yellow text-iron-950 px-2 py-1.5 rounded hover:bg-plate-yellow-hot"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingLink(false);
                        setLinkDraft("");
                      }}
                      className="text-xs text-chalk-500 hover:text-chalk-200 px-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingLink(true)}
                    className="text-sm text-plate-yellow font-medium hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add URL
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
