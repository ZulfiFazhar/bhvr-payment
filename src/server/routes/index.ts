import { Hono } from 'hono'
import { swaggerUI } from '@hono/swagger-ui'
import type { Env } from '../types/env'
import { health } from './health.route'
import { auth } from './auth.route'
import { topupRouter } from './topup.route'

const api = new Hono<Env>()

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Payment Gateway API',
    version: '1.0.0',
    description: 'API documentation for the Payment Gateway system',
  },
  paths: {
    '/api/health': {
      get: {
        summary: 'Check API health',
        responses: {
          '200': { description: 'OK' },
        },
      },
    },
    '/api/topups': {
      post: {
        summary: 'Create a topup request',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  amount: { type: 'integer', minimum: 10000 },
                },
                required: ['amount'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Topup created' },
        },
      },
    },
    '/api/topups/history': {
      get: {
        summary: 'Get user topup history',
        responses: {
          '200': { description: 'Success' },
        },
      },
    },
    '/api/topups/{id}/simulate-pay': {
      post: {
        summary: 'Simulate a successful payment for a topup',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Payment simulated' },
        },
      },
    },
    '/api/topups/admin/transactions': {
      get: {
        summary: 'Get all transactions (Admin only)',
        responses: {
          '200': { description: 'Success' },
        },
      },
    },
    '/api/topups/webhook': {
      post: {
        summary: 'Payment webhook callback',
        parameters: [
          {
            name: 'svix-id',
            in: 'header',
            required: false,
            description: 'Svix Webhook Event ID (for HMAC verification)',
            schema: { type: 'string' },
          },
          {
            name: 'svix-timestamp',
            in: 'header',
            required: false,
            description: 'Svix Webhook Event Timestamp (for HMAC verification)',
            schema: { type: 'string' },
          },
          {
            name: 'svix-signature',
            in: 'header',
            required: false,
            description: 'Svix Webhook Event Signature (for HMAC verification)',
            schema: { type: 'string' },
          },
          {
            name: 'X-Webhook-Token',
            in: 'header',
            required: false,
            description: 'SumoPod Webhook Token (alternative token verification)',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'OK' },
        },
      },
    },
  },
}

api.get('/openapi.json', (c) => c.json(openApiSpec))
api.get('/docs', swaggerUI({ url: '/api/openapi.json' }))

api.route('/health', health)
api.route('/auth', auth)
api.route('/topups', topupRouter)

export { api }
