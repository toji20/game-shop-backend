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
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { OrderService } from './order.service';
import { OrderDto } from './dto/order.dto';
import { PaymentStatusDto } from './dto/payment-status.dto';
import { OptionalJwtGuard } from 'src/auth/guards/optional-jwt.guard';
import { GiftapiOrderService } from 'src/giftapi/giftapi-order.service';
import { GiftapiSyncService } from 'src/giftapi/giftapi-sync.service';

@Controller('orders')
export class OrderController {
  private readonly logger = new Logger(OrderController.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly giftapiOrderService: GiftapiOrderService,
    private readonly giftapiSyncService: GiftapiSyncService,
  ) {}

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
  @UseGuards(OptionalJwtGuard)
  @Post('giftapi/create')
  @HttpCode(201)
  async createGiftapiOrder(
    @Body()
    dto: {
      skuId: string;
      fields: Record<string, any>;
      orderId?: string;
    },
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id ?? null;

    if (!dto.skuId) {
      throw new BadRequestException('skuId is required');
    }

    if (!dto.fields || Object.keys(dto.fields).length === 0) {
      throw new BadRequestException('fields are required');
    }

    // Проверить, есть ли товар в каталоге
    const product = await this.giftapiSyncService.getProductBySku(dto.skuId);
    if (!product) {
      throw new BadRequestException(
        `SKU ${dto.skuId} not found. Please sync catalog first.`,
      );
    }

    this.logger.log(
      `Creating GiftAPI order for user ${userId || 'anonymous'}: SKU=${dto.skuId}`,
    );

    // Создать заказ в нашей БД
    const order = await this.orderService.createGiftapiOrder(
      {
        skuId: dto.skuId,
        fields: dto.fields,
        giftapiProductId: product.giftapiProductId,
        userId: userId ?? undefined,
      },
    );

    // Создать заказ в GiftAPI
    const giftapiOrder = await this.giftapiOrderService.createOrder(
      order.id,
      dto.skuId,
      dto.fields,
    );

    return {
      success: true,
      data: {
        orderId: order.id,
        giftapiOrderId: giftapiOrder.id,
        status: giftapiOrder.status,
        items: giftapiOrder.items,
      },
    };
  }
}
