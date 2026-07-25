import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
  UnauthorizedException,
  Get,
} from '@nestjs/common';
import { GiftapiOrderService } from './giftapi-order.service';
import { GiftapiService } from './giftapi.service';
import { GiftApiWebhookPayloadDto } from './dto/giftapi-product.dto';

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
    @Body() payload: GiftApiWebhookPayloadDto,
    @Headers('x-timestamp') xTimestamp: string,
    @Headers('x-signature') xSignature: string,
  ) {
    try {
      const { event, idempotency_key } = payload;

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
          throw new UnauthorizedException('Invalid signature');
        }
      }

      // Обработать webhook
      await this.orderService.handleWebhook(payload);

      this.logger.log(`Webhook processed successfully: ${idempotency_key}`);

      // GiftAPI требует ответ 2xx
      return { success: true, idempotency_key };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error processing webhook: ${message}`, error);
      // Важно вернуть 2xx, иначе GiftAPI будет переотправлять
      // максимум 5 раз с экспоненциальной задержкой
      return { success: false, error: message };
    }
  }

  /**
   * Health check endpoint для проверки доступности вебхука
   * GET /giftapi/webhooks/health
   */
  @Get('health')
  @HttpCode(200)
  async health() {
    return { status: 'ok' };
  }
}
