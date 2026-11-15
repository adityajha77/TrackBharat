/**
 * The constituency's shape, drawn from an SVG path that PostGIS generated
 * (ST_AsSVG). No map tiles or map library: just the outline, which also avoids
 * showing any international borders.
 */
export function ConstituencyOutline({ outline, name, className }: { outline: { path: string; viewBox: string }; name: string; className?: string }) {
  return (
    <svg viewBox={outline.viewBox} className={className} role="img" aria-label={`Outline map of ${name} constituency`} preserveAspectRatio="xMidYMid meet">
      <path
        d={outline.path}
        fill="color-mix(in oklab, var(--flag-saffron) 18%, transparent)"
        stroke="var(--saffron)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}
