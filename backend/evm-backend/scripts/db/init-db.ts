import "dotenv/config";
import { PoolConfig, SyncStatus } from "../../src/domain-models";
import { getPrismaClient } from "../../src/infrastructure/PrismaClient";
import { SyncStatusRepository } from "../../src/repositories/implementations/SyncStatusRepository";

function parsePoolConfigs(): PoolConfig[] {
  const raw = process.env.POOL_CONFIGS;
  if (!raw) {
    throw new Error("POOL_CONFIGS environment variable is not set");
  }

  const parsed = JSON.parse(raw) as Array<{
    chainId: number;
    stakingAddress: string;
    rewardTokenAddress: string;
    startBlock: number;
    name: string;
  }>;
  return parsed.map((config) => new PoolConfig(config));
}

async function main(): Promise<void> {
  const prisma = getPrismaClient();
  const repository = new SyncStatusRepository(prisma);

  if (process.env.RESET_DB === "true") {
    await prisma.alert.deleteMany();
    await prisma.userActivity.deleteMany();
    await prisma.syncStatus.deleteMany();
  }

  for (const pool of parsePoolConfigs()) {
    await repository.save(
      new SyncStatus({
        poolKey: pool.poolKey,
        chainId: pool.chainId,
        contractAddress: pool.stakingAddress,
        rewardTokenAddress: pool.rewardTokenAddress,
        name: pool.name,
        lastSyncedBlock: pool.startBlock - 1,
        initializeBlock: pool.startBlock,
      })
    );
  }
}

main()
  .then(async () => {
    await getPrismaClient().$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await getPrismaClient().$disconnect();
    process.exit(1);
  });
