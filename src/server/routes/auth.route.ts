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
