#!/usr/bin/env node

import { main } from './cli/index';

main().catch((error) => {
  // This should not normally be reached since errors are handled in commands.ts
  // But adding this as a safety net
  console.error(
    `\ngit-commitai: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`
  );
  process.exit(1);
});
