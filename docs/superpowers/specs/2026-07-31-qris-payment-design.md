# QRIS Payment & Balance Verification Design Spec

## Overview

Implement QRIS payment flow (via SumoPod Sandbox API) with user balance tracking and an admin transaction monitoring dashboard.

**Key Stack additions:** Drizzle Schema updates, Better Auth custom user fields, Hono Webhook endpoint, Hono Simulation endpoint, User Dashboard, Admin Dashboard.

---

## 1. Database Schema Updates (Drizzle)

Update `src/server/db/schema.ts` to support roles, user balances, and topup records.

### User Table Modification
- `role`: `text` (must be `'admin' | 'user'`, default `'user'`)
- `balance`: `integer` (default `0`)

### Topup Table (New)
- `id`: `text` primary key
- `userId`: `text` references `user.id` cascade
- `amount`: `integer` notNull (topup amount in IDR)
- `paymentId`: `text` (external transaction ID from SumoPod)
- `paymentUrl`: `text` (external QRIS payment link URL from SumoPod)
- `status`: `text` ('pending' | 'completed' | 'failed' | 'expired', default 'pending')
- `createdAt`: `integer` as timestamp notNull
- `updatedAt`: `integer` as timestamp notNull

---

## 2. Better Auth Configuration

Better Auth must support the custom `role` and `balance` fields in its user model.

### Better Auth Server Config (`src/server/auth/index.ts`)
```ts
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

---

## 3. API Endpoints (Hono Server)

### Env Bindings (`src/server/types/env.ts`)
Add:
- `SUMOPOD_API_KEY: string`
- `SUMOPOD_WEBHOOK_TOKEN: string`

### 1. `POST /api/topups` (Protected)
- Check session user (if no session -> 401).
- Parse body: `amount` (number, min 10000).
- Call SumoPod Sandbox API:
  - POST `https://api-pay-sandbox.sumopod.com/api/v1/payments`
  - Header: `X-Api-Key: c.env.SUMOPOD_API_KEY`
  - Payload:
    ```json
    {
      "order_id": "topup-uuid",
      "amount": amount,
      "currency": "IDR",
      "payment_method_type_code": "QRIS"
    }
    ```
- Parse response, retrieve `payment_id` and `payment_link_url`.
- Insert into `topup` table status `'pending'`.
- Return topup data to frontend.

### 2. `GET /api/topups/history` (Protected)
- Retrieve all topups for logged-in user, sorted by `createdAt` DESC.

### 3. `GET /api/admin/transactions` (Protected/Admin)
- Verify `user.role === 'admin'`. If not -> 403.
- Retrieve all topups (joined with user details) from DB.
- Compute sum of all completed topups (total balance received).

### 4. `POST /api/webhooks/sumopod` (Public)
- Verify header `X-Webhook-Token === c.env.SUMOPOD_WEBHOOK_TOKEN`. If mismatch -> 401.
- Parse payload:
  - If `event_type === 'payment.completed'`:
    - Find `topup` where `paymentId === data.payment_id` and `status === 'pending'`.
    - If found:
      - Update `topup` status to `'completed'`.
      - Increment `user.balance` by `amount`.
- Return 200 OK.

### 5. `POST /api/topups/:id/simulate-pay` (Protected)
- Fetch topup where `id === params.id` and `status === 'pending'`.
- Update `topup` status to `'completed'`.
- Increment user's `balance` by `topup.amount`.
- Return updated topup.
- (Allows local sandbox testing without establishing tunnel endpoints).

---

## 4. UI Pages (React SPA)

### Sign Up (`register.tsx`)
- Add a Select field for Role selection: `'user'` or `'admin'` (helps testing/demoing roles).

### Header (`__root.tsx`)
- Navigation links based on role:
  - If admin: show link to `/admin` dashboard.
  - If user: show link to `/dashboard` page.

### Dashboard (`_authenticated/dashboard.tsx` - User View)
- Header displaying user name and formatted wallet balance (e.g. `Rp 50.000`).
- Quick topup box: input amount (min 10.000) and button "Topup via QRIS".
- When payment link generated: display link button and sandbox simulation trigger button "Simulate Payment Success" (active only when status is pending).
- Table showing previous topup attempts: date, amount, status, external payment link.

### Admin Dashboard (`_authenticated/admin.tsx` - Protected Admin View)
- Protect page via `beforeLoad` checking `user.role === 'admin'`.
- Display summary card: "Total Saldo Masuk" (sum of all completed topups).
- Table showing all transactions: User Name, Email, Date, Amount, Status.

---

## 5. Webhook Security & Environment Setup

Add these to `.env.example` and `.dev.vars`:
```
SUMOPOD_API_KEY=9ff50150f42c6419c2caa883f5f3d9bdc985c345a29f10c442ad272fde644971
SUMOPOD_WEBHOOK_TOKEN=whtok_secret_token_123
```
