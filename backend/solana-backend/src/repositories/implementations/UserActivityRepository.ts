import { UserActivity } from "../../domain-models";
import { IUserActivityRepository } from "../interfaces/IUserActivityRepository";

/**
 * UserActivityRepository 实现
 * 使用内存数据库（Map）存储用户活动记录
 */
export class UserActivityRepository implements IUserActivityRepository {
  // 内存数据库：使用 Map 存储，key 为 txHash（唯一标识）
  private activities: Map<string, UserActivity> = new Map();

  /**
   * 保存用户活动记录
   */
  async save(activity: UserActivity): Promise<void> {
    // 使用 txHash 作为唯一标识，如果已存在则覆盖
    this.activities.set(activity.txHash, activity);
  }

  /**
   * 查询指定用户的所有活动
   */
  async findByUser(
    userAddress: string,
    programId: string
  ): Promise<UserActivity[]> {
    const results: UserActivity[] = [];
    for (const activity of Array.from(this.activities.values())) {
      if (
        activity.userAddress === userAddress &&
        activity.programId === programId
      ) {
        results.push(activity);
      }
    }
    // 按时间戳倒序排序
    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 按事件类型过滤查询
   */
  async findByUserAndEventType(
    userAddress: string,
    programId: string,
    eventType: string
  ): Promise<UserActivity[]> {
    const results: UserActivity[] = [];
    for (const activity of Array.from(this.activities.values())) {
      if (
        activity.userAddress === userAddress &&
        activity.programId === programId &&
        activity.eventType === eventType
      ) {
        results.push(activity);
      }
    }
    // 按时间戳倒序排序
    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 清空所有数据（用于测试或重置）
   */
  clear(): void {
    this.activities.clear();
  }

  /**
   * 获取所有活动记录（用于调试）
   */
  getAll(): UserActivity[] {
    return Array.from(this.activities.values());
  }
}

