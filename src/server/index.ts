import { Hono } from 'hono'
import type { Env } from './types/env'
import { errorHandler } from './middleware/error-handler'
import { api } from './routes/index'

const app = new Hono<Env>()

app.use('*', errorHandler)
app.route('/api', api)

export { app }
