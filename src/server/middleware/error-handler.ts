import type { Context, Next } from 'hono'
import type { ApiError } from '@/shared/types/api'

export async function errorHandler(c: Context, next: Next) {
  try {
    await next()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 500

    console.error(`[Error] ${c.req.method} ${c.req.path}:`, err)

    return c.json(
      {
        success: false,
        error: message,
      } satisfies ApiError,
      status as 500
    )
  }
}
