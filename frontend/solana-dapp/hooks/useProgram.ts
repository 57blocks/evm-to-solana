import { useEffect, useState } from "react";
import { Program, Idl, AnchorProvider, setProvider } from "@coral-xyz/anchor";
import { SolanaStaking } from "@/idl/type";
import { useConnection } from "@solana/wallet-adapter-react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import idl from "@/idl/idl.json";

export const useProgram = () => {
  const [program, setProgram] = useState<Program<Idl>>();
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  useEffect(() => {
    if (wallet) {
      const provider = new AnchorProvider(connection, wallet, {});
      setProvider(provider);
      const program = new Program(idl as SolanaStaking, {
        connection,
      });
      setProgram(program);
    }
  }, [connection, wallet]);

  return { program, setProgram };
};
