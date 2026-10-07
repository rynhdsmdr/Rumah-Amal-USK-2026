import 'dotenv/config'
import { defineConfig } from '@prisma/config'

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL

export default defineConfig({
  datasource: {
    url: dbUrl,
  },
})
