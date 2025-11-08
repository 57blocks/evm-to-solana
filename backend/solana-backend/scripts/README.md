# Scripts Directory

This directory contains standalone scripts that can be run independently.

## Running Scripts

```bash
# Run any script with tsx
pnpm script scripts/example.ts

# Or directly with tsx
pnpm tsx scripts/example.ts
```

## Available Scripts

- `example.ts` - Example template script ✅
- `test-connection.ts` - Test Solana RPC connection
- `listen-events.ts` - Listen to program events in real-time
- `fetch-history.ts` - Fetch and display transaction history

## Script Template

```typescript
/**
 * Script description
 * Run with: pnpm script scripts/your-script.ts
 */

async function main() {
  // Your logic here
  console.log("Script running...");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
```

## Common Use Cases

- Testing Solana connections
- Querying blockchain data
- Event indexing demos
- Database operations
- Admin tasks

