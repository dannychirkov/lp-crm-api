import { LpCrmApiError, LpCrmNetworkError } from './errors.js';
import type {
  GetProductsByIdParams,
  LpCrmCategory,
  LpCrmOrder,
  LpCrmProduct,
  LpCrmResponse,
  LpCrmSuccessResponse,
  OrdersIdByStatusParams,
  OrdersIdByUserParams,
} from './types.js';

export interface LpCrmClientConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly fetch?: typeof fetch;
  readonly timeout?: number;
}

function compactParams(params: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = String(value);
    }
  }

  return result;
}

function joinIds(ids: string | number | Array<string | number>): string {
  const values = Array.isArray(ids) ? ids : [ids];
  return values.map((id) => String(id).trim()).filter(Boolean).join(',');
}

function messageToString(message: unknown): string {
  if (Array.isArray(message)) {
    return message.map((item) => String(item)).join('; ');
  }

  if (typeof message === 'string') {
    return message;
  }

  return JSON.stringify(message);
}

export class LpCrmClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchFn: typeof fetch;
  private readonly timeout: number;

  constructor(config: LpCrmClientConfig) {
    this.baseUrl = config.baseUrl.endsWith('/') ? config.baseUrl : `${config.baseUrl}/`;
    this.apiKey = config.apiKey;
    this.fetchFn = config.fetch ?? fetch;
    this.timeout = config.timeout ?? 30000;
  }

  async getStatuses(): Promise<LpCrmSuccessResponse<Record<string, string>>> {
    return this.post<Record<string, string>>('api/getStatuses.html');
  }

  async getOrderIdsByStatus(
    params: OrdersIdByStatusParams
  ): Promise<LpCrmSuccessResponse<Array<string | number>>> {
    return this.post<Array<string | number>>('api/getOrdersIdByStatus.html', {
      status: params.status,
      date_start: params.dateStart,
      date_end: params.dateEnd,
    });
  }

  async getOrdersById(
    orderIds: string | number | Array<string | number>
  ): Promise<LpCrmSuccessResponse<LpCrmOrder | Record<string, LpCrmOrder>>> {
    const orderId = joinIds(orderIds);
    if (!orderId) {
      throw new LpCrmApiError('At least one order ID is required');
    }

    if (orderId.split(',').length > 100) {
      throw new LpCrmApiError('LP-CRM getOrdersByID.html accepts up to 100 order IDs');
    }

    return this.post<LpCrmOrder | Record<string, LpCrmOrder>>('api/getOrdersByID.html', {
      order_id: orderId,
    });
  }

  async getCategories(): Promise<LpCrmSuccessResponse<Record<string, LpCrmCategory>>> {
    return this.post<Record<string, LpCrmCategory>>('api/getCategories.html');
  }

  async getProductsByCategory(
    categoryId: string | number
  ): Promise<LpCrmSuccessResponse<LpCrmProduct[] | Record<string, LpCrmProduct>>> {
    return this.post<LpCrmProduct[] | Record<string, LpCrmProduct>>(
      'api/getProductsByCategory.html',
      {
        category_id: categoryId,
      }
    );
  }

  async getProductsById(
    params: GetProductsByIdParams
  ): Promise<LpCrmSuccessResponse<LpCrmProduct | Record<string, LpCrmProduct>>> {
    const productId = joinIds(params.productIds);
    if (!productId) {
      throw new LpCrmApiError('At least one product ID is required');
    }

    return this.post<LpCrmProduct | Record<string, LpCrmProduct>>('api/getProduct.html', {
      product_id: productId,
      status_ignore:
        params.statusIgnore === undefined ? undefined : params.statusIgnore === true ? 1 : 0,
    });
  }

  async getOrderIdsByUser(
    params: OrdersIdByUserParams
  ): Promise<LpCrmSuccessResponse<Array<string | number>>> {
    return this.post<Array<string | number>>('api/getOrdersIdByUser.html', {
      user: params.user,
      date_start: params.dateStart,
      date_end: params.dateEnd,
    });
  }

  private async post<T>(
    endpoint: string,
    params: Record<string, unknown> = {}
  ): Promise<LpCrmSuccessResponse<T>> {
    const url = new URL(endpoint, this.baseUrl).toString();
    const body = new URLSearchParams({
      key: this.apiKey,
      ...compactParams(params),
    });
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.timeout);

    try {
      const response = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      const text = await response.text();
      let data: LpCrmResponse<T>;

      try {
        data = JSON.parse(text) as LpCrmResponse<T>;
      } catch (error) {
        throw new LpCrmApiError(`LP-CRM returned non-JSON response: ${text.slice(0, 200)}`, text, response.status);
      }

      if (!response.ok) {
        throw new LpCrmApiError(`HTTP ${response.status}: ${response.statusText}`, data, response.status);
      }

      if (data.status === 'error') {
        throw new LpCrmApiError(messageToString(data.message), data, response.status);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof LpCrmApiError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new LpCrmNetworkError('LP-CRM request timeout', error);
        }

        throw new LpCrmNetworkError(`LP-CRM network error: ${error.message}`, error);
      }

      throw error;
    }
  }
}

export function createLpCrmClient(config: LpCrmClientConfig): LpCrmClient {
  return new LpCrmClient(config);
}
