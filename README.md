# lp-crm-api

[![npm version](https://img.shields.io/npm/v/lp-crm-api.svg)](https://www.npmjs.com/package/lp-crm-api)
[![License](https://img.shields.io/npm/l/lp-crm-api.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933.svg)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-3178c6.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-server-111827.svg)](https://modelcontextprotocol.io/)
[![Read only](https://img.shields.io/badge/CRM-read--only-0f766e.svg)](#supported-endpoints)

Read-only TypeScript client and MCP server for LP-CRM.

This package exposes only LP-CRM read endpoints. It is intended for AI assistants and internal tools that need to inspect orders, statuses, categories, and products without writing anything back to the CRM.

## Features

- Typed LP-CRM client for form-encoded API requests.
- MCP stdio server with read-only tools.
- No write endpoints; every MCP tool is annotated `readOnlyHint: true`.
- Strict input validation (zod) for every MCP tool argument.
- HTTPS-only: the API key is never sent over plain HTTP or to a redirect target.
- Node.js 20+ and native `fetch`.
- Unit tests for request formatting, error handling, timeouts, retries, MCP validation, and read-only tool exposure.

## Supported Endpoints

| LP-CRM endpoint | MCP tool |
| --- | --- |
| `getStatuses.html` | `lpcrm_get_statuses` |
| `getOrdersIdByStatus.html` | `lpcrm_get_order_ids_by_status` |
| `getOrdersByID.html` | `lpcrm_get_orders_by_id` |
| `getCategories.html` | `lpcrm_get_categories` |
| `getProductsByCategory.html` | `lpcrm_get_products_by_category` |
| `getProduct.html` | `lpcrm_get_products_by_id` |
| `getOrdersIdByUser.html` | `lpcrm_get_order_ids_by_user` |

## Installation

Use directly with `npx`:

```bash
npx -y lp-crm-api
```

Or install globally:

```bash
npm install -g lp-crm-api
lp-crm-mcp
```

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `LPCRM_BASE_URL` | Yes | LP-CRM cabinet URL, for example `https://example.lp-crm.biz`; must be `https://` |
| `LPCRM_API_KEY` | Yes | Outgoing/read API key |
| `LPCRM_MIN_REQUEST_INTERVAL_MS` | No | Minimum delay between LP-CRM requests from one MCP process; default is `1000` |
| `LPCRM_MAX_RETRIES` | No | Number of retries for LP-CRM HTTP `429` responses; default is `2` |
| `LPCRM_RETRY_DELAY_MS` | No | Retry delay when LP-CRM omits `Retry-After`; default is `2000` |
| `LPCRM_MAX_RETRY_DELAY_MS` | No | Upper bound for any retry delay, including `Retry-After`; default is `60000` |
| `LOG_LEVEL` | No | `debug`, `info`, `warn`, or `error`; default is `info` |

The API key is sent as the LP-CRM `key` form parameter. Do not commit real keys into your repository.

The MCP server serializes LP-CRM requests from one process. If LP-CRM returns HTTP `429`, the client retries after `Retry-After` when present, otherwise after `LPCRM_RETRY_DELAY_MS`, doubled on each repeat, and never waits longer than `LPCRM_MAX_RETRY_DELAY_MS`. Each request (including reading the response body) times out after 30 seconds.

Redirects are not followed. If your cabinet URL redirects (for example to `www.`), the error message shows the target; put that final URL into `LPCRM_BASE_URL`.

## MCP Configuration

With `npx`:

```json
{
  "mcpServers": {
    "lp-crm": {
      "command": "npx",
      "args": ["-y", "lp-crm-api"],
      "env": {
        "LPCRM_BASE_URL": "https://your-account.lp-crm.biz",
        "LPCRM_API_KEY": "your-read-key"
      }
    }
  }
}
```

With a local checkout:

```json
{
  "mcpServers": {
    "lp-crm": {
      "command": "node",
      "args": ["/path/to/lp-crm-api/dist/cli/index.js"],
      "env": {
        "LPCRM_BASE_URL": "https://your-account.lp-crm.biz",
        "LPCRM_API_KEY": "your-read-key"
      }
    }
  }
}
```

## Client Usage

```ts
import { createLpCrmClient } from 'lp-crm-api';

const client = createLpCrmClient({
  baseUrl: process.env.LPCRM_BASE_URL!,
  apiKey: process.env.LPCRM_API_KEY!,
});

const statuses = await client.getStatuses();
const orderIds = await client.getOrderIdsByStatus({ status: 3 });
const orders = await client.getOrdersById(orderIds.data?.slice(0, 10) ?? []);
```

Direct client instances use the same retry and rate-limit defaults as the MCP server. Pass `minRequestIntervalMs`, `maxRetries`, `retryDelayMs`, `maxRetryDelayMs`, or `timeout` to tune them; `0` disables the corresponding delay or retry count.

The MCP server lives in a separate entry point, so importing the client does not load the MCP SDK:

```ts
import { createServer, runServer } from 'lp-crm-api/mcp';
```

## Tools

All IDs must be numeric (a number or a string of digits). Dates use `YYYY-MM-DD` (optionally `YYYY-MM-DD HH:MM[:SS]`). Invalid arguments are rejected before any request is sent to LP-CRM.

Tools that return lists of order IDs accept an optional `limit` (default `500`, max `5000`). When the list is longer, the response contains the first `limit` IDs plus `truncated: true` and `total_ids`.

### `lpcrm_get_statuses`

Get LP-CRM order statuses.

### `lpcrm_get_order_ids_by_status`

Get order IDs by status.

Input:

```json
{
  "status": "3",
  "dateStart": "2026-04-23",
  "dateEnd": "2026-04-30"
}
```

### `lpcrm_get_orders_by_id`

Get order details by one or more order IDs. LP-CRM accepts up to 100 IDs per request.

Input:

```json
{
  "orderIds": ["15198557827"]
}
```

### `lpcrm_get_categories`

Get the LP-CRM product category tree.

### `lpcrm_get_products_by_category`

Get products by category ID.

Input:

```json
{
  "categoryId": 1
}
```

### `lpcrm_get_products_by_id`

Get product details by one or more product IDs.

Input:

```json
{
  "productIds": [1, 2],
  "statusIgnore": true
}
```

`statusIgnore: true` sends `status_ignore=1`; `false` sends `status_ignore=0`.

### `lpcrm_get_order_ids_by_user`

Get order IDs by LP-CRM user login.

Input:

```json
{
  "user": "admin",
  "dateStart": "2026-04-23",
  "dateEnd": "2026-04-30"
}
```

## Development

```bash
npm install
npm test
npm run type-check
npm run build
```

Run the MCP server locally:

```bash
LPCRM_BASE_URL=https://example.lp-crm.biz LPCRM_API_KEY=... npm run dev
```

## Live Verification

The current implementation was checked against a test LP-CRM cabinet:

- `getStatuses.html`: ok
- `getOrdersIdByStatus.html`: ok
- `getOrdersByID.html`: ok
- `getCategories.html`: ok
- `getProductsByCategory.html`: endpoint reachable; the tested cabinet returned "no products in category"
- `getProduct.html`: ok
- `getOrdersIdByUser.html`: ok
