import React, { useMemo } from "react";
import { artPosition, artUrl, pickArt } from "../lib/art";

/*
 * One art slot. A screen asks for a MOOD and gets whatever the library hands
 * back — no component in this app names an image file.
 *
 * The image is a background-image div with the scrim as a SIBLING layer above
 * it, never an <img> with object-fit, because the scrim has to be its own
 * element. Under every scrim sits a flat 18% black wash: the draw is unknown,
 * so no scrim can be tuned to one image, and some of these are near-white.
 *
 * Art is decorative. It is aria-hidden, no layout depends on it, and a missing
 * file, an empty pool or Character art `Off` all render nothing at all — the
 * parent's plain surface shows through and the screen is still correct.
 */

const SCRIMS = {
  poster: "var(--scrim-poster)",
  heroCard: "var(--scrim-hero-h)",
  band: "var(--scrim-band)",
  rest: "var(--scrim-rest)",
};

/**
 * Draws once per seed key and holds it. Returns the image so a caller
 * rendering two slots can feed the first draw into the second's `exclude`.
 */
export function useArtDraw(mood, seedKey, exclude = []) {
  const excludeKey = exclude.join(",");
  return useMemo(
    () => pickArt(mood, seedKey, { exclude }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mood, seedKey, excludeKey]
  );
}

export default function ArtLayer({
  mood,
  seedKey,
  image: given,
  scrim = "poster",
  exclude = [],
  // The 8K side crop is the one slot that overrides the image's own
  // position — it pins a 116px-wide crop from the top (§8.2).
  size = "cover",
  position,
  className = "",
  style,
  // 8A's hero is the one slot where the scrim is wider than the art it covers
  // (210px of gradient over a 190px panel), so the image and its wash can be
  // inset independently of the scrim above them.
  artStyle,
  scrimStyle,
}) {
  const drawn = useArtDraw(mood, seedKey, exclude);
  const image = given ?? drawn;

  if (!image) return null;
  const url = artUrl(image);
  if (!url) return null;

  return (
    <div className={className} style={{ position: "absolute", inset: 0, ...style }}>
      <div
        className="art-layer"
        aria-hidden="true"
        style={{
          backgroundImage: `url('${url}')`,
          backgroundSize: size,
          backgroundPosition: position || artPosition(image),
          ...artStyle,
        }}
      />
      <div className="art-wash" aria-hidden="true" style={artStyle} />
      <div
        className="art-scrim"
        aria-hidden="true"
        style={{ background: SCRIMS[scrim] || SCRIMS.poster, ...scrimStyle }}
      />
    </div>
  );
}
