import { UserActivity } from "../../domain-models";

export interface IUserActivityRepository {
  save(activity: UserActivity): Promise<void>;
  findByUser(userAddress: string, contractAddress: string): Promise<UserActivity[]>;
  findByUserAndEventType(
    userAddress: string,
    contractAddress: string,
    eventType: string
  ): Promise<UserActivity[]>;
}
