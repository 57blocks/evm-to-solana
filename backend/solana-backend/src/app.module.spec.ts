import { Test } from "@nestjs/testing";

describe("AppModule", () => {
  it("compiles with infrastructure, indexing, and autotask modules", async () => {
    process.env.DATABASE_URL = "file:./prisma/dev.db";
    process.env.INDEXING_CRON = "*/10 * * * * *";
    process.env.POOL_BALANCE_MONITOR_CRON = "0 */5 * * * *";

    const { AppModule } = await import("./app.module");
    const { PrismaService } = await import("./infrastructure/prisma.service");

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
        client: {},
      })
      .compile();

    expect(moduleRef).toBeDefined();
    await moduleRef.init();
    await moduleRef.close();
  });
});
