import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    const reviews = await this.prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        game: true,
      },
    });

    return reviews;
  }

  async getBygameId(gameId: number) {
    const store = this.prisma.review.findMany({
      where: {
        gameId,
      },
      select: {
        user: true,
      },
    });
    return store;
  }

  async getById(id: string, userId: string) {
    const review = await this.prisma.review.findUnique({
      where: {
        id,
        userId,
      },
      include: {
        user: true,
      },
    });
    if (!review) {
      throw new NotFoundException({
        message: 'Отзыв не найден или вы не являетесь его автором',
      });
    }
    return review;
  }

  async create(dto: ReviewDto, gameId: number, userId: string) {
    return this.prisma.review.create({
      data: {
        ...dto,
        game: {
          connect: {
            id: gameId,
          },
        },
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  async delete(id: string, userId: string) {
    await this.getById(id, userId);
    return this.prisma.review.delete({
      where: {
        id,
      },
    });
  }
}
