import { Hono } from 'hono'
import type { Env } from '../types/env'
import { HealthController } from '../controllers/health.controller'

const health = new Hono<Env>()

health.get('/', HealthController.check)

export { health }
