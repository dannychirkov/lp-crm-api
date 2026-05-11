import assert from 'node:assert/strict';
import test from 'node:test';
import type { LpCrmClient } from '../src/client.js';
import { handleLpCrmTool, lpCrmTools } from '../src/mcp/tools.js';

function textPayload(result: { content?: Array<{ type: string; text: string }> }): unknown {
  assert.ok(result.content?.[0]);
  return JSON.parse(result.content[0].text);
}

test('exposes only read-only LP-CRM tools', () => {
  assert.deepEqual(
    lpCrmTools.map((tool) => tool.name),
    [
      'lpcrm_get_statuses',
      'lpcrm_get_order_ids_by_status',
      'lpcrm_get_orders_by_id',
      'lpcrm_get_categories',
      'lpcrm_get_products_by_category',
      'lpcrm_get_products_by_id',
      'lpcrm_get_order_ids_by_user',
    ]
  );
});

test('routes status lookup to the client and formats JSON', async () => {
  const client = {
    async getOrderIdsByStatus(params: unknown) {
      return {
        status: 'ok',
        received: params,
        data: ['15198557827'],
      };
    },
  } as LpCrmClient;

  const result = await handleLpCrmTool(
    'lpcrm_get_order_ids_by_status',
    { status: '3', dateStart: '2026-04-23', dateEnd: '2026-04-30' },
    client
  );

  assert.deepEqual(textPayload(result), {
    status: 'ok',
    received: {
      status: '3',
      dateStart: '2026-04-23',
      dateEnd: '2026-04-30',
    },
    data: ['15198557827'],
  });
});

test('formats unknown tool as MCP error', async () => {
  const result = await handleLpCrmTool('lpcrm_unknown', {}, {} as LpCrmClient);

  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /Unknown tool/);
});
