import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  PositionCategoryDto,
  PositionCategoryUpdateDto,
} from './dto/position-category.dto';

@Injectable()
export class PositionCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return await this.prisma.positionCategory.findMany({});
  }

  async getByGameId(gameId: number) {
    return await this.prisma.positionCategory.findMany({
      where: {
        gameId: Number(gameId),
      },
    });
  }

  async create(dto: PositionCategoryDto) {
    return this.prisma.positionCategory.create({
      data: {
        name: dto.name,
        gameId: Number(dto.gameId),
      },
    });
  }

  async update(dto: PositionCategoryUpdateDto, id: number) {
    return this.prisma.positionCategory.update({
      where: {
        id: Number(id),
      },
      data: {
        name: dto.name,
      },
    });
  }

  async delete(id: number) {
    return this.prisma.positionCategory.delete({
      where: {
        id: Number(id),
      },
    });
  }
}
