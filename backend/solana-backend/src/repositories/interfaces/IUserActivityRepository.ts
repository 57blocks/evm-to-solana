import { UserActivity } from "../../domain-models";

/**
 * UserActivityRepository 接口
 * 查询和保存用户活动记录
 */
export interface IUserActivityRepository {
  /**
   * 保存用户活动记录
   */
  save(activity: UserActivity): Promise<void>;

  /**
   * 查询指定用户的所有活动
   */
  findByUser(userAddress: string, programId: string): Promise<UserActivity[]>;

  /**
   * 按事件类型过滤查询
   */
  findByUserAndEventType(
    userAddress: string,
    programId: string,
    eventType: string
  ): Promise<UserActivity[]>;
}

