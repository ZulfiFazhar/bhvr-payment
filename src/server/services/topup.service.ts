import { eq, desc, sum, sql } from 'drizzle-orm'
import type { Database } from '../db/index'
import { topup, user } from '../db/schema'

export class TopupService {
  constructor(private db: Database) {}

  async createTopup(userId: string, amount: number, apiKey: string, successUrl: string, cancelUrl: string) {
    const orderId = crypto.randomUUID()
    const response = await fetch('https://api-pay-sandbox.sumopod.com/api/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        order_id: orderId,
        amount: amount,
        currency: 'IDR',
        payment_method_type_code: 'QRIS',
        success_return_url: successUrl,
        cancel_return_url: cancelUrl,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to initialize payment: ${response.statusText}`)
    }

    const data = (await response.json()) as {
      payment_id: string
      payment_link_url: string
      [key: string]: any
    }

    const now = new Date()
    await this.db.insert(topup).values({
      id: orderId,
      userId,
      amount,
      paymentId: data.payment_id,
      paymentUrl: data.payment_link_url,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    })

    return {
      id: orderId,
      paymentUrl: data.payment_link_url,
    }
  }

  async getHistory(userId: string) {
    return this.db
      .select()
      .from(topup)
      .where(eq(topup.userId, userId))
      .orderBy(desc(topup.createdAt))
  }

  async getAllTransactions() {
    const list = await this.db
      .select({
        id: topup.id,
        userId: topup.userId,
        amount: topup.amount,
        status: topup.status,
        createdAt: topup.createdAt,
        updatedAt: topup.updatedAt,
        userName: user.name,
        userEmail: user.email,
      })
      .from(topup)
      .innerJoin(user, eq(topup.userId, user.id))
      .orderBy(desc(topup.createdAt))

    const completedSum = await this.db
      .select({ total: sum(topup.amount) })
      .from(topup)
      .where(eq(topup.status, 'completed'))

    const totalBalance = Number(completedSum[0]?.total || 0)

    return {
      transactions: list,
      totalBalance,
    }
  }

  async completePayment(paymentId: string, amount: number) {
    const [pendingTopup] = await this.db
      .select()
      .from(topup)
      .where(eq(topup.paymentId, paymentId))
      .limit(1)

    if (!pendingTopup || pendingTopup.status !== 'pending') {
      return
    }

    await this.db.batch([
      this.db
        .update(topup)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(topup.id, pendingTopup.id)),
      this.db
        .update(user)
        .set({
          balance: sql`${user.balance} + ${pendingTopup.amount}`,
        })
        .where(eq(user.id, pendingTopup.userId)),
    ])
  }

  async simulatePayment(id: string) {
    const [pendingTopup] = await this.db
      .select()
      .from(topup)
      .where(eq(topup.id, id))
      .limit(1)

    if (!pendingTopup || pendingTopup.status !== 'pending') {
      return
    }

    await this.db.batch([
      this.db
        .update(topup)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(topup.id, id)),
      this.db
        .update(user)
        .set({
          balance: sql`${user.balance} + ${pendingTopup.amount}`,
        })
        .where(eq(user.id, pendingTopup.userId)),
    ])
  }
}
