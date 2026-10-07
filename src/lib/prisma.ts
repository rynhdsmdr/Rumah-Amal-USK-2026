import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prismaPool: Pool | undefined;
  prisma: PrismaClient | undefined;
  prismaAdapter: PrismaPg | undefined;
};

export function getPrismaPool(): Pool {
  if (!globalForPrisma.prismaPool) {
    const rawUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
    globalForPrisma.prismaPool = new Pool({
      connectionString: rawUrl,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });

    globalForPrisma.prismaPool.on('error', (err) => {
      console.error('[Supabase PG Pool Error]', err);
    });
  }
  return globalForPrisma.prismaPool;
}

export function getPrismaInstance(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const pool = getPrismaPool();
    globalForPrisma.prismaAdapter = new PrismaPg(pool);
    globalForPrisma.prisma = new PrismaClient({
      adapter: globalForPrisma.prismaAdapter,
      log: ['error', 'warn'],
    });
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaInstance();
    const value = Reflect.get(client, prop, client);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

export default prisma;
