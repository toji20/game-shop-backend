import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { GiftapiService } from './giftapi.service';
import { GiftapiSyncService } from './giftapi-sync.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class GiftapiOrderService {
  private readonly logger = new Logger(GiftapiOrderService.name);

  constructor(
    private readonly giftapi: GiftapiService,
    private readonly syncService: GiftapiSyncService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Создать заказ в GiftAPI
   * @param orderId ID заказа из нашей системы
   * @param skuId SKU ID товара из GiftAPI
   * @param fields Поля заказа (зависят от типа товара)
   * @param externalId Уникальный ID заказа (обычно ID из нашей ��Д)
   */
  async createOrder(
    orderId: string,
    skuId: string,
    fields: Record<string, any>,
    externalId?: string,
  ) {
    const extId = externalId || `order-${orderId}`;

    try {
      this.logger.log(`Creating GiftAPI order: ${extId} for SKU ${skuId}`);

      // Проверить наличие товара в каталоге
      const product = await this.syncService.getProductBySku(skuId);
      if (!product) {
        throw new BadRequestException(
          `SKU ${skuId} not found in catalog. Please sync catalog first.`,
        );
      }

      // if (product.stock <= 0) {
      //   throw new BadRequestException(`SKU ${skuId} is out of stock`);
      // }

      // Создать заказ в GiftAPI
      const response = await this.giftapi.createOrder(extId, skuId, fields);

      if (!response.success) {
        throw new Error(`GiftAPI error: ${response.error || 'Unknown error'}`);
      }

      const giftapiOrder = response.data;

      // Сохранить информацию о заказе в нашей БД
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          giftapiOrderId: giftapiOrder.id,
          giftapiExternalId: extId,
          giftapiStatus: giftapiOrder.status,
          giftapiDeliveryData: giftapiOrder.items[0]?.delivery_data || null,
        },
      });

      this.logger.log(`GiftAPI order created successfully: ${giftapiOrder.id}`);

      return giftapiOrder;
    } catch (error) {
      this.logger.error(
        `Failed to create GiftAPI order for ${orderId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Получить статус заказа из GiftAPI
   */
  async getOrderStatus(giftapiOrderId: string) {
    try {
      const order = await this.giftapi.getOrder(giftapiOrderId);
      return order.data;
    } catch (error) {
      this.logger.error(
        `Failed to get GiftAPI order status for ${giftapiOrderId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Обработать вебхук от GiftAPI
   */
  async handleWebhook(payload: any) {
    const { event, idempotency_key, data } = payload;

    try {
      // Проверить подпись вебхука
      const xTimestamp = payload.headers?.['x-timestamp'];
      const xSignature = payload.headers?.['x-signature'];

      if (xTimestamp && xSignature) {
        const isValid = this.giftapi.verifyWebhookSignature(
          xTimestamp,
          xSignature,
          event,
          idempotency_key,
        );

        if (!isValid) {
          this.logger.warn(`Invalid webhook signature for ${idempotency_key}`);
          // Можно выбросить ошибку или просто залогировать
          // throw new Error('Invalid webhook signature');
        }
      }

      if (event === 'order.status_changed') {
        await this.handleOrderStatusChanged(data.order, idempotency_key);
      }

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to handle GiftAPI webhook ${idempotency_key}:`,
        error,
      );
      // Важно вернуть 2xx статус, чтобы GiftAPI не пересылал вебхук
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Обработать изменение статуса заказа
   */
  private async handleOrderStatusChanged(
    giftapiOrder: any,
    idempotencyKey: string,
  ) {
    try {
      // Найти наш заказ по external_id из GiftAPI
      const ourOrder = await this.prisma.order.findFirst({
        where: {
          giftapiExternalId: giftapiOrder.external_id,
        },
      });

      if (!ourOrder) {
        this.logger.warn(
          `Order not found for GiftAPI external_id: ${giftapiOrder.external_id}`,
        );
        return;
      }

      // Обновить статус в нашей БД
      const statusMap = {
        completed: 'COMPLETED',
        failed: 'CANCELED',
        partially_completed: 'COMPLETED', // или отдельный статус
        processing: 'PROCESSING',
        created: 'PENDING',
      };

      const ourStatus =
        statusMap[giftapiOrder.status as keyof typeof statusMap] || 'PENDING';

      // Сохранить delivery данные
      const deliveryData = giftapiOrder.items?.[0]?.delivery_data || [];

      await this.prisma.order.update({
        where: { id: ourOrder.id },
        data: {
          giftapiStatus: giftapiOrder.status,
          giftapiDeliveryData: deliveryData,
          // Можно обновить и общий статус заказа если нужно
          // status: ourStatus,
        },
      });

      this.logger.log(
        `Updated order ${ourOrder.id} with GiftAPI status: ${giftapiOrder.status}`,
      );

      // Если заказ завершился - обновить основной статус
      if (
        giftapiOrder.status === 'completed' ||
        giftapiOrder.status === 'failed'
      ) {
        await this.prisma.order.update({
          where: { id: ourOrder.id },
          data: {
            status: ourStatus as any,
          },
        });

        this.logger.log(`Order ${ourOrder.id} final status: ${ourStatus}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle order status change for ${idempotencyKey}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Top-up eSIM (если поддерживается)
   */
  async topupEsim(
    orderId: string,
    iccid: string,
    skuId: string,
    externalId?: string,
  ) {
    const extId = externalId || `topup-${orderId}`;

    try {
      this.logger.log(`Creating eSIM top-up: ${extId} for ICCID ${iccid}`);

      const response = await this.giftapi.topupEsim(iccid, extId, skuId);

      if (!response.success) {
        throw new Error(`GiftAPI error: ${response.error || 'Unknown error'}`);
      }

      // Сохранить информацию
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          giftapiOrderId: response.data.id,
          giftapiExternalId: extId,
          giftapiStatus: response.data.status,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to create eSIM top-up for ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Получить статус eSIM
   */
  async getEsimStatus(iccid: string) {
    try {
      const response = await this.giftapi.getEsimStatus(iccid);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get eSIM status for ${iccid}:`, error);
      throw error;
    }
  }
}
