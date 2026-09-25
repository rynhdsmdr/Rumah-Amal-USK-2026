import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaAdapter: PrismaPg | undefined;
};

export function getPrismaInstance(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL || '';
    if (!globalForPrisma.prismaAdapter) {
      globalForPrisma.prismaAdapter = new PrismaPg({ connectionString });
    }
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
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

export default prisma;
