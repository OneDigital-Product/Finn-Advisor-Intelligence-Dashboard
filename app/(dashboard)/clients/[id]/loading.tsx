export default function ClientDetailLoading() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      {/* Hero bar skeleton */}
      <div className="h-[260px] rounded-xl bg-muted/40" />
      {/* Tab bar skeleton */}
      <div className="flex gap-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-md bg-muted/30" />
        ))}
      </div>
      {/* Content area skeleton */}
      <div className="grid grid-cols-2 gap-6">
        <div className="h-[200px] rounded-lg bg-muted/30" />
        <div className="h-[200px] rounded-lg bg-muted/30" />
      </div>
      <div className="h-[300px] rounded-lg bg-muted/30" />
    </div>
  );
}
