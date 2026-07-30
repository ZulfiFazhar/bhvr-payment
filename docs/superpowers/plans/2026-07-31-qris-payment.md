# QRIS Payment & Balance Verification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement QRIS payments via SumoPod Sandbox API, user balance tracking in DB, and admin/user transaction dashboards.

**Architecture:** Extend Drizzle schema with roles and topup logs. Update Better Auth configuration to sync these custom fields. Create Hono API routes for creating topups, querying logs, handling webhooks, and simulating payments. Build protected dashboard routing and forms.

**Tech Stack:** Hono, Drizzle ORM, Better Auth, Cloudflare D1, TanStack Router, React 19, shadcn/ui

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
- SumoPod env vars: `SUMOPOD_API_KEY`, `SUMOPOD_WEBHOOK_TOKEN`

---

## File Map

### Files to CREATE

- `src/client/routes/_authenticated/admin.tsx` — Admin dashboard
- `src/server/routes/topup.route.ts` — Topup, Admin list, Webhook, and Simulation routing
- `src/server/controllers/topup.controller.ts` — Request parsing and API validation
- `src/server/services/topup.service.ts` — Business logic (calling SumoPod API, balance additions)

### Files to MODIFY

- `src/server/db/schema.ts` — Update user table, add topup table
- `src/server/types/env.ts` — Add SumoPod keys to Bindings
- `src/server/auth/index.ts` — Add custom user fields to Better Auth config
- `src/server/routes/index.ts` — Mount topup routes
- `src/client/routes/register.tsx` — Add role selection input
- `src/client/routes/_authenticated/dashboard.tsx` — Add user wallet, topup input, history table
- `src/client/routes/__root.tsx` — Add admin link conditionally to navbar header
- `.env.example` — Document SumoPod keys
- `.dev.vars` — Add local keys for SumoPod sandbox

---

## Task 1: Drizzle Schema Update & Migrations

**Files:**
- Modify: `src/server/db/schema.ts`
- Modify: `src/server/types/env.ts`
- Modify: `.env.example`
- Modify: `.dev.vars`

**Interfaces:**
- Produces: Updated database schema (user with role/balance, new topup table), updated Bindings for Hono

- [ ] **Step 1: Update Drizzle Schema**

Replace `src/server/db/schema.ts`:
```ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('user'), // 'admin' | 'user'
  balance: integer('balance').notNull().default(0), // wallet balance in IDR
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

export const topup = sqliteTable('topup', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  paymentId: text('payment_id').notNull(),
  paymentUrl: text('payment_url').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'completed' | 'failed' | 'expired'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})
```

- [ ] **Step 2: Update src/server/types/env.ts**

Replace `src/server/types/env.ts`:
```ts
export type Env = {
  Bindings: {
    DB: D1Database
    BETTER_AUTH_SECRET: string
    BETTER_AUTH_URL: string
    SUMOPOD_API_KEY: string
    SUMOPOD_WEBHOOK_TOKEN: string
  }
}
```

- [ ] **Step 3: Update env template files**

Add to `.env.example`:
```
SUMOPOD_API_KEY=9ff50150f42c6419c2caa883f5f3d9bdc985c345a29f10c442ad272fde644971
SUMOPOD_WEBHOOK_TOKEN=whtok_secret_token_123
```

Add to `.dev.vars`:
```
SUMOPOD_API_KEY=9ff50150f42c6419c2caa883f5f3d9bdc985c345a29f10c442ad272fde644971
SUMOPOD_WEBHOOK_TOKEN=whtok_secret_token_123
```

- [ ] **Step 4: Generate migrations**

```bash
bun run db:generate
```

- [ ] **Step 5: Apply local migration**

```bash
bun run db:migrate:local
```

- [ ] **Step 6: Update wrangler types**

```bash
bun run cf-typegen
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(db): update user schema with role and balance, add topup table"
```

---

## Task 2: Better Auth Config Custom Fields

**Files:**
- Modify: `src/server/auth/index.ts`

**Interfaces:**
- Consumes: schema modifications
- Produces: session payload including `role` and `balance` properties

- [ ] **Step 1: Update Auth Config**

Replace `src/server/auth/index.ts`:
```ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import type { Database } from '../db/index'

export function createAuth(db: Database, env: { BETTER_AUTH_SECRET: string; BETTER_AUTH_URL: string }) {
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'sqlite' }),
    emailAndPassword: { enabled: true },
    user: {
      additionalFields: {
        role: {
          type: 'string',
          defaultValue: 'user',
        },
        balance: {
          type: 'number',
          defaultValue: 0,
        },
      },
    },
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL],
  })
}
```

- [ ] **Step 2: Verify typecheck**

```bash
bunx tsc --noEmit -p tsconfig.json
```

Expected: compiles clean.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(auth): support additional fields role and balance in better-auth config"
```

---

## Task 3: Backend Business Logic & Routing

**Files:**
- Create: `src/server/services/topup.service.ts`
- Create: `src/server/controllers/topup.controller.ts`
- Create: `src/server/routes/topup.route.ts`
- Modify: `src/server/routes/index.ts`

**Interfaces:**
- Consumes: `createDb(d1)`, `createAuth(db, env)`, `Env` bindings
- Produces: API routing `/api/topups` (create, history, simulation) and `/api/admin/transactions`, webhook endpoint `/api/webhooks/sumopod`

- [ ] **Step 1: Create topup.service.ts**

Create `src/server/services/topup.service.ts`:
```ts
import { eq, sql } from 'drizzle-orm'
import type { Database } from '../db'
import { topup, user } from '../db/schema'

export class TopupService {
  constructor(private db: Database) {}

  async createTopup(userId: string, amount: number, apiKey: string) {
    const id = crypto.randomUUID()
    
    // Call SumoPod sandbox API
    const res = await fetch('https://api-pay-sandbox.sumopod.com/api/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        order_id: id,
        amount: amount,
        currency: 'IDR',
        payment_method_type_code: 'QRIS',
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`SumoPod API error: ${errText}`)
    }

    const json = (await res.json()) as {
      payment_id: string
      payment_link_url: string
    }

    const newTopup = {
      id,
      userId,
      amount,
      paymentId: json.payment_id,
      paymentUrl: json.payment_link_url,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await this.db.insert(topup).values(newTopup)
    return newTopup
  }

  async getHistory(userId: string) {
    return this.db.query.topup.findMany({
      where: eq(topup.userId, userId),
      orderBy: (topups, { desc }) => [desc(topups.createdAt)],
    })
  }

  async getAllTransactions() {
    const txs = await this.db
      .select({
        id: topup.id,
        userName: user.name,
        userEmail: user.email,
        amount: topup.amount,
        status: topup.status,
        createdAt: topup.createdAt,
      })
      .from(topup)
      .innerJoin(user, eq(topup.userId, user.id))
      .orderBy(sql`${topup.createdAt} DESC`)

    const completedResult = await this.db
      .select({
        total: sql<number>`SUM(${topup.amount})`,
      })
      .from(topup)
      .where(eq(topup.status, 'completed'))

    const totalBalance = completedResult[0]?.total || 0

    return {
      transactions: txs,
      totalBalance,
    }
  }

  async completePayment(paymentId: string, amount: number) {
    const record = await this.db.query.topup.findFirst({
      where: eq(topup.paymentId, paymentId),
    })

    if (!record || record.status !== 'pending') {
      return false
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(topup)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(topup.id, record.id))

      await tx
        .update(user)
        .set({
          balance: sql`${user.balance} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(user.id, record.userId))
    })

    return true
  }

  async simulatePayment(id: string) {
    const record = await this.db.query.topup.findFirst({
      where: eq(topup.id, id),
    })

    if (!record || record.status !== 'pending') {
      return null
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(topup)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(topup.id, id))

      await tx
        .update(user)
        .set({
          balance: sql`${user.balance} + ${record.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(user.id, record.userId))
    })

    return this.db.query.topup.findFirst({
      where: eq(topup.id, id),
    })
  }
}
```

- [ ] **Step 2: Create topup.controller.ts**

Create `src/server/controllers/topup.controller.ts`:
```ts
import type { Context } from 'hono'
import type { Env } from '../types/env'
import { createDb } from '../db'
import { createAuth } from '../auth'
import { TopupService } from '../services/topup.service'

async function getAuthenticatedUser(c: Context<Env>) {
  const db = createDb(c.env.DB)
  const auth = createAuth(db, {
    BETTER_AUTH_SECRET: c.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: c.env.BETTER_AUTH_URL,
  })
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    return null
  }
  return session.user
}

export class TopupController {
  static async create(c: Context<Env>) {
    const currentUser = await getAuthenticatedUser(c)
    if (!currentUser) return c.json({ success: false, error: 'Unauthorized' }, 401)

    const body = await c.req.json()
    const amount = Number(body.amount)

    if (isNaN(amount) || amount < 10000) {
      return c.json({ success: false, error: 'Min amount is Rp 10.000' }, 400)
    }

    const db = createDb(c.env.DB)
    const service = new TopupService(db)

    try {
      const data = await service.createTopup(currentUser.id, amount, c.env.SUMOPOD_API_KEY)
      return c.json({ success: true, data })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create payment'
      return c.json({ success: false, error: msg }, 500)
    }
  }

  static async history(c: Context<Env>) {
    const currentUser = await getAuthenticatedUser(c)
    if (!currentUser) return c.json({ success: false, error: 'Unauthorized' }, 401)

    const db = createDb(c.env.DB)
    const service = new TopupService(db)
    const data = await service.getHistory(currentUser.id)

    return c.json({ success: true, data })
  }

  static async adminTransactions(c: Context<Env>) {
    const currentUser = await getAuthenticatedUser(c)
    if (!currentUser || currentUser.role !== 'admin') {
      return c.json({ success: false, error: 'Forbidden' }, 403)
    }

    const db = createDb(c.env.DB)
    const service = new TopupService(db)
    const data = await service.getAllTransactions()

    return c.json({ success: true, data })
  }

  static async handleWebhook(c: Context<Env>) {
    const receivedToken = c.req.header('X-Webhook-Token')
    if (receivedToken !== c.env.SUMOPOD_WEBHOOK_TOKEN) {
      return c.json({ success: false, error: 'Invalid webhook token' }, 401)
    }

    const body = await c.req.json()
    if (body.event_type !== 'payment.completed') {
      return c.json({ success: true, message: 'Unhandled event' })
    }

    const paymentId = body.data.payment_id
    const amount = Number(body.data.amount)

    const db = createDb(c.env.DB)
    const service = new TopupService(db)
    const updated = await service.completePayment(paymentId, amount)

    if (!updated) {
      return c.json({ success: false, error: 'Topup transaction not found' }, 404)
    }

    return c.json({ success: true })
  }

  static async simulatePay(c: Context<Env>) {
    const currentUser = await getAuthenticatedUser(c)
    if (!currentUser) return c.json({ success: false, error: 'Unauthorized' }, 401)

    const id = c.req.param('id')
    const db = createDb(c.env.DB)
    const service = new TopupService(db)
    const data = await service.simulatePayment(id)

    if (!data) {
      return c.json({ success: false, error: 'Transaction pending record not found' }, 404)
    }

    return c.json({ success: true, data })
  }
}
```

- [ ] **Step 3: Create topup.route.ts**

Create `src/server/routes/topup.route.ts`:
```ts
import { Hono } from 'hono'
import type { Env } from '../types/env'
import { TopupController } from '../controllers/topup.controller'

const topupRouter = new Hono<Env>()

topupRouter.post('/', TopupController.create)
topupRouter.get('/history', TopupController.history)
topupRouter.post('/:id/simulate-pay', TopupController.simulatePay)
topupRouter.get('/admin/transactions', TopupController.adminTransactions)
topupRouter.post('/webhook', TopupController.handleWebhook)

export { topupRouter }
```

- [ ] **Step 4: Mount routes in server**

Update `src/server/routes/index.ts`:
```ts
import { Hono } from 'hono'
import type { Env } from '../types/env'
import { health } from './health.route'
import { auth } from './auth.route'
import { topupRouter } from './topup.route'

const api = new Hono<Env>()

api.route('/health', health)
api.route('/auth', auth)
api.route('/topups', topupRouter)

export { api }
```

- [ ] **Step 5: Verify typecheck**

```bash
bunx tsc --noEmit -p tsconfig.json
```

Expected: compiles clean.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(api): implement topup service, controller, and routes"
```

---

## Task 4: UI Updates (Register, Conditionally Header, Wallet Dashboard, Admin View)

**Files:**
- Create: `src/client/routes/_authenticated/admin.tsx`
- Modify: `src/client/routes/register.tsx`
- Modify: `src/client/routes/__root.tsx`
- Modify: `src/client/routes/_authenticated/dashboard.tsx`

**Interfaces:**
- Consumes: `/api/topups` endpoints, `/api/admin/transactions`
- Produces: register role selection UI, conditional navbar tabs, topup panel with simulation payment triggers on user dashboard, admin summary card with full transaction table

- [ ] **Step 1: Modify register page to add role selection**

Replace `src/client/routes/register.tsx`:
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
  const [role, setRole] = useState<'user' | 'admin'>('user')
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
      role,
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
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                className="w-full rounded-none border border-input bg-transparent px-3 py-2 text-xs"
                value={role}
                onChange={(e) => setRole((e.target as HTMLSelectElement).value as 'user' | 'admin')}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
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

- [ ] **Step 2: Update Header layout conditionally**

Replace `src/client/routes/__root.tsx`:
```tsx
import { createRootRoute, Outlet, Link } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../lib/query-client'
import { authClient } from '../lib/auth-client'

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
    </QueryClientProvider>
  )
}
```

- [ ] **Step 3: Update Dashboard for wallet and payments**

Replace `src/client/routes/_authenticated/dashboard.tsx`:
```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { authClient } from '../../lib/auth-client'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { apiFetch } from '../../lib/api'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
})

interface TopupTx {
  id: string
  amount: number
  paymentId: string
  paymentUrl: string
  status: string
  createdAt: string
}

function DashboardPage() {
  const navigate = useNavigate()
  const { data: session, isPending, refetch } = authClient.useSession()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<TopupTx[]>([])
  const [error, setError] = useState('')

  async function fetchHistory() {
    try {
      const data = await apiFetch<TopupTx[]>('/topups/history')
      setHistory(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (session) {
      fetchHistory()
    }
  }, [session])

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

  async function handleTopup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await apiFetch<TopupTx>('/topups', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(amount) }),
      })
      setAmount('')
      await fetchHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Topup failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSimulatePay(id: string) {
    try {
      await apiFetch(`/topups/${id}/simulate-pay`, { method: 'POST' })
      await refetch()
      await fetchHistory()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Simulation failed')
    }
  }

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Welcome back, {session.user.name}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Wallet Balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold tracking-tight text-primary">
              {formatRupiah(session.user.balance ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">Email: {session.user.email}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Topup Balance via QRIS</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTopup} className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (IDR)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Min Rp 10.000"
                  value={amount}
                  onChange={(e) => setAmount((e.target as HTMLInputElement).value)}
                  required
                  min={10000}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Requesting payment link...' : 'Topup via QRIS'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="font-heading text-lg font-bold">Riputasi Topup</h3>
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted text-muted-foreground font-semibold uppercase border-b border-border">
              <tr>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Jumlah</th>
                <th className="p-3">Status</th>
                <th className="p-3">Aksi / Pembayaran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-3 text-center text-muted-foreground">
                    No transactions yet.
                  </td>
                </tr>
              ) : (
                history.map((tx) => (
                  <tr key={tx.id}>
                    <td className="p-3">{new Date(tx.createdAt).toLocaleString()}</td>
                    <td className="p-3 font-semibold">{formatRupiah(tx.amount)}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          tx.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : tx.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="p-3 flex items-center gap-2">
                      {tx.status === 'pending' && (
                        <>
                          <a
                            href={tx.paymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-primary text-primary-foreground font-semibold px-3 py-1 text-[10px] uppercase hover:bg-primary/95"
                          >
                            Pay QRIS
                          </a>
                          <Button
                            variant="outline"
                            size="xs"
                            className="text-[10px] uppercase border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-500"
                            onClick={() => handleSimulatePay(tx.id)}
                          >
                            Simulate Success
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create Admin Dashboard page**

Create `src/client/routes/_authenticated/admin.tsx`:
```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { authClient } from '../../lib/auth-client'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { apiFetch } from '../../lib/api'

export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    if (!session || session.user.role !== 'admin') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: AdminPage,
})

interface AdminTx {
  id: string
  userName: string
  userEmail: string
  amount: number
  status: string
  createdAt: string
}

interface TransactionsResponse {
  transactions: AdminTx[]
  totalBalance: number
}

function AdminPage() {
  const [data, setData] = useState<TransactionsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchTransactions() {
    try {
      const res = await apiFetch<TransactionsResponse>('/admin/transactions')
      setData(res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val)
  }

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-bold">Admin Panel</h2>
        <p className="text-sm text-muted-foreground">Monitor payment gateway and total completed balances</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Saldo Masuk (QRIS)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-primary">
              {formatRupiah(data?.totalBalance ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Sum of all successfully processed topups</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="font-heading text-lg font-bold">Semua Transaksi</h3>
        <div className="border border-border overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted text-muted-foreground font-semibold uppercase border-b border-border">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Email</th>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Jumlah</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!data || data.transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-muted-foreground">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                data.transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="p-3 font-semibold">{tx.userName}</td>
                    <td className="p-3">{tx.userEmail}</td>
                    <td className="p-3">{new Date(tx.createdAt).toLocaleString()}</td>
                    <td className="p-3 font-semibold">{formatRupiah(tx.amount)}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          tx.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : tx.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Generate TanStack Router route tree**

```bash
bunx @tanstack/router-cli generate --routesDirectory ./src/client/routes --generatedRouteTree ./src/client/routeTree.gen.ts
```

- [ ] **Step 6: Verify client typecheck**

```bash
bunx tsc --noEmit -p tsconfig.app.json
```

Expected: compiles cleanly.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(client): implement registration role selection, conditional header, user dashboard wallet, and admin dashboard views"
```

---

## Task 5: Final Verification & Test runs

**Files:**
- Verify build and runs

- [ ] **Step 1: Check server compilation**

```bash
bunx tsc --noEmit -p tsconfig.json
```

Expected: passes without errors.

- [ ] **Step 2: Check client compilation**

```bash
bunx tsc --noEmit -p tsconfig.app.json
```

Expected: passes without errors.

- [ ] **Step 3: Run build**

```bash
bun run build
```

Expected: succeeds without errors.

- [ ] **Step 4: Run development environment**

```bash
bun run dev
```

Test manually:
1. Register as a user `User A` -> topup 50.000 -> check pending -> click "Simulate Success" -> balance increments to 50.000.
2. Sign out.
3. Register as an admin `Admin X` -> click "Admin" page in navbar -> verify total balance is 50.000 and details for `User A` are visible.
4. Try to access `/admin` on `User A` (or mock session role) -> verify redirect to `/dashboard`.
5. Test webhook trigger manually via curl:
   ```bash
   curl -X POST http://localhost:5173/api/topups/webhook \
     -H "Content-Type: application/json" \
     -H "X-Webhook-Token: whtok_secret_token_123" \
     -d '{
       "event_type": "payment.completed",
       "data": {
         "payment_id": "YOUR_TX_PAYMENT_ID",
         "amount": 25000
       }
     }'
   ```
   (Should return `{"success":true}`).

- [ ] **Step 5: Commit verified changes**

```bash
git add -A && git commit -m "chore: final verification complete, app is production-ready"
```
