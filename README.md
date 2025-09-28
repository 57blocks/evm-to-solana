# EVM to Solana Token Staking Migration

A token staking implementation showcasing the migration from EVM to Solana, demonstrating the same business logic on both blockchain platforms.

## 📁 Project Structure

```
evm-to-solana-contract/
├── contract/
│   ├── evm-staking/      # Solidity + Foundry
│   └── solana-staking/   # Rust + Anchor
└── frontend/
    ├── evm-dapp/        # Next.js + wagmi
    └── solana-dapp/     # Next.js + Wallet Adapter
```

## ✨ Features

- **Token Staking**: Stake tokens to earn rewards over time
- **Flexible Unstaking**: Partial or full unstaking
- **Reward System**: 1% daily reward rate (configurable)
- **Admin Controls**: Owner-only configuration functions
- **Blacklist System**: Address restriction capabilities

### Solana Advanced Features

- **Address Lookup Tables**: Optimize transaction size and fees
- **Priority Fees**: Dynamic fee adjustment for faster processing
- **Transaction Retry**: Automatic retry with blockhash management

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
