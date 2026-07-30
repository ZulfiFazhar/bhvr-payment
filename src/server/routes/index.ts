import { Hono } from 'hono'
import type { Env } from '../types/env'
import { health } from './health.route'
import { auth } from './auth.route'

const api = new Hono<Env>()

api.route('/health', health)
api.route('/auth', auth)

export { api }
