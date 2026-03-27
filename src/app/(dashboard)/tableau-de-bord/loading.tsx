export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50"
          />
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50" />
        <div className="h-80 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50" />
      </div>

      {/* Bottom section */}
      <div className="h-48 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50" />
    </div>
  )
}
