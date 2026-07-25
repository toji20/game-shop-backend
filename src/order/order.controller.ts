import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { OrderService } from './order.service';
import { CreateGiftApiPaymentDto, OrderDto } from './dto/order.dto';
import { PaymentStatusDto } from './dto/payment-status.dto';
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

  @HttpCode(200)
  @Post('status')
  async updateStatus(@Body() dto: PaymentStatusDto) {
    return this.orderService.updateStatus(dto);
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
