export default function ClientsLoading() {
  return (
    <div className="space-y-4 p-6 animate-pulse">
      {/* Search bar skeleton */}
      <div className="flex items-center gap-4">
        <div className="h-10 flex-1 rounded-lg bg-muted/30" />
        <div className="h-10 w-24 rounded-lg bg-muted/30" />
      </div>
      {/* Table header skeleton */}
      <div className="h-10 rounded-lg bg-muted/20" />
      {/* Table rows skeleton */}
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-14 rounded-lg bg-muted/20" style={{ opacity: 1 - i * 0.1 }} />
      ))}
    </div>
  );
}
