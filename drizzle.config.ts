import { defineConfig } from 'drizzle-kit'
import fs from 'node:fs'
import path from 'node:path'

function getLocalD1DbPath() {
  const basePath = path.resolve(__dirname, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject')
  if (!fs.existsSync(basePath)) return undefined
  
  const files = fs.readdirSync(basePath)
  const dbFile = files.find(f => f.endsWith('.sqlite') && f !== 'metadata.sqlite')
  return dbFile ? `file:${path.join(basePath, dbFile)}` : undefined
}

const localDbPath = getLocalD1DbPath()

export default defineConfig({
  out: './drizzle',
  schema: './src/server/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: localDbPath || '',
  },
  seed: {
    seed: './src/server/db/seed.ts',
  },
})
