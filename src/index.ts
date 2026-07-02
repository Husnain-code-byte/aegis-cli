#!/usr/bin/env node
import { main } from './cli/index.js';

main().catch((err) => {
  console.error('Aegis CLI encountered an unexpected error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
