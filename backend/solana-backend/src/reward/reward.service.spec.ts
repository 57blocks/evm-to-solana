import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { RewardService } from "./reward.service";
import {
  SYNC_STATUS_REPOSITORY,
  USER_ACTIVITY_REPOSITORY,
  USER_STAKE_POSITION_REPOSITORY,
} from "../repositories/repositories.module";
import { SolanaConnections } from "../infrastructure/SolanaConnections";

describe("RewardService", () => {
  let service: RewardService;
  const mockSyncStatusRepo = { findAll: jest.fn() };
  const mockUserActivityRepo = { findByUserAndEventType: jest.fn() };
  const mockUserStakePositionRepo = { getUserStakePosition: jest.fn() };
  const mockConnections = { getConnection: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              if (key === "PROGRAM_ID") {
                return "mockProgram111111111111111111111111111111111111";
              }
              return undefined;
            }),
            get: jest.fn((key: string) => {
              if (key === "CHAIN_ID") return 901;
              return undefined;
            }),
          },
        },
        { provide: SYNC_STATUS_REPOSITORY, useValue: mockSyncStatusRepo },
        { provide: USER_ACTIVITY_REPOSITORY, useValue: mockUserActivityRepo },
        { provide: USER_STAKE_POSITION_REPOSITORY, useValue: mockUserStakePositionRepo },
        { provide: SolanaConnections, useValue: mockConnections },
      ],
    }).compile();

    service = module.get<RewardService>(RewardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getUserRewards", () => {
    it("should return empty pools when no sync statuses found", async () => {
      mockSyncStatusRepo.findAll.mockResolvedValue([]);

      const result = await service.getUserRewards(
        "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
      );

      expect(result.userAddress).toBe("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");
      expect(result.pools).toHaveLength(0);
      expect(result.totalStaked).toBe("0");
      expect(result.totalPendingRewards).toBe("0");
      expect(result.totalClaimedRewards).toBe("0");
    });
  });
});
