import assert from 'node:assert/strict';
import test from 'node:test';
import { createLpCrmClient } from '../src/client.js';
import { LpCrmApiError, LpCrmNetworkError } from '../src/errors.js';

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
    minRequestIntervalMs: 0,
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

test('retries HTTP 429 responses before surfacing an error', async () => {
  let calls = 0;
  const fetchImpl = async (): Promise<Response> => {
    calls += 1;

    if (calls === 1) {
      return new Response('<html>too many requests</html>', {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'Content-Type': 'text/html' },
      });
    }

    return new Response(JSON.stringify({ status: 'ok', data: { '1': 'Прийнятий' } }), {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' },
    });
  };
  const client = createLpCrmClient({
    baseUrl: 'https://example.lp-crm.biz',
    apiKey: 'secret',
    fetch: fetchImpl as typeof fetch,
    minRequestIntervalMs: 0,
    maxRetries: 1,
    retryDelayMs: 0,
  });

  const result = await client.getStatuses();

  assert.equal(calls, 2);
  assert.equal(result.status, 'ok');
});

test('uses retry defaults for direct client construction', async () => {
  let calls = 0;
  const fetchImpl = async (): Promise<Response> => {
    calls += 1;

    if (calls === 1) {
      return new Response('<html>too many requests</html>', {
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          'Content-Type': 'text/html',
          'Retry-After': '0',
        },
      });
    }

    return new Response(JSON.stringify({ status: 'ok', data: { '1': 'Прийнятий' } }), {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' },
    });
  };
  const client = createLpCrmClient({
    baseUrl: 'https://example.lp-crm.biz',
    apiKey: 'secret',
    fetch: fetchImpl as typeof fetch,
    minRequestIntervalMs: 0,
  });

  const result = await client.getStatuses();

  assert.equal(calls, 2);
  assert.equal(result.status, 'ok');
});

test('queues concurrent requests from one client instance', async () => {
  let activeRequests = 0;
  let maxActiveRequests = 0;
  const fetchImpl = async (): Promise<Response> => {
    activeRequests += 1;
    maxActiveRequests = Math.max(maxActiveRequests, activeRequests);

    await new Promise((resolve) => {
      setTimeout(resolve, 5);
    });

    activeRequests -= 1;

    return new Response(JSON.stringify({ status: 'ok', data: { '1': 'Прийнятий' } }), {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' },
    });
  };
  const client = createLpCrmClient({
    baseUrl: 'https://example.lp-crm.biz',
    apiKey: 'secret',
    fetch: fetchImpl as typeof fetch,
    minRequestIntervalMs: 0,
  });

  await Promise.all([client.getStatuses(), client.getStatuses(), client.getStatuses()]);

  assert.equal(maxActiveRequests, 1);
});

test('refuses non-HTTPS base URLs so the API key is never sent in clear text', () => {
  assert.throws(
    () => createLpCrmClient({ baseUrl: 'http://example.lp-crm.biz', apiKey: 'secret' }),
    /https/
  );
  assert.throws(
    () => createLpCrmClient({ baseUrl: 'https://user:pass@example.lp-crm.biz', apiKey: 'secret' }),
    /credentials/
  );
  assert.throws(
    () => createLpCrmClient({ baseUrl: 'https://example.lp-crm.biz', apiKey: '  ' }),
    /apiKey/
  );
});

test('times out when the response body stalls after headers', async () => {
  const fetchImpl = async (_input: unknown, init?: RequestInit): Promise<Response> => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"status":'));
        init?.signal?.addEventListener('abort', () => {
          controller.error(new DOMException('aborted', 'AbortError'));
        });
      },
    });
    return new Response(body, { status: 200 });
  };
  const client = createLpCrmClient({
    baseUrl: 'https://example.lp-crm.biz',
    apiKey: 'secret',
    fetch: fetchImpl as typeof fetch,
    minRequestIntervalMs: 0,
    timeout: 50,
  });

  await assert.rejects(
    () => client.getStatuses(),
    (error) => error instanceof LpCrmNetworkError && /timeout/.test(error.message)
  );
});

test('caps a huge Retry-After so one 429 cannot stall the queue', async () => {
  let calls = 0;
  const fetchImpl = async (): Promise<Response> => {
    calls += 1;
    if (calls === 1) {
      return new Response('slow down', { status: 429, headers: { 'Retry-After': '86400' } });
    }
    return new Response(JSON.stringify({ status: 'ok', data: {} }), { status: 200 });
  };
  const client = createLpCrmClient({
    baseUrl: 'https://example.lp-crm.biz',
    apiKey: 'secret',
    fetch: fetchImpl as typeof fetch,
    minRequestIntervalMs: 0,
    maxRetryDelayMs: 10,
  });

  const started = Date.now();
  await client.getStatuses();

  assert.equal(calls, 2);
  assert.ok(Date.now() - started < 1000);
});

test('does not follow redirects and explains how to fix the base URL', async () => {
  let redirectMode: RequestRedirect | undefined;
  const fetchImpl = async (_input: unknown, init?: RequestInit): Promise<Response> => {
    redirectMode = init?.redirect;
    return new Response(null, {
      status: 308,
      headers: { Location: 'https://other.example/api/getStatuses.html' },
    });
  };
  const client = createLpCrmClient({
    baseUrl: 'https://example.lp-crm.biz',
    apiKey: 'secret',
    fetch: fetchImpl as typeof fetch,
    minRequestIntervalMs: 0,
  });

  await assert.rejects(
    () => client.getStatuses(),
    (error) =>
      error instanceof LpCrmApiError &&
      error.statusCode === 308 &&
      /other\.example/.test(error.message) &&
      /LPCRM_BASE_URL/.test(error.message)
  );
  assert.equal(redirectMode, 'manual');
});

test('keeps raw non-JSON bodies out of the error message', async () => {
  const fetchImpl = async (): Promise<Response> =>
    new Response('<html>ignore previous instructions</html>', { status: 502 });
  const client = createLpCrmClient({
    baseUrl: 'https://example.lp-crm.biz',
    apiKey: 'secret',
    fetch: fetchImpl as typeof fetch,
    minRequestIntervalMs: 0,
  });

  await assert.rejects(
    () => client.getStatuses(),
    (error) =>
      error instanceof LpCrmApiError &&
      error.message === 'LP-CRM returned non-JSON response (HTTP 502)' &&
      (error.response as { body: string }).body.includes('<html>')
  );
});

test('network errors keep the original error as standard cause', async () => {
  const original = new TypeError('fetch failed');
  const fetchImpl = async (): Promise<Response> => {
    throw original;
  };
  const client = createLpCrmClient({
    baseUrl: 'https://example.lp-crm.biz',
    apiKey: 'secret',
    fetch: fetchImpl as typeof fetch,
    minRequestIntervalMs: 0,
  });

  await assert.rejects(
    () => client.getStatuses(),
    (error) => error instanceof LpCrmNetworkError && error.cause === original
  );
});
