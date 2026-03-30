import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PositionDto, PositionUpdateDto } from './dto/position.dto';

@Injectable()
export class PositionService {
  constructor(private readonly prisma: PrismaService) {}

  async getByGameId(gameId: number) {
    return this.prisma.position.findMany({
      where: { gameId: Number(gameId) },
    });
  }

  async create(dto: PositionDto) {
    return this.prisma.position.create({
      data: {
        gameId: Number(dto.gameId),
        myPrice: dto.myPrice,
        name: dto.name,
        image: dto.image,
        isActive: dto.isActive || true,
        isPublic: dto.isPublic || true,
        discount: dto.discount,
      },
    });
  }

  async update(id: number, dto: PositionUpdateDto) {
    return this.prisma.position.update({
      where: { id: Number(id) },
      data: {
        name: dto.name,
        myPrice: dto.myPrice,
        isActive: dto.isActive,
        isPublic: dto.isPublic,
        image: dto.image,
        discount: dto.discount,
      },
    });
  }

  async delete(id: number) {
    return this.prisma.position.delete({
      where: { id: Number(id) },
    });
  }
}
