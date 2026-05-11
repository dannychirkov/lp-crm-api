import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createLpCrmClient } from '../client.js';
import { loadConfig, validateConfig, type ServerConfig } from '../config.js';
import { logger, setLogLevel } from '../logger.js';
import { handleLpCrmTool, lpCrmTools } from './tools.js';

export function createServer(config: ServerConfig): Server {
  validateConfig(config);
  setLogLevel(config.logLevel);

  const client = createLpCrmClient({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
  });

  const server = new Server(
    {
      name: 'lp-crm-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Listing LP-CRM tools');
    return { tools: lpCrmTools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    logger.info(`Tool called: ${name}`, args);

    return handleLpCrmTool(name, args as Record<string, unknown>, client);
  });

  return server;
}

export async function runServer(): Promise<void> {
  const config = loadConfig();
  const server = createServer(config);
  const transport = new StdioServerTransport();

  logger.info('Starting LP-CRM MCP Server...');
  logger.info(`Base URL: ${config.baseUrl}`);
  logger.info('Mode: READ-ONLY');

  await server.connect(transport);
}
