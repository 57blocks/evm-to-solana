import { PrismaClient } from '../generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

let prisma: PrismaClient | undefined;

/**
 * 获取 PrismaClient 单例
 * 使用单例模式避免创建多个数据库连接
 * 
 * Prisma 7 需要为 SQLite 传递 adapter
 * 需要安装: pnpm add @prisma/adapter-sqlite
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    // 从环境变量读取数据库路径
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // 解析 SQLite 文件路径（格式：file:./path/to/db.db）
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
 * 优雅关闭 Prisma 连接
 * 在应用关闭时调用
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = undefined;
  }
}

