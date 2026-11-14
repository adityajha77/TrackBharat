/**
 * India's national flag (Tiranga) and the Ashoka Chakra, drawn as SVG.
 *
 * Proportions follow the Flag Code of India: ratio 3:2, three equal horizontal
 * bands (India saffron, white, India green), and a navy-blue 24-spoke Ashoka
 * Chakra centred on the white band. Drawn as code, not images: crisp at any size,
 * tiny to download, and colours are exact.
 *
 * Usage note: the Flag Code allows respectful use by citizens; the Emblems and
 * Names Act forbids commercial use. TrackBharat is a non-commercial civic project
 * and does NOT use the State Emblem (Lion Capital), which is reserved for government.
 */

export const FLAG = {
  saffron: "#FF9933",
  white: "#FFFFFF",
  green: "#138808",
  navy: "#000080",
} as const;

const SPOKES = 24;

/** SVG markup for the chakra, centred at (cx, cy) with radius r. Shared by the component and the flag string. */
function chakraMarkup(cx: number, cy: number, r: number, color: string = FLAG.navy) {
  const spokes: string[] = [];
  const dots: string[] = [];
  for (let i = 0; i < SPOKES; i++) {
    const a = (i * 2 * Math.PI) / SPOKES;
    // Tapered spoke: wide in the middle, pointed at hub and rim (as on the Sarnath wheel)
    const mid = a + Math.PI / SPOKES / 2;
    const p = (ang: number, rad: number) => `${(cx + rad * Math.cos(ang)).toFixed(2)},${(cy + rad * Math.sin(ang)).toFixed(2)}`;
    spokes.push(`<polygon points="${p(a, r * 0.18)} ${p(a - 0.06, r * 0.55)} ${p(a, r * 0.95)} ${p(a + 0.06, r * 0.55)}" />`);
    // Small semicircle "dots" on the rim between spokes
    dots.push(`<circle cx="${(cx + r * 0.92 * Math.cos(mid)).toFixed(2)}" cy="${(cy + r * 0.92 * Math.sin(mid)).toFixed(2)}" r="${(r * 0.035).toFixed(2)}" />`);
  }
  return (
    `<g fill="${color}">` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${(r * 0.07).toFixed(2)}" />` +
    `<circle cx="${cx}" cy="${cy}" r="${(r * 0.17).toFixed(2)}" />` +
    spokes.join("") +
    dots.join("") +
    `</g>`
  );
}

/** Full flag as an SVG string: used as a CSS background by the waving flag. */
export const flagSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600">` +
  `<rect width="900" height="200" fill="${FLAG.saffron}"/>` +
  `<rect y="200" width="900" height="200" fill="${FLAG.white}"/>` +
  `<rect y="400" width="900" height="200" fill="${FLAG.green}"/>` +
  chakraMarkup(450, 300, 92) +
  `</svg>`;

export const flagDataUrl = `url("data:image/svg+xml,${encodeURIComponent(flagSvg)}")`;

/** Static flag, e.g. small badges. */
export function IndiaFlag({ className = "h-4 w-6", title = "Flag of India" }: { className?: string; title?: string }) {
  return (
    <span
      role="img"
      aria-label={title}
      className={`inline-block shrink-0 rounded-[2px] bg-cover shadow-[0_0_0_1px_rgba(0,0,0,0.08)] ${className}`}
      style={{ backgroundImage: flagDataUrl }}
    />
  );
}

/** Standalone Ashoka Chakra (decorative). */
export function AshokaChakra({ className, color = FLAG.navy }: { className?: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      aria-hidden
      // Generated markup from our own constants, with no user input involved.
      dangerouslySetInnerHTML={{ __html: chakraMarkup(100, 100, 96, color) }}
    />
  );
}
