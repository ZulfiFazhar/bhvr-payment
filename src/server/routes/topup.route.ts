import { Hono } from 'hono'
import type { Env } from '../types/env'
import { TopupController } from '../controllers/topup.controller'

const topupRouter = new Hono<Env>()

topupRouter.post('/', TopupController.create)
topupRouter.get('/history', TopupController.history)
topupRouter.post('/:id/simulate-pay', TopupController.simulatePay)
topupRouter.get('/admin/transactions', TopupController.adminTransactions)
topupRouter.post('/webhook', TopupController.handleWebhook)

export { topupRouter }
