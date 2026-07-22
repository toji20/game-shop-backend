/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ICapturePayment,
  IPaymentMethodData,
  YooCheckout,
} from '@a2seven/yoo-checkout';
import { OrderDto, OrderItemDto } from './dto/order.dto';
import { ConfigService } from '@nestjs/config';
import { PaymentMethod, PaymentStatusDto } from './dto/payment-status.dto';
import { EnumOrderStatus, ManualStatus, OrderType } from '@prisma/client';
import { DonatehubGameService } from 'src/donate-hub-game/donate-hub-game.service';
import { SteamOrderService } from 'src/steam-order/steam-order.service';
import { OrderGateway } from './order.gateway';
import { PromoService } from 'src/promo/promo.service';
import { PromoTarget } from 'src/promo/dto/promo.dto';

@Injectable()
export class OrderService {
  private checkout: YooCheckout;
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly donatehubGameService: DonatehubGameService,
    private readonly steamOrderService: SteamOrderService,
    private readonly gateway: OrderGateway,
    private readonly promoService: PromoService,
  ) {
    const shopId = this.configService.get<string>('YOOKASSA_SHOP_ID');
    const secretKey = this.configService.get<string>('YOOKASSA_SECRET_KEY');

    if (!shopId || !secretKey) {
      throw new Error('YooKassa env variables are not defined');
    }

    this.checkout = new YooCheckout({ shopId, secretKey });
  }

  /**
   * Создать заказ с платежом через YooKassa
   */
  async createPayment(dto: OrderDto, userId: string | null) {
    let total = dto.items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );

    let promoCodeId: string | null = null;

    if (dto.promoCode && userId) {
      const promo = await this.promoService.apply(
        {
          code: dto.promoCode,
          target: PromoTarget.GAME,
        },
        userId,
      );

      total = total * (1 - promo.discount / 100);
      promoCodeId = promo.id;
    }

    const method = dto.paymentMethod ?? PaymentMethod.BANK_CARD;
    const commissionRate =
      method === PaymentMethod.SBP
        ? 1.01
        : method === PaymentMethod.BANK_CARD
          ? 1.02
          : 1;

    total = +(total * commissionRate).toFixed(2);

    this.logger.log(`Комиссия x${commissionRate} (${method}), итого: ${total}`);

    const gameIds = [...new Set(dto.items.map((i) => Number(i.gameId)))];
    const allGameFields = await this.prisma.gameField.findMany({
      where: { gameId: { in: gameIds } },
    });

    const orderItemsData = dto.items.map((item: OrderItemDto) => {
      const mappedFields: Record<string, string> = {};

      if (item.fields && Object.keys(item.fields).length > 0) {
        const gameFields = allGameFields.filter(
          (f) => f.gameId === Number(item.gameId),
        );

        for (const [fieldId, value] of Object.entries(item.fields)) {
          const field = gameFields.find((f) => f.id === Number(fieldId));
          mappedFields[field ? field.label : fieldId] = value;
        }
      }

      return {
        quantity: item.quantity,
        price: item.price,
        fields: mappedFields,
        game: { connect: { id: Number(item.gameId) } },
        position: { connect: { id: Number(item.positionId) } },
      };
    });

    const order = await this.prisma.order.create({
      data: {
        status: EnumOrderStatus.PENDING,
        type: dto.type ?? OrderType.AUTO,
        total,
        userId: userId ?? undefined,
        items: { create: orderItemsData },
      },
      include: { items: true },
    });

    this.logger.log(
      `Заказ создан: ${order.id}, type: ${order.type}, total: ${total}`,
    );

    const payment = await this.checkout.createPayment({
      amount: { value: total.toFixed(2), currency: 'RUB' },
      capture: true,
      payment_method_data: this.buildPaymentMethodData(
        dto.paymentMethod ?? PaymentMethod.BANK_CARD,
      ),
      confirmation: {
        type: 'redirect',
        return_url: `${process.env.CLIENT_URL}/order/${order.id}`,
      },
      description: `Оплата заказа #${order.id}`,
    });

    if (promoCodeId && userId) {
      await this.prisma.promoCodeUse.create({
        data: {
          promoCodeId,
          userId,
          orderId: order.id,
        },
      });
    }

    return { order, payment };
  }

  /**
   * Создать заказ товара из GiftAPI каталога
   * Заказ создается в локальной БД, а затем отправляется в GiftAPI
   */
  async createGiftapiOrder(data: {
    skuId: string;
    fields: Record<string, any>;
    giftapiProductId: string;
    userId?: string;
  }) {
    const order = await this.prisma.order.create({
      data: {
        status: EnumOrderStatus.PENDING,
        type: OrderType.AUTO,
        total: 0, // Итоговую сумму заполнит GiftAPI
        userId: data.userId ?? undefined,
        giftapiProductId: data.giftapiProductId,
        items: {
          create: {
            quantity: 1,
            price: 0,
            fields: data.fields,
            game: undefined, // GiftAPI заказы не связаны с играми
            position: undefined,
          },
        },
      },
      include: { items: true },
    });

    this.logger.log(
      `GiftAPI заказ создан локально: ${order.id}, SKU: ${data.skuId}`,
    );

    return order;
  }

  async updateStatus(dto: PaymentStatusDto) {
    this.logger.log(`Получен вебхук: ${dto.event}`);

    this.handleWebhook(dto).catch((err) =>
      this.logger.error('handleWebhook упал:', err),
    );

    return true;
  }

  private async handleWebhook(dto: PaymentStatusDto) {
    if (dto.event === 'payment.waiting_for_capture') {
      const capturePayment: ICapturePayment = {
        amount: {
          value: dto.object.amount.value,
          currency: dto.object.amount.currency,
        },
      };

      return this.checkout.capturePayment(dto.object.id, capturePayment);
    }

    if (dto.event === 'payment.succeeded') {
      const description = dto.object.description ?? '';
      this.logger.log(`description: "${description}"`);

      if (description.startsWith('Пополнение Steam #')) {
        await this.steamOrderService.handleSuccessPayment(description);
      } else if (description.startsWith('Оплата заказа #')) {
        await this.handleGameOrderPayment(description);
      } else {
        this.logger.warn(`Неизвестный тип заказа: "${description}"`);
      }
    }
  }

  private async handleGameOrderPayment(description: string) {
    const orderId = description.split('#')[1]?.trim();

    if (!orderId) {
      this.logger.error('orderId не найден в description');
      return;
    }

    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        type: true,
        userId: true,
        promoCodes: {
          select: { promoCodeId: true },
        },
      },
    });

    if (!existing) {
      this.logger.error(`Заказ ${orderId} не найден в БД`);
      return;
    }

    const isManual = existing.type === OrderType.MANUAL;

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: EnumOrderStatus.PAID,
        ...(isManual ? { manualStatus: ManualStatus.PENDING } : {}),
      },
      include: {
        items: { include: { position: true } },
      },
    });

    if (existing.promoCodes) {
      await this.promoService
        .markUsed(existing.promoCodes.promoCodeId)
        .catch((err) => this.logger.error('promoService.markUsed упал:', err));
    }

    this.logger.log(
      `Заказ ${orderId} оплачен, type: ${order.type}, manualStatus: ${order.manualStatus ?? 'n/a'}`,
    );

    if (isManual) {
      this.gateway.notifyNewManualOrder(order);
      return;
    }

    this.donatehubGameService
      .createGameOrders(order)
      .catch((err) =>
        this.logger.error('donatehubGameService.createGameOrders упал:', err),
      );
  }

  private buildPaymentMethodData(method: PaymentMethod): IPaymentMethodData {
    switch (method) {
      case PaymentMethod.SBP:
        return { type: 'sbp' };
      case PaymentMethod.SBERBANK:
        return { type: 'sberbank' };
      case PaymentMethod.TINKOFF_BANK:
        return { type: 'tinkoff_bank' };
      case PaymentMethod.BANK_CARD:
      default:
        return { type: 'bank_card' };
    }
  }
}
