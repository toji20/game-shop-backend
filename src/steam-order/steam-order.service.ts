import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnumOrderStatus } from '@prisma/client';
import { YooCheckout } from '@a2seven/yoo-checkout';
import { PrismaService } from 'src/prisma/prisma.service';
import { DonatehubSteamService } from 'src/donatehub-steam/donatehub-steam.service';
import { SteamOrderDto } from './dto/steam-order.dto';

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

  async checkAccount(dto: SteamOrderDto) {
    const check = await this.donatehubSteamService.checkSteamOrder(
      dto.account,
      dto.amount,
    );

    const rate = await this.donatehubSteamService.getUsdtToRubRate();
    const totalRub = +(check.total * rate).toFixed(2);

    this.logger.log(
      `Steam check: ${dto.amount} USDT → total DonateHub: ${check.total} USDT → ${totalRub} RUB (курс ${rate})`,
    );

    return {
      custom_id: check.custom_id,
      total: check.total,
      totalRub,
      rate,
    };
  }

  async createPayment(dto: SteamOrderDto, userId: string) {
    const commission =
      this.configService.get<number>('STEAM_COMMISSION') ?? 1.06;
    const rate = await this.donatehubSteamService.getUsdtToRubRate();

    const amountUsdt = +(dto.amountRub / rate).toFixed(2);

    this.logger.log(
      `Steam: ${dto.amountRub} RUB → ${amountUsdt} USDT (курс ${rate})`,
    );

    const check = await this.donatehubSteamService.checkSteamOrder(
      dto.account,
      amountUsdt,
    );

    const totalRub = +(check.total * rate * commission).toFixed(2);

    this.logger.log(
      `Steam: ${dto.amountRub} RUB → ${amountUsdt} USDT → ${check.total} USDT (DonateHub) → ${totalRub} RUB (с комиссией x${commission})`,
    );

    const steamOrder = await this.prisma.steamOrder.create({
      data: {
        account: dto.account,
        amount: amountUsdt,
        total: totalRub,
        status: EnumOrderStatus.PENDING,
        donateHubCustomId: check.custom_id,
        user: { connect: { id: userId } },
      },
    });

    const payment = await this.checkout.createPayment({
      amount: { value: totalRub.toFixed(2), currency: 'RUB' },
      capture: true,
      payment_method_data: { type: 'bank_card' },
      confirmation: {
        type: 'redirect',
        return_url: `${process.env.CLIENT_URL}/thanks`,
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
