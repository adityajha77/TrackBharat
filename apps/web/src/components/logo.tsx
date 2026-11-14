/**
 * Mark: a location pin in the colours of the Tiranga, with a navy ring for the
 * Ashoka Chakra, meaning "your place in India". Uses the exact flag colours.
 */
export function Logo({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <clipPath id="tb-pin">
          <path d="M16 2c-6.1 0-11 4.8-11 10.8C5 21 16 30 16 30s11-9 11-17.2C27 6.8 22.1 2 16 2Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#tb-pin)">
        <rect width="32" height="9.5" fill="var(--flag-saffron)" />
        <rect y="9.5" width="32" height="7" fill="var(--flag-white)" />
        <rect y="16.5" width="32" height="16" fill="var(--flag-green)" />
      </g>
      <path
        d="M16 2c-6.1 0-11 4.8-11 10.8C5 21 16 30 16 30s11-9 11-17.2C27 6.8 22.1 2 16 2Z"
        fill="none"
        stroke="var(--foreground)"
        strokeOpacity=".15"
      />
      <circle cx="16" cy="13" r="3" fill="none" stroke="var(--flag-navy)" strokeWidth="1.3" />
      <circle cx="16" cy="13" r=".9" fill="var(--flag-navy)" />
    </svg>
  );
}
