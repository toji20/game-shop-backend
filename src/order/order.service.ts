/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  BadGatewayException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TBankService } from './tbank.service';
import {
  CreateGiftApiPaymentDto,
  OrderDto,
  OrderItemDto,
} from './dto/order.dto';
import {
  PaymentMethod,
  PaymentStatusDto,
} from 'src/order/dto/payment-status.dto';
import { EnumOrderStatus, ManualStatus, OrderType } from '@prisma/client';
import { DonatehubGameService } from 'src/donate-hub-game/donate-hub-game.service';
import { SteamOrderService } from 'src/steam-order/steam-order.service';
import { OrderGateway } from './order.gateway';
import { PromoService } from 'src/promo/promo.service';
import { PromoTarget } from 'src/promo/dto/promo.dto';
// ВАЖНО: поправь путь импорта под реальное расположение файла в твоём проекте
import { GiftapiOrderService } from 'src/giftapi/giftapi-order.service';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tbankService: TBankService,
    private readonly donatehubGameService: DonatehubGameService,
    private readonly steamOrderService: SteamOrderService,
    private readonly gateway: OrderGateway,
    private readonly promoService: PromoService,
    private readonly giftapiOrderService: GiftapiOrderService,
  ) {}

  /**
   * Создать заказ с платежом через Т-Банк (эквайринг).
   * Поддерживает смешанную корзину:
   * - товары старого каталога (Position, по gameId/positionId)
   * - товары GiftAPI (по giftapiProductId)
   *
   * Для GiftAPI-товаров цена ВСЕГДА берётся из своей БД (GiftApiProduct.price),
   * а не из dto — иначе цену можно подделать на фронте.
   */
  async createPayment(dto: OrderDto, userId: string | null) {
    const positionItems = dto.items.filter((i) => !!i.positionId);
    const giftapiItems = dto.items.filter((i) => !!i.giftapiProductId);

    // ── Подтягиваем реальные цены GiftAPI-товаров и валидируем их ──
    const giftapiProducts = giftapiItems.length
      ? await this.prisma.giftApiProduct.findMany({
          where: {
            id: { in: giftapiItems.map((i) => i.giftapiProductId!) },
          },
        })
      : [];
    const giftapiProductMap = new Map(giftapiProducts.map((p) => [p.id, p]));

    for (const item of giftapiItems) {
      const product = giftapiProductMap.get(item.giftapiProductId!);
      if (!product) {
        throw new NotFoundException(
          `Товар GiftAPI ${item.giftapiProductId} не найден в БД`,
        );
      }
      if (!product.isActive) {
        throw new BadRequestException(
          `Товар ${product.id} недоступен для заказа`,
        );
      }
      if (product.price === null || product.price === undefined) {
        throw new BadRequestException(
          `У товара ${product.id} не задана цена (price is null)`,
        );
      }
      if (item.quantity > product.maxPerOrder) {
        throw new BadRequestException(
          `Максимум ${product.maxPerOrder} шт. товара ${product.id} за один заказ`,
        );
      }
      if (product.stock > 0 && item.quantity > product.stock) {
        throw new BadRequestException(
          `Недостаточно товара ${product.id} на складе`,
        );
      }
      // цена с фронта игнорируется, подставляем доверенную из БД
      item.price = Number(product.price);
    }

    let total = dto.items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0,
    );

    let promoCodeId: string | null = null;
    if (dto.promoCode && userId) {
      const promo = await this.promoService.apply(
        { code: dto.promoCode, target: PromoTarget.GAME },
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

    // ── Легаси-маппинг полей для Position-товаров (по numeric id -> label) ──
    const gameIds = [...new Set(positionItems.map((i) => Number(i.gameId)))];
    const allGameFields = gameIds.length
      ? await this.prisma.gameField.findMany({
          where: { gameId: { in: gameIds } },
        })
      : [];

    const orderItemsData = dto.items.map((item: OrderItemDto) => {
      if (item.giftapiProductId) {
        // GiftAPI: fields уже приходят с ключами по code поля, релейблинг не нужен
        return {
          quantity: item.quantity,
          price: item.price,
          fields: item.fields ?? {},
          giftapiProduct: { connect: { id: item.giftapiProductId } },
        };
      }

      const mappedFields: Record<string, string> = {};
      if (item.fields && Object.keys(item.fields).length > 0) {
        const gameFields = allGameFields.filter(
          (f) => f.gameId === Number(item.gameId),
        );
        for (const [fieldId, value] of Object.entries(item.fields)) {
          const field = gameFields.find((f) => f.id === Number(fieldId));
          mappedFields[field ? field.label : fieldId] = value as string;
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

    const payment = await this.tbankService.init({
      // Т-Банк принимает сумму В КОПЕЙКАХ
      Amount: Math.round(total * 100),
      OrderId: order.id,
      Description: `Оплата заказа #${order.id}`,
      // 'O' — одностадийная оплата, деньги списываются сразу же после
      // AUTHORIZED (аналог capture:true из ЮKassa) — Confirm вызывать не нужно
      PayType: 'O',
      // Data.description дублируется в тело нотификации (dto.Data.description) —
      // используем её в handleWebhook, чтобы отличать этот заказ от пополнений
      // Steam, не завися от других полей нотификации Т-Банка
      DATA: { description: `Оплата заказа #${order.id}` },
      NotificationURL: `${process.env.API_URL}/orders/status`,
      SuccessURL: `${process.env.CLIENT_URL}/order/${order.id}`,
      FailURL: `${process.env.CLIENT_URL}/order/${order.id}`,
    });

    if (!payment.Success) {
      throw new BadGatewayException(
        `Т-Банк не смог создать платёж: ${payment.ErrorCode} ${payment.Message ?? ''}`,
      );
    }

    if (promoCodeId && userId) {
      await this.prisma.promoCodeUse.create({
        data: { promoCodeId, userId, orderId: order.id },
      });
    }

    return { order, payment };
  }

  /**
   * Создать заказ товара из каталога GiftAPI
 с оплатой через Т-Банк
   * (быстрая покупка одного товара вне корзины — "купить сейчас").
   *
   * Флоу:
   * 1. Пользователь открывает каталог (GiftApiProduct из своей БД).
   * 2. Цена берётся ИЗ СВОЕЙ БД (GiftApiProduct.price), а не от клиента —
   *    иначе можно было бы подделать сумму на фронте.
   * 3. Создаётся локальный заказ с реальной стоимостью (total != 0).
   * 4. Возвращается платёж Т-Банка (PaymentURL), пользователь его оплачивает.
   * 5. Только ПОСЛЕ нотификации со статусом CONFIRMED (см. handleGameOrderPayment)
   *    заказ реально уходит в GiftAPI — деньги там списываются с баланса,
   *    только когда деньги реально получены нами через Т-Банк.
   *
   * Примечание: логика дублирует price-lookup из createPayment. Если корзина
   * теперь умеет отправлять GiftAPI-товары через createPayment, этот метод
   * можно оставить только для сценария "купить в один клик" со страницы товара.
   */
  async createGiftapiPayment(
    dto: CreateGiftApiPaymentDto,
    userId: string | null,
  ) {
    const product = await this.prisma.giftApiProduct.findUnique({
      where: { id: dto.giftapiProductId },
    });
    if (!product) {
      throw new NotFoundException(
        `Товар GiftAPI ${dto.giftapiProductId} не найден в БД`,
      );
    }
    if (!product.isActive) {
      throw new BadRequestException('Товар недоступен для заказа');
    }
    if (product.price === null || product.price === undefined) {
      throw new BadRequestException(
        `У товара ${product.id} не задана цена (price is null)`,
      );
    }

    const quantity = dto.quantity ?? 1;
    if (quantity > product.maxPerOrder) {
      throw new BadRequestException(
        `Максимум ${product.maxPerOrder} шт. за один заказ`,
      );
    }
    if (product.stock > 0 && quantity > product.stock) {
      throw new BadRequestException('Недостаточно товара на складе');
    }

    // ВНИМАНИЕ: GiftApiProduct.currency по умолчанию "USD", а платёж
    // в Т-Банке создаётся в рублях. Если цены в каталоге хранятся не в рублях,
    // здесь нужна конвертация по актуальному курсу перед выставлением счёта.
    // Пока предполагается, что product.price уже в рублях.
    if (product.currency !== 'RUB') {
      this.logger.warn(
        `GiftApiProduct ${product.id} имеет валюту ${product.currency}, ` +
          `а оплата всегда идёт в RUB — проверь, что цена уже сконвертирована`,
      );
    }

    let total = Number(product.price) * quantity;

    let promoCodeId: string | null = null;
    if (dto.promoCode && userId) {
      const promo = await this.promoService.apply(
        { code: dto.promoCode, target: PromoTarget.GAME },
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
    this.logger.log(
      `GiftAPI заказ: sku ${product.giftapiSkuId}, комиссия x${commissionRate} (${method}), итого: ${total}`,
    );

    const order = await this.prisma.order.create({
      data: {
        status: EnumOrderStatus.PENDING,
        type: OrderType.AUTO,
        total,
        userId: userId ?? undefined,
        items: {
          create: {
            quantity,
            price: product.price,
            fields: dto.fields ?? {},
            giftapiProduct: { connect: { id: product.id } },
          },
        },
      },
      include: { items: true },
    });
    this.logger.log(
      `GiftAPI заказ создан локально: ${order.id}, SKU: ${product.giftapiSkuId}, total: ${total}`,
    );

    const payment = await this.tbankService.init({
      Amount: Math.round(total * 100),
      OrderId: order.id,
      // Тот же формат описания, что и у обычных заказов —
      // handleWebhook его уже умеет парсить и находить заказ по id
      Description: `Оплата заказа #${order.id}`,
      PayType: 'O',
      DATA: { description: `Оплата заказа #${order.id}` },
      NotificationURL: `${process.env.API_URL}/orders/status`,
      SuccessURL: `${process.env.CLIENT_URL}/order/${order.id}`,
      FailURL: `${process.env.CLIENT_URL}/order/${order.id}`,
    });

    if (!payment.Success) {
      throw new BadGatewayException(
        `Т-Банк не смог создать платёж: ${payment.ErrorCode} ${payment.Message ?? ''}`,
      );
    }

    if (promoCodeId && userId) {
      await this.prisma.promoCodeUse.create({
        data: { promoCodeId, userId, orderId: order.id },
      });
    }

    return { order, payment };
  }

  /**
   * Обработчик HTTP-нотификации от Т-Банка.
   * ВАЖНО: контроллер должен вернуть именно строку "OK" (без кавычек/JSON)
   * с HTTP 200 — иначе Т-Банк посчитает нотификацию неуспешной и будет
   * ретраить её раз в час на протяжении суток, потом раз в сутки — месяц.
   * Пример контроллера (см. order.controller.ts, POST /orders/status):
   *
   *   @Post('status')
   *   async updateStatus(@Body() dto: PaymentStatusDto, @Res() res: Response) {
   *     await this.orderService.updateStatus(dto);
   *     res.status(200).send('OK');
   *   }
   */
  async updateStatus(dto: PaymentStatusDto): Promise<void> {
    this.logger.log(
      `Получена нотификация Т-Банка: ${dto.Status} (order ${dto.OrderId})`,
    );

    // КРИТИЧНО: проверяем подлинность нотификации. Без этой проверки любой,
    // кто знает формат payload, может дёрнуть эндпоинт и обмануть систему,
    // что деньги якобы получены — раньше (на ЮKassa) эта проверка отсутствовала.
    if (!this.tbankService.verifyNotificationToken(dto as any)) {
      this.logger.error(
        `Невалидный Token в нотификации для заказа ${dto.OrderId} — запрос отклонён`,
      );
      return;
    }

    this.handleWebhook(dto).catch((err) =>
      this.logger.error('handleWebhook упал:', err),
    );
  }

  private async handleWebhook(dto: PaymentStatusDto) {
    if (!dto.Success) {
      this.logger.warn(
        `Заказ ${dto.OrderId}: неуспешный статус ${dto.Status}, ErrorCode ${dto.ErrorCode}`,
      );
      return;
    }

    // При одностадийной оплате (PayType='O') Т-Банк присылает подряд
    // AUTHORIZED и CONFIRMED — деньги реально захвачены только на CONFIRMED,
    // поэтому фулфилмент запускаем строго по этому статусу.
    if (dto.Status !== 'CONFIRMED') {
      return;
    }

    // description у нас имеет тот же формат, что был при ЮKassa — используем
    // его, чтобы отличать пополнение Steam от обычных заказов, не трогая
    // steam-order модуль.
    // TODO: если steam-order.service.ts тоже вызывает YooCheckout напрямую,
    // его тоже нужно перевести на TBankService.init(...) и передавать туда
    // DATA: { description: 'Пополнение Steam #<id>' } — иначе Data.description
    // в нотификации для Steam-пополнений будет пустым и этот if не сработает.
    const description =
      dto.Data?.description ?? `Оплата заказа #${dto.OrderId}`;

    if (description.startsWith('Пополнение Steam #')) {
      await this.steamOrderService.handleSuccessPayment(description);
      return;
    }

    await this.handleGameOrderPayment(dto.OrderId);
  }

  private async handleGameOrderPayment(orderId: string) {
    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        type: true,
        userId: true,
        promoCodes: { select: { promoCodeId: true } },
        items: {
          select: {
            id: true,
            fields: true,
            giftapiProductId: true,
            giftapiProduct: { select: { giftapiSkuId: true } },
          },
        },
      },
    });

    if (!existing) {
      this.logger.error(`Заказ ${orderId} не найден в БД`);
      return;
    }

    const isManual = existing.type === OrderType.MANUAL;
    const giftapiItems = existing.items.filter((i) => i.giftapiProductId);
    const isGiftapi = giftapiItems.length > 0;

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: EnumOrderStatus.PAID,
        ...(isManual ? { manualStatus: ManualStatus.PENDING } : {}),
      },
      include: { items: { include: { position: true } } },
    });

    if (existing.promoCodes) {
      await this.promoService
        .markUsed(existing.promoCodes.promoCodeId)
        .catch((err) => this.logger.error('promoService.markUsed упал:', err));
    }

    this.logger.log(
      `Заказ ${orderId} оплачен, type: ${order.type}, isGiftapi: ${isGiftapi}, manualStatus: ${order.manualStatus ?? 'n/a'}`,
    );

    // ── Ручные заказы обрабатываются ПЕРВЫМИ и полностью отдельно от AUTO.
    // Ручной заказ (MANUAL) — это осознанный выбор "оператор выполняет вручную",
    // даже если в нём лежит GiftAPI-товар. Поэтому:
    // - в GiftAPI НИЧЕГО не отправляем (иначе задвоится: и GiftAPI спишет
    //   наш баланс, и оператор потом выполнит то же самое руками);
    // - в DonateHub тоже не отправляем;
    // - оператора уведомляем ВСЕГДА, даже если в заказе только GiftAPI-позиции.
    if (isManual) {
      this.gateway.notifyNewManualOrder(order);
      return;
    }

    // ── Дальше — только автоматические (AUTO) заказы.
    // Деньги реально получены через Т-Банк (статус CONFIRMED) — теперь можно
    // отправлять GiftAPI-позиции заказа в GiftAPI.
    if (isGiftapi) {
      for (const item of giftapiItems) {
        if (!item.giftapiProduct) continue;
        const fields = (item.fields as Record<string, any>) ?? {};
        this.giftapiOrderService
          .createOrder(order.id, item.giftapiProduct.giftapiSkuId, fields)
          .catch((err) =>
            this.logger.error('giftapiOrderService.createOrder упал:', err),
          );
      }
    }

    const hasNonGiftapiItems = existing.items.some((i) => !i.giftapiProductId);
    if (!hasNonGiftapiItems) {
      return;
    }

    this.donatehubGameService
      .createGameOrders(order)
      .catch((err) =>
        this.logger.error('donatehubGameService.createGameOrders упал:', err),
      );
  }
}
