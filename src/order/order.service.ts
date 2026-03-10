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

@Injectable()
export class OrderService {
  private checkout: YooCheckout;
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly donatehubGameService: DonatehubGameService,
    private readonly steamOrderService: SteamOrderService,
  ) {
    const shopId = this.configService.get<string>('YOOKASSA_SHOP_ID');
    const secretKey = this.configService.get<string>('YOOKASSA_SECRET_KEY');

    if (!shopId || !secretKey) {
      throw new Error('YooKassa env variables are not defined');
    }

    this.checkout = new YooCheckout({ shopId, secretKey });
  }

  async createPayment(dto: OrderDto, userId: string) {
    const total = dto.items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );

    const orderItemsData = dto.items.map((item: OrderItemDto) => ({
      quantity: item.quantity,
      price: item.price,
      fields: item.fields ?? {},
      game: { connect: { id: Number(item.gameId) } },
      position: { connect: { id: Number(item.positionId) } },
    }));

    const order = await this.prisma.order.create({
      data: {
        status: EnumOrderStatus.PENDING,
        type: dto.type ?? OrderType.AUTO,
        total,
        user: { connect: { id: userId } },
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
        return_url: `${process.env.CLIENT_URL}/thanks`,
      },
      description: `Оплата заказа #${order.id}`,
    });

    return { order, payment };
  }

  async updateStatus(dto: PaymentStatusDto) {
    this.logger.log(`Получен вебхук: ${dto.event}`);

    // Отвечаем YooKassa мгновенно, обработку делаем в фоне
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
        // Steam заказ
        await this.steamOrderService.handleSuccessPayment(description);
      } else if (description.startsWith('Оплата заказа #')) {
        // Игровой заказ (AUTO или MANUAL)
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
      select: { type: true },
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

    this.logger.log(
      `Заказ ${orderId} оплачен, type: ${order.type}, manualStatus: ${order.manualStatus ?? 'n/a'}`,
    );

    // if (isManual) {
    //   this.gateway.notifyNewManualOrder(order);
    //   return;
    // }

    if (isManual) {
      this.logger.log(`Ручной заказ ${orderId} ожидает обработки сотрудником`);
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
