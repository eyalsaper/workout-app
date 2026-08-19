import React from "react";

/**
 * Animated form demos.
 *
 * These are not video. Each is a jointed stick figure whose limbs are rotated
 * by CSS keyframes, looping through the movement. That means they load
 * instantly, work with no connection, and carry no licensing question — the
 * tradeoff is that they show the movement pattern rather than one specific
 * exercise, so all pressing variations share the press animation.
 *
 * Transform origins are in SVG user units, which is why every joint has an
 * explicit origin: rotating a limb around the wrong point looks broken
 * immediately.
 */

const STYLES = `
.fd { --lift: 1.6s; }
.fd * { transform-box: view-box; }
.fd-limb { stroke-linecap: round; fill: none; }

/* squat: hips drop, knees and hips fold, torso leans forward slightly */
@keyframes fd-squat-body { 50% { transform: translateY(26px) rotate(14deg); } }
@keyframes fd-squat-thigh { 50% { transform: rotate(-72deg); } }
@keyframes fd-squat-shin  { 50% { transform: rotate(64deg); } }
.fd-squat .j-body  { animation: fd-squat-body var(--lift) ease-in-out infinite; }
.fd-squat .j-thigh { animation: fd-squat-thigh var(--lift) ease-in-out infinite; }
.fd-squat .j-shin  { animation: fd-squat-shin var(--lift) ease-in-out infinite; }

/* hinge: torso rotates over near-fixed knees, bar tracks down the legs */
@keyframes fd-hinge-body { 50% { transform: rotate(64deg) translateY(4px); } }
@keyframes fd-hinge-thigh { 50% { transform: rotate(-16deg); } }
.fd-hinge .j-body  { animation: fd-hinge-body var(--lift) ease-in-out infinite; }
.fd-hinge .j-thigh { animation: fd-hinge-thigh var(--lift) ease-in-out infinite; }

/* horizontal press: elbows flex, bar travels to the chest */
@keyframes fd-hpress-upper { 50% { transform: rotate(52deg); } }
@keyframes fd-hpress-fore  { 50% { transform: rotate(-88deg); } }
.fd-hpress .j-upper { animation: fd-hpress-upper var(--lift) ease-in-out infinite; }
.fd-hpress .j-fore  { animation: fd-hpress-fore var(--lift) ease-in-out infinite; }

/* vertical press: bar from shoulders to overhead */
@keyframes fd-vpress-upper { 50% { transform: rotate(-74deg); } }
@keyframes fd-vpress-fore  { 50% { transform: rotate(-16deg); } }
.fd-vpress .j-upper { animation: fd-vpress-upper var(--lift) ease-in-out infinite; }
.fd-vpress .j-fore  { animation: fd-vpress-fore var(--lift) ease-in-out infinite; }

/* row: bar pulled to the ribcage, torso braced */
@keyframes fd-row-upper { 50% { transform: rotate(-34deg); } }
@keyframes fd-row-fore  { 50% { transform: rotate(-64deg); } }
.fd-row .j-upper { animation: fd-row-upper var(--lift) ease-in-out infinite; }
.fd-row .j-fore  { animation: fd-row-fore var(--lift) ease-in-out infinite; }

/* vertical pull: body rises toward the bar */
@keyframes fd-vpull-body  { 50% { transform: translateY(-24px); } }
@keyframes fd-vpull-upper { 50% { transform: rotate(46deg); } }
.fd-vpull .j-body  { animation: fd-vpull-body var(--lift) ease-in-out infinite; }
.fd-vpull .j-upper { animation: fd-vpull-upper var(--lift) ease-in-out infinite; }

/* lunge: rear leg drops, front shin stays vertical */
@keyframes fd-lunge-body  { 50% { transform: translateY(22px); } }
@keyframes fd-lunge-rear  { 50% { transform: rotate(38deg); } }
@keyframes fd-lunge-rears { 50% { transform: rotate(-84deg); } }
.fd-lunge .j-body  { animation: fd-lunge-body var(--lift) ease-in-out infinite; }
.fd-lunge .j-rear  { animation: fd-lunge-rear var(--lift) ease-in-out infinite; }
.fd-lunge .j-rears { animation: fd-lunge-rears var(--lift) ease-in-out infinite; }

/* curl: forearm only, upper arm pinned */
@keyframes fd-curl-fore { 50% { transform: rotate(-116deg); } }
.fd-curl .j-fore { animation: fd-curl-fore var(--lift) ease-in-out infinite; }

/* triceps: mirror of the curl, elbow overhead and locked */
@keyframes fd-tri-fore { 50% { transform: rotate(104deg); } }
.fd-tri .j-fore { animation: fd-tri-fore var(--lift) ease-in-out infinite; }

/* lateral raise: both arms sweep to shoulder height */
@keyframes fd-lat-upper { 50% { transform: rotate(-84deg); } }
.fd-lat .j-upper { animation: fd-lat-upper var(--lift) ease-in-out infinite; }

/* plank: isometric. Only a subtle breathing drift, no rep motion. */
@keyframes fd-plank { 50% { transform: translateY(1.5px); } }
.fd-plank .j-body { animation: fd-plank 3s ease-in-out infinite; }

/* crunch: spine curls, hips fixed */
@keyframes fd-crunch-body { 50% { transform: rotate(-34deg); } }
.fd-crunch .j-body { animation: fd-crunch-body var(--lift) ease-in-out infinite; }

/* hip thrust: hips drive up from the floor */
@keyframes fd-thrust-body { 50% { transform: translateY(-18px) rotate(-12deg); } }
@keyframes fd-thrust-shin { 50% { transform: rotate(16deg); } }
.fd-thrust .j-body { animation: fd-thrust-body var(--lift) ease-in-out infinite; }
.fd-thrust .j-shin { animation: fd-thrust-shin var(--lift) ease-in-out infinite; }

/* calf raise: heels lift, short range so the loop is quick */
@keyframes fd-calf { 50% { transform: translateY(-11px); } }
.fd-calf .j-body { animation: fd-calf 1.1s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .fd * { animation: none !important; }
}
`;

const IRON = "#3b4756";
const CHALK = "#cdd6de";
const YELLOW = "#f2c300";

/** Barbell: a bar with a plate stack at each end. */
function Bar({ x, y, w = 46 }) {
  return (
    <g>
      <line
        x1={x - w / 2}
        x2={x + w / 2}
        y1={y}
        y2={y}
        stroke={CHALK}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {[-1, 1].map((side) => (
        <rect
          key={side}
          x={x + side * (w / 2) - (side === 1 ? 0 : 4)}
          y={y - 7}
          width="4"
          height="14"
          rx="1"
          fill={YELLOW}
        />
      ))}
    </g>
  );
}

const Head = ({ cx, cy, r = 7 }) => (
  <circle cx={cx} cy={cy} r={r} fill="none" stroke={CHALK} strokeWidth="2.5" />
);

const Limb = (props) => (
  <line className="fd-limb" stroke={CHALK} strokeWidth="3" {...props} />
);

const Floor = () => (
  <line x1="8" x2="192" y1="148" y2="148" stroke={IRON} strokeWidth="2" />
);

/**
 * Each pattern returns a figure. Hips sit at (100,100) for standing shapes so
 * the joint origins stay consistent between patterns.
 */
function Figure({ pattern }) {
  switch (pattern) {
    case "squat":
    case "hinge":
      return (
        <g className={pattern === "squat" ? "fd-squat" : "fd-hinge"}>
          <Floor />
          <g className="j-thigh" style={{ transformOrigin: "100px 100px" }}>
            <Limb x1="100" y1="100" x2="100" y2="124" />
            <g className="j-shin" style={{ transformOrigin: "100px 124px" }}>
              <Limb x1="100" y1="124" x2="100" y2="148" />
              <Limb x1="100" y1="148" x2="112" y2="148" />
            </g>
          </g>
          <g className="j-body" style={{ transformOrigin: "100px 100px" }}>
            <Limb x1="100" y1="100" x2="100" y2="58" />
            <Head cx="100" cy="48" />
            <Limb x1="100" y1="64" x2="100" y2="86" strokeWidth="2.5" />
            <Bar x={100} y={pattern === "squat" ? 62 : 88} />
          </g>
        </g>
      );

    case "horizontal-push":
      return (
        <g className="fd-hpress">
          {/* bench */}
          <rect x="52" y="104" width="96" height="7" rx="2" fill={IRON} />
          <Limb x1="60" y1="111" x2="60" y2="140" stroke={IRON} />
          <Limb x1="140" y1="111" x2="140" y2="140" stroke={IRON} />
          <Floor />
          <Limb x1="66" y1="100" x2="128" y2="100" />
          <Head cx="60" cy="96" />
          <Limb x1="128" y1="100" x2="146" y2="128" />
          <g className="j-upper" style={{ transformOrigin: "96px 100px" }}>
            <Limb x1="96" y1="100" x2="96" y2="76" />
            <g className="j-fore" style={{ transformOrigin: "96px 76px" }}>
              <Limb x1="96" y1="76" x2="96" y2="54" />
              <Bar x={96} y={52} />
            </g>
          </g>
        </g>
      );

    case "vertical-push":
      return (
        <g className="fd-vpress">
          <Floor />
          <Limb x1="100" y1="100" x2="100" y2="58" />
          <Head cx="100" cy="48" />
          <Limb x1="100" y1="100" x2="94" y2="148" />
          <Limb x1="100" y1="100" x2="108" y2="148" />
          <g className="j-upper" style={{ transformOrigin: "100px 66px" }}>
            <Limb x1="100" y1="66" x2="118" y2="80" />
            <g className="j-fore" style={{ transformOrigin: "118px 80px" }}>
              <Limb x1="118" y1="80" x2="112" y2="58" />
              <Bar x={110} y={56} />
            </g>
          </g>
        </g>
      );

    case "horizontal-pull":
      return (
        <g className="fd-row">
          <Floor />
          {/* hinged torso, braced */}
          <Limb x1="100" y1="104" x2="138" y2="76" />
          <Head cx="146" cy="70" />
          <Limb x1="100" y1="104" x2="96" y2="148" />
          <Limb x1="100" y1="104" x2="108" y2="148" />
          <g className="j-upper" style={{ transformOrigin: "124px 86px" }}>
            <Limb x1="124" y1="86" x2="124" y2="112" />
            <g className="j-fore" style={{ transformOrigin: "124px 112px" }}>
              <Limb x1="124" y1="112" x2="124" y2="132" />
              <Bar x={124} y={134} w={40} />
            </g>
          </g>
        </g>
      );

    case "vertical-pull":
      return (
        <g className="fd-vpull">
          <Bar x={100} y={30} w={70} />
          <g className="j-body" style={{ transformOrigin: "100px 30px" }}>
            <g className="j-upper" style={{ transformOrigin: "100px 30px" }}>
              <Limb x1="88" y1="32" x2="94" y2="62" />
              <Limb x1="112" y1="32" x2="106" y2="62" />
            </g>
            <Head cx="100" cy="72" />
            <Limb x1="100" y1="80" x2="100" y2="112" />
            <Limb x1="100" y1="112" x2="94" y2="140" />
            <Limb x1="100" y1="112" x2="108" y2="140" />
          </g>
        </g>
      );

    case "lunge":
      return (
        <g className="fd-lunge">
          <Floor />
          <g className="j-body" style={{ transformOrigin: "100px 100px" }}>
            <Limb x1="100" y1="100" x2="100" y2="58" />
            <Head cx="100" cy="48" />
            {/* front leg: shin stays vertical */}
            <Limb x1="100" y1="100" x2="122" y2="124" />
            <Limb x1="122" y1="124" x2="122" y2="148" />
            <g className="j-rear" style={{ transformOrigin: "100px 100px" }}>
              <Limb x1="100" y1="100" x2="82" y2="124" />
              <g className="j-rears" style={{ transformOrigin: "82px 124px" }}>
                <Limb x1="82" y1="124" x2="72" y2="148" />
              </g>
            </g>
          </g>
        </g>
      );

    case "curl":
    case "tricep-extension": {
      const isCurl = pattern === "curl";
      return (
        <g className={isCurl ? "fd-curl" : "fd-tri"}>
          <Floor />
          <Limb x1="100" y1="100" x2="100" y2="58" />
          <Head cx="100" cy="48" />
          <Limb x1="100" y1="100" x2="94" y2="148" />
          <Limb x1="100" y1="100" x2="108" y2="148" />
          {isCurl ? (
            <>
              <Limb x1="100" y1="68" x2="100" y2="98" />
              <g className="j-fore" style={{ transformOrigin: "100px 98px" }}>
                <Limb x1="100" y1="98" x2="122" y2="98" />
                <Bar x={126} y={98} w={34} />
              </g>
            </>
          ) : (
            <>
              <Limb x1="100" y1="68" x2="104" y2="42" />
              <g className="j-fore" style={{ transformOrigin: "104px 42px" }}>
                <Limb x1="104" y1="42" x2="104" y2="66" />
                <Bar x={104} y={68} w={34} />
              </g>
            </>
          )}
        </g>
      );
    }

    case "lateral-raise":
      return (
        <g className="fd-lat">
          <Floor />
          <Limb x1="100" y1="100" x2="100" y2="58" />
          <Head cx="100" cy="48" />
          <Limb x1="100" y1="100" x2="94" y2="148" />
          <Limb x1="100" y1="100" x2="108" y2="148" />
          <g className="j-upper" style={{ transformOrigin: "100px 68px" }}>
            <Limb x1="100" y1="68" x2="76" y2="94" />
            <rect x="66" y="90" width="14" height="8" rx="2" fill={YELLOW} />
          </g>
          <g className="j-upper" style={{ transformOrigin: "100px 68px" }}>
            <Limb x1="100" y1="68" x2="124" y2="94" />
            <rect x="120" y="90" width="14" height="8" rx="2" fill={YELLOW} />
          </g>
        </g>
      );

    case "plank":
      return (
        <g className="fd-plank">
          <Floor />
          <g className="j-body">
            <Limb x1="66" y1="112" x2="146" y2="126" />
            <Head cx="58" cy="110" />
            <Limb x1="76" y1="114" x2="76" y2="148" />
            <Limb x1="146" y1="126" x2="156" y2="148" />
          </g>
        </g>
      );

    case "crunch":
      return (
        <g className="fd-crunch">
          <Floor />
          <Limb x1="100" y1="130" x2="126" y2="130" />
          <Limb x1="126" y1="130" x2="132" y2="148" />
          <g className="j-body" style={{ transformOrigin: "100px 130px" }}>
            <Limb x1="100" y1="130" x2="70" y2="130" />
            <Head cx="62" cy="128" />
          </g>
        </g>
      );

    case "hip-thrust":
      return (
        <g className="fd-thrust">
          <rect x="40" y="96" width="34" height="7" rx="2" fill={IRON} />
          <Floor />
          <g className="j-body" style={{ transformOrigin: "112px 128px" }}>
            <Limb x1="72" y1="104" x2="112" y2="128" />
            <Head cx="64" cy="100" />
            <Bar x={104} y={118} w={40} />
            <g className="j-shin" style={{ transformOrigin: "112px 128px" }}>
              <Limb x1="112" y1="128" x2="138" y2="148" />
            </g>
          </g>
        </g>
      );

    case "calf-raise":
      return (
        <g className="fd-calf">
          <Floor />
          <g className="j-body">
            <Limb x1="100" y1="100" x2="100" y2="58" />
            <Head cx="100" cy="48" />
            <Limb x1="100" y1="100" x2="100" y2="140" />
            <Limb x1="100" y1="140" x2="114" y2="146" />
            <Limb x1="100" y1="68" x2="86" y2="96" />
          </g>
        </g>
      );

    default:
      return (
        <g>
          <Floor />
          <Limb x1="100" y1="100" x2="100" y2="58" />
          <Head cx="100" cy="48" />
          <Limb x1="100" y1="100" x2="90" y2="148" />
          <Limb x1="100" y1="100" x2="110" y2="148" />
          <Limb x1="100" y1="70" x2="82" y2="92" />
          <Limb x1="100" y1="70" x2="118" y2="92" />
        </g>
      );
  }
}

export default function ExerciseAnimation({ pattern, label }) {
  return (
    <div className="bg-iron-900 border border-iron-700 rounded-sm overflow-hidden">
      <style>{STYLES}</style>
      <svg
        viewBox="0 0 200 160"
        className="w-full max-w-[280px] mx-auto fd"
        role="img"
        aria-label={label ? `Form demonstration: ${label}` : "Form demonstration"}
      >
        <Figure pattern={pattern} />
      </svg>
      <p className="stencil text-center pb-2.5">
        {label || "Movement pattern"} · looped
      </p>
    </div>
  );
}
