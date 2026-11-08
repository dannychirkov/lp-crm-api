import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { LpCrmClient } from '../client.js';
import { DEFAULT_MCP_ID_LIMIT } from '../defaults.js';
import { logger } from '../logger.js';
import type { LpCrmSuccessResponse } from '../types.js';
import { formatError, formatSuccess } from './format.js';

export const LP_CRM_TOOL_NAMES = [
  'lpcrm_get_statuses',
  'lpcrm_get_order_ids_by_status',
  'lpcrm_get_orders_by_id',
  'lpcrm_get_categories',
  'lpcrm_get_products_by_category',
  'lpcrm_get_products_by_id',
  'lpcrm_get_order_ids_by_user',
] as const;

export const MAX_IDS_PER_REQUEST = 100;
export const MAX_ID_LIMIT = 5000;

const READ_ONLY: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

/** Numeric LP-CRM ID. Digits only, so a value like "1,2" cannot smuggle extra IDs into a list. */
const idSchema = z.union([
  z.number().int().nonnegative(),
  z.string().trim().regex(/^\d+$/, 'ID must contain digits only'),
]);

const idListSchema = (what: string) =>
  z
    .union([idSchema, z.array(idSchema).min(1).max(MAX_IDS_PER_REQUEST)])
    .describe(`${what} ID or array of up to ${MAX_IDS_PER_REQUEST} ${what.toLowerCase()} IDs`);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}(:\d{2})?)?$/;

function parseDate(value: string): number {
  return Date.parse(value.replace(' ', 'T'));
}

const dateSchema = (label: string) =>
  z
    .string()
    .trim()
    .regex(DATE_PATTERN, 'Expected YYYY-MM-DD or YYYY-MM-DD HH:MM[:SS]')
    .refine((value) => !Number.isNaN(parseDate(value)), 'Invalid calendar date')
    .optional()
    .describe(`${label} (YYYY-MM-DD)`);

const limitSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_ID_LIMIT)
  .optional()
  .describe(
    `Maximum number of IDs to return (default ${DEFAULT_MCP_ID_LIMIT}, max ${MAX_ID_LIMIT})`
  );

function assertDateRange(dateStart?: string, dateEnd?: string): void {
  if (dateStart && dateEnd && parseDate(dateStart) > parseDate(dateEnd)) {
    throw new Error('dateStart must not be later than dateEnd');
  }
}

/** Trims a list of IDs so one broad query cannot flood the model's context. */
export function limitIdList<T extends LpCrmSuccessResponse<unknown>>(
  response: T,
  limit: number = DEFAULT_MCP_ID_LIMIT
): T {
  const data = response.data;
  if (!Array.isArray(data) || data.length <= limit) {
    return response;
  }

  return {
    ...response,
    data: data.slice(0, limit),
    truncated: true,
    total_ids: data.length,
    returned_ids: limit,
    note: `Only the first ${limit} of ${data.length} IDs are shown. Narrow the date range or raise "limit".`,
  };
}

async function run(name: string, args: unknown, action: () => Promise<unknown>) {
  logger.info(`Tool called: ${name}`, args);
  try {
    return formatSuccess(await action());
  } catch (error) {
    return formatError(error);
  }
}

export function registerLpCrmTools(server: McpServer, client: LpCrmClient): void {
  server.registerTool(
    'lpcrm_get_statuses',
    { description: 'Get LP-CRM order statuses', annotations: READ_ONLY },
    () => run('lpcrm_get_statuses', {}, () => client.getStatuses())
  );

  server.registerTool(
    'lpcrm_get_order_ids_by_status',
    {
      description: 'Get LP-CRM order IDs by status and optional creation date range',
      inputSchema: {
        status: idSchema.describe('Order status ID'),
        dateStart: dateSchema('Creation date from'),
        dateEnd: dateSchema('Creation date to'),
        limit: limitSchema,
      },
      annotations: READ_ONLY,
    },
    (args) =>
      run('lpcrm_get_order_ids_by_status', args, async () => {
        assertDateRange(args.dateStart, args.dateEnd);
        const response = await client.getOrderIdsByStatus({
          status: args.status,
          dateStart: args.dateStart,
          dateEnd: args.dateEnd,
        });
        return limitIdList(response, args.limit);
      })
  );

  server.registerTool(
    'lpcrm_get_orders_by_id',
    {
      description: `Get LP-CRM order details by one or more order IDs, up to ${MAX_IDS_PER_REQUEST}`,
      inputSchema: { orderIds: idListSchema('Order') },
      annotations: READ_ONLY,
    },
    (args) => run('lpcrm_get_orders_by_id', args, () => client.getOrdersById(args.orderIds))
  );

  server.registerTool(
    'lpcrm_get_categories',
    { description: 'Get LP-CRM product categories', annotations: READ_ONLY },
    () => run('lpcrm_get_categories', {}, () => client.getCategories())
  );

  server.registerTool(
    'lpcrm_get_products_by_category',
    {
      description: 'Get LP-CRM products by category ID',
      inputSchema: { categoryId: idSchema.describe('Category ID') },
      annotations: READ_ONLY,
    },
    (args) =>
      run('lpcrm_get_products_by_category', args, () =>
        client.getProductsByCategory(args.categoryId)
      )
  );

  server.registerTool(
    'lpcrm_get_products_by_id',
    {
      description: `Get LP-CRM product details by one or more product IDs, up to ${MAX_IDS_PER_REQUEST}`,
      inputSchema: {
        productIds: idListSchema('Product'),
        statusIgnore: z
          .boolean()
          .optional()
          .describe('Return enabled and disabled products when true'),
      },
      annotations: READ_ONLY,
    },
    (args) =>
      run('lpcrm_get_products_by_id', args, () =>
        client.getProductsById({ productIds: args.productIds, statusIgnore: args.statusIgnore })
      )
  );

  server.registerTool(
    'lpcrm_get_order_ids_by_user',
    {
      description: 'Get LP-CRM order IDs by user login and optional creation date range',
      inputSchema: {
        user: z.string().trim().min(1).max(100).describe('LP-CRM user login'),
        dateStart: dateSchema('Creation date from'),
        dateEnd: dateSchema('Creation date to'),
        limit: limitSchema,
      },
      annotations: READ_ONLY,
    },
    (args) =>
      run('lpcrm_get_order_ids_by_user', args, async () => {
        assertDateRange(args.dateStart, args.dateEnd);
        const response = await client.getOrderIdsByUser({
          user: args.user,
          dateStart: args.dateStart,
          dateEnd: args.dateEnd,
        });
        return limitIdList(response, args.limit);
      })
  );
}
