# Solana Backend

TypeScript backend for Solana event indexing and API.

## Setup

```bash
# Install dependencies (when needed)
pnpm install

# Development mode (hot reload)
pnpm dev

# Build for production
pnpm build

# Run production build
pnpm start
```

## Project Structure

```
solana-backend/
├── src/
│   └── index.ts          # Entry point
├── scripts/              # Standalone demo scripts
│   ├── README.md
│   └── example.ts        # Example script
├── dist/                 # Compiled output (generated)
├── package.json
├── tsconfig.json
└── .gitignore
```

## Running Scripts

The `scripts/` directory contains standalone scripts that can be run independently:

```bash
# Run any script
pnpm script scripts/example.ts

# Or directly with tsx
pnpm tsx scripts/your-script.ts
```

See `scripts/README.md` for more details.

## Configuration

Create a `.env` file based on `.env.example`:

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PROGRAM_ID=your_program_id_here
PORT=3000
NODE_ENV=development
```

## Add Dependencies Later

```bash
# Solana dependencies
pnpm add @solana/web3.js @coral-xyz/anchor

# Environment variables
pnpm add dotenv

# Express (if building REST API)
pnpm add express
pnpm add -D @types/express

# Database (if needed)
pnpm add prisma @prisma/client
# or
pnpm add mongoose
```

## TypeScript Configuration

The `tsconfig.json` is configured with:
- Target: ES2020
- Module: CommonJS
- Strict mode enabled
- Source maps for debugging
- Output directory: `dist/`
- Source directory: `src/`

