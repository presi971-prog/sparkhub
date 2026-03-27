export default function OutilsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-card/50" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-56 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50"
          />
        ))}
      </div>
    </div>
  )
}
