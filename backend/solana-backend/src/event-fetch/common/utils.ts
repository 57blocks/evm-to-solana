import { BaseEvent } from '../chain/event';

// TODO: Need to evaluate the existing data throughput.
export function sleep(delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}
  
export function mergeSortedArrays(a: BaseEvent[], b: BaseEvent[]): BaseEvent[] {
    if (a.length === 0) return b;
    if (b.length === 0) return a;
  
    const merged: BaseEvent[] = [];
    let i = 0;
    let j = 0;
  
    while (i < a.length && j < b.length) {
      if (a[i].blockNumber < b[j].blockNumber) {
        merged.push(a[i]);
        i++;
      } else if (a[i].blockNumber > b[j].blockNumber) {
        merged.push(b[j]);
        j++;
      } else {
        const aEvent = a[i];
        // If blockNumbers are equal
        merged.push(aEvent);
        i++;
        // If transactionHashs are equal, ignore the event in b
        if (aEvent.transactionHash === b[j].transactionHash) {
          j++;
        } else {
          console.log(
            `[Warning] TransactionHashs are not equal, but slot are equal, a: ${aEvent.transactionHash}, b: ${b[j].transactionHash}`
          );
        }
      }
    }
    return merged;
}