import { createRootRoute, Outlet } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../lib/query-client'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground font-sans">
        <header className="border-b border-border px-6 py-4">
          <h1 className="font-heading text-xl font-bold">Payment Gateway</h1>
        </header>
        <main className="px-6 py-8">
          <Outlet />
        </main>
      </div>
    </QueryClientProvider>
  )
}
