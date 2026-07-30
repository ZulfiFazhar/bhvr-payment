# Backend Business Logic & Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement backend topup service, controller, routes, and route registration.

**Architecture:** Create `TopupService` for business logic (handling D1 database, HTTP requests to sandbox, transactions). Create `TopupController` to handle Hono API requests/responses. Define routes in `topup.route.ts` and mount to `/api/topups` in routes index.

**Tech Stack:** Hono, Drizzle ORM, D1 Database, better-auth, Valibot.

## Global Constraints

- Define business logic for Topups including `createTopup`, `getHistory`, `getAllTransactions`, `completePayment`, `simulatePayment`.
- Create controller handling `create`, `history`, `adminTransactions`, `handleWebhook`, `simulatePay`.
- Register routes inside route tree.
- Run type check `bunx tsc --noEmit -p tsconfig.json` and ensure it passes.

---

### Task 1: Create Topup Service

**Files:**
- Create: `D:/Zulfi/Programming/hono/payment-gateway/src/server/services/topup.service.ts`

**Interfaces:**
- Produces: `TopupService` class.

- [ ] **Step 1: Write service code**

Create `src/server/services/topup.service.ts` with following:
```typescript
import { eq, desc, sum } from 'drizzle-orm'
import type { Database } from '../db/index'
import { topup, user } from '../db/schema'

export class TopupService {
  constructor(private db: Database) {}

  async createTopup(userId: string, amount: number, apiKey: string) {
    const orderId = crypto.randomUUID()
    const response = await fetch('https://api-pay-sandbox.sumopod.com/api/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        order_id: orderId,
        amount: amount,
        currency: 'IDR',
        payment_method_type_code: 'QRIS',
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to initialize payment: ${response.statusText}`)
    }

    const data = (await response.json()) as {
      id: string
      payment_url: string
      [key: string]: any
    }

    const now = new Date()
    await this.db.insert(topup).values({
      id: orderId,
      userId,
      amount,
      paymentId: data.id,
      paymentUrl: data.payment_url,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    })

    return {
      id: orderId,
      paymentUrl: data.payment_url,
    }
  }

  async getHistory(userId: string) {
    return this.db
      .select()
      .from(topup)
      .where(eq(topup.userId, userId))
      .orderBy(desc(topup.createdAt))
  }

  async getAllTransactions() {
    const list = await this.db
      .select({
        id: topup.id,
        userId: topup.userId,
        amount: topup.amount,
        status: topup.status,
        createdAt: topup.createdAt,
        updatedAt: topup.updatedAt,
        userName: user.name,
        userEmail: user.email,
      })
      .from(topup)
      .innerJoin(user, eq(topup.userId, user.id))
      .orderBy(desc(topup.createdAt))

    const completedSum = await this.db
      .select({ total: sum(topup.amount) })
      .from(topup)
      .where(eq(topup.status, 'completed'))

    const totalBalance = Number(completedSum[0]?.total || 0)

    return {
      transactions: list,
      totalBalance,
    }
  }

  async completePayment(paymentId: string, amount: number) {
    const [pendingTopup] = await this.db
      .select()
      .from(topup)
      .where(eq(topup.paymentId, paymentId))
      .limit(1)

    if (!pendingTopup || pendingTopup.status !== 'pending') {
      return
    }

    await this.db.batch([
      this.db
        .update(topup)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(topup.id, pendingTopup.id)),
      this.db
        .update(user)
        .set({
          balance: Number(pendingTopup.amount) + Number(amount), // incrementing balance
        })
        .where(eq(user.id, pendingTopup.userId)),
    ])
  }

  async simulatePayment(id: string) {
    const [pendingTopup] = await this.db
      .select()
      .from(topup)
      .where(eq(topup.id, id))
      .limit(1)

    if (!pendingTopup || pendingTopup.status !== 'pending') {
      return
    }

    const [u] = await this.db
      .select()
      .from(user)
      .where(eq(user.id, pendingTopup.userId))
      .limit(1)

    const currentBalance = u?.balance || 0

    await this.db.batch([
      this.db
        .update(topup)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(topup.id, id)),
      this.db
        .update(user)
        .set({
          balance: currentBalance + pendingTopup.amount,
        })
        .where(eq(user.id, pendingTopup.userId)),
    ])
  }
}
```

- [ ] **Step 2: Run compiler check to verify it has no syntax errors**

Run: `bunx tsc --noEmit -p tsconfig.json`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/server/services/topup.service.ts
git commit -m "feat: add topup service"
```

---

### Task 2: Create Topup Controller

**Files:**
- Create: `D:/Zulfi/Programming/hono/payment-gateway/src/server/controllers/topup.controller.ts`

**Interfaces:**
- Consumes: `TopupService`
- Produces: `TopupController` class.

- [ ] **Step 1: Write controller code**

Create `src/server/controllers/topup.controller.ts` with following:
```typescript
import type { Context } from 'hono'
import * as v from 'valibot'
import type { Env } from '../types/env'
import { createDb } from '../db/index'
import { createAuth } from '../auth/index'
import { TopupService } from '../services/topup.service'
import type { ApiResponse } from '@/shared/types/api'

const CreateTopupSchema = v.object({
  amount: v.pipe(
    v.number(),
    v.minValue(10000, 'Min amount is 10000')
  ),
})

export class TopupController {
  private static async getService(c: Context<Env>) {
    const db = createDb(c.env.DB)
    return new TopupService(db)
  }

  private static async getSession(c: Context<Env>) {
    const db = createDb(c.env.DB)
    const auth = createAuth(db, {
      BETTER_AUTH_SECRET: c.env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: c.env.BETTER_AUTH_URL,
    })
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    })
    return session
  }

  static async create(c: Context<Env>) {
    const session = await TopupController.getSession(c)
    if (!session) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json()
    const result = v.safeParse(CreateTopupSchema, body)
    if (!result.success) {
      return c.json({ success: false, error: result.issues[0].message }, 400)
    }

    const service = await TopupController.getService(c)
    const res = await service.createTopup(
      session.user.id,
      result.output.amount,
      c.env.SUMOPOD_API_KEY
    )

    return c.json({
      success: true,
      data: res,
    } satisfies ApiResponse<typeof res>)
  }

  static async history(c: Context<Env>) {
    const session = await TopupController.getSession(c)
    if (!session) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const service = await TopupController.getService(c)
    const history = await service.getHistory(session.user.id)

    return c.json({
      success: true,
      data: history,
    } satisfies ApiResponse<typeof history>)
  }

  static async adminTransactions(c: Context<Env>) {
    const session = await TopupController.getSession(c)
    if (!session || session.user.role !== 'admin') {
      return c.json({ success: false, error: 'Forbidden' }, 403)
    }

    const service = await TopupController.getService(c)
    const res = await service.getAllTransactions()

    return c.json({
      success: true,
      data: res,
    } satisfies ApiResponse<typeof res>)
  }

  static async handleWebhook(c: Context<Env>) {
    const token = c.req.header('X-Webhook-Token')
    if (token !== c.env.SUMOPOD_WEBHOOK_TOKEN) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json()
    if (body.event_type !== 'payment.completed') {
      return c.json({ success: true, data: { status: 'ignored' } })
    }

    const paymentId = body.data?.payment_id
    const amount = Number(body.data?.amount)

    if (!paymentId || isNaN(amount)) {
      return c.json({ success: false, error: 'Invalid payload' }, 400)
    }

    const service = await TopupController.getService(c)
    await service.completePayment(paymentId, amount)

    return c.json({ success: true, data: { status: 'completed' } })
  }

  static async simulatePay(c: Context<Env>) {
    const session = await TopupController.getSession(c)
    if (!session) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const id = c.req.param('id')
    const service = await TopupController.getService(c)
    await service.simulatePayment(id)

    return c.json({ success: true, data: { status: 'completed' } })
  }
}
```

- [ ] **Step 2: Run compiler check**

Run: `bunx tsc --noEmit -p tsconfig.json`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/server/controllers/topup.controller.ts
git commit -m "feat: add topup controller"
```

---

### Task 3: Create Routes & Register

**Files:**
- Create: `D:/Zulfi/Programming/hono/payment-gateway/src/server/routes/topup.route.ts`
- Modify: `D:/Zulfi/Programming/hono/payment-gateway/src/server/routes/index.ts`

**Interfaces:**
- Consumes: `TopupController`
- Produces: Mounted `/api/topups` route in Honos api router.

- [ ] **Step 1: Write route definition**

Create `src/server/routes/topup.route.ts` with following:
```typescript
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

- [ ] **Step 2: Register routes in routing index**

Modify `src/server/routes/index.ts` to look like this:
```typescript
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

- [ ] **Step 3: Run compiler check**

Run: `bunx tsc --noEmit -p tsconfig.json`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/server/routes/topup.route.ts src/server/routes/index.ts
git commit -m "feat: route topups api"
```
