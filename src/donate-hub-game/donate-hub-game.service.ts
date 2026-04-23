import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DonateHubStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DonatehubGameService {
  private readonly logger = new Logger(DonatehubGameService.name);
  private readonly baseUrl = process.env.DONATEHUB_URL;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async createGameOrders(order: any) {
    const token = this.configService.get<string>('DONATEHUB_TOKEN');

    for (const item of order.items) {
      if (!item.positionId) {
        this.logger.warn(
          `OrderItem ${item.id} не имеет positionId — пропускаем`,
        );
        continue;
      }

      const donateHubPositionId = item.position?.donateHubPositionId;

      if (!donateHubPositionId) {
        this.logger.error(
          `OrderItem ${item.id}: donateHubPositionId не найден`,
        );
        await this.updateItemStatus(
          item.id,
          'FAILED',
          'donateHubPositionId не найден',
        );
        continue;
      }

      try {
        await this.updateItemStatus(item.id, 'WAIT');

        const body = {
          position: donateHubPositionId,
          fields: item.fields ?? {},
        };

        this.logger.log(`Отправляем в DonateHub: ${JSON.stringify(body)}`);

        const response = await fetch(`${this.baseUrl}/create_game_order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `TOKEN ${token}` } : {}),
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const rawText = await response.text();
          this.logger.error(`DonateHub ошибка для item ${item.id}: ${rawText}`);
          const errorMessage = this.parseError(rawText, response.status);
          await this.updateItemStatus(item.id, 'FAILED', errorMessage);
          continue;
        }

        const transaction = await response.json();
        this.logger.log(
          `Транзакция создана: ${transaction.id} для item ${item.id}`,
        );

        await this.prisma.orderItem.update({
          where: { id: item.id },
          data: {
            donateHubTransactionId: String(transaction.id),
            donateHubStatus: DonateHubStatus.SUCCESS,
          },
        });
      } catch (err) {
        this.logger.error(`Не удалось создать заказ для item ${item.id}:`, err);
        await this.updateItemStatus(
          item.id,
          'FAILED',
          err instanceof Error ? err.message : 'unknown error',
        );
      }
    }
  }

  private async updateItemStatus(
    id: string,
    status: DonateHubStatus,
    error?: string,
  ) {
    await this.prisma.orderItem.update({
      where: { id },
      data: {
        donateHubStatus: status,
        ...(error ? { donateHubError: error } : {}),
      },
    });
  }

  private parseError(rawText: string, status: number): string {
    try {
      const json = JSON.parse(rawText);
      return json?.error_message ?? `HTTP ${status}`;
    } catch {
      return `HTTP ${status}`;
    }
  }
}
