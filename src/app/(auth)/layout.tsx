import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Simple header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
              C
            </div>
            <span className="font-heading text-xl font-bold">
              Cobeone<span className="text-primary">Pro</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center py-8 sm:py-10 md:py-12 px-4 sm:px-6">
        <div className="w-full max-w-2xl">
          {children}
        </div>
      </main>

      {/* Simple footer */}
      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Cobeone Pro. Tous droits réservés.
        </div>
      </footer>
    </div>
  )
}
