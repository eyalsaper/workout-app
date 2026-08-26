import React from "react";
import ArtLayer from "./ArtLayer";
import { artSeed } from "../lib/art";

/*
 * A band — the 70–96px strip that gives a card screen a sense of place.
 *
 * A band REPLACES the header it would otherwise duplicate: on History the
 * band is the month header, so the card below must not repeat it.
 *
 * The draw is seeded per app launch, so a band changes when you reopen the
 * app and not while you are using it.
 */
export default function ArtBand({ screen, kicker, sub, height = 96, mood = "calm", right }) {
  return (
    <div
      className="relative overflow-hidden flex-none"
      style={{
        height,
        borderRadius: "var(--radius-art)",
        border: "1px solid var(--color-border-hi)",
        background: "var(--color-hero-a)",
      }}
    >
      <ArtLayer mood={mood} seedKey={artSeed.band(screen)} scrim="band" />
      <div
        className="absolute flex flex-col gap-[4px]"
        style={{ left: 18, bottom: 14, right: 18 }}
      >
        <span
          className="uppercase"
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            fontWeight: 700,
            color: "var(--color-brass)",
          }}
        >
          {kicker}
        </span>
        {sub && (
          <span className="truncate" style={{ fontSize: 13, color: "#cfcbc3" }}>
            {sub}
          </span>
        )}
      </div>
      {right && (
        <div className="absolute" style={{ right: 14, top: "50%", transform: "translateY(-50%)" }}>
          {right}
        </div>
      )}
    </div>
  );
}
