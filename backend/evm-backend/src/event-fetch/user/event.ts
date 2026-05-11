import { BaseEvent, BaseEventProps } from "../chain/event";

export class StakedEvent extends BaseEvent {
  constructor(props: Omit<BaseEventProps, "eventType">) {
    super({ ...props, eventType: "Staked" });
  }
}

export class UnstakedEvent extends BaseEvent {
  constructor(props: Omit<BaseEventProps, "eventType">) {
    super({ ...props, eventType: "Unstaked" });
  }
}

export class RewardClaimedEvent extends BaseEvent {
  constructor(props: Omit<BaseEventProps, "eventType">) {
    super({ ...props, eventType: "RewardClaimed" });
  }
}
