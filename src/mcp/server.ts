import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createLpCrmClient } from '../client.js';
import { loadConfig, normalizeConfig, validateConfig, type ServerConfig } from '../config.js';
import { logger, setLogLevel } from '../logger.js';
import { registerLpCrmTools } from './tools.js';

const require = createRequire(import.meta.url);
// Resolves to the package root both from src/mcp (tsx) and dist/mcp (build).
const { version } = require('../../package.json') as { version: string };

export function createServer(config: ServerConfig): McpServer {
  const normalizedConfig = normalizeConfig(config);
  validateConfig(normalizedConfig);
  setLogLevel(normalizedConfig.logLevel);

  const client = createLpCrmClient({
    apiKey: normalizedConfig.apiKey,
    baseUrl: normalizedConfig.baseUrl,
    maxRetries: normalizedConfig.maxRetries,
    minRequestIntervalMs: normalizedConfig.minRequestIntervalMs,
    retryDelayMs: normalizedConfig.retryDelayMs,
    maxRetryDelayMs: normalizedConfig.maxRetryDelayMs,
  });

  const server = new McpServer({ name: 'lp-crm-mcp-server', version });
  registerLpCrmTools(server, client);

  return server;
}

export async function runServer(): Promise<void> {
  const config = loadConfig();
  const server = createServer(config);
  const transport = new StdioServerTransport();

  logger.info(`Starting LP-CRM MCP Server v${version}...`);
  logger.info(`Base URL: ${new URL(config.baseUrl).origin}`);
  logger.info('Mode: READ-ONLY');

  await server.connect(transport);
}
