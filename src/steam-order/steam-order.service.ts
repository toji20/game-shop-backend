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
    return this.donatehubSteamService.checkSteamOrder(dto.account, dto.amount);
  }

  async createPayment(dto: SteamOrderDto, customId: string, userId: string) {
    const check = await this.donatehubSteamService.checkSteamOrder(
      dto.account,
      dto.amount,
    );

    const steamOrder = await this.prisma.steamOrder.create({
      data: {
        account: dto.account,
        amount: dto.amount,
        total: check.total,
        status: EnumOrderStatus.PENDING,
        donateHubCustomId: check.custom_id,
        user: { connect: { id: userId } },
      },
    });

    const payment = await this.checkout.createPayment({
      amount: { value: Number(check.total).toFixed(2), currency: 'RUB' },
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
