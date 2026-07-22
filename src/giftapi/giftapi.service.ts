import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface GiftApiConfig {
  baseUrl: string;
  token: string;
  secret: string;
}

@Injectable()
export class GiftapiService {
  private config: GiftApiConfig;
  private readonly logger = new Logger(GiftapiService.name);

  constructor(private readonly configService: ConfigService) {
    const baseUrl = this.configService.get<string>('GIFTAPI_BASE_URL');
    const token = this.configService.get<string>('GIFTAPI_TOKEN');
    const secret = this.configService.get<string>('GIFTAPI_SECRET');

    if (!baseUrl || !token || !secret) {
      throw new Error(
        'GiftAPI env variables are not defined: GIFTAPI_BASE_URL, GIFTAPI_TOKEN, GIFTAPI_SECRET',
      );
    }

    this.config = { baseUrl, token, secret };
  }

  /**
   * Получить информацию о партнере и баланс
   */
  async getPartnerInfo() {
    return this.request('GET', '/me');
  }

  /**
   * Получить текущий баланс
   */
  async getBalance() {
    return this.request('GET', '/balance');
  }

  /**
   * Получить историю транзакций баланса
   */
  async getBalanceHistory(cursor?: string, perPage: number = 50) {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('per_page', perPage.toString());

    return this.request('GET', `/balance/history?${params.toString()}`);
  }

  /**
   * Получить список продуктов с фильтрацией
   */
  async getProducts(options?: {
    locale?: 'en' | 'ru';
    cursor?: string;
    perPage?: number;
    categoryId?: number;
    type?: string;
    includeSKUs?: boolean;
  }) {
    const params = new URLSearchParams();
    if (options?.locale) params.append('locale', options.locale);
    if (options?.cursor) params.append('cursor', options.cursor);
    if (options?.perPage) params.append('per_page', options.perPage.toString());
    if (options?.categoryId) params.append('category_id', options.categoryId.toString());
    if (options?.type) params.append('type', options.type);
    if (options?.includeSKUs) params.append('include_skus', 'true');

    return this.request('GET', `/catalog/products?${params.toString()}`);
  }

  /**
   * Получить детали одного продукта
   */
  async getProduct(productId: string, locale?: 'en' | 'ru') {
    const params = new URLSearchParams();
    if (locale) params.append('locale', locale);

    return this.request('GET', `/catalog/products/${productId}?${params.toString()}`);
  }

  /**
   * Получить прайс-лист товаров
   */
  async getPricelist(options?: {
    locale?: 'en' | 'ru';
    cursor?: string;
    perPage?: number;
    categoryId?: number;
    type?: string;
  }) {
    const params = new URLSearchParams();
    if (options?.locale) params.append('locale', options.locale);
    if (options?.cursor) params.append('cursor', options.cursor);
    if (options?.perPage) params.append('per_page', options.perPage.toString());
    if (options?.categoryId) params.append('category_id', options.categoryId.toString());
    if (options?.type) params.append('type', options.type);

    return this.request('GET', `/catalog/pricelist?${params.toString()}`);
  }

  /**
   * Получить категории
   */
  async getCategories(options?: {
    locale?: 'en' | 'ru';
    target?: 'product' | 'sku';
  }) {
    const params = new URLSearchParams();
    if (options?.locale) params.append('locale', options.locale);
    if (options?.target) params.append('target', options.target);

    return this.request('GET', `/catalog/categories?${params.toString()}`);
  }

  /**
   * Получить список заказов
   */
  async getOrders(options?: {
    cursor?: string;
    perPage?: number;
    status?: string;
    externalId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const params = new URLSearchParams();
    if (options?.cursor) params.append('cursor', options.cursor);
    if (options?.perPage) params.append('per_page', options.perPage.toString());
    if (options?.status) params.append('status', options.status);
    if (options?.externalId) params.append('external_id', options.externalId);
    if (options?.dateFrom) params.append('date_from', options.dateFrom);
    if (options?.dateTo) params.append('date_to', options.dateTo);

    return this.request('GET', `/orders?${params.toString()}`);
  }

  /**
   * Получить детали заказа
   */
  async getOrder(orderId: string) {
    return this.request('GET', `/orders/${orderId}`);
  }

  /**
   * Создать заказ
   * @param externalId Уникальный ID заказа на вашей стороне
   * @param skuId ID товара из каталога GiftAPI
   * @param fields Поля заказа (зависят от типа товара)
   * @param metadata Дополнительные метаданные
   */
  async createOrder(
    externalId: string,
    skuId: string,
    fields: Record<string, any>,
    metadata?: Record<string, any>,
  ) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.generateSignature(timestamp, skuId, externalId);

    return this.request(
      'POST',
      '/orders',
      {
        external_id: externalId,
        item: {
          sku_id: skuId,
          fields,
        },
        ...(metadata && { metadata }),
      },
      {
        'X-Timestamp': timestamp.toString(),
        'X-Signature': signature,
      },
    );
  }

  /**
   * Top-up eSIM с новым пакетом данных
   */
  async topupEsim(
    iccid: string,
    externalId: string,
    skuUuid?: string,
  ) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.generateSignature(timestamp, iccid, externalId);

    return this.request(
      'POST',
      `/esim/${iccid}/topup`,
      {
        external_id: externalId,
        ...(skuUuid && { sku_uuid: skuUuid }),
      },
      {
        'X-Timestamp': timestamp.toString(),
        'X-Signature': signature,
      },
    );
  }

  /**
   * Получить статус eSIM
   */
  async getEsimStatus(iccid: string) {
    return this.request('GET', `/services/esim/${iccid}/status`);
  }

  /**
   * Проверить подпись вебхука
   */
  verifyWebhookSignature(
    timestamp: string,
    signature: string,
    event: string,
    idempotencyKey: string,
  ): boolean {
    const message = timestamp + event + idempotencyKey;
    const expectedSignature = crypto
      .createHmac('sha256', this.config.secret)
      .update(message)
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Приватный метод для HTTP запросов
   */
  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: any,
    customHeaders?: Record<string, string>,
  ) {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.config.token}`,
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    try {
      const options: RequestInit = {
        method,
        headers,
      };

      if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        this.logger.error(
          `GiftAPI Error: ${method} ${path} - Status ${response.status}`,
          data,
        );
        throw new Error(`GiftAPI Error: ${data.error || 'Unknown error'}`);
      }

      return data;
    } catch (error) {
      this.logger.error(`GiftAPI Request failed: ${method} ${path}`, error);
      throw error;
    }
  }

  /**
   * Генерация HMAC-SHA256 подписи
   */
  private generateSignature(
    timestamp: number,
    skuIdOrIccid: string,
    externalId: string,
  ): string {
    const message = timestamp + skuIdOrIccid + externalId;
    return crypto
      .createHmac('sha256', this.config.secret)
      .update(message)
      .digest('hex');
  }
}
