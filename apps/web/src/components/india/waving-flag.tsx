import { flagDataUrl } from "./flag";

/**
 * A waving Tiranga on a flagpole, with pure CSS and no JavaScript or video.
 *
 * Technique: the flag is cut into N vertical slices. Every slice shows the same
 * background image shifted so together they form the whole flag. Each slice bobs
 * up and down with a slightly delayed animation, so a wave travels across the
 * cloth. Slices further from the pole move more (`--amp`), like real fabric.
 * A shadow layer (animated `--shade`, see globals.css) darkens each slice as it
 * dips, faking light and shadow in the folds.
 *
 * `prefers-reduced-motion` (globals.css) stops the animation: a calm, static flag.
 */
const SLICES = 48;

export function WavingFlag({ className = "" }: { className?: string }) {
  return (
    // pb reserves room for the pole below the cloth, so it never overlaps the content underneath
    <div className={`relative pb-[32%] pl-[4%] pt-[4%] ${className}`} role="img" aria-label="The flag of India waving on a flagpole">
      {/* Pole: stretches from the top to the bottom of the padded box */}
      <div aria-hidden className="absolute bottom-0 left-0 top-0 z-10 flex w-[3.2%] min-w-1.5 flex-col items-center">
        <span className="-mb-0.5 aspect-square w-[190%] shrink-0 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-700 shadow" />
        <span className="w-full flex-1 rounded-b-sm bg-gradient-to-r from-zinc-400 via-zinc-100 to-zinc-500 shadow-sm dark:from-zinc-600 dark:via-zinc-300 dark:to-zinc-600" />
      </div>
      {/* Cloth */}
      <div aria-hidden className="flex aspect-[3/2] drop-shadow-xl">
        {Array.from({ length: SLICES }, (_, i) => (
          <span
            key={i}
            className="tiranga-slice"
            style={{
              // Two layers: a translucent shadow (strength = animated --shade) over the flag
              backgroundImage: `linear-gradient(rgb(0 0 0 / var(--shade)), rgb(0 0 0 / var(--shade))), ${flagDataUrl}`,
              backgroundSize: `${SLICES * 100}% 100%`,
              backgroundPosition: `${(i / (SLICES - 1)) * 100}% 0`,
              // Phase lag grows away from the pole, so the wave travels outward
              animationDelay: `${-(SLICES - i) * 0.055}s`,
              ["--amp" as string]: `${(i / SLICES) * 7}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
