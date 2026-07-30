import { Hono } from 'hono'
import type { Env } from '../types/env'
import { health } from './health.route'

const api = new Hono<Env>()

api.route('/health', health)

export { api }
