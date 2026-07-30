# TanStack DevTools Integration Design Spec

## Overview

Integrate `@tanstack/router-devtools` and `@tanstack/react-query-devtools` into the client application under development mode conditionally using React lazy dynamic imports.

---

## 1. DevTools Packages

Add packages to `devDependencies` to ensure they are excluded from production builds and do not increase the production bundle footprint:
- `@tanstack/router-devtools`
- `@tanstack/react-query-devtools`

---

## 2. Dynamic Integration (`__root.tsx`)

Implement lazy-loading directly inside `src/client/routes/__root.tsx`.

- Wrap DevTools component resolution with check against `import.meta.env.DEV`.
- Resolve dynamic imports using React `Suspense`.

```tsx
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
          {session && (
            <nav className="flex space-x-4 text-xs font-semibold uppercase tracking-wider">
              <Link to="/dashboard" className="hover:text-primary [&.active]:text-primary">
                Dashboard
              </Link>
              {session.user.role === 'admin' && (
                <Link to="/admin" className="hover:text-primary [&.active]:text-primary">
                  Admin
                </Link>
              )}
            </nav>
          )}
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
```
