export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-200" />
        ))}
      </div>
    </div>
  );
}
