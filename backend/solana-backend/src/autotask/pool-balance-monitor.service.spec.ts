import { ConfigService } from "@nestjs/config";
import { SyncStatus } from "../domain-models";
import { LOW_REWARD_BALANCE, PoolBalanceMonitorService } from "./pool-balance-monitor.service";

describe("PoolBalanceMonitorService", () => {
  const poolConfig = "11111111111111111111111111111111";

  const makeService = (openAlert: unknown = null) => {
    const syncStatusRepository = {
      findAll: jest.fn().mockResolvedValue([new SyncStatus(poolConfig, 1, 1)]),
    };
    const rewardVaultReader = {
      getRewardVaultBalance: jest.fn().mockResolvedValue({
        rewardVault: "reward-vault",
        uiAmount: 5,
        rawAmount: "5",
      }),
    };
    const alertRepository = {
      findOpenAlert: jest.fn().mockResolvedValue(openAlert),
      save: jest.fn(),
    };
    const config = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          POOL_BALANCE_MONITOR_CRON: "0 */5 * * * *",
          REWARD_BALANCE_THRESHOLD: 10,
        };
        return values[key];
      }),
    } as unknown as ConfigService;
    const schedulerRegistry = {
      addCronJob: jest.fn(),
    };

    const service = new PoolBalanceMonitorService(
      config,
      schedulerRegistry as never,
      syncStatusRepository as never,
      rewardVaultReader as never,
      alertRepository as never
    );

    return { service, rewardVaultReader, alertRepository };
  };

  it("writes a low reward balance alert when the reward vault is below threshold", async () => {
    const { service, rewardVaultReader, alertRepository } = makeService();

    await service.tick();

    expect(rewardVaultReader.getRewardVaultBalance).toHaveBeenCalledWith(poolConfig);
    expect(alertRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        poolConfig,
        alertType: LOW_REWARD_BALANCE,
        threshold: "10",
        actualValue: "5",
        resolved: false,
      })
    );
  });

  it("does not create a duplicate low reward balance alert when one is already open", async () => {
    const { service, alertRepository } = makeService({ id: "existing-alert" });

    await service.tick();

    expect(alertRepository.save).not.toHaveBeenCalled();
  });
});
