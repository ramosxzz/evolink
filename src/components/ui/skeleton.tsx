/** Shimmering placeholder. Shape it with className (height, width, radius). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton rounded-2xl ${className}`} />;
}

/** Generic page placeholder: title, a row of tiles and two content blocks. */
export function PageSkeleton({ tiles = 3 }: { tiles?: number }) {
  return (
    <div role="status" aria-label="Carregando" className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-9 w-72 max-w-full rounded-xl" />
        <Skeleton className="h-4 w-96 max-w-full rounded-full" />
      </div>
      <div className={`grid gap-4 ${tiles >= 4 ? "grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
        {Array.from({ length: tiles }, (_, index) => <Skeleton key={index} className="h-28" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-72 rounded-3xl" />
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    </div>
  );
}

/** List placeholder: avatar + two lines per row. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Carregando" className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(16,46,37,.06)]">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3 rounded-full" />
            <Skeleton className="h-3 w-2/3 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
