import { AshokaChakra } from "./flag";

/**
 * Hero art: the spinning Ashoka Chakra with three tricolour bands drifting behind it,
 * like cloth in the wind. Pure CSS animation (`.ribbon-band`, `.chakra-spin`), no JS,
 * and it stops for people who prefer reduced motion.
 */
export function TricolourRibbon({ className }: { className?: string }) {
  return (
    <div aria-hidden className={`relative aspect-square ${className ?? ""}`}>
      <div className="absolute inset-x-[-10%] top-1/2 flex -translate-y-1/2 flex-col gap-3">
        <span className="ribbon-band brutal-sm block h-10 rounded-sm bg-flag-saffron sm:h-14" />
        <span className="ribbon-band brutal-sm block h-10 rounded-sm bg-flag-white sm:h-14" />
        <span className="ribbon-band brutal-sm block h-10 rounded-sm bg-flag-green sm:h-14" />
      </div>
      <div className="brutal absolute left-1/2 top-1/2 grid size-[62%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-flag-white">
        <AshokaChakra className="chakra-spin-fast size-[86%]" color="var(--flag-navy)" />
      </div>
    </div>
  );
}
