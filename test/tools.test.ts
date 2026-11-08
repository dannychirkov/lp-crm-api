import assert from 'node:assert/strict';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { LpCrmClient } from '../src/client.js';
import { LP_CRM_TOOL_NAMES, limitIdList, registerLpCrmTools } from '../src/mcp/tools.js';

interface ToolResult {
  isError?: boolean;
  content: Array<{ type: string; text: string }>;
}

async function connect(fakeClient: Partial<LpCrmClient>) {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerLpCrmTools(server, fakeClient as LpCrmClient);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '0.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  return {
    client,
    async call(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
      return (await client.callTool({ name, arguments: args })) as ToolResult;
    },
    async close() {
      await client.close();
      await server.close();
    },
  };
}

function payload(result: ToolResult): unknown {
  assert.equal(result.isError, undefined, result.content[0]?.text);
  return JSON.parse(result.content[0]!.text);
}

test('exposes only read-only LP-CRM tools with read-only annotations', async () => {
  const mcp = await connect({});
  const { tools } = await mcp.client.listTools();

  assert.deepEqual(
    tools.map((tool) => tool.name),
    [...LP_CRM_TOOL_NAMES]
  );
  for (const tool of tools) {
    assert.equal(tool.annotations?.readOnlyHint, true, tool.name);
    assert.equal(tool.annotations?.destructiveHint, false, tool.name);
  }

  await mcp.close();
});

test('routes status lookup to the client and formats JSON', async () => {
  let received: unknown;
  const mcp = await connect({
    async getOrderIdsByStatus(params) {
      received = params;
      return { status: 'ok', data: ['15198557827'] };
    },
  });

  const result = await mcp.call('lpcrm_get_order_ids_by_status', {
    status: '3',
    dateStart: '2026-04-23',
    dateEnd: '2026-04-30',
  });

  assert.deepEqual(payload(result), { status: 'ok', data: ['15198557827'] });
  assert.deepEqual(received, { status: '3', dateStart: '2026-04-23', dateEnd: '2026-04-30' });

  await mcp.close();
});

test('rejects malformed arguments before calling LP-CRM', async () => {
  let calls = 0;
  const count = async () => {
    calls += 1;
    return { status: 'ok' as const, data: [] };
  };
  const mcp = await connect({
    getOrderIdsByStatus: count,
    getOrdersById: count,
    getOrderIdsByUser: count,
    getProductsById: count,
  });

  const bad: Array<[string, Record<string, unknown>]> = [
    ['lpcrm_get_order_ids_by_status', {}],
    ['lpcrm_get_order_ids_by_status', { status: { $ne: 1 } }],
    ['lpcrm_get_order_ids_by_status', { status: '3,4' }],
    ['lpcrm_get_order_ids_by_status', { status: 3, dateStart: '23.04.2026' }],
    ['lpcrm_get_order_ids_by_status', { status: 3, dateStart: '2026-13-45' }],
    ['lpcrm_get_order_ids_by_status', { status: 3, limit: 0 }],
    ['lpcrm_get_orders_by_id', { orderIds: [] }],
    ['lpcrm_get_orders_by_id', { orderIds: Array.from({ length: 101 }, (_, i) => i + 1) }],
    ['lpcrm_get_orders_by_id', { orderIds: 'abc' }],
    ['lpcrm_get_products_by_id', { productIds: [1], statusIgnore: 'yes' }],
    ['lpcrm_get_order_ids_by_user', { user: '   ' }],
  ];

  for (const [name, args] of bad) {
    const result = await mcp.call(name, args);
    assert.equal(result.isError, true, `${name} ${JSON.stringify(args)} should fail`);
  }
  assert.equal(calls, 0);

  await mcp.close();
});

test('rejects an inverted date range', async () => {
  let calls = 0;
  const mcp = await connect({
    async getOrderIdsByUser() {
      calls += 1;
      return { status: 'ok', data: [] };
    },
  });

  const result = await mcp.call('lpcrm_get_order_ids_by_user', {
    user: 'admin',
    dateStart: '2026-05-01',
    dateEnd: '2026-04-01',
  });

  assert.equal(result.isError, true);
  assert.match(result.content[0]!.text, /dateStart must not be later than dateEnd/);
  assert.equal(calls, 0);

  await mcp.close();
});

test('truncates long ID lists and reports the total', async () => {
  const ids = Array.from({ length: 1200 }, (_, i) => String(i + 1));
  const mcp = await connect({
    async getOrderIdsByStatus() {
      return { status: 'ok', count: ids.length, data: ids };
    },
  });

  const byDefault = payload(await mcp.call('lpcrm_get_order_ids_by_status', { status: 3 })) as {
    data: string[];
    truncated: boolean;
    total_ids: number;
  };
  assert.equal(byDefault.data.length, 500);
  assert.equal(byDefault.truncated, true);
  assert.equal(byDefault.total_ids, 1200);

  const explicit = payload(
    await mcp.call('lpcrm_get_order_ids_by_status', { status: 3, limit: 2000 })
  ) as { data: string[]; truncated?: boolean };
  assert.equal(explicit.data.length, 1200);
  assert.equal(explicit.truncated, undefined);

  await mcp.close();
});

test('limitIdList leaves non-array data untouched', () => {
  const response = { status: 'ok' as const, data: { '1': 'x' } };
  assert.equal(limitIdList(response, 1), response);
});

test('passes product IDs and statusIgnore through', async () => {
  let received: unknown;
  const mcp = await connect({
    async getProductsById(params) {
      received = params;
      return { status: 'ok', data: {} };
    },
  });

  payload(await mcp.call('lpcrm_get_products_by_id', { productIds: [1, '2'], statusIgnore: true }));
  assert.deepEqual(received, { productIds: [1, '2'], statusIgnore: true });

  await mcp.close();
});

test('formats client errors as MCP tool errors', async () => {
  const mcp = await connect({
    async getStatuses() {
      throw new Error('boom');
    },
  });

  const result = await mcp.call('lpcrm_get_statuses');
  assert.equal(result.isError, true);
  assert.match(result.content[0]!.text, /boom/);

  await mcp.close();
});
