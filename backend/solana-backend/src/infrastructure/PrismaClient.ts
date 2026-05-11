import { PrismaClient } from '../generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

let prisma: PrismaClient | undefined;

/**
 * Returns the PrismaClient singleton.
 * Singleton pattern prevents multiple database connections.
 *
 * Prisma 7 requires passing an adapter for SQLite.
 * Install: pnpm add @prisma/adapter-sqlite
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    // Read database path from environment variable
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Parse SQLite file path (format: file:./path/to/db.db)
    const dbPath = databaseUrl.replace(/^file:/, '');
    const absolutePath = path.resolve(process.cwd(), dbPath);

    const adapter = new PrismaBetterSqlite3({
        url: absolutePath
      })
    prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prisma;
}

/**
 * Gracefully closes the Prisma connection.
 * Call this when the application shuts down.
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = undefined;
  }
}

