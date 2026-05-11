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
      resolveOpenAlert: jest.fn(),
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

  it("resolves the open alert when reward vault balance recovers above threshold", async () => {
    const { service, rewardVaultReader, alertRepository } = makeService({
      id: "existing-alert",
    });

    // Simulate balance above threshold
    rewardVaultReader.getRewardVaultBalance.mockResolvedValue({
      rewardVault: "reward-vault",
      uiAmount: 15,
      rawAmount: "15",
    });

    await service.tick();

    expect(alertRepository.resolveOpenAlert).toHaveBeenCalledWith(
      poolConfig,
      LOW_REWARD_BALANCE
    );
    expect(alertRepository.save).not.toHaveBeenCalled();
  });

  it("does nothing when balance is above threshold and no open alert exists", async () => {
    const { service, rewardVaultReader, alertRepository } = makeService(null);

    // Simulate balance above threshold
    rewardVaultReader.getRewardVaultBalance.mockResolvedValue({
      rewardVault: "reward-vault",
      uiAmount: 15,
      rawAmount: "15",
    });

    await service.tick();

    expect(alertRepository.findOpenAlert).toHaveBeenCalledWith(
      poolConfig,
      LOW_REWARD_BALANCE
    );
    expect(alertRepository.resolveOpenAlert).not.toHaveBeenCalled();
    expect(alertRepository.save).not.toHaveBeenCalled();
  });

  it("goes through the full alert lifecycle: create → resolve → create again", async () => {
    // Track openAlert state across calls
    let storedAlert: { id: string } | null = null;
    const openAlertView = () => storedAlert;

    const syncStatusRepository = {
      findAll: jest
        .fn()
        .mockResolvedValue([new SyncStatus(poolConfig, 1, 1)]),
    };
    const rewardVaultReader = {
      getRewardVaultBalance: jest.fn(),
    };
    const alertRepository = {
      findOpenAlert: jest.fn().mockImplementation(async () => openAlertView()),
      save: jest.fn().mockImplementation(async (alert: { id?: string }) => {
        storedAlert = { id: alert.id ?? "new-alert-id" };
      }),
      resolveOpenAlert: jest.fn().mockImplementation(async () => {
        storedAlert = null;
      }),
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
    const schedulerRegistry = { addCronJob: jest.fn() };

    const service = new PoolBalanceMonitorService(
      config,
      schedulerRegistry as never,
      syncStatusRepository as never,
      rewardVaultReader as never,
      alertRepository as never
    );

    // --- Scenario 1: balance below threshold, no open alert → create alert ---
    rewardVaultReader.getRewardVaultBalance.mockResolvedValue({
      rewardVault: "reward-vault",
      uiAmount: 5,
      rawAmount: "5",
    });

    await service.tick();

    expect(alertRepository.save).toHaveBeenCalledTimes(1);
    expect(alertRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        poolConfig,
        alertType: LOW_REWARD_BALANCE,
        threshold: "10",
        actualValue: "5",
        resolved: false,
      })
    );
    expect(storedAlert).not.toBeNull();

    // --- Scenario 2: balance above threshold, open alert exists → resolve ---
    rewardVaultReader.getRewardVaultBalance.mockResolvedValue({
      rewardVault: "reward-vault",
      uiAmount: 15,
      rawAmount: "15",
    });

    await service.tick();

    expect(alertRepository.resolveOpenAlert).toHaveBeenCalledTimes(1);
    expect(alertRepository.resolveOpenAlert).toHaveBeenCalledWith(
      poolConfig,
      LOW_REWARD_BALANCE
    );
    expect(alertRepository.save).toHaveBeenCalledTimes(1); // still 1, no new save
    expect(storedAlert).toBeNull(); // resolved → no open alert

    // --- Scenario 3: balance below threshold again, no open alert → create new alert ---
    rewardVaultReader.getRewardVaultBalance.mockResolvedValue({
      rewardVault: "reward-vault",
      uiAmount: 3,
      rawAmount: "3",
    });

    await service.tick();

    expect(alertRepository.save).toHaveBeenCalledTimes(2); // new save
    expect(alertRepository.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        poolConfig,
        alertType: LOW_REWARD_BALANCE,
        threshold: "10",
        actualValue: "3",
        resolved: false,
      })
    );
    expect(storedAlert).not.toBeNull(); // new open alert exists
  });
});
