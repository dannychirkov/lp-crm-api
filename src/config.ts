export interface ServerConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export function loadConfig(): ServerConfig {
  const apiKey = process.env.LPCRM_API_KEY;
  const baseUrl = process.env.LPCRM_BASE_URL;
  const logLevel = (process.env.LOG_LEVEL || 'info') as ServerConfig['logLevel'];

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
}
