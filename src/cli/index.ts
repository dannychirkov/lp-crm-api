#!/usr/bin/env node
import { runServer } from '../mcp/server.js';

runServer().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Fatal error: ${message}\n`);
  process.exit(1);
});
