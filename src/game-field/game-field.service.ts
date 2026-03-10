import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GameFieldDto, GameFieldUpdateDto } from './dto/game-field.dto';

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

  async create(dto: GameFieldDto) {
    return this.prisma.gameField.create({
      data: {
        label: dto.label,
        required: dto.required ?? true,
        gameId: Number(dto.gameId),
      },
    });
  }

  async update(dto: GameFieldUpdateDto, id: number) {
    return this.prisma.gameField.update({
      where: {
        id: Number(id),
      },
      data: {
        label: dto.label,
        required: dto.required ?? true,
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
