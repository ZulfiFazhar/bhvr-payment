import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { reset } from 'drizzle-seed'
import { hashPassword } from 'better-auth/crypto'
import * as schema from './schema'
import fs from 'node:fs'
import path from 'node:path'

function getLocalD1DbPath() {
  const basePath = path.resolve(process.cwd(), '.wrangler/state/v3/d1/miniflare-D1DatabaseObject')
  if (!fs.existsSync(basePath)) return undefined
  
  const files = fs.readdirSync(basePath)
  const dbFile = files.find(f => f.endsWith('.sqlite') && f !== 'metadata.sqlite')
  return dbFile ? path.join(basePath, dbFile) : undefined
}

async function main() {
  const dbPath = getLocalD1DbPath()
  if (!dbPath) {
    throw new Error('Local D1 SQLite database file not found. Make sure wrangler dev is running or has run.')
  }
  
  console.log(`Connecting to local D1 DB at: ${dbPath}`)
  const client = createClient({ url: `file:${dbPath}` })
  const db = drizzle(client, { schema })
  
  console.log('Resetting database...')
  await reset(db, schema)
  
  console.log('Generating password hashes...')
  const adminHash = await hashPassword('password123')
  const userHash = await hashPassword('password123')
  
  const now = new Date()
  const adminId = 'seed-admin-001'
  const userId = 'seed-user-001'
  
  console.log('Inserting seed users...')
  await db.insert(schema.user).values([
    {
      id: adminId,
      name: 'Admin',
      email: 'admin@sumopod.com',
      emailVerified: true,
      role: 'admin',
      balance: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: userId,
      name: 'User',
      email: 'user@sumopod.com',
      emailVerified: true,
      role: 'user',
      balance: 100000,
      createdAt: now,
      updatedAt: now,
    },
  ])
  
  console.log('Inserting seed accounts...')
  await db.insert(schema.account).values([
    {
      id: 'seed-account-admin',
      accountId: 'admin@sumopod.com',
      providerId: 'credential',
      userId: adminId,
      password: adminHash,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-account-user',
      accountId: 'user@sumopod.com',
      providerId: 'credential',
      userId: userId,
      password: userHash,
      createdAt: now,
      updatedAt: now,
    },
  ])
  
  console.log('Seeding completed successfully!')
  client.close()
}

main().catch((err) => {
  console.error('Seeding failed:', err)
  process.exit(1)
})
