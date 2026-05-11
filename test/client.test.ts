import assert from 'node:assert/strict';
import test from 'node:test';
import { createLpCrmClient } from '../src/client.js';
import { LpCrmApiError } from '../src/errors.js';

interface FetchCall {
  readonly url: string;
  readonly init: RequestInit;
}

function makeFetch(responseBody: unknown, status = 200): { fetch: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fetchImpl = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    calls.push({ url: String(input), init: init ?? {} });

    return new Response(JSON.stringify(responseBody), {
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: { 'Content-Type': 'application/json' },
    });
  };

  return { fetch: fetchImpl as typeof fetch, calls };
}

function readForm(init: RequestInit): URLSearchParams {
  assert.ok(init.body instanceof URLSearchParams);
  return init.body;
}

test('posts form data with key and status date filters', async () => {
  const { fetch, calls } = makeFetch({
    status: 'ok',
    date_start: '2026-04-23',
    date_end: '2026-04-30',
    count: 1,
    data: ['15198557827'],
  });
  const client = createLpCrmClient({
    baseUrl: 'https://example.lp-crm.biz',
    apiKey: 'secret',
    fetch,
  });

  const result = await client.getOrderIdsByStatus({
    status: 3,
    dateStart: '2026-04-23',
    dateEnd: '2026-04-30',
  });

  assert.equal(result.status, 'ok');
  assert.deepEqual(result.data, ['15198557827']);
  assert.equal(calls[0]?.url, 'https://example.lp-crm.biz/api/getOrdersIdByStatus.html');
  assert.equal(calls[0]?.init.method, 'POST');

  const form = readForm(calls[0].init);
  assert.equal(form.get('key'), 'secret');
  assert.equal(form.get('status'), '3');
  assert.equal(form.get('date_start'), '2026-04-23');
  assert.equal(form.get('date_end'), '2026-04-30');
});

test('joins order IDs and enforces LP-CRM 100 order limit', async () => {
  const { fetch, calls } = makeFetch({
    status: 'ok',
    data: {
      '1': { order_id: '1' },
      '2': { order_id: '2' },
    },
  });
  const client = createLpCrmClient({
    baseUrl: 'https://example.lp-crm.biz/',
    apiKey: 'secret',
    fetch,
  });

  await client.getOrdersById(['1', 2, ' 3 ']);

  assert.equal(calls[0]?.url, 'https://example.lp-crm.biz/api/getOrdersByID.html');
  assert.equal(readForm(calls[0].init).get('order_id'), '1,2,3');

  await assert.rejects(
    () => client.getOrdersById(Array.from({ length: 101 }, (_, index) => index + 1)),
    /up to 100 order IDs/
  );
});

test('sends product status_ignore as 1 or 0', async () => {
  const { fetch, calls } = makeFetch({ status: 'ok', data: { id: '45' } });
  const client = createLpCrmClient({
    baseUrl: 'https://example.lp-crm.biz',
    apiKey: 'secret',
    fetch,
  });

  await client.getProductsById({ productIds: [45, 46], statusIgnore: true });
  await client.getProductsById({ productIds: 47, statusIgnore: false });

  assert.equal(readForm(calls[0].init).get('product_id'), '45,46');
  assert.equal(readForm(calls[0].init).get('status_ignore'), '1');
  assert.equal(readForm(calls[1].init).get('product_id'), '47');
  assert.equal(readForm(calls[1].init).get('status_ignore'), '0');
});

test('throws LP-CRM API errors with readable messages', async () => {
  const { fetch } = makeFetch({
    status: 'error',
    message: ['Нет товара в данной категории'],
  });
  const client = createLpCrmClient({
    baseUrl: 'https://example.lp-crm.biz',
    apiKey: 'secret',
    fetch,
  });

  await assert.rejects(
    () => client.getProductsByCategory(45),
    (error) =>
      error instanceof LpCrmApiError && error.message === 'Нет товара в данной категории'
  );
});

test('throws on non-JSON responses', async () => {
  const fetchImpl = async (): Promise<Response> => new Response('<html>bad gateway</html>');
  const client = createLpCrmClient({
    baseUrl: 'https://example.lp-crm.biz',
    apiKey: 'secret',
    fetch: fetchImpl as typeof fetch,
  });

  await assert.rejects(() => client.getStatuses(), /non-JSON response/);
});
