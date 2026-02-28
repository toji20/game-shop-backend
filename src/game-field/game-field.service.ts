import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GameFieldDto } from './dto/game-field.dto';

@Injectable()
export class GameFieldService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return await this.prisma.gameField.findMany({});
  }

  async getByGameId(gameId: number) {
    return await this.prisma.gameField.findMany({
      where: {
        gameId: Number(gameId),
      },
    });
  }

  async create(gameId: number, dto: GameFieldDto) {
    return this.prisma.gameField.create({
      data: {
        label: dto.label,
        required: dto.required || true,
        gameId: Number(gameId),
      },
    });
  }

  async update(dto: GameFieldDto, id: number) {
    return this.prisma.gameField.update({
      where: {
        id: Number(id),
      },
      data: {
        label: dto.label,
        required: dto.required || true,
      },
    });
  }

  async delete(id: number) {
    return this.prisma.gameField.delete({
      where: {
        id: Number(id),
      },
    });
  }
}
