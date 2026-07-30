import type { Context } from 'hono'
import type { Env } from '../types/env'
import { HealthService } from '../services/health.service'
import type { ApiResponse } from '@/shared/types/api'

const healthService = new HealthService()

export class HealthController {
  static check(c: Context<Env>) {
    const result = healthService.check()
    return c.json({
      success: true,
      data: result,
    } satisfies ApiResponse<typeof result>)
  }
}
