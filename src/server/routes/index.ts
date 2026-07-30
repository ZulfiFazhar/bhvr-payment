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
