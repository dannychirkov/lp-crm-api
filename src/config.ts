import {
  DEFAULT_MAX_RETRIES,
  DEFAULT_MIN_REQUEST_INTERVAL_MS,
  DEFAULT_RETRY_DELAY_MS,
} from './defaults.js';

export interface ServerConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly minRequestIntervalMs?: number;
  readonly maxRetries?: number;
  readonly retryDelayMs?: number;
}

export interface NormalizedServerConfig extends ServerConfig {
  readonly minRequestIntervalMs: number;
  readonly maxRetries: number;
  readonly retryDelayMs: number;
}

function readNonNegativeInteger(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }

  return parsed;
}

function validateNonNegativeInteger(name: string, value: number | undefined): void {
  if (value === undefined) {
    return;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
}

export function loadConfig(): ServerConfig {
  const apiKey = process.env.LPCRM_API_KEY;
  const baseUrl = process.env.LPCRM_BASE_URL;
  const logLevel = (process.env.LOG_LEVEL || 'info') as ServerConfig['logLevel'];
  const minRequestIntervalMs = readNonNegativeInteger(
    'LPCRM_MIN_REQUEST_INTERVAL_MS',
    DEFAULT_MIN_REQUEST_INTERVAL_MS
  );
  const maxRetries = readNonNegativeInteger('LPCRM_MAX_RETRIES', DEFAULT_MAX_RETRIES);
  const retryDelayMs = readNonNegativeInteger('LPCRM_RETRY_DELAY_MS', DEFAULT_RETRY_DELAY_MS);

  if (!apiKey) {
    throw new Error('LPCRM_API_KEY environment variable is required');
  }

  if (!baseUrl) {
    throw new Error('LPCRM_BASE_URL environment variable is required');
  }

  return {
    apiKey,
    baseUrl,
    logLevel,
    minRequestIntervalMs,
    maxRetries,
    retryDelayMs,
  };
}

export function normalizeConfig(config: ServerConfig): NormalizedServerConfig {
  return {
    ...config,
    minRequestIntervalMs: config.minRequestIntervalMs ?? DEFAULT_MIN_REQUEST_INTERVAL_MS,
    maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
    retryDelayMs: config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS,
  };
}

export function validateConfig(config: ServerConfig): void {
  if (!config.apiKey.trim()) {
    throw new Error('LPCRM_API_KEY cannot be empty');
  }

  if (!config.baseUrl.trim()) {
    throw new Error('LPCRM_BASE_URL cannot be empty');
  }

  try {
    new URL(config.baseUrl);
  } catch {
    throw new Error(`Invalid LPCRM_BASE_URL: ${config.baseUrl}`);
  }

  if (!['debug', 'info', 'warn', 'error'].includes(config.logLevel)) {
    throw new Error(`Invalid LOG_LEVEL: ${config.logLevel}`);
  }

  validateNonNegativeInteger('LPCRM_MIN_REQUEST_INTERVAL_MS', config.minRequestIntervalMs);
  validateNonNegativeInteger('LPCRM_MAX_RETRIES', config.maxRetries);
  validateNonNegativeInteger('LPCRM_RETRY_DELAY_MS', config.retryDelayMs);
}
