/**
 * The SRT web crest.
 *
 * A spider chest-emblem whose body is the wordmark: SRT set in the house
 * condensed display face, wearing the suit's diamond webbing, with eight
 * tapered legs sweeping out from behind the letters across a hand-built web.
 *
 * Everything is deterministic math on a 600×600 grid — no randomness, so the
 * server and client agree.
 */

type Pt = [number, number];

const TAU = Math.PI * 2;
const CX = 300;
const CY = 300;

const SPOKES = 16;
const RING_RADII = [70, 112, 158, 208, 255];
const SAG = 0.855; // how far each strand dips between spokes

const polar = (r: number, a: number): Pt => [CX + r * Math.cos(a), CY + r * Math.sin(a)];
const n = (v: number) => v.toFixed(1);
const angle = (i: number) => (i / SPOKES) * TAU - Math.PI / 2;

/** Radial anchor strands, from behind the body out past the last ring. */
const SPOKES_D = Array.from({ length: SPOKES }, (_, i) => {
  const [x1, y1] = polar(44, angle(i));
  const [x2, y2] = polar(RING_RADII[RING_RADII.length - 1] + 22, angle(i));
  return `M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`;
});

/** Concentric catch-spirals. The sag between spokes is what reads as "web". */
const RINGS_D = RING_RADII.map((r) => {
  let d = "";
  for (let i = 0; i < SPOKES; i++) {
    const [x1, y1] = polar(r, angle(i));
    const [x2, y2] = polar(r, angle(i + 1));
    const [cx, cy] = polar(r * SAG, (angle(i) + angle(i + 1)) / 2);
    d += `M${n(x1)} ${n(y1)}Q${n(cx)} ${n(cy)} ${n(x2)} ${n(y2)}`;
  }
  return d;
});

/* ── Legs ───────────────────────────────────────────────────────────
   A stroke can't taper, and an untapered leg reads as a chevron. So each
   leg is a filled outline: sample the centre line (body → knee → tip),
   then offset it either side by a width that runs out to nothing at the
   tip. Bases sit under the letters, so their blunt end never shows.      */

interface Leg {
  base: Pt;
  c1: Pt;
  c2: Pt;
  knee: Pt;
  c3: Pt;
  c4: Pt;
  tip: Pt;
  w: number;
  /** Folded-in angle the leg unfurls from on load. */
  fold: number;
}

const RIGHT_LEGS: Leg[] = [
  // upper inner — short and steep, tucked against the body
  { base: [316, 286], c1: [322, 232], c2: [322, 142], knee: [366, 108], c3: [410, 120], c4: [452, 168], tip: [474, 244], w: 12, fold: -32 },
  // upper outer — the long one, tip lands right on the web's outer strand
  { base: [332, 294], c1: [392, 272], c2: [444, 222], knee: [492, 148], c3: [528, 168], c4: [556, 214], tip: [574, 284], w: 14, fold: -26 },
  // lower outer
  { base: [332, 306], c1: [392, 328], c2: [444, 378], knee: [492, 452], c3: [528, 432], c4: [556, 386], tip: [574, 316], w: 14, fold: 26 },
  // lower inner
  { base: [316, 314], c1: [322, 368], c2: [322, 458], knee: [366, 492], c3: [410, 480], c4: [452, 432], tip: [474, 356], w: 12, fold: 32 },
];

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

function legPath(leg: Leg): string {
  const STEPS = 40;
  const spine: Pt[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    spine.push(
      t < 0.5
        ? cubic(leg.base, leg.c1, leg.c2, leg.knee, t * 2)
        : cubic(leg.knee, leg.c3, leg.c4, leg.tip, (t - 0.5) * 2)
    );
  }

  const near: Pt[] = [];
  const far: Pt[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const a = spine[Math.max(0, i - 1)];
    const b = spine[Math.min(STEPS, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    const w = leg.w * Math.pow(1 - i / STEPS, 0.62);
    near.push([spine[i][0] + nx * w, spine[i][1] + ny * w]);
    far.push([spine[i][0] - nx * w, spine[i][1] - ny * w]);
  }

  const trace = (pts: Pt[]) => pts.map((p) => `${n(p[0])} ${n(p[1])}`).join("L");
  return `M${trace(near)}L${trace(far.reverse())}Z`;
}

const LEGS = RIGHT_LEGS.map((leg) => ({ d: legPath(leg), origin: leg.base, fold: leg.fold }));

/** Diamond suit webbing, clipped to the letterforms. */
const HATCH_D = (() => {
  const lines: string[] = [];
  for (let x = 80; x <= 430; x += 12) {
    lines.push(`M${x} 236L${x + 90} 364`);
    lines.push(`M${x} 364L${x + 90} 236`);
  }
  return lines;
})();

export default function Emblem({ uid, plain = false }: { uid: string; plain?: boolean }) {
  return (
    <svg className="crest-svg" viewBox="0 0 600 600" role="img" aria-label="SRT Cuts">
      {!plain && (
        <defs>
          <clipPath id={`${uid}-letters`}>
            <text className="crest-letters" x={CX} y={CY} textAnchor="middle" dominantBaseline="central">
              SRT
            </text>
          </clipPath>
        </defs>
      )}

      <g className="crest-web">
        {SPOKES_D.map((d, i) => (
          <path key={`s${i}`} d={d} pathLength={1} style={{ "--i": i } as React.CSSProperties} />
        ))}
        {RINGS_D.map((d, i) => (
          <path
            key={`r${i}`}
            className="crest-ring"
            d={d}
            pathLength={1}
            style={{ "--i": SPOKES + i * 2 } as React.CSSProperties}
          />
        ))}
      </g>

      <g className="crest-legs">
        {[0, 1].map((side) => (
          <g key={side} transform={side ? "translate(600 0) scale(-1 1)" : undefined}>
            {LEGS.map((leg, i) => (
              <path
                key={i}
                d={leg.d}
                style={
                  {
                    "--i": i * 2 + side,
                    "--fold": `${leg.fold}deg`,
                    transformOrigin: `${leg.origin[0]}px ${leg.origin[1]}px`,
                  } as React.CSSProperties
                }
              />
            ))}
          </g>
        ))}
      </g>

      <g className="crest-mark">
        <text
          className="crest-letters crest-letters--solid"
          x={CX}
          y={CY}
          textAnchor="middle"
          dominantBaseline="central"
        >
          SRT
        </text>
        {!plain && (
          <g className="crest-webbing" clipPath={`url(#${uid}-letters)`}>
            {HATCH_D.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
        )}
      </g>

      {!plain && <circle className="crest-shock" cx={CX} cy={CY} r={150} />}
    </svg>
  );
}
