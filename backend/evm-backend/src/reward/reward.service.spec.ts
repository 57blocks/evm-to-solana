import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { RewardService } from "./reward.service";
import { EVMClients } from "../infrastructure/EVMClients";
import { USER_ACTIVITY_REPOSITORY } from "../repositories/repositories.module";

// Mock viem client
const mockReadContract = jest.fn();

jest.mock("viem", () => ({
  createPublicClient: jest.fn(() => ({
    readContract: mockReadContract,
  })),
  http: jest.fn(),
}));

describe("RewardService", () => {
  let service: RewardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === "POOL_CONFIGS") {
                return JSON.stringify([
                  {
                    chainId: 11155111,
                    stakingAddress: "0x67bebacfb97f13e1b33510309b74a0503695d0f3",
                    rewardTokenAddress: "0xb31198aabbdb66365c211a26d7da1aeea8099fca",
                    startBlock: 0,
                    name: "sepolia-staking",
                  },
                ]);
              }
              return undefined;
            }),
          },
        },
        {
          provide: EVMClients,
          useValue: {
            getClient: jest.fn(() => ({
              readContract: mockReadContract,
            })),
          },
        },
        {
          provide: USER_ACTIVITY_REPOSITORY,
          useValue: {
            findByUser: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<RewardService>(RewardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getUserRewards", () => {
    it("should return reward info for a user across all pools", async () => {
      mockReadContract.mockResolvedValue([100n, 50n, 200n]);

      const result = await service.getUserRewards(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result.userAddress).toBe(
        "0x1234567890123456789012345678901234567890"
      );
      expect(result.pools).toHaveLength(1);
      expect(result.pools[0].stakedAmount).toBe("100");
      expect(result.pools[0].pendingRewards).toBe("50");
      expect(result.pools[0].claimedRewards).toBe("200");
      expect(result.totalStaked).toBe("100");
      expect(result.totalPendingRewards).toBe("50");
      expect(result.totalClaimedRewards).toBe("200");
    });

    it("should return zero rewards when on-chain call fails", async () => {
      mockReadContract.mockRejectedValue(new Error("RPC error"));

      const result = await service.getUserRewards(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result.pools).toHaveLength(1);
      expect(result.pools[0].stakedAmount).toBe("0");
      expect(result.pools[0].pendingRewards).toBe("0");
      expect(result.pools[0].claimedRewards).toBe("0");
    });

    it("should return empty pools when no pool configs", async () => {
      jest.spyOn(service as any, "parsePoolConfigs").mockReturnValue([]);

      const result = await service.getUserRewards(
        "0x1234567890123456789012345678901234567890"
      );

      expect(result.pools).toHaveLength(0);
      expect(result.totalStaked).toBe("0");
    });
  });
});
