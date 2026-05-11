import { ConfigService } from "@nestjs/config";
import { SchedulerRegistry } from "@nestjs/schedule";
import {
  LOW_REWARD_BALANCE,
  PoolBalanceMonitorService,
} from "./pool-balance-monitor.service";
import { SyncStatus } from "../domain-models";

const syncStatus = new SyncStatus({
  poolKey: "11155111:0x67bebacfb97f13e1b33510309b74a0503695d0f3",
  chainId: 11155111,
  contractAddress: "0x67bebacfb97f13e1b33510309b74a0503695d0f3",
  rewardTokenAddress: "0x0000000000000000000000000000000000000002",
  name: "sepolia-staking",
  lastSyncedBlock: 1,
  initializeBlock: 1,
});

function createService(balance: bigint, openAlert: unknown = null) {
  const syncStatusRepository = { findAll: jest.fn().mockResolvedValue([syncStatus]) };
  const alertRepository = {
    findOpenAlert: jest.fn().mockResolvedValue(openAlert),
    resolveOpenAlert: jest.fn(),
    save: jest.fn(),
  };
  const service = new PoolBalanceMonitorService(
    new ConfigService({
      POOL_BALANCE_MONITOR_CRON: "0 */5 * * * *",
      BALANCE_THRESHOLD: "100",
    }),
    { addCronJob: jest.fn() } as unknown as SchedulerRegistry,
    syncStatusRepository as never,
    { getBalance: jest.fn().mockResolvedValue(balance) } as never,
    alertRepository
  );
  return { service, alertRepository };
}

describe("PoolBalanceMonitorService", () => {
  it("creates an alert when reward balance is below threshold", async () => {
    const { service, alertRepository } = createService(99n);

    await service.tick();

    expect(alertRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        poolKey: syncStatus.poolKey,
        alertType: LOW_REWARD_BALANCE,
        threshold: "100",
        actualValue: "99",
        resolved: false,
      })
    );
  });

  it("suppresses duplicate open alerts", async () => {
    const { service, alertRepository } = createService(99n, { id: "alert-1" });

    await service.tick();

    expect(alertRepository.save).not.toHaveBeenCalled();
  });

  it("does not create an alert when reward balance is above threshold", async () => {
    const { service, alertRepository } = createService(100n);

    await service.tick();

    expect(alertRepository.save).not.toHaveBeenCalled();
  });

  it("resolves an open alert when reward balance recovers to threshold", async () => {
    const { service, alertRepository } = createService(100n, {
      id: "alert-1",
    });

    await service.tick();

    expect(alertRepository.resolveOpenAlert).toHaveBeenCalledWith(
      syncStatus.poolKey,
      LOW_REWARD_BALANCE
    );
    expect(alertRepository.save).not.toHaveBeenCalled();
  });
});
