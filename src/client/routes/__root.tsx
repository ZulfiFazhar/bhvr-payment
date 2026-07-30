import React, { Suspense } from 'react'
import { createRootRoute, Outlet, Link } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../lib/query-client'
import { authClient } from '../lib/auth-client'

const TanStackRouterDevtools =
  import.meta.env.DEV
    ? React.lazy(() =>
        import('@tanstack/router-devtools').then((res) => ({
          default: res.TanStackRouterDevtools,
        }))
      )
    : () => null

const ReactQueryDevtools =
  import.meta.env.DEV
    ? React.lazy(() =>
        import('@tanstack/react-query-devtools').then((res) => ({
          default: res.ReactQueryDevtools,
        }))
      )
    : () => null

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const { data: session } = authClient.useSession()

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground font-sans">
        <header className="border-b border-border px-6 py-4 flex items-center justify-between">
          <h1 className="font-heading text-xl font-bold">Payment Gateway</h1>
          <nav className="flex items-center gap-4 text-sm font-medium">
            {session && (
              <>
                <Link to="/dashboard" className="hover:underline [&.active]:font-bold">
                  Dashboard
                </Link>
                {(session.user as any).role === 'admin' && (
                  <Link to="/admin" className="hover:underline [&.active]:font-bold">
                    Admin Panel
                  </Link>
                )}
              </>
            )}
          </nav>
        </header>
        <main className="px-6 py-8">
          <Outlet />
        </main>
      </div>
      <Suspense fallback={null}>
        <TanStackRouterDevtools position="bottom-right" />
        <ReactQueryDevtools initialIsOpen={false} />
      </Suspense>
    </QueryClientProvider>
  )
}
