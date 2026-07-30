import { Hono } from 'hono'
import { app as api } from './server/index'
import { renderer } from './renderer'

const app = new Hono()

// Mount API routes
app.route('/', api)

// SPA fallback — all non-API routes serve HTML shell
app.use(renderer)
app.get('*', (c) => {
  return c.render(<></>)
})

export default app
