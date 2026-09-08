import { PrismaClient } from '@prisma/client';

// Standard Next.js dev-mode singleton so hot-reload doesn't exhaust DB connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasources: {
      db: {
        // Falls back to a syntactically-valid but unreachable URL so the client
        // can always be constructed, even before DATABASE_URL is configured
        // (e.g. a preview deploy running entirely on USE_MOCK_DATA). A real
        // query attempted without a real DATABASE_URL fails at query time
        // instead of crashing every route at import time.
        url: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db',
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
