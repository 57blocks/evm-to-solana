import { ConfigService } from "@nestjs/config";
import { SchedulerRegistry } from "@nestjs/schedule";
import { EventIndexingService } from "./event-indexing.service";

jest.mock("../event-fetch/FetchScheduler", () => {
  return {
    FetchScheduler: jest.fn().mockImplementation(() => ({
      runOnce: jest.fn(
        () => new Promise((resolve) => setTimeout(resolve, 20))
      ),
    })),
  };
});

describe("EventIndexingService", () => {
  it("registers event-indexing cron job", () => {
    const schedulerRegistry = { addCronJob: jest.fn() };
    const service = new EventIndexingService(
      new ConfigService({
        INDEXING_CRON: "*/15 * * * * *",
        INDEXING_RETRY_DELAY_MS: 1,
        INDEXING_MAX_RETRIES: 1,
        BLOCK_CHUNK_SIZE: 100,
        CONFIRMATION_BLOCKS: 5,
      }),
      schedulerRegistry as unknown as SchedulerRegistry,
      {} as never,
      {} as never,
      {} as never
    );

    service.onModuleInit();

    expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith(
      "event-indexing",
      expect.anything()
    );
    schedulerRegistry.addCronJob.mock.calls[0][1].stop();
  });

  it("coalesces overlapping ticks", async () => {
    const schedulerRegistry = { addCronJob: jest.fn() };
    const service = new EventIndexingService(
      new ConfigService({
        INDEXING_CRON: "*/15 * * * * *",
        INDEXING_RETRY_DELAY_MS: 1,
        INDEXING_MAX_RETRIES: 1,
        BLOCK_CHUNK_SIZE: 100,
        CONFIRMATION_BLOCKS: 5,
      }),
      schedulerRegistry as unknown as SchedulerRegistry,
      {} as never,
      {} as never,
      {} as never
    );
    service.onModuleInit();

    await Promise.all([service.tick(), service.tick()]);

    const fetchScheduler = (service as unknown as { fetchScheduler: { runOnce: jest.Mock } }).fetchScheduler;
    expect(fetchScheduler.runOnce).toHaveBeenCalledTimes(1);
    schedulerRegistry.addCronJob.mock.calls[0][1].stop();
  });
});
