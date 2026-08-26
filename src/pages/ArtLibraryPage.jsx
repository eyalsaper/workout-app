import React, { useEffect, useRef, useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import {
  MOODS,
  MOOD_PURPOSE,
  allImages,
  artPosition,
  artUrl,
  moodCounts,
  setArtPreferences,
} from "../lib/art";
import {
  MAX_IMAGES,
  addUserArt,
  listUserArt,
  removeUserArt,
  updateUserArt,
} from "../lib/userArt";

/*
 * 8Q · Settings / Art library.
 *
 * Lets the user grow the pool the app draws from. Shipped images HIDE; user
 * images DELETE — a licensing complaint should be one toggle away from
 * emptying the shipped set without breaking a single screen.
 *
 * This grid is the one place in the app with an inner scroll.
 */

const CROPS = [
  ["center 12%", "Top"],
  ["center 40%", "Centre"],
  ["center 70%", "Bottom"],
];

function Thumb({ image, hidden, onClick }) {
  const url = artUrl(image);
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 128,
        borderRadius: 12,
        border: "1px solid var(--color-border-hi)",
        backgroundImage: url ? `url('${url}')` : "none",
        backgroundColor: "var(--color-hero-a)",
        backgroundSize: "cover",
        backgroundPosition: artPosition(image),
        // A hidden image stays visible here, just obviously off.
        opacity: hidden ? 0.25 : 1,
      }}
      aria-label={image.id}
    />
  );
}

/** Full-bleed detail: moods, a three-way crop, and remove. */
function Detail({ image, hidden, onClose, onToggleMood, onCrop, onRemoveOrHide }) {
  const url = artUrl(image);
  const isShipped = image.src !== "user";
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--color-page)" }}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          backgroundImage: url ? `url('${url}')` : "none",
          backgroundSize: "cover",
          backgroundPosition: artPosition(image),
        }}
      />
      <div className="flex flex-col gap-3" style={{ padding: 22 }}>
        <span className="label">Moods</span>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((mood) => {
            const on = image.moods?.includes(mood);
            return (
              <button
                key={mood}
                type="button"
                onClick={() => onToggleMood(mood)}
                disabled={isShipped}
                className="mode-chip"
                data-active={on}
                style={isShipped ? { opacity: 0.5 } : undefined}
              >
                {mood}
              </button>
            );
          })}
        </div>

        <span className="label">Crop</span>
        <div className="flex gap-2">
          {CROPS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onCrop(value)}
              disabled={isShipped}
              className="mode-chip"
              data-active={artPosition(image) === value}
              style={isShipped ? { opacity: 0.5 } : undefined}
            >
              {label}
            </button>
          ))}
        </div>

        {isShipped && (
          <span style={{ fontSize: 12, color: "var(--color-dim)" }}>
            Shipped images can be hidden, not edited.
          </span>
        )}

        <button type="button" className="btn-secondary" onClick={onRemoveOrHide}>
          {isShipped ? (hidden ? "Show this image" : "Hide this image") : "Remove"}
        </button>
        <button type="button" className="btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

export default function ArtLibraryPage({ onBack }) {
  const { settings, setSettings } = useWorkout();
  const [userImages, setUserImages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState(null);
  const fileRef = useRef(null);

  const hiddenIds = settings.hiddenArtIds || [];

  const refresh = async () => {
    const images = await listUserArt();
    setUserImages(images);
    setArtPreferences({ userImages: images });
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    setArtPreferences({
      artOnlyMine: !!settings.artOnlyMine,
      hiddenIds,
      characterArt: settings.characterArt !== false,
    });
  }, [settings.artOnlyMine, settings.characterArt, hiddenIds.join(",")]);

  const shipped = settings.artOnlyMine ? [] : allImages().filter((i) => i.src !== "user");
  const grid = [...shipped, ...userImages];
  const counts = moodCounts();
  const thin = MOODS.filter((mood) => counts[mood] > 0 && counts[mood] < 2);

  const pick = async (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = "";
    if (!files.length) return;
    const { added, rejected } = await addUserArt(files);
    await refresh();
    const small = rejected.filter((r) => r.reason === "small").length;
    const full = rejected.filter((r) => r.reason === "full").length;
    setNotice(
      [
        added ? `${added} added` : null,
        small ? `${small} too small (under 600px)` : null,
        full ? `${full} skipped — library is full at ${MAX_IMAGES}` : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Nothing added"
    );
  };

  const toggleMood = async (mood) => {
    const moods = selected.moods?.includes(mood)
      ? selected.moods.filter((m) => m !== mood)
      : [...(selected.moods || []), mood];
    await updateUserArt(selected.id, { moods });
    setSelected({ ...selected, moods });
    refresh();
  };

  const setCrop = async (position) => {
    await updateUserArt(selected.id, { position });
    setSelected({ ...selected, position });
    refresh();
  };

  const removeOrHide = async () => {
    if (selected.src === "user") {
      await removeUserArt(selected.id);
      await refresh();
    } else {
      const next = hiddenIds.includes(selected.id)
        ? hiddenIds.filter((id) => id !== selected.id)
        : [...hiddenIds, selected.id];
      setSettings({ ...settings, hiddenArtIds: next });
    }
    setSelected(null);
  };

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-[12px]">
      <div className="flex items-center justify-between flex-none">
        <button type="button" className="link-teal" onClick={onBack}>
          Settings
        </button>
        <span
          className="uppercase"
          style={{ fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, color: "var(--color-muted)" }}
        >
          Art library
        </span>
        <button
          type="button"
          style={{ fontSize: 13, color: "var(--color-brass)" }}
          onClick={() => fileRef.current?.click()}
        >
          Add
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={pick}
        style={{ display: "none" }}
      />

      <div className="flex flex-col gap-[4px] flex-none">
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            fontWeight: 700,
            color: "var(--color-text-strong)",
          }}
        >
          {grid.length} image{grid.length === 1 ? "" : "s"}
        </span>
        <span style={{ fontSize: 13, color: "var(--color-muted)" }}>
          Every screen draws one at random. Add your own and they join the pool.
        </span>
      </div>

      {notice && (
        <span style={{ fontSize: 12, color: "var(--color-teal)" }} role="status">
          {notice}
        </span>
      )}

      {/* The one inner scroll in the app. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          overflowY: "auto",
          minHeight: 0,
        }}
      >
        {grid.map((image) => (
          <Thumb
            key={image.id}
            image={image}
            hidden={hiddenIds.includes(image.id)}
            onClick={() => setSelected(image)}
          />
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{
            height: 128,
            borderRadius: 12,
            border: "1px dashed #3a3f48",
            color: "var(--color-brass)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          + Add
        </button>
      </div>

      <div className="flex flex-col gap-[8px] flex-none">
        <span className="label" style={{ paddingLeft: 2 }}>
          Moods in use
        </span>
        <div className="card flex flex-col gap-[9px]" style={{ padding: 14 }}>
          {MOODS.map((mood) => (
            <div key={mood} className="flex items-baseline justify-between gap-3">
              <span style={{ fontSize: 13, color: "#cfcbc3" }}>
                {mood}
                <span style={{ color: "var(--color-dim)" }}> · {MOOD_PURPOSE[mood]}</span>
              </span>
              <span
                className="tabular"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--color-brass-text)",
                  flex: "none",
                }}
              >
                {counts[mood]}
              </span>
            </div>
          ))}
          {/* Warn, never block. */}
          {thin.map((mood) => (
            <span key={mood} style={{ fontSize: 12, color: "var(--color-dim)" }}>
              {mood[0].toUpperCase() + mood.slice(1)} has one image — every session will look
              the same.
            </span>
          ))}
        </div>

        <button
          type="button"
          className="row-card flex justify-between items-center w-full text-left"
          onClick={() => setSettings({ ...settings, artOnlyMine: !settings.artOnlyMine })}
        >
          <div className="flex flex-col gap-[2px]">
            <span className="row-title">Only my images</span>
            <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>
              hide the ones that shipped
            </span>
          </div>
          <span className="row-value">{settings.artOnlyMine ? "On" : "Off"}</span>
        </button>

        <span style={{ fontSize: 11, color: "var(--color-dim)", paddingLeft: 2 }}>
          Your images stay on this device. They are not synced.
        </span>
      </div>

      {selected && (
        <Detail
          image={selected}
          hidden={hiddenIds.includes(selected.id)}
          onClose={() => setSelected(null)}
          onToggleMood={toggleMood}
          onCrop={setCrop}
          onRemoveOrHide={removeOrHide}
        />
      )}
    </div>
  );
}
