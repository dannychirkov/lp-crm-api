export type LpCrmStatus = 'ok' | 'error';

export interface LpCrmSuccessResponse<T = unknown> {
  readonly status: 'ok';
  readonly data?: T;
  readonly count?: number;
  readonly date_start?: string | null;
  readonly date_end?: string | null;
  readonly status_orders_id?: string | number;
  readonly status_orders_name?: string;
  readonly user?: string;
  readonly [key: string]: unknown;
}

export interface LpCrmErrorResponse {
  readonly status: 'error';
  readonly message: string | string[] | Record<string, unknown>;
  readonly [key: string]: unknown;
}

export type LpCrmResponse<T = unknown> = LpCrmSuccessResponse<T> | LpCrmErrorResponse;

export interface LpCrmCategory {
  readonly id: string | number;
  readonly name: string;
  readonly parent_id?: string | number;
  readonly subcategories?: LpCrmCategory[];
  readonly [key: string]: unknown;
}

export interface LpCrmProductVariant {
  readonly id?: string | number;
  readonly product_id?: string | number;
  readonly sub_id?: string | number;
  readonly name?: string;
  readonly quantity?: string | number;
  readonly [key: string]: unknown;
}

export interface LpCrmProduct {
  readonly id?: string | number;
  readonly category_id?: string | number;
  readonly title?: string;
  readonly name?: string;
  readonly model?: string;
  readonly localization?: string;
  readonly vendor?: string;
  readonly site?: string | number;
  readonly color?: string;
  readonly description?: string;
  readonly delivery_description?: string;
  readonly price?: string | number;
  readonly price_enter?: string | number;
  readonly currency?: string | number;
  readonly weight?: string | number;
  readonly width?: string | number;
  readonly height?: string | number;
  readonly depth?: string | number;
  readonly spec_price?: string | number;
  readonly quantity?: string | number;
  readonly subs?: LpCrmProductVariant[];
  readonly manufacturer?: string;
  readonly status?: string | number;
  readonly date?: string;
  readonly [key: string]: unknown;
}

export interface LpCrmOrderProduct {
  readonly type?: string;
  readonly product_id?: string | number;
  readonly name?: string;
  readonly product_name?: string;
  readonly sub_id?: string | number;
  readonly sub_name?: string;
  readonly price?: string | number;
  readonly quantity?: string | number;
  readonly [key: string]: unknown;
}

export interface LpCrmOrder {
  readonly id?: string | number;
  readonly order_id?: string | number;
  readonly site?: string;
  readonly localization?: string;
  readonly bayer_name?: string;
  readonly phone?: string;
  readonly phone_local?: string;
  readonly email?: string;
  readonly total?: string | number;
  readonly datetime?: string;
  readonly date_update?: string;
  readonly status?: string | number;
  readonly cancel_description?: string;
  readonly ip?: string;
  readonly delivery?: string;
  readonly delivery_date?: string;
  readonly delivery_adress?: string;
  readonly ttn?: string;
  readonly ttn_status?: string;
  readonly ttn_create?: string;
  readonly user?: string;
  readonly office?: string | number;
  readonly payment?: string | number;
  readonly date_complete?: string;
  readonly comment?: string;
  readonly utm_source?: string;
  readonly utm_medium?: string;
  readonly utm_term?: string;
  readonly utm_content?: string;
  readonly utm_campaign?: string;
  readonly products?: LpCrmOrderProduct[];
  readonly [key: string]: unknown;
}

export interface OrdersIdByStatusParams {
  readonly status: string | number;
  readonly dateStart?: string;
  readonly dateEnd?: string;
}

export interface OrdersIdByUserParams {
  readonly user: string;
  readonly dateStart?: string;
  readonly dateEnd?: string;
}

export interface GetProductsByIdParams {
  readonly productIds: string | number | Array<string | number>;
  readonly statusIgnore?: 0 | 1 | boolean;
}
