# EVM to Solana Token Staking Migration

A token staking implementation showcasing the migration from EVM to Solana, demonstrating the same business logic on both blockchain platforms.

## 📁 Project Structure

```
evm-to-solana/
├── contract/
│   ├── evm-staking/      # Solidity + Foundry
│   └── solana-staking/   # Rust + Anchor
├── frontend/
│   ├── evm-dapp/         # Vite + wagmi
│   └── solana-dapp/      # Vite + Wallet Adapter
└── backend/
    ├── evm-backend/      # NestJS + Prisma (Sepolia event indexing)
    └── solana-backend/   # NestJS + Prisma (Solana event indexing)
```

## ✨ Features

- **Token Staking**: Stake tokens to earn rewards over time
- **Flexible Unstaking**: Partial or full unstaking
- **Reward System**: Configurable per-second emission rate
- **Admin Controls**: Owner-only configuration functions
- **Blacklist System**: Address restriction capabilities
- **Event Indexing Backends**: Scheduled on-chain event sync with SQLite storage

### Solana Advanced Features

- **Address Lookup Tables**: Optimize transaction size and fees
- **Priority Fees**: Dynamic fee adjustment for faster processing
- **Transaction Retry**: Automatic retry with blockhash management
- **Multi-Pool Support**: Single program manages multiple staking pools

## 🔧 Key Differences

| Feature            | EVM                | Solana                    |
| ------------------ | ------------------ | ------------------------- |
| **Language**       | Solidity           | Rust                      |
| **Data Storage**   | Contract variables | Account structures        |
| **Token Standard** | ERC20              | SPL Token                 |
| **Addresses**      | Contract addresses | Program Derived Addresses |
| **Fees**           | Gas (variable)     | Fixed fees + rent         |

## 📖 Documentation

Each component has detailed documentation:

- [EVM Contract](./contract/evm-staking/README.md)
- [Solana Program](./contract/solana-staking/README.md)
- [EVM DApp](./frontend/evm-dapp/README.md)
- [Solana DApp](./frontend/solana-dapp/README.md)
- [EVM Backend](./backend/evm-backend/README.md)
- [Solana Backend](./backend/solana-backend/README.md)