import { ConfigService } from "@nestjs/config";
import { SchedulerRegistry } from "@nestjs/schedule";
import { EventIndexingService } from "./event-indexing.service";

const mockRunOnce = jest.fn();

jest.mock("../event-fetch/FetchScheduler", () => ({
  FetchScheduler: jest.fn().mockImplementation(() => ({
    runOnce: mockRunOnce,
  })),
}));

describe("EventIndexingService", () => {
  const createdJobs: { stop: () => void }[] = [];

  const makeService = () => {
    const config = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          INDEXING_CRON: "*/10 * * * * *",
          INDEXING_RETRY_DELAY_MS: 1,
          INDEXING_MAX_RETRIES: 3,
          CHAIN_ID: 901,
          SOLSCAN_ENDPOINT: "",
          SOLSCAN_API_KEY: "",
        };
        return values[key];
      }),
      get: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          SOLSCAN_ENDPOINT: "",
          SOLSCAN_API_KEY: "",
        };
        return values[key];
      }),
    } as unknown as ConfigService;
    const schedulerRegistry = {
      addCronJob: jest.fn((_name: string, job: { stop: () => void }) => {
        createdJobs.push(job);
      }),
    } as unknown as SchedulerRegistry;

    const service = new EventIndexingService(
      config,
      schedulerRegistry,
      { findAll: jest.fn(), findByPoolConfig: jest.fn(), save: jest.fn() },
      { save: jest.fn(), findByUser: jest.fn(), findByUserAndEventType: jest.fn() },
      { getConnection: jest.fn() } as never
    );

    return { service, schedulerRegistry };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    createdJobs.splice(0, createdJobs.length);
  });

  afterEach(() => {
    createdJobs.forEach((job) => job.stop());
  });

  it("registers the event-indexing cron job on module init", () => {
    const { service, schedulerRegistry } = makeService();

    service.onModuleInit();

    expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith(
      "event-indexing",
      expect.any(Object)
    );
  });

  it("runs one fetch cycle per tick and suppresses overlapping runs", async () => {
    const { service } = makeService();
    service.onModuleInit();
    let resolveRun: () => void;
    mockRunOnce.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRun = resolve;
      })
    );

    const firstRun = service.tick();
    const secondRun = service.tick();

    expect(mockRunOnce).toHaveBeenCalledTimes(1);
    resolveRun!();
    await Promise.all([firstRun, secondRun]);
  });
});
