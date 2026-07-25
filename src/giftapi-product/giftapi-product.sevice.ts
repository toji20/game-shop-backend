import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateGiftApiProductDto,
  UpdateGiftApiProductDto,
} from './dto/giftapi-product.dto';

@Injectable()
export class GiftapiProductService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return this.prisma.giftApiProduct.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        game: true,
        positionCategory: true,
      },
    });
  }

  async getById(id: string) {
    return this.prisma.giftApiProduct.findUnique({
      where: {
        id,
      },
      include: {
        game: true,
        positionCategory: true,
      },
    });
  }

  async create(dto: CreateGiftApiProductDto) {
    return this.prisma.giftApiProduct.create({
      data: {
        ...dto,
        gameId: dto.gameId,
      },
    });
  }

  async update(id: string, dto: UpdateGiftApiProductDto) {
    const { gameId, positionCategoryId, ...rest } = dto;

    return this.prisma.giftApiProduct.update({
      where: { id },
      data: {
        ...rest,

        game:
          gameId !== undefined
            ? gameId === null
              ? { disconnect: true }
              : {
                  connect: {
                    id: gameId,
                  },
                }
            : undefined,

        positionCategory:
          positionCategoryId !== undefined
            ? positionCategoryId === null
              ? { disconnect: true }
              : {
                  connect: {
                    id: positionCategoryId,
                  },
                }
            : undefined,
      },
      include: {
        game: true,
        positionCategory: true,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.giftApiProduct.delete({
      where: {
        id,
      },
    });
  }
}
