import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeConfig } from '../src/config.js';
import {
  DEFAULT_MAX_RETRIES,
  DEFAULT_MIN_REQUEST_INTERVAL_MS,
  DEFAULT_RETRY_DELAY_MS,
} from '../src/defaults.js';

test('normalizes MCP retry and rate-limit defaults', () => {
  const config = normalizeConfig({
    apiKey: 'secret',
    baseUrl: 'https://example.lp-crm.biz',
    logLevel: 'info',
  });

  assert.equal(config.minRequestIntervalMs, DEFAULT_MIN_REQUEST_INTERVAL_MS);
  assert.equal(config.maxRetries, DEFAULT_MAX_RETRIES);
  assert.equal(config.retryDelayMs, DEFAULT_RETRY_DELAY_MS);
});

test('preserves explicit zero retry and rate-limit settings', () => {
  const config = normalizeConfig({
    apiKey: 'secret',
    baseUrl: 'https://example.lp-crm.biz',
    logLevel: 'info',
    minRequestIntervalMs: 0,
    maxRetries: 0,
    retryDelayMs: 0,
  });

  assert.equal(config.minRequestIntervalMs, 0);
  assert.equal(config.maxRetries, 0);
  assert.equal(config.retryDelayMs, 0);
});
