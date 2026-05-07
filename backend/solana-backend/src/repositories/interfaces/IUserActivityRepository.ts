import { UserActivity } from "../../domain-models";

/**
 * UserActivityRepository 接口
 * 查询和保存用户活动记录
 */
export interface IUserActivityRepository {
  save(activity: UserActivity): Promise<void>;

  findByUser(userAddress: string, poolConfig: string): Promise<UserActivity[]>;

  findByUserAndEventType(
    userAddress: string,
    poolConfig: string,
    eventType: string
  ): Promise<UserActivity[]>;
}
