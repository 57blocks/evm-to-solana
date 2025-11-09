import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";
import { createSolanaRpc, Signature } from '@solana/kit';
import { Program } from "@coral-xyz/anchor";
import { SolanaStaking } from "../../../contract/solana-staking/target/types/solana_staking";


const DEVNET_RPC_URL = "https://api.devnet.solana.com";

async function parseTransaction() {
  console.log("📜 fetching transaction...\n");
  const rpc = createSolanaRpc(DEVNET_RPC_URL);
  const signature = "4CwGkWSvj9NFqof7V9n92Sv3esdsWxyuak5DwqdPT8bV4mz7CG56MvRnsgSzXWUNpWEV9MmbNeYtaMe3MsjLgKLh";
  const response = await rpc.getTransaction(signature as Signature).send();
  if (!response) {
    throw new Error('Could not find transaction');
  }
  const {
    transaction,
    meta,
  } = response;
  // console.log(meta);
  // console.log(transaction);
  const logMessages = meta?.logMessages;
  // find the first log message that contains the string "Program data:"
  const programDataLogMessage = logMessages?.find((log) => log.includes("Program data:"));
  if (!programDataLogMessage) {
    throw new Error('Could not find program data log message');
  }
  const programData = programDataLogMessage.split("Program data:")[1].trim();
  console.log("Program data encoded in base64:", programData);
  meta?.innerInstructions?.forEach((innerInstruction) => {
    innerInstruction.instructions.forEach((instruction) => {
      console.log(instruction);
    });
  });
  // Setup Provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  // Load IDL
  const idl = JSON.parse(
    fs.readFileSync("./solana_staking.json", "utf8")
  );
  const program = new Program<SolanaStaking>(idl as any, provider);
  const event = program.coder.events.decode(programData);
  console.log(event?.name);
  if (event?.data) {
    for (const key in event?.data) {
      console.log(`${key}: ${event.data[key]}`);
    }
  }

}

parseTransaction().then(() => {
  console.log("✅ Transaction fetched successfully");
  process.exit(0);
}).catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});


