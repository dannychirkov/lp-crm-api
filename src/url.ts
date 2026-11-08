/**
 * Validates the LP-CRM base URL. The API key travels in the request body,
 * so plain HTTP would expose it to anyone on the network path.
 */
export function assertSecureBaseUrl(baseUrl: string, label = 'baseUrl'): URL {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error(`Invalid ${label}: ${baseUrl}`);
  }

  if (url.protocol !== 'https:') {
    throw new Error(`${label} must use https:// (the API key would be sent unencrypted)`);
  }

  if (url.username || url.password) {
    throw new Error(`${label} must not contain credentials`);
  }

  return url;
}
