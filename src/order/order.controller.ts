import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { OrderService } from './order.service';
import { CreateGiftApiPaymentDto, OrderDto } from './dto/order.dto';
// import { PaymentStatusDto } from './dto/payment-status.dto';
import { OptionalJwtGuard } from 'src/auth/guards/optional-jwt.guard';

@Controller('orders')
export class OrderController {
  private readonly logger = new Logger(OrderController.name);

  constructor(private readonly orderService: OrderService) {}

  @UseGuards(OptionalJwtGuard)
  @UsePipes(new ValidationPipe())
  @HttpCode(200)
  @Post('place')
  async checkout(@Body() dto: OrderDto, @Req() req: Request) {
    const userId = (req as any).user?.id ?? null;
    return this.orderService.createPayment(dto, userId);
  }

  /**
   * Вебхук Т-Банка. НЕ убирай ValidationPipe: без него в dto.Data/Receipt
   * попадёт что угодно, а verifyNotificationToken строго завязан на состав
   * полей.
   *
   * ВАЖНО: путь должен буквально совпадать с NotificationURL, который
   * передаётся в TBankService.init(...) внутри order.service.ts
   * (сейчас там `${API_URL}/order/tbank/webhook` — либо поменяй его на
   * `${API_URL}/orders/status`, либо перенеси этот метод на путь
   * 'tbank/webhook'). Иначе нотификации будут падать в никуда, а заказы
   * навсегда останутся в статусе PENDING.
   *
   * Т-Банк засчитывает нотификацию успешной ТОЛЬКО если получил HTTP 200
   * с телом ровно "OK" (заглавными буквами, без кавычек, без JSON). Если
   * этого не сделать — он будет ретраить нотификацию раз в час сутки,
   * затем раз в сутки ещё месяц.
   */
  @HttpCode(200)
  @Post('status')
  async updateStatus(@Body() dto: any, @Res() res: Response) {
    // ВРЕМЕННО для отладки формата нотификации Т-Банка — убрать после диагностики!
    this.logger.warn('RAW T-Bank notification: ' + JSON.stringify(dto));
    try {
      await this.orderService.updateStatus(dto);
    } catch (err) {
      this.logger.error('updateStatus упал:', err);
    }
    res.status(200).send('OK');
  }

  /**
   * Создать заказ напрямую через GiftAPI
   * POST /orders/giftapi/create
   *
   * Body:
   * {
   *   "skuId": "019bc0dd-8562-7173-afd9-a5cc534fafb7",
   *   "fields": { "quantity": 1 },
   *   "orderId": "order-123" // Optional, если нет - будет сгенерирован
   * }
   */
  @Post('giftapi/payment')
  @UseGuards(OptionalJwtGuard)
  @UsePipes(new ValidationPipe())
  async createGiftapiPayment(
    @Body() dto: CreateGiftApiPaymentDto,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id ?? null;

    return this.orderService.createGiftapiPayment(dto, userId);
  }
}
