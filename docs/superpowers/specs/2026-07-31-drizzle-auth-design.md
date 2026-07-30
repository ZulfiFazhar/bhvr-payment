# Drizzle + D1 + Better Auth — Design Spec

## Overview

Add Drizzle ORM (D1), Better Auth (email/password), and register/login/dashboard pages to the existing payment-gateway n-layer scaffold.

**Stack additions:** drizzle-orm, drizzle-kit, better-auth, Cloudflare D1

---

## 1. Database (Drizzle + D1)

**ORM:** drizzle-orm with D1 adapter (`drizzle-orm/d1`)

**Schema location:** `src/server/db/schema.ts`
**DB factory:** `src/server/db/index.ts` — `createDb(d1: D1Database)` returns Drizzle instance

**Tables (required by Better Auth):**
- `user` — id, name, email, emailVerified, image, createdAt, updatedAt
- `session` — id, expiresAt, token, createdAt, updatedAt, ipAddress, userAgent, userId
- `account` — id, accountId, providerId, userId, accessToken, refreshToken, idToken, accessTokenExpiresAt, refreshTokenExpiresAt, scope, password, createdAt, updatedAt
- `verification` — id, identifier, value, expiresAt, createdAt, updatedAt

**Migrations:**
- `drizzle-kit generate` → SQL files in `drizzle/` folder
- Local apply: `wrangler d1 migrations apply payment-gateway-db --local`
- Remote apply: `wrangler d1 migrations apply payment-gateway-db --remote`

**Wrangler config:** Add `d1_databases` binding with name `DB`.

**File structure:**
```
src/server/db/
├── index.ts          # createDb(d1: D1Database) factory
└── schema.ts         # Drizzle table definitions
drizzle/              # Generated migration SQL files
drizzle.config.ts     # Drizzle Kit config
```

---

## 2. Better Auth (Server)

**Package:** `better-auth`

**Config location:** `src/server/auth/index.ts`

**Architecture:** Better Auth instance created per-request because D1 binding (`c.env.DB`) only available in request context. Factory function `createAuth(db)`.

**Auth config:**
```ts
export function createAuth(db: DrizzleD1Database) {
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'd1' }),
    emailAndPassword: { enabled: true },
    trustedOrigins: ['http://localhost:5173'],
  })
}
```

**Hono mount:** `app.on(['GET', 'POST'], '/api/auth/**', handler)` in `src/server/routes/auth.route.ts`

**Handler:** Creates DB + auth per request, delegates to `auth.handler(c.req.raw)`.

**Env type update:** Add `DB: D1Database` to `Bindings`.

---

## 3. Better Auth (Client)

**Client:** `better-auth/react` (built-in React integration)

**Config location:** `src/client/lib/auth-client.ts`

```ts
export const authClient = createAuthClient({
  baseURL: window.location.origin,
})
```

**Hooks used:**
- `authClient.useSession()` — current session/user
- `authClient.signUp.email()` — register
- `authClient.signIn.email()` — login
- `authClient.signOut()` — logout

No TanStack Query needed for auth — Better Auth client handles state internally.

---

## 4. Pages

**Route structure:**
```
src/client/routes/
├── __root.tsx              # existing (unchanged)
├── index.tsx               # redirect: logged in → /dashboard, else → /login
├── login.tsx               # Login form
├── register.tsx            # Register form
├── _authenticated.tsx      # Pathless layout — beforeLoad guard
└── _authenticated/
    └── dashboard.tsx       # Protected dashboard
```

### Login page (`login.tsx`)
- Form: email + password
- shadcn: Input, Button, Label, Card
- `authClient.signIn.email({ email, password })`
- On success → navigate `/dashboard`
- Link to `/register`

### Register page (`register.tsx`)
- Form: name + email + password
- shadcn: Input, Button, Label, Card
- `authClient.signUp.email({ name, email, password })`
- On success → navigate `/dashboard`
- Link to `/login`

### Dashboard (`_authenticated/dashboard.tsx`)
- Show user name, email from `authClient.useSession()`
- Logout button → `authClient.signOut()` → navigate `/login`
- Minimal layout

### Index page (`index.tsx`)
- Check session → redirect `/dashboard` or `/login`

### Route protection (`_authenticated.tsx`)
- TanStack Router pathless layout route
- `beforeLoad`: check `authClient.getSession()`, if no session → `redirect({ to: '/login' })`
- All child routes under `_authenticated/` folder automatically protected

---

## 5. Dependencies & Scripts

**New dependencies:**
| Package | Type | Purpose |
|---------|------|---------|
| `drizzle-orm` | prod | ORM |
| `better-auth` | prod | Auth framework |
| `drizzle-kit` | dev | Migration generation |

**shadcn components to add:** `input`, `label`, `card`

**New scripts in package.json:**
```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate:local": "wrangler d1 migrations apply payment-gateway-db --local",
  "db:migrate:remote": "wrangler d1 migrations apply payment-gateway-db --remote"
}
```

**drizzle.config.ts:**
```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: './src/server/db/schema.ts',
  dialect: 'sqlite',
})
```
