# Payment Gateway N-Layer Scaffold — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold payment-gateway project with 4-layer backend (Route/Controller/Service/Repository) and React SPA frontend, separated in folder structure, deployed as single Cloudflare Workers app.

**Architecture:** Hono serves API routes at `/api/*` and an SSR HTML shell for everything else. React SPA mounts client-side, handles routing via TanStack Router (file-based). Shared Valibot schemas used by both sides. Dual JSX runtime: Hono JSX for server, React JSX for client.

**Tech Stack:** Hono, React 19, TanStack Router, TanStack Query, Zustand, Valibot, shadcn/ui, Tailwind v4, Cloudflare Workers, Vite 8

## Global Constraints

- Runtime: Cloudflare Workers (no Node.js APIs)
- Package manager: bun
- JSX: `hono/jsx` for server files, `react` for client files
- Validation: Valibot only (no Zod)
- Styling: Tailwind v4 + shadcn/ui (base-sera style, taupe base color)
- No new UI component libraries beyond what's installed
- All paths use `@/*` alias resolving to `./src/*`
- shadcn components use `@base-ui/react` primitives (already installed)

---

## File Map

### Files to CREATE

**Server:**
- `src/server/index.ts` — Hono app, mount API routes + SPA fallback
- `src/server/routes/index.ts` — aggregate all route modules
- `src/server/routes/health.route.ts` — GET /api/health
- `src/server/controllers/health.controller.ts` — handle health request
- `src/server/services/health.service.ts` — health check logic
- `src/server/repositories/base.repository.ts` — abstract repository interface
- `src/server/middleware/error-handler.ts` — global error handler
- `src/server/types/env.ts` — Hono env type with CloudflareBindings

**Client:**
- `src/client/main.tsx` — React entry, createRoot, router setup
- `src/client/routes/__root.tsx` — root layout with providers
- `src/client/routes/index.tsx` — home page
- `src/client/routes/about.tsx` — example page
- `src/client/lib/api.ts` — fetch wrapper
- `src/client/lib/utils.ts` — cn() helper (moved)
- `src/client/lib/query-client.ts` — TanStack Query client
- `src/client/stores/.gitkeep` — placeholder for Zustand stores
- `src/client/hooks/.gitkeep` — placeholder for custom hooks
- `src/client/style.css` — Tailwind entry (moved)

**Shared:**
- `src/shared/types/api.ts` — ApiResponse<T>, ApiError types
- `src/shared/schemas/common.schema.ts` — reusable Valibot schemas

### Files to MODIFY

- `package.json` — add dependencies, update scripts
- `vite.config.ts` — add React plugin, TanStack Router plugin
- `tsconfig.json` — server JSX config (hono/jsx)
- `tsconfig.app.json` — client JSX config (react), include client files
- `src/index.tsx` — re-point to server app
- `src/renderer.tsx` — update SSR shell to serve React SPA
- `components.json` — update shadcn aliases to new client paths
- `.gitignore` — add routeTree.gen.ts pattern (optional, or keep tracked)

### Files to MOVE/DELETE

- `src/components/ui/button.tsx` → `src/client/components/ui/button.tsx`
- `src/lib/utils.ts` → `src/client/lib/utils.ts`
- `src/style.css` → `src/client/style.css`
- Delete `src/components/` (after move)
- Delete `src/lib/` (after move)

---

## Task 1: Install Dependencies & Update Config

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Install new dependencies**

```bash
bun add react react-dom @vitejs/plugin-react @tanstack/react-router @tanstack/router-plugin @tanstack/react-query zustand valibot
```

```bash
bun add -d @types/react @types/react-dom
```

- [ ] **Step 2: Update .gitignore**

Add to `.gitignore`:
```
# tanstack router
src/client/routeTree.gen.ts
```

- [ ] **Step 3: Verify install**

Run: `bun install`
Expected: no errors, lock file updated.

---

## Task 2: Restructure TypeScript Configs (Dual JSX)

**Files:**
- Modify: `tsconfig.json`
- Modify: `tsconfig.app.json`

- [ ] **Step 1: Update tsconfig.json (server — Hono JSX)**

Replace `tsconfig.json` with:
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "lib": ["ESNext"],
    "types": ["vite/client"],
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["src/client/**/*"]
}
```

Key: `exclude` client files — server tsconfig only processes server + shared.

- [ ] **Step 2: Update tsconfig.app.json (client — React JSX)**

Replace `tsconfig.app.json` with:
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/client/**/*", "src/shared/**/*"]
}
```

Key: `jsxImportSource: "react"`, includes `DOM` lib, scoped to client + shared.

- [ ] **Step 3: Verify no TS errors on config**

Run: `bunx tsc --noEmit -p tsconfig.json` and `bunx tsc --noEmit -p tsconfig.app.json`
Expected: may show errors for missing files (OK — files created in later tasks).

---

## Task 3: Move Existing Files to New Structure

**Files:**
- Move: `src/components/ui/button.tsx` → `src/client/components/ui/button.tsx`
- Move: `src/lib/utils.ts` → `src/client/lib/utils.ts`
- Move: `src/style.css` → `src/client/style.css`
- Delete: `src/components/` (empty after move)
- Delete: `src/lib/` (empty after move)

- [ ] **Step 1: Create client directory structure**

```bash
mkdir -p src/client/components/ui src/client/lib src/client/routes src/client/stores src/client/hooks
```

- [ ] **Step 2: Move files**

```bash
mv src/components/ui/button.tsx src/client/components/ui/button.tsx
mv src/lib/utils.ts src/client/lib/utils.ts
mv src/style.css src/client/style.css
```

- [ ] **Step 3: Update import path in button.tsx**

`src/client/components/ui/button.tsx` — the import `@/lib/utils` needs to become `@/client/lib/utils`:

```tsx
import { cn } from "@/client/lib/utils"
```

- [ ] **Step 4: Delete empty directories**

```bash
rmdir src/components/ui src/components src/lib
```

- [ ] **Step 5: Create server & shared directory structure**

```bash
mkdir -p src/server/routes src/server/controllers src/server/services src/server/repositories src/server/middleware src/server/types
mkdir -p src/shared/schemas src/shared/types
```

- [ ] **Step 6: Create placeholder files for empty directories**

```bash
touch src/client/stores/.gitkeep src/client/hooks/.gitkeep
```

- [ ] **Step 7: Update components.json**

Update shadcn `components.json` aliases to point to new paths:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-sera",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/client/style.css",
    "baseColor": "taupe",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "rtl": false,
  "aliases": {
    "components": "@/client/components",
    "utils": "@/client/lib/utils",
    "ui": "@/client/components/ui",
    "lib": "@/client/lib",
    "hooks": "@/client/hooks"
  },
  "menuColor": "default",
  "menuAccent": "subtle",
  "registries": {}
}
```

---

## Task 4: Shared Layer

**Files:**
- Create: `src/shared/types/api.ts`
- Create: `src/shared/schemas/common.schema.ts`

**Interfaces:**
- Produces: `ApiResponse<T>`, `ApiError` types; `IdSchema`, `PaginationSchema` schemas

- [ ] **Step 1: Create API response types**

Create `src/shared/types/api.ts`:
```ts
export type ApiResponse<T> = {
  success: true
  data: T
}

export type ApiError = {
  success: false
  error: string
  details?: unknown
}

export type ApiResult<T> = ApiResponse<T> | ApiError
```

- [ ] **Step 2: Create common Valibot schemas**

Create `src/shared/schemas/common.schema.ts`:
```ts
import * as v from 'valibot'

export const IdSchema = v.pipe(v.string(), v.nonEmpty())

export const PaginationSchema = v.object({
  page: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 1),
  limit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100)), 20),
})

export type Id = v.InferOutput<typeof IdSchema>
export type Pagination = v.InferOutput<typeof PaginationSchema>
```

---

## Task 5: Backend — Server Skeleton (4-Layer)

**Files:**
- Create: `src/server/types/env.ts`
- Create: `src/server/repositories/base.repository.ts`
- Create: `src/server/services/health.service.ts`
- Create: `src/server/controllers/health.controller.ts`
- Create: `src/server/middleware/error-handler.ts`
- Create: `src/server/routes/health.route.ts`
- Create: `src/server/routes/index.ts`
- Create: `src/server/index.ts`

**Interfaces:**
- Consumes: `ApiResponse<T>`, `ApiError` from `src/shared/types/api.ts`
- Produces: Hono app with `/api/health` endpoint, exported from `src/server/index.ts`

- [ ] **Step 1: Create env types**

Create `src/server/types/env.ts`:
```ts
export type Env = {
  Bindings: CloudflareBindings
}
```

Note: `CloudflareBindings` is generated by `wrangler types` (cf-typegen script). If not yet generated, it's an empty interface — that's fine for now.

- [ ] **Step 2: Create base repository interface**

Create `src/server/repositories/base.repository.ts`:
```ts
// ponytail: abstract interface only. Concrete implementations when data store chosen.
export interface BaseRepository<T> {
  findById(id: string): Promise<T | null>
  findAll(): Promise<T[]>
  create(data: Omit<T, 'id'>): Promise<T>
  update(id: string, data: Partial<T>): Promise<T | null>
  delete(id: string): Promise<boolean>
}
```

- [ ] **Step 3: Create health service**

Create `src/server/services/health.service.ts`:
```ts
export class HealthService {
  check() {
    return {
      status: 'ok' as const,
      timestamp: new Date().toISOString(),
    }
  }
}
```

- [ ] **Step 4: Create health controller**

Create `src/server/controllers/health.controller.ts`:
```ts
import type { Context } from 'hono'
import type { Env } from '../types/env'
import { HealthService } from '../services/health.service'
import type { ApiResponse } from '@/shared/types/api'

const healthService = new HealthService()

export class HealthController {
  static check(c: Context<Env>) {
    const result = healthService.check()
    return c.json({
      success: true,
      data: result,
    } satisfies ApiResponse<typeof result>)
  }
}
```

- [ ] **Step 5: Create error handler middleware**

Create `src/server/middleware/error-handler.ts`:
```ts
import type { Context, Next } from 'hono'
import type { ApiError } from '@/shared/types/api'

export async function errorHandler(c: Context, next: Next) {
  try {
    await next()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 500

    console.error(`[Error] ${c.req.method} ${c.req.path}:`, err)

    return c.json(
      {
        success: false,
        error: message,
      } satisfies ApiError,
      status as 500
    )
  }
}
```

- [ ] **Step 6: Create health route**

Create `src/server/routes/health.route.ts`:
```ts
import { Hono } from 'hono'
import type { Env } from '../types/env'
import { HealthController } from '../controllers/health.controller'

const health = new Hono<Env>()

health.get('/', HealthController.check)

export { health }
```

- [ ] **Step 7: Create routes index**

Create `src/server/routes/index.ts`:
```ts
import { Hono } from 'hono'
import type { Env } from '../types/env'
import { health } from './health.route'

const api = new Hono<Env>()

api.route('/health', health)

export { api }
```

- [ ] **Step 8: Create server app**

Create `src/server/index.ts`:
```ts
import { Hono } from 'hono'
import type { Env } from './types/env'
import { errorHandler } from './middleware/error-handler'
import { api } from './routes/index'

const app = new Hono<Env>()

app.use('*', errorHandler)
app.route('/api', api)

export { app }
```

---

## Task 6: Frontend — React SPA Setup

**Files:**
- Create: `src/client/lib/query-client.ts`
- Create: `src/client/lib/api.ts`
- Create: `src/client/routes/__root.tsx`
- Create: `src/client/routes/index.tsx`
- Create: `src/client/routes/about.tsx`
- Create: `src/client/main.tsx`

**Interfaces:**
- Consumes: `ApiResponse<T>` from `src/shared/types/api.ts`
- Produces: React SPA entry at `src/client/main.tsx`, mounts to `#root`

- [ ] **Step 1: Create query client**

Create `src/client/lib/query-client.ts`:
```tsx
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
})
```

- [ ] **Step 2: Create API fetch wrapper**

Create `src/client/lib/api.ts`:
```tsx
import type { ApiResult } from '@/shared/types/api'

const BASE_URL = '/api'

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })

  const json: ApiResult<T> = await res.json()

  if (!json.success) {
    throw new Error(json.error)
  }

  return json.data
}
```

- [ ] **Step 3: Create root layout**

Create `src/client/routes/__root.tsx`:
```tsx
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
```

- [ ] **Step 4: Create index page**

Create `src/client/routes/index.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div>
      <h2 className="font-heading text-2xl font-bold mb-4">Dashboard</h2>
      <p className="text-muted-foreground">Payment Gateway is running.</p>
    </div>
  )
}
```

- [ ] **Step 5: Create about page**

Create `src/client/routes/about.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  return (
    <div>
      <h2 className="font-heading text-2xl font-bold mb-4">About</h2>
      <p className="text-muted-foreground">
        Payment Gateway — N-Layer Architecture Scaffold
      </p>
    </div>
  )
}
```

- [ ] **Step 6: Create React entry**

Create `src/client/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './style.css'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootEl = document.getElementById('root')
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  )
}
```

---

## Task 7: Wire Everything Together (Entry + Renderer + Vite Config)

**Files:**
- Modify: `src/renderer.tsx`
- Modify: `src/index.tsx`
- Modify: `vite.config.ts`

**Interfaces:**
- Consumes: `app` from `src/server/index.ts`, React SPA at `src/client/main.tsx`
- Produces: Working dev server with API at `/api/*` and React SPA for all other routes

- [ ] **Step 1: Update renderer.tsx (SSR shell for React SPA)**

Replace `src/renderer.tsx` with:
```tsx
import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, Script, ViteClient } from 'vite-ssr-components/hono'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Payment Gateway</title>
        <ViteClient />
        <Link href="/src/client/style.css" rel="stylesheet" />
      </head>
      <body>
        <div id="root">{children}</div>
        <Script src="/src/client/main.tsx" />
      </body>
    </html>
  )
})
```

Key changes: added `<div id="root">`, `<Script>` for React entry, updated CSS path.

- [ ] **Step 2: Update src/index.tsx (main entry)**

Replace `src/index.tsx` with:
```tsx
import { Hono } from 'hono'
import { app as api } from './server/index'
import { renderer } from './renderer'

const app = new Hono()

// Mount API routes
app.route('/', api)

// SPA fallback — all non-API routes serve HTML shell
app.use(renderer)
app.get('*', (c) => {
  return c.render(<></>)
})

export default app
```

- [ ] **Step 3: Update vite.config.ts**

Replace `vite.config.ts` with:
```ts
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { cloudflare } from "@cloudflare/vite-plugin"
import { defineConfig } from "vite"
import ssrPlugin from "vite-ssr-components/plugin"
import react from "@vitejs/plugin-react"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"

export default defineConfig({
  plugins: [
    cloudflare(),
    ssrPlugin(),
    TanStackRouterVite({
      routesDirectory: "./src/client/routes",
      generatedRouteTree: "./src/client/routeTree.gen.ts",
    }),
    react({
      include: /src\/client\/.*\.tsx?$/,
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

Key: `react()` plugin scoped to `src/client/` files only via `include`. TanStack Router plugin configured to scan `src/client/routes/`.

- [ ] **Step 4: Run dev server**

Run: `bun run dev`
Expected: Vite starts, TanStack Router generates `routeTree.gen.ts`, no errors. Visit `http://localhost:5173/` shows React SPA. Visit `http://localhost:5173/api/health` returns JSON.

- [ ] **Step 5: Verify API endpoint**

```bash
curl http://localhost:5173/api/health
```

Expected:
```json
{"success":true,"data":{"status":"ok","timestamp":"..."}}
```

- [ ] **Step 6: Verify SPA routing**

Visit `http://localhost:5173/about` in browser.
Expected: About page renders (client-side routing). No 404 from server.

---

## Task 8: Final Verification & Cleanup

**Files:**
- Verify all files in place
- Clean up any leftover empty directories

- [ ] **Step 1: Verify directory structure**

```bash
find src -type f | sort
```

Expected output should match the file map from the spec.

- [ ] **Step 2: Run TypeScript check**

```bash
bunx tsc --noEmit -p tsconfig.json && bunx tsc --noEmit -p tsconfig.app.json
```

Expected: no errors.

- [ ] **Step 3: Run build**

```bash
bun run build
```

Expected: Vite build succeeds, outputs to `dist/`.

- [ ] **Step 4: Commit scaffold**

```bash
git add -A
git commit -m "feat: scaffold n-layer architecture with React SPA frontend"
```
