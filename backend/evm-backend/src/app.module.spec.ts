import { Test } from "@nestjs/testing";

describe("AppModule", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "file:./prisma/test.db";
    process.env.EVM_RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";
    process.env.POOL_CONFIGS = "[]";
    process.env.INDEXING_CRON = "*/15 * * * * *";
    process.env.POOL_BALANCE_MONITOR_CRON = "0 */5 * * * *";
  });

  it("compiles with real scheduled services and mocked external dependencies", async () => {
    const { AppModule } = await import("./app.module");
    const { EVMClients } = await import("./infrastructure/EVMClients");
    const { PrismaService } = await import("./infrastructure/prisma.service");
    const {
      ALERT_REPOSITORY,
      SYNC_STATUS_REPOSITORY,
      USER_ACTIVITY_REPOSITORY,
    } = await import("./repositories/repositories.module");

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        client: {},
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
      })
      .overrideProvider(EVMClients)
      .useValue({ getClient: jest.fn() })
      .overrideProvider(SYNC_STATUS_REPOSITORY)
      .useValue({ findAll: jest.fn(), findByPoolKey: jest.fn(), save: jest.fn() })
      .overrideProvider(USER_ACTIVITY_REPOSITORY)
      .useValue({ save: jest.fn() })
      .overrideProvider(ALERT_REPOSITORY)
      .useValue({ findOpenAlert: jest.fn(), save: jest.fn() })
      .compile();

    await moduleRef.close();
  });
});
