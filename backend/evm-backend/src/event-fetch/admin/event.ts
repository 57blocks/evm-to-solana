import { BaseEvent, BaseEventProps } from "../chain/event";

export class RewardsFundedEvent extends BaseEvent {
  constructor(props: Omit<BaseEventProps, "eventType">) {
    super({ ...props, eventType: "RewardsFunded" });
  }
}

export class RemainingRewardsWithdrawnEvent extends BaseEvent {
  constructor(props: Omit<BaseEventProps, "eventType">) {
    super({ ...props, eventType: "RemainingRewardsWithdrawn" });
  }
}
