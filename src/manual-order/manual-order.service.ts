import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EnumOrderStatus, ManualStatus, OrderType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateManualStatusDto } from './dto/manual-order.dto';
import { OrderGateway } from 'src/order/order.gateway';

@Injectable()
export class ManualOrderService {
  private readonly logger = new Logger(ManualOrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: OrderGateway,
  ) {}

  async getAll(status?: ManualStatus) {
    return this.prisma.order.findMany({
      where: {
        type: OrderType.MANUAL,
        status: {
          in: [
            EnumOrderStatus.PAID,
            EnumOrderStatus.COMPLETED,
            EnumOrderStatus.CANCELED,
          ],
        },
        ...(status ? { manualStatus: status } : {}),
      },
      include: {
        items: {
          include: {
            game: true,
            position: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getById(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            game: true,
            position: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Заказ не найден');
    if (order.type !== OrderType.MANUAL) {
      throw new BadRequestException('Заказ не является ручным');
    }

    return order;
  }

  async updateStatus(orderId: string, dto: UpdateManualStatusDto) {
    const order = await this.getById(orderId);

    this.validateStatusTransition(order.manualStatus, dto.status);

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        manualStatus: dto.status,
        ...(dto.status === ManualStatus.COMPLETED
          ? { status: EnumOrderStatus.COMPLETED }
          : {}),
        ...(dto.status === ManualStatus.FAILED
          ? { status: EnumOrderStatus.CANCELED }
          : {}),
      },
    });

    this.logger.log(
      `Заказ ${orderId} обновлён: ${order.manualStatus} → ${dto.status}`,
    );

    // Уведомляем всех операторов что статус изменился
    this.gateway.notifyOrderStatusUpdated(updated);

    if (dto.status === ManualStatus.COMPLETED) {
      // Уведомляем пользователя что заказ выполнен
      this.gateway.notifyOrderCompleted(String(order.userId), orderId);
      this.logger.log(`Заказ ${orderId} завершён, уведомление отправлено`);
    }

    return updated;
  }

  async request2FA(orderId: string) {
    const order = await this.getById(orderId);

    if (order.manualStatus !== ManualStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Запросить 2FA можно только для заказа со статусом IN_PROGRESS',
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        manualStatus: ManualStatus.AWAITING_2FA,
        twoFaRequestedAt: new Date(),
        twoFaCode: null,
      },
    });

    this.logger.log(`2FA запрошен для заказа ${orderId}`);
    this.gateway.notifyOrderStatusUpdated(updated);
    // Уведомляем пользователя что нужен 2FA код
    return updated;
  }

  async provide2FA(orderId: string, code: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new NotFoundException('Заказ не найден');

    if (order.userId !== userId) {
      throw new ForbiddenException('Нет доступа к этому заказу');
    }

    if (order.manualStatus !== ManualStatus.AWAITING_2FA) {
      throw new BadRequestException('2FA код для этого заказа не запрашивался');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        twoFaCode: code,
        twoFaProvidedAt: new Date(),
        manualStatus: ManualStatus.IN_PROGRESS,
      },
    });

    this.logger.log(`2FA код предоставлен для заказа ${orderId}`);

    // Уведомляем операторов что 2FA получен — список заказов обновится
    this.gateway.notifyOrderStatusUpdated(userId);

    return { message: '2FA код принят', updated };
  }

  // Вызывается из OrderService после успешной оплаты ручного заказа
  async notifyNewOrder(order: any) {
    this.gateway.notifyNewManualOrder(order);
    this.logger.log(`Новый ручной заказ ${order.id} — уведомление операторам`);
  }

  private validateStatusTransition(
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    current: ManualStatus | null,
    next: ManualStatus,
  ) {
    const allowed: Record<string, ManualStatus[]> = {
      [ManualStatus.PENDING]: [ManualStatus.IN_PROGRESS, ManualStatus.FAILED],
      [ManualStatus.IN_PROGRESS]: [
        ManualStatus.AWAITING_2FA,
        ManualStatus.COMPLETED,
        ManualStatus.FAILED,
      ],
      [ManualStatus.AWAITING_2FA]: [
        ManualStatus.IN_PROGRESS,
        ManualStatus.FAILED,
      ],
      [ManualStatus.COMPLETED]: [],
      [ManualStatus.FAILED]: [],
    };

    const currentKey = current ?? ManualStatus.PENDING;
    const allowedNext = allowed[currentKey] ?? [];

    if (!allowedNext.includes(next)) {
      throw new BadRequestException(
        `Нельзя перейти из статуса ${currentKey} в ${next}. ` +
          `Допустимые переходы: ${allowedNext.join(', ') || 'нет'}`,
      );
    }
  }
}
