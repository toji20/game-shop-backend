import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { GiftapiOrderService } from './giftapi-order.service';
import { GiftapiService } from './giftapi.service';

@Controller('giftapi/webhooks')
export class GiftapiWebhookController {
  private readonly logger = new Logger(GiftapiWebhookController.name);

  constructor(
    private readonly orderService: GiftapiOrderService,
    private readonly giftapi: GiftapiService,
  ) {}

  /**
   * Webhook endpoint для событий от GiftAPI
   * POST /giftapi/webhooks/order-status
   *
   * GiftAPI будет отправлять POST запросы с headers:
   * - X-Timestamp: Unix timestamp (seconds)
   * - X-Signature: HMAC-SHA256 signature
   *
   * Body:
   * {
   *   "event": "order.status_changed",
   *   "timestamp": "2026-01-15T12:58:23+00:00",
   *   "idempotency_key": "550e8400-e29b-41d4-a716-446655440000",
   *   "data": {
   *     "order": { ... }
   *   }
   * }
   */
  @Post('order-status')
  @HttpCode(200)
  async handleOrderStatusWebhook(
    @Body() payload: any,
    @Headers('x-timestamp') xTimestamp: string,
    @Headers('x-signature') xSignature: string,
  ) {
    try {
      const { event, idempotency_key, data } = payload;

      this.logger.log(
        `Received GiftAPI webhook: ${event} (idempotency_key: ${idempotency_key})`,
      );

      // Проверить подпись если хедеры присутствуют
      if (xTimestamp && xSignature) {
        const isValid = this.giftapi.verifyWebhookSignature(
          xTimestamp,
          xSignature,
          event,
          idempotency_key,
        );

        if (!isValid) {
          this.logger.warn(
            `Invalid webhook signature for ${idempotency_key}`,
          );
          // Можно выбросить ошибку или просто залогировать
          // throw new BadRequestException('Invalid webhook signature');
        }
      }

      // Обработать webhook
      const result = await this.orderService.handleWebhook({
        event,
        idempotency_key,
        data,
        timestamp: payload.timestamp,
        headers: {
          'x-timestamp': xTimestamp,
          'x-signature': xSignature,
        },
      });

      this.logger.log(
        `Webhook processed successfully: ${idempotency_key}`,
      );

      // GiftAPI требует ответ 2xx
      return { success: true, idempotency_key };
    } catch (error) {
      this.logger.error(
        `Error processing webhook:`,
        error,
      );
      // Важно вернуть 2xx, иначе GiftAPI будет переотправлять
      // максимум 5 раз с экспоненциальной задержкой
      return { success: false, error: error.message };
    }
  }

  /**
   * Health check endpoint для проверки доступности вебхука
   * GET /giftapi/webhooks/health
   */
  @Post('health')
  @HttpCode(200)
  async health() {
    return { status: 'ok' };
  }
}
