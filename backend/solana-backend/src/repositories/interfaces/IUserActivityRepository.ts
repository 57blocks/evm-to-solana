import { UserActivity } from "../../domain-models";

/**
 * IUserActivityRepository
 * Queries and saves user activity records.
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
