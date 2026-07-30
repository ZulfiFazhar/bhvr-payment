# Drizzle + D1 + Better Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Drizzle ORM (D1), Better Auth (email/password), and register/login/dashboard pages to the existing payment-gateway scaffold.

**Architecture:** Better Auth mounted directly on Hono at `/api/auth/*`. Drizzle ORM with D1 adapter for data layer. Auth client (`better-auth/react`) on client side. TanStack Router pathless layout route `_authenticated` for route protection. shadcn/ui components for forms.

**Tech Stack:** drizzle-orm, drizzle-kit, better-auth, Cloudflare D1, shadcn/ui

## Global Constraints

- Runtime: Cloudflare Workers (no Node.js APIs)
- Package manager: bun
- Server JSX: `hono/jsx` (tsconfig.json)
- Client JSX: `react` (tsconfig.app.json)
- Validation: Valibot
- Styling: Tailwind v4 + shadcn/ui (base-sera style)
- All paths use `@/*` alias → `./src/*`
- Better Auth env vars: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- D1 binding name: `DB`

---

## File Map

### Files to CREATE

- `.env.example` — example environment variables
- `drizzle.config.ts` — Drizzle Kit config
- `src/server/db/schema.ts` — Drizzle table definitions (user, session, account, verification)
- `src/server/db/index.ts` — `createDb(d1)` factory
- `src/server/auth/index.ts` — `createAuth(db)` factory
- `src/server/routes/auth.route.ts` — mount Better Auth handler
- `src/client/lib/auth-client.ts` — Better Auth React client
- `src/client/routes/login.tsx` — Login page
- `src/client/routes/register.tsx` — Register page
- `src/client/routes/_authenticated.tsx` — Protected layout route (beforeLoad guard)
- `src/client/routes/_authenticated/dashboard.tsx` — Dashboard page

### Files to MODIFY

- `package.json` — add deps, scripts
- `wrangler.jsonc` — add D1 binding
- `src/server/types/env.ts` — add DB to Bindings
- `src/server/routes/index.ts` — mount auth route
- `src/client/routes/index.tsx` — redirect based on session
- `.gitignore` — add `.dev.vars` if not present

### shadcn components to add

- `input`, `label`, `card`

---

## Task 1: Install Dependencies, Config Files, .env.example

**Files:**
- Modify: `package.json`
- Create: `drizzle.config.ts`
- Create: `.env.example`
- Modify: `wrangler.jsonc`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `drizzle.config.ts` pointing to `src/server/db/schema.ts`, D1 binding `DB` in wrangler, `.env.example`

- [ ] **Step 1: Install dependencies**

```bash
bun add drizzle-orm better-auth
bun add -d drizzle-kit
```

- [ ] **Step 2: Add shadcn components**

```bash
bunx shadcn@latest add input label card
```

Note: shadcn may prompt — accept defaults. Components go to `src/client/components/ui/` per `components.json` config.

- [ ] **Step 3: Create drizzle.config.ts**

Create `drizzle.config.ts` at project root:
```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: './src/server/db/schema.ts',
  dialect: 'sqlite',
})
```

- [ ] **Step 4: Create .env.example**

Create `.env.example` at project root:
```
# Better Auth
BETTER_AUTH_SECRET=your-secret-key-min-32-chars-use-openssl-rand-base64-32
BETTER_AUTH_URL=http://localhost:5173

# Cloudflare D1 (production only — local dev uses wrangler D1 local mode)
# DATABASE_ID is set in wrangler.jsonc after running: bunx wrangler d1 create payment-gateway-db
```

- [ ] **Step 5: Create .dev.vars for local dev**

Create `.dev.vars` at project root (this file is gitignored):
```
BETTER_AUTH_SECRET=dev-secret-at-least-32-characters-long-for-local
BETTER_AUTH_URL=http://localhost:5173
```

- [ ] **Step 6: Update wrangler.jsonc — add D1 binding**

Update `wrangler.jsonc`:
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "payment-gateway",
  "compatibility_date": "2025-08-03",
  "main": "./src/index.tsx",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "payment-gateway-db",
      "database_id": "local"
    }
  ]
}
```

Note: `database_id: "local"` is a placeholder. For production, replace with actual ID from `bunx wrangler d1 create payment-gateway-db`.

- [ ] **Step 7: Add new scripts to package.json**

Add to `scripts` in `package.json`:
```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate:local": "wrangler d1 migrations apply payment-gateway-db --local",
  "db:migrate:remote": "wrangler d1 migrations apply payment-gateway-db --remote"
}
```

- [ ] **Step 8: Ensure .dev.vars in .gitignore**

Check `.gitignore` — it already has `.dev.vars`. Verify.

- [ ] **Step 9: Regenerate CF types**

```bash
bun run cf-typegen
```

This updates `worker-configuration.d.ts` with the new `DB` binding type.

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "chore: add drizzle, better-auth deps, config files, .env.example"
```

---

## Task 2: Database Schema & Migrations

**Files:**
- Create: `src/server/db/schema.ts`
- Create: `src/server/db/index.ts`
- Modify: `src/server/types/env.ts`

**Interfaces:**
- Produces: `createDb(d1: D1Database)` factory, Drizzle schema tables (`user`, `session`, `account`, `verification`), updated `Env` type with `DB: D1Database`

- [ ] **Step 1: Create Drizzle schema**

Create `src/server/db/schema.ts`:
```ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
})
```

- [ ] **Step 2: Create DB factory**

Create `src/server/db/index.ts`:
```ts
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema })
}

export type Database = ReturnType<typeof createDb>
```

- [ ] **Step 3: Update Env type**

Replace `src/server/types/env.ts`:
```ts
export type Env = {
  Bindings: {
    DB: D1Database
    BETTER_AUTH_SECRET: string
    BETTER_AUTH_URL: string
  }
}
```

- [ ] **Step 4: Generate migrations**

```bash
bun run db:generate
```

Expected: SQL migration files created in `drizzle/` folder.

- [ ] **Step 5: Apply migrations locally**

```bash
bun run db:migrate:local
```

Expected: Tables created in local D1 SQLite.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add drizzle schema, DB factory, and migrations"
```

---

## Task 3: Better Auth Server Setup

**Files:**
- Create: `src/server/auth/index.ts`
- Create: `src/server/routes/auth.route.ts`
- Modify: `src/server/routes/index.ts`

**Interfaces:**
- Consumes: `createDb(d1)` from `src/server/db/index.ts`, `Env` type
- Produces: Better Auth handler mounted at `/api/auth/*`

- [ ] **Step 1: Create auth factory**

Create `src/server/auth/index.ts`:
```ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import type { Database } from '../db/index'

export function createAuth(db: Database, env: { BETTER_AUTH_SECRET: string; BETTER_AUTH_URL: string }) {
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'sqlite' }),
    emailAndPassword: { enabled: true },
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL],
  })
}
```

- [ ] **Step 2: Create auth route**

Create `src/server/routes/auth.route.ts`:
```ts
import { Hono } from 'hono'
import type { Env } from '../types/env'
import { createDb } from '../db/index'
import { createAuth } from '../auth/index'

const auth = new Hono<Env>()

auth.on(['GET', 'POST'], '/*', (c) => {
  const db = createDb(c.env.DB)
  const authInstance = createAuth(db, {
    BETTER_AUTH_SECRET: c.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: c.env.BETTER_AUTH_URL,
  })
  return authInstance.handler(c.req.raw)
})

export { auth }
```

- [ ] **Step 3: Mount auth route in API routes**

Update `src/server/routes/index.ts`:
```ts
import { Hono } from 'hono'
import type { Env } from '../types/env'
import { health } from './health.route'
import { auth } from './auth.route'

const api = new Hono<Env>()

api.route('/health', health)
api.route('/auth', auth)

export { api }
```

- [ ] **Step 4: Verify typecheck**

```bash
bunx tsc --noEmit -p tsconfig.json
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add better auth server setup with drizzle adapter"
```

---

## Task 4: Better Auth Client + Auth Pages

**Files:**
- Create: `src/client/lib/auth-client.ts`
- Create: `src/client/routes/login.tsx`
- Create: `src/client/routes/register.tsx`
- Create: `src/client/routes/_authenticated.tsx`
- Create: `src/client/routes/_authenticated/dashboard.tsx`
- Modify: `src/client/routes/index.tsx`

**Interfaces:**
- Consumes: Better Auth server at `/api/auth/*`, shadcn `Input`, `Label`, `Card`, `Button` components
- Produces: Working login/register/dashboard pages with auth flow

- [ ] **Step 1: Create auth client**

Create `src/client/lib/auth-client.ts`:
```tsx
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient()
```

Note: No `baseURL` needed — client and server same origin.

- [ ] **Step 2: Create login page**

Create `src/client/routes/login.tsx`:
```tsx
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '../lib/auth-client'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message ?? 'Sign in failed')
      return
    }

    navigate({ to: '/dashboard' })
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>Enter your credentials to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="underline">
                Register
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Create register page**

Create `src/client/routes/register.tsx`:
```tsx
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '../lib/auth-client'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signUpError } = await authClient.signUp.email({
      name,
      email,
      password,
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message ?? 'Sign up failed')
      return
    }

    navigate({ to: '/dashboard' })
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>Enter your details to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName((e.target as HTMLInputElement).value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Create authenticated layout route**

Create `src/client/routes/_authenticated.tsx`:
```tsx
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { authClient } from '../lib/auth-client'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    if (!session) {
      throw redirect({ to: '/login' })
    }
    return { session }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return <Outlet />
}
```

- [ ] **Step 5: Create dashboard page**

Create `src/client/routes/_authenticated/dashboard.tsx`:
```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { authClient } from '../../lib/auth-client'
import { Button } from '../../components/ui/button'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return <p className="text-muted-foreground">Loading...</p>
  }

  if (!session) {
    return null
  }

  async function handleSignOut() {
    await authClient.signOut()
    navigate({ to: '/login' })
  }

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold mb-4">Dashboard</h2>
      <div className="space-y-2 mb-6">
        <p><span className="font-semibold">Name:</span> {session.user.name}</p>
        <p><span className="font-semibold">Email:</span> {session.user.email}</p>
      </div>
      <Button variant="outline" onClick={handleSignOut}>
        Sign Out
      </Button>
    </div>
  )
}
```

- [ ] **Step 6: Update index page — redirect based on session**

Replace `src/client/routes/index.tsx`:
```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { authClient } from '../lib/auth-client'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    if (session) {
      throw redirect({ to: '/dashboard' })
    }
    throw redirect({ to: '/login' })
  },
})
```

- [ ] **Step 7: Regenerate TanStack Router route tree**

```bash
bunx @tanstack/router-cli generate --routesDirectory ./src/client/routes --generatedRouteTree ./src/client/routeTree.gen.ts
```

Or just run `bun run dev` briefly — the Vite plugin auto-regenerates it.

- [ ] **Step 8: Verify client typecheck**

```bash
bunx tsc --noEmit -p tsconfig.app.json
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: add auth pages (login, register, dashboard) with route protection"
```

---

## Task 5: Final Verification

**Files:**
- Verify all files compile and build

- [ ] **Step 1: Run server typecheck**

```bash
bunx tsc --noEmit -p tsconfig.json
```

Expected: no errors.

- [ ] **Step 2: Run client typecheck**

```bash
bunx tsc --noEmit -p tsconfig.app.json
```

Expected: no errors.

- [ ] **Step 3: Run production build**

```bash
bun run build
```

Expected: build succeeds.

- [ ] **Step 4: Run dev server and test auth flow**

```bash
bun run dev
```

Test manually:
1. Visit `http://localhost:5173/` → should redirect to `/login`
2. Click "Register" link → go to `/register`
3. Fill form, submit → should redirect to `/dashboard`
4. Dashboard shows user name/email
5. Click "Sign Out" → redirected to `/login`
6. Visit `/dashboard` directly → redirected to `/login` (not logged in)
7. `curl http://localhost:5173/api/health` → still returns health JSON

- [ ] **Step 5: Commit final state**

```bash
git add -A && git commit -m "feat: drizzle + better auth integration complete"
```
