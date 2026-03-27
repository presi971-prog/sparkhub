export default function CreditsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Balance card */}
      <div className="h-32 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50" />

      {/* Credit packs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-48 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50"
          />
        ))}
      </div>

      {/* Transaction history */}
      <div className="h-64 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50" />
    </div>
  )
}
