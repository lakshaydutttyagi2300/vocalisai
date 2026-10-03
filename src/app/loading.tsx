// Shaped like a page with a hero, so the real page doesn't jump when it arrives.
export default function Loading() {
  return (
    <div className="pb-20" aria-busy="true" aria-label="Loading">
      <div className="px-2 pt-2 sm:px-3 sm:pt-3">
        <div className="h-[16rem] animate-pulse rounded-[1.25rem] border border-line bg-surface-muted sm:h-[20rem]" />
      </div>
      <div className="page-container mt-10">
        <div className="h-6 w-48 animate-pulse rounded bg-surface-muted" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-line bg-surface" />
          ))}
        </div>
      </div>
    </div>
  );
}
