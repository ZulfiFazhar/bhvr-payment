import type { Context } from 'hono'
import * as v from 'valibot'
import type { Env } from '../types/env'
import { createDb } from '../db/index'
import { createAuth } from '../auth/index'
import { TopupService } from '../services/topup.service'
import type { ApiResponse } from '@/shared/types/api'

const CreateTopupSchema = v.object({
  amount: v.pipe(
    v.number(),
    v.minValue(10000, 'Min amount is 10000')
  ),
})

export class TopupController {
  private static async getService(c: Context<Env>) {
    const db = createDb(c.env.DB)
    return new TopupService(db)
  }

  private static async getSession(c: Context<Env>) {
    const db = createDb(c.env.DB)
    const auth = createAuth(db, {
      BETTER_AUTH_SECRET: c.env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: c.env.BETTER_AUTH_URL,
    })
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    })
    return session
  }

  static async create(c: Context<Env>) {
    const session = await TopupController.getSession(c)
    if (!session) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json()
    const result = v.safeParse(CreateTopupSchema, body)
    if (!result.success) {
      return c.json({ success: false, error: result.issues[0].message }, 400)
    }

    const service = await TopupController.getService(c)
    const res = await service.createTopup(
      session.user.id,
      result.output.amount,
      c.env.SUMOPOD_API_KEY
    )

    return c.json({
      success: true,
      data: res,
    } satisfies ApiResponse<typeof res>)
  }

  static async history(c: Context<Env>) {
    const session = await TopupController.getSession(c)
    if (!session) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const service = await TopupController.getService(c)
    const history = await service.getHistory(session.user.id)

    return c.json({
      success: true,
      data: history,
    } satisfies ApiResponse<typeof history>)
  }

  static async adminTransactions(c: Context<Env>) {
    const session = await TopupController.getSession(c)
    if (!session || session.user.role !== 'admin') {
      return c.json({ success: false, error: 'Forbidden' }, 403)
    }

    const service = await TopupController.getService(c)
    const res = await service.getAllTransactions()

    return c.json({
      success: true,
      data: res,
    } satisfies ApiResponse<typeof res>)
  }

  static async handleWebhook(c: Context<Env>) {
    const token = c.req.header('X-Webhook-Token')
    if (token !== c.env.SUMOPOD_WEBHOOK_TOKEN) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const body = await c.req.json()
    if (body.event_type !== 'payment.completed') {
      return c.json({ success: true, data: { status: 'ignored' } })
    }

    const paymentId = body.data?.payment_id
    const amount = Number(body.data?.amount)

    if (typeof paymentId !== 'string' || isNaN(amount)) {
      return c.json({ success: false, error: 'Invalid payload' }, 400)
    }

    const service = await TopupController.getService(c)
    await service.completePayment(paymentId, amount)

    return c.json({ success: true, data: { status: 'completed' } })
  }

  static async simulatePay(c: Context<Env>) {
    const session = await TopupController.getSession(c)
    if (!session) {
      return c.json({ success: false, error: 'Unauthorized' }, 401)
    }

    const id = c.req.param('id')
    if (!id) {
      return c.json({ success: false, error: 'Bad request' }, 400)
    }
    const service = await TopupController.getService(c)
    await service.simulatePayment(id)

    return c.json({ success: true, data: { status: 'completed' } })
  }
}
