import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { DonateHubStatus } from '@prisma/client';

@Injectable()
export class DonatehubSteamService {
  private readonly logger = new Logger(DonatehubSteamService.name);
  private readonly baseUrl = process.env.DONATEHUB_TEST_URL;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private get token(): string {
    return this.configService.get<string>('DONATEHUB_TOKEN') ?? '';
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `TOKEN ${this.token}`,
    };
  }

  async checkSteamOrder(account: string, amount: number) {
    const url = new URL(`${this.baseUrl}/create_steam_order`);
    url.searchParams.set('account', account);
    url.searchParams.set('amount', String(amount));

    this.logger.log(
      `Проверяем Steam заказ: account=${account}, amount=${amount}`,
    );

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.headers,
    });

    const data = await response.json();

    if (!response.ok) {
      this.logger.error(`DonateHub Steam check error: ${JSON.stringify(data)}`);
      throw new BadRequestException(
        data?.error_message ?? 'Ошибка проверки Steam аккаунта',
      );
    }

    this.logger.log(
      `Steam check OK: custom_id=${data.custom_id}, total=${data.total}`,
    );
    return data as { custom_id: string; total: number };
  }

  async createSteamOrder(steamOrderId: string) {
    const steamOrder = await this.prisma.steamOrder.findUnique({
      where: { id: steamOrderId },
    });

    if (!steamOrder) {
      this.logger.error(`SteamOrder ${steamOrderId} не найден`);
      return;
    }

    if (!steamOrder.donateHubCustomId) {
      this.logger.error(
        `SteamOrder ${steamOrderId} не имеет donateHubCustomId`,
      );
      await this.updateStatus(
        steamOrderId,
        DonateHubStatus.FAILED,
        'Нет custom_id',
      );
      return;
    }

    try {
      await this.updateStatus(steamOrderId, DonateHubStatus.WAIT);

      this.logger.log(
        `Создаём Steam заказ в DonateHub: custom_id=${steamOrder.donateHubCustomId}`,
      );

      const response = await fetch(`${this.baseUrl}/create_steam_order`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ custom_id: steamOrder.donateHubCustomId }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(
          `DonateHub Steam create error: ${JSON.stringify(data)}`,
        );
        await this.updateStatus(
          steamOrderId,
          DonateHubStatus.FAILED,
          data?.error_message ?? `HTTP ${response.status}`,
        );
        return;
      }

      this.logger.log(`Steam транзакция создана: ${data.id}`);

      await this.prisma.steamOrder.update({
        where: { id: steamOrderId },
        data: {
          donateHubTransactionId: String(data.id),
          donateHubStatus: DonateHubStatus.SUCCESS,
        },
      });
    } catch (err) {
      this.logger.error(`Ошибка создания Steam заказа ${steamOrderId}:`, err);
      await this.updateStatus(
        steamOrderId,
        DonateHubStatus.FAILED,
        err instanceof Error ? err.message : 'unknown error',
      );
    }
  }

  private async updateStatus(
    id: string,
    status: DonateHubStatus,
    error?: string,
  ) {
    await this.prisma.steamOrder.update({
      where: { id },
      data: {
        donateHubStatus: status,
        ...(error ? { donateHubError: error } : {}),
      },
    });
  }
}
