export const DEFAULT_MIN_REQUEST_INTERVAL_MS = 1000;
export const DEFAULT_MAX_RETRIES = 2;
export const DEFAULT_RETRY_DELAY_MS = 2000;
export const DEFAULT_TIMEOUT_MS = 30000;
/** Upper bound for a server-provided Retry-After delay, so one 429 cannot stall the queue for hours. */
export const DEFAULT_MAX_RETRY_DELAY_MS = 60000;
/** Default cap on how many IDs an MCP tool returns, to keep LLM context small. */
export const DEFAULT_MCP_ID_LIMIT = 500;
