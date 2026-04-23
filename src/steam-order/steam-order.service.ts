/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnumOrderStatus } from '@prisma/client';
import { YooCheckout } from '@a2seven/yoo-checkout';
import { PrismaService } from 'src/prisma/prisma.service';
import { DonatehubSteamService } from 'src/donatehub-steam/donatehub-steam.service';
import {
  SteamCheckDto,
  SteamOrderDto,
  SteamCurrency,
} from './dto/steam-order.dto';
import { PromoService } from 'src/promo/promo.service';
import { PromoTarget } from 'src/promo/dto/promo.dto';

@Injectable()
export class SteamOrderService {
  private checkout: YooCheckout;
  private readonly logger = new Logger(SteamOrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly donatehubSteamService: DonatehubSteamService,
    private readonly promoService: PromoService,
  ) {
    const shopId = this.configService.get<string>('YOOKASSA_SHOP_ID');
    const secretKey = this.configService.get<string>('YOOKASSA_SECRET_KEY');

    if (!shopId || !secretKey) {
      throw new Error('YooKassa env variables are not defined');
    }

    this.checkout = new YooCheckout({ shopId, secretKey });
  }

  private async toRub(
    amount: number,
    currency: SteamCurrency = 'RUB',
  ): Promise<number> {
    if (currency === 'RUB') return amount;

    const rates = await this.getExchangeRates();

    if (currency === 'USD') {
      return +(amount * rates.usdToRub).toFixed(2);
    }

    if (currency === 'KZT') {
      return +(amount * rates.kztToRub).toFixed(2);
    }

    return amount;
  }

  private async getExchangeRates(): Promise<{
    usdToRub: number;
    kztToRub: number;
  }> {
    try {
      const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
      const data = await res.json();

      const usdToRub = data.Valute.USD.Value as number;
      const kztToRub = (data.Valute.KZT.Value /
        data.Valute.KZT.Nominal) as number;

      this.logger.log(`Курсы ЦБ: USD=${usdToRub}, KZT=${kztToRub}`);

      return { usdToRub, kztToRub };
    } catch (err) {
      this.logger.error('Ошибка получения курсов ЦБ:', err);
      return { usdToRub: 90, kztToRub: 0.2 };
    }
  }

  async checkAccount(dto: SteamCheckDto) {
    const amountRub = await this.toRub(dto.amount, dto.currency);
    const rate = await this.donatehubSteamService.getUsdtToRubRate();
    const amountUsdt = +(amountRub / rate).toFixed(2);

    const check = await this.donatehubSteamService.checkSteamOrder(
      dto.account,
      amountUsdt,
    );

    const commission =
      this.configService.get<number>('STEAM_COMMISSION') ?? 1.06;

    const totalRubBase = +(check.total * rate * commission).toFixed(2);
    const totalRubCard = +(totalRubBase * 1.02).toFixed(2);
    const totalRubSbp = +(totalRubBase * 1.01).toFixed(2);

    this.logger.log(
      `Steam check: ${dto.amount} ${dto.currency ?? 'RUB'} → ${amountRub} RUB → ${amountUsdt} USDT → total: ${check.total} USDT → base: ${totalRubBase} RUB`,
    );

    return {
      custom_id: check.custom_id,
      total: check.total,
      totalRubBase,
      totalRubCard,
      totalRubSbp,
      rate,
      currency: dto.currency ?? 'RUB',
      originalAmount: dto.amount,
    };
  }

  async createPayment(dto: SteamOrderDto, userId: string | null) {
    const commission =
      this.configService.get<number>('STEAM_COMMISSION') ?? 1.06;
    const rate = await this.donatehubSteamService.getUsdtToRubRate();

    const amountInRub = await this.toRub(dto.amountRub, dto.currency);
    const amountUsdt = +(amountInRub / rate).toFixed(2);

    const check = await this.donatehubSteamService.checkSteamOrder(
      dto.account,
      amountUsdt,
    );

    const method = dto.paymentMethod ?? 'bank_card';
    const bankCommissionRate = method === 'sbp' ? 1.01 : 1.02;
    let totalRub = +(
      check.total *
      rate *
      commission *
      bankCommissionRate
    ).toFixed(2);

    let promoCodeId: string | null = null;

    if (dto.promoCode && userId) {
      const promo = await this.promoService.apply(
        {
          code: dto.promoCode,
          target: PromoTarget.STEAM,
        },
        userId,
      );

      totalRub = +(totalRub * (1 - promo.discount / 100)).toFixed(2);
      promoCodeId = promo.id;
    }

    this.logger.log(
      `Steam: итого ${totalRub} RUB (комиссия сервиса x${commission}, банк x${bankCommissionRate}, метод: ${method})`,
    );

    const steamOrder = await this.prisma.steamOrder.create({
      data: {
        account: dto.account,
        amount: amountUsdt,
        total: totalRub,
        status: EnumOrderStatus.PENDING,
        donateHubCustomId: check.custom_id,
        userId: userId ?? undefined,
      },
    });

    const payment = await this.checkout.createPayment({
      amount: { value: totalRub.toFixed(2), currency: 'RUB' },
      capture: true,
      payment_method_data: { type: method },
      confirmation: {
        type: 'redirect',
        return_url: `${process.env.CLIENT_URL}/steam-order/${steamOrder.id}`,
      },
      description: `Пополнение Steam #${steamOrder.id}`,
    });

    if (promoCodeId && userId) {
      await this.prisma.promoCodeUse.create({
        data: {
          promoCodeId,
          userId,
          steamOrderId: steamOrder.id,
        },
      });
    }

    return { steamOrder, payment };
  }

  async handleSuccessPayment(description: string) {
    const steamOrderId = description?.split('#')[1]?.trim();

    if (!steamOrderId) {
      this.logger.error('steamOrderId не найден в description');
      return;
    }

    this.logger.log(`Обновляем Steam заказ: ${steamOrderId}`);

    const existing = await this.prisma.steamOrder.findUnique({
      where: { id: steamOrderId },
      select: {
        promoCodes: {
          select: { promoCodeId: true },
        },
      },
    });

    await this.prisma.steamOrder.update({
      where: { id: steamOrderId },
      data: { status: EnumOrderStatus.PAID },
    });

    if (existing?.promoCodes) {
      await this.promoService
        .markUsed(existing.promoCodes.promoCodeId)
        .catch((err) => this.logger.error('promoService.markUsed упал:', err));
    }

    this.donatehubSteamService
      .createSteamOrder(steamOrderId)
      .catch((err) =>
        this.logger.error('donatehubSteamService.createSteamOrder упал:', err),
      );
  }
}
