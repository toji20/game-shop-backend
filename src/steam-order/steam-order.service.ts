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

@Injectable()
export class SteamOrderService {
  private checkout: YooCheckout;
  private readonly logger = new Logger(SteamOrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly donatehubSteamService: DonatehubSteamService,
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

    const totalRub = +(check.total * rate).toFixed(2);

    this.logger.log(
      `Steam check: ${dto.amount} ${dto.currency ?? 'RUB'} → ${amountRub} RUB → ${amountUsdt} USDT → total: ${check.total} USDT → ${totalRub} RUB (курс ${rate})`,
    );

    return {
      custom_id: check.custom_id,
      total: check.total,
      totalRub,
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

    this.logger.log(
      `Steam: ${dto.amountRub} ${dto.currency ?? 'RUB'} → ${amountInRub} RUB → ${amountUsdt} USDT (курс ${rate})`,
    );

    const check = await this.donatehubSteamService.checkSteamOrder(
      dto.account,
      amountUsdt,
    );

    const totalRub = +(check.total * rate * commission).toFixed(2);

    this.logger.log(
      `Steam: итого ${totalRub} RUB (с комиссией x${commission})`,
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
      payment_method_data: { type: 'bank_card' },
      confirmation: {
        type: 'redirect',
        return_url: `${process.env.CLIENT_URL}/steam-order/${steamOrder.id}`,
      },
      description: `Пополнение Steam #${steamOrder.id}`,
    });

    return { steamOrder, payment };
  }

  async handleSuccessPayment(description: string) {
    const steamOrderId = description?.split('#')[1]?.trim();

    if (!steamOrderId) {
      this.logger.error('steamOrderId не найден в description');
      return;
    }

    this.logger.log(`Обновляем Steam заказ: ${steamOrderId}`);

    await this.prisma.steamOrder.update({
      where: { id: steamOrderId },
      data: { status: EnumOrderStatus.PAID },
    });

    this.donatehubSteamService
      .createSteamOrder(steamOrderId)
      .catch((err) =>
        this.logger.error('donatehubSteamService.createSteamOrder упал:', err),
      );
  }
}
