import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PositionDto } from './dto/position.dto';

@Injectable()
export class PositionService {
  constructor(private readonly prisma: PrismaService) {}

  async getByGameId(gameId: number) {
    return await this.prisma.position.findMany({
      where: {
        gameId: Number(gameId),
      },
    });
  }

  async create(gameId: number, dto: PositionDto) {
    return await this.prisma.position.create({
      data: {
        gameId: Number(gameId),
        myPrice: dto.myPrice,
        name: dto.name,
        image: dto.image,
        isActive: dto.isActive || true,
      },
    });
  }

  async update(id: number, dto: PositionDto) {
    return await this.prisma.position.update({
      where: {
        id: Number(id),
      },
      data: {
        name: dto.name,
        myPrice: dto.myPrice,
        isActive: dto.isActive,
        image: dto.image,
      },
    });
  }

  async delete(id: number) {
    return this.prisma.position.delete({
      where: {
        id: id,
      },
    });
  }
}
