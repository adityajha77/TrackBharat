/**
 * Placeholder while a live page renders. Used by the `loading.tsx` files: a
 * loading file wraps its page in <Suspense>, which Cache Components needs for
 * pages that read live API data with `connection()`.
 */
export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12" aria-busy="true">
      <div className="h-10 w-2/3 animate-pulse rounded-md bg-surface-muted" />
      <div className="mt-4 h-5 w-1/2 animate-pulse rounded-md bg-surface-muted" />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-md bg-surface-muted" />
        ))}
      </div>
    </div>
  );
}
