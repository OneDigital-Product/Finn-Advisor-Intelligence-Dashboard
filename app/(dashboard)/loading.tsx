export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      {/* Hero section skeleton */}
      <div className="h-[180px] rounded-xl bg-muted/40" />
      {/* Stats row skeleton */}
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[100px] rounded-lg bg-muted/30" />
        ))}
      </div>
      {/* Content grid skeleton */}
      <div className="grid grid-cols-2 gap-6">
        <div className="h-[300px] rounded-lg bg-muted/30" />
        <div className="h-[300px] rounded-lg bg-muted/30" />
      </div>
    </div>
  );
}
