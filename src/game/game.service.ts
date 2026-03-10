/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GameDto } from 'src/game/dto/game.dto';

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService) {}
  async getAll() {
    const reviews = await this.prisma.game.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
      },
    });

    return reviews;
  }

  async create(dto: GameDto) {
    return this.prisma.game.create({
      data: {
        name: dto.name,
        decription: dto.description,
        isActive: dto.isActive || true,
        categoryId: String(dto.categoryId) || null,
        image: dto.image,
      },
    });
  }

  async update(id: number, dto: GameDto) {
    return this.prisma.game.update({
      where: {
        id: Number(id),
      },
      data: {
        name: dto.name,
        decription: dto.description,
        isActive: dto.isActive,
        categoryId: String(dto.categoryId),
        image: dto.image,
      },
    });
  }

  async delete(id: number) {
    return this.prisma.game.delete({
      where: {
        id: Number(id),
      },
      include: {
        positions: true,
        reviews: true,
      },
    });
  }
}
