/** Mark: a location pin with a check, meaning "verified, in your area". */
export function Logo({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M16 2c-6.1 0-11 4.8-11 10.8C5 21 16 30 16 30s11-9 11-17.2C27 6.8 22.1 2 16 2Z" fill="var(--primary)" />
      <path d="m11 13.2 3.4 3.4L21.2 9.8" fill="none" stroke="var(--background)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
