import React from "react";

/*
 * Poster-screen primitives.
 *
 * Cards for screens you scan and tap through; poster for screens about one
 * thing. Poster screens get hairline rules and no radius except the phone
 * itself — a rounded card on a poster screen is wrong.
 */

/** Full-bleed poster shell: ink ground, 24px sides, one scrolling column. */
export function PosterScreen({ children, bleed = false }) {
  return (
    <div
      className="flex-1 min-h-0 flex flex-col"
      style={{
        background: "var(--color-poster)",
        // Heroes run edge to edge; everything under them is inset 24px.
        margin: "-10px -22px -12px",
        padding: bleed ? 0 : "0 0 12px",
        overflowY: "auto",
      }}
    >
      {children}
    </div>
  );
}

/** The 24px column the non-hero content of a poster screen lives in. */
export function PosterBody({ children, className = "", style }) {
  return (
    <div
      className={`flex flex-col ${className}`}
      style={{ padding: "0 24px", ...style }}
    >
      {children}
    </div>
  );
}

export function Kicker({ children, style }) {
  return (
    <span className="kicker" style={style}>
      {children}
    </span>
  );
}

/** A 1px horizontal rule. The first rule of a group is brass. */
export function Rule({ brass = false, style }) {
  return <div className="poster-rule" data-brass={brass} style={style} />;
}

/**
 * One poster row: a label on the left, a value on the right, a rule above.
 * The stat rows on 8G, 8H and 8M are all this.
 */
export function PosterRow({ label, value, brassRule = false, valueColor }) {
  return (
    <>
      <Rule brass={brassRule} />
      <div className="flex items-baseline justify-between" style={{ padding: "14px 0" }}>
        <span className="label">{label}</span>
        <span
          className="tabular"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 19,
            fontWeight: 700,
            color: valueColor || "var(--color-brass-text)",
          }}
        >
          {value}
        </span>
      </div>
    </>
  );
}

/** No trough on a poster screen — labels in a row under one rule. */
export function PosterSegments({ options, value, onChange }) {
  return (
    <div className="segmented-poster">
      {options.map(([key, label]) => (
        <button key={key} type="button" data-active={value === key} onClick={() => onChange(key)}>
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * A rolling window of bars. All bars are `--color-rule` except the last,
 * which is brass, because the last one is now.
 *
 * Takes the SAME series the caption above it was computed from — the caption
 * disagreeing with the bars was the most common bug in the last version.
 */
export function Bars({ series, height = 120, square = true, label }) {
  const max = Math.max(1, ...series.map((point) => point.value));
  return (
    <div
      className="flex items-end gap-2"
      style={{ height }}
      role="img"
      aria-label={label}
    >
      {series.map((point, index) => (
        <div
          key={point.key || index}
          style={{
            flex: 1,
            // A zero week still shows a 2px sliver, so the axis reads as
            // eight weeks rather than as a gap in the data.
            height: `${Math.max(2, (point.value / max) * height)}px`,
            background:
              index === series.length - 1 ? "var(--color-brass)" : "var(--color-rule)",
            borderRadius: square ? 0 : 5,
          }}
        />
      ))}
    </div>
  );
}

/** "8 weeks ago" / "this week" — never W1…W8, because the window rolls. */
export function BarAxis({ from = "8 weeks ago", to = "this week" }) {
  return (
    <div
      className="flex justify-between"
      style={{ fontSize: 11, color: "var(--color-dim)", paddingTop: 8 }}
    >
      <span>{from}</span>
      <span>{to}</span>
    </div>
  );
}

/** The one inset block a poster screen is allowed. */
export function InsetBlock({ children, style }) {
  return (
    <div
      style={{
        background: "var(--color-poster-card)",
        borderRadius: 10,
        padding: 14,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Poster primary action: 56px, 6px radius, uppercase. */
export function PosterButton({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn-primary btn-poster w-full"
    >
      {children}
    </button>
  );
}
