import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeConfig } from '../src/config.js';

test('normalizes MCP retry and rate-limit defaults', () => {
  const config = normalizeConfig({
    apiKey: 'secret',
    baseUrl: 'https://example.lp-crm.biz',
    logLevel: 'info',
  });

  assert.equal(config.minRequestIntervalMs, 1000);
  assert.equal(config.maxRetries, 2);
  assert.equal(config.retryDelayMs, 2000);
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
