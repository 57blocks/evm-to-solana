// import { useEffect, useState } from "react";
// import { useProgram } from "./useProgram";
// import { BorshCoder, EventParser, Idl } from "@coral-xyz/anchor";
// import { PublicKey } from "@solana/web3.js";
// import idl from "@/idl/idl.json";

// export type RewardInfo = {
//   totalStaked: bigint;
//   totalReward: bigint;
//   lastClaimTime: bigint;
// };

// export const useRewardInfo = () => {
//   const coder = new BorshCoder(idl as Idl);
//   const programId = new PublicKey(idl.address);

//   const eventParser = new EventParser(programId, coder);

//   const gen = eventParser.parseLogs(logs);
//   for (const event of gen) {
//     expect(event.name).toEqual("NftSold");
//     done();
//   }
//   const { program } = useProgram();
//   const [rewardInfo, setRewardInfo] = useState<RewardInfo | null>(null);
//   useEffect(() => {
//     if (program) {
//       void program.addEventListener("rewardsClaimed", (event) => {
//         console.log("unstaked", event);
//       });
//     }
//   }, [program]);
// };
