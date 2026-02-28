import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderUpdateStatus } from './dto/order-update-status.dto';

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
        id: id,
      },
      include: {
        items: true,
        user: true,
      },
    });
  }

  async updateStatus(id: string, dto: OrderUpdateStatus) {
    return await this.prisma.order.update({
      where: {
        id: id,
      },
      data: {
        status: dto.status,
      },
    });
  }

  async delete(id: string) {
    return await this.prisma.order.delete({
      where: {
        id: id,
      },
      include: {
        items: true,
      },
    });
  }
}
