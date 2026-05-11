import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { LpCrmClient } from '../client.js';
import { logger } from '../logger.js';
import { formatError, formatSuccess } from './format.js';

export const lpCrmTools: Tool[] = [
  {
    name: 'lpcrm_get_statuses',
    description: 'Get LP-CRM order statuses',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'lpcrm_get_order_ids_by_status',
    description: 'Get LP-CRM order IDs by status and optional creation date range',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: ['string', 'number'],
          description: 'Order status ID',
        },
        dateStart: {
          type: 'string',
          description: 'Creation date from (YYYY-MM-DD)',
        },
        dateEnd: {
          type: 'string',
          description: 'Creation date to (YYYY-MM-DD)',
        },
      },
      required: ['status'],
    },
  },
  {
    name: 'lpcrm_get_orders_by_id',
    description: 'Get LP-CRM order details by one or more order IDs, up to 100',
    inputSchema: {
      type: 'object',
      properties: {
        orderIds: {
          oneOf: [
            { type: 'string' },
            { type: 'number' },
            {
              type: 'array',
              items: { type: ['string', 'number'] },
            },
          ],
          description: 'Order ID or array of order IDs',
        },
      },
      required: ['orderIds'],
    },
  },
  {
    name: 'lpcrm_get_categories',
    description: 'Get LP-CRM product categories',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'lpcrm_get_products_by_category',
    description: 'Get LP-CRM products by category ID',
    inputSchema: {
      type: 'object',
      properties: {
        categoryId: {
          type: ['string', 'number'],
          description: 'Category ID',
        },
      },
      required: ['categoryId'],
    },
  },
  {
    name: 'lpcrm_get_products_by_id',
    description: 'Get LP-CRM product details by one or more product IDs',
    inputSchema: {
      type: 'object',
      properties: {
        productIds: {
          oneOf: [
            { type: 'string' },
            { type: 'number' },
            {
              type: 'array',
              items: { type: ['string', 'number'] },
            },
          ],
          description: 'Product ID or array of product IDs',
        },
        statusIgnore: {
          type: 'boolean',
          description: 'Return enabled and disabled products when true',
        },
      },
      required: ['productIds'],
    },
  },
  {
    name: 'lpcrm_get_order_ids_by_user',
    description: 'Get LP-CRM order IDs by user login and optional creation date range',
    inputSchema: {
      type: 'object',
      properties: {
        user: {
          type: 'string',
          description: 'LP-CRM user login',
        },
        dateStart: {
          type: 'string',
          description: 'Creation date from (YYYY-MM-DD)',
        },
        dateEnd: {
          type: 'string',
          description: 'Creation date to (YYYY-MM-DD)',
        },
      },
      required: ['user'],
    },
  },
];

export async function handleLpCrmTool(
  toolName: string,
  args: Record<string, unknown>,
  client: LpCrmClient
) {
  logger.debug(`Handling tool: ${toolName}`, args);

  try {
    switch (toolName) {
      case 'lpcrm_get_statuses':
        return formatSuccess(await client.getStatuses());

      case 'lpcrm_get_order_ids_by_status':
        return formatSuccess(
          await client.getOrderIdsByStatus({
            status: args.status as string | number,
            dateStart: args.dateStart as string | undefined,
            dateEnd: args.dateEnd as string | undefined,
          })
        );

      case 'lpcrm_get_orders_by_id':
        return formatSuccess(
          await client.getOrdersById(args.orderIds as string | number | Array<string | number>)
        );

      case 'lpcrm_get_categories':
        return formatSuccess(await client.getCategories());

      case 'lpcrm_get_products_by_category':
        return formatSuccess(await client.getProductsByCategory(args.categoryId as string | number));

      case 'lpcrm_get_products_by_id':
        return formatSuccess(
          await client.getProductsById({
            productIds: args.productIds as string | number | Array<string | number>,
            statusIgnore: args.statusIgnore as boolean | undefined,
          })
        );

      case 'lpcrm_get_order_ids_by_user':
        return formatSuccess(
          await client.getOrderIdsByUser({
            user: args.user as string,
            dateStart: args.dateStart as string | undefined,
            dateEnd: args.dateEnd as string | undefined,
          })
        );

      default:
        return formatError(new Error(`Unknown tool: ${toolName}`));
    }
  } catch (error) {
    return formatError(error);
  }
}
