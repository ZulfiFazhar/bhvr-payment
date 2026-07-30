## Actions Taken
- Updated `src/server/db/schema.ts` to add `role` (text, default 'user'), `balance` (integer, default 0) to `user` table, and created the new `topup` table with foreign key reference to `user.id`.
- Updated `src/server/types/env.ts` to add `DB`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `SUMOPOD_API_KEY`, and `SUMOPOD_WEBHOOK_TOKEN` to `Bindings`.
- Added `SUMOPOD_API_KEY` and `SUMOPOD_WEBHOOK_TOKEN` to `.env.example` and `.dev.vars`.
- Generated Drizzle migration files using `bun run db:generate`.
- Applied Drizzle migration files locally using `bun run db:migrate:local`.
- Generated type definition file `worker-configuration.d.ts` using `bun run cf-typegen`.
