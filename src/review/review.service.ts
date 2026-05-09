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
        user: {
          include: {
            avatar: true,
          },
        },
      },
    });

    return reviews;
  }

  async getAllPaginated(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            include: {
              avatar: true,
            },
          },
          game: true,
        },
      }),
      this.prisma.review.count(),
    ]);

    return {
      reviews,
      total,
      page,
      limit,
      hasMore: skip + reviews.length < total,
    };
  }

  async getBygameId(gameId: number) {
    const store = this.prisma.review.findMany({
      where: {
        gameId,
      },
      select: {
        user: {
          include: {
            avatar: true,
          },
        },
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
        user: {
          include: {
            avatar: true,
          },
        },
      },
    });
    if (!review) {
      throw new NotFoundException({
        message: 'Отзыв не найден или вы не являетесь его автором',
      });
    }
    return review;
  }

  async getByGameIdPaginated(gameId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { gameId: Number(gameId) },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            include: {
              avatar: true,
            },
          },
        },
      }),
      this.prisma.review.count({
        where: { gameId: Number(gameId) },
      }),
    ]);

    return {
      reviews,
      total,
      page,
      limit,
      hasMore: skip + reviews.length < total,
    };
  }

  // review.service.ts (бэк)
  async getStats(gameId?: number) {
    const where = gameId ? { gameId: Number(gameId) } : {};

    const [total, groups] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where,
        _count: { rating: true },
      }),
    ]);

    const sum = groups.reduce((acc, g) => acc + g.rating * g._count.rating, 0);
    const avgRating = total > 0 ? Math.round((sum / total) * 10) / 10 : null;

    const good = groups
      .filter((g) => g.rating >= 7)
      .reduce((acc, g) => acc + g._count.rating, 0);
    const average = groups
      .filter((g) => g.rating >= 4 && g.rating < 7)
      .reduce((acc, g) => acc + g._count.rating, 0);
    const bad = groups
      .filter((g) => g.rating < 4)
      .reduce((acc, g) => acc + g._count.rating, 0);

    return { total, avgRating, good, average, bad };
  }

  async create(dto: ReviewDto, gameId: number, userId: string) {
    return this.prisma.review.create({
      data: {
        ...dto,
        game: {
          connect: {
            id: Number(gameId),
          },
        },
        user: {
          connect: {
            id: userId,
          },
        },
      },
      include: {
        user: {
          include: {
            avatar: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    return this.prisma.review.delete({
      where: {
        id,
      },
    });
  }
}
