import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  OrderItemDonateHubStatusDto,
  OrderUpdateStatus,
  SteamOrderDonateHubStatusDto,
} from './dto/order-update-status.dto';

@Injectable()
export class OrderApiService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return await this.prisma.order.findMany({
      include: {
        items: true,
        user: true,
      },
    });
  }

  async getById(id: string) {
    return await this.prisma.order.findUnique({
      where: {
        id,
      },
      include: {
        items: {
          include: {
            position: {
              include: { game: true },
            },
            game: true,
          },
        },
        user: true,
      },
    });
  }

  async getByIdSteamOrder(id: string) {
    return await this.prisma.steamOrder.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
      },
    });
  }

  async getAnyOrderById(id: string) {
    const [order, steamOrder] = await Promise.all([
      this.prisma.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              position: true,
              game: true,
            },
          },
          user: true,
        },
      }),
      this.prisma.steamOrder.findUnique({
        where: { id },
        include: { user: true },
      }),
    ]);

    if (order) return { type: 'order' as const, data: order };
    if (steamOrder) return { type: 'steam' as const, data: steamOrder };

    return null;
  }

  async updateStatus(id: string, dto: OrderUpdateStatus) {
    return await this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
      },
    });
  }

  async updateSteamStatus(id: string, dto: OrderUpdateStatus) {
    return await this.prisma.steamOrder.update({
      where: { id },
      data: {
        status: dto.status,
      },
    });
  }

  async updateItemDonateHubStatus(
    itemId: string,
    dto: OrderItemDonateHubStatusDto,
  ) {
    return await this.prisma.orderItem.update({
      where: { id: itemId },
      data: {
        donateHubStatus: dto.status,
      },
      include: {
        game: true,
        position: true,
      },
    });
  }

  async updateSteamDonateHubStatus(
    id: string,
    dto: SteamOrderDonateHubStatusDto,
  ) {
    return await this.prisma.steamOrder.update({
      where: { id },
      data: {
        donateHubStatus: dto.status,
      },
      include: {
        user: true,
      },
    });
  }

  async delete(id: string) {
    return await this.prisma.order.delete({
      where: {
        id,
      },
      include: {
        items: true,
      },
    });
  }
}
