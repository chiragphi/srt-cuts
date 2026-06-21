/**
 * TreelineDivider — a ragged ridge-line of pines used between sections,
 * in place of a flat hairline border. Pure SVG, no client JS.
 */
export default function TreelineDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`treeline ${className}`} aria-hidden>
      <svg viewBox="0 0 1440 70" preserveAspectRatio="none">
        <path
          d="M0,70 L0,46 L60,22 L96,40 L150,12 L200,38 L250,18 L312,42 L360,16 L420,40 L470,20 L540,44 L590,14 L660,38 L720,18 L788,42 L840,16 L910,40 L965,20 L1030,44 L1085,14 L1150,38 L1210,18 L1278,42 L1330,18 L1390,40 L1440,24 L1440,70 Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}
