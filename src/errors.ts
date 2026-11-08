export class LpCrmError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'LpCrmError';
    Object.setPrototypeOf(this, LpCrmError.prototype);
  }
}

export class LpCrmApiError extends LpCrmError {
  constructor(
    message: string,
    public readonly response?: unknown,
    statusCode?: number
  ) {
    super(message, 'API_ERROR', statusCode);
    this.name = 'LpCrmApiError';
    Object.setPrototypeOf(this, LpCrmApiError.prototype);
  }
}

export class LpCrmNetworkError extends LpCrmError {
  constructor(message: string, cause?: unknown) {
    super(message, 'NETWORK_ERROR', undefined, cause === undefined ? undefined : { cause });
    this.name = 'LpCrmNetworkError';
    Object.setPrototypeOf(this, LpCrmNetworkError.prototype);
  }
}
