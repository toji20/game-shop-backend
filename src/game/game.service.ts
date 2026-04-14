import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GameDto } from 'src/game/dto/game.dto';

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService) {}

  private withAvgRating<T extends { reviews: { rating: number }[] }>(
    games: T[],
  ) {
    return games.map((g) => ({
      ...g,
      avgRating: g.reviews.length
        ? Math.round(
            (g.reviews.reduce((acc, r) => acc + r.rating, 0) /
              g.reviews.length) *
              10,
          ) / 10
        : null,
    }));
  }

  async getAll() {
    return this.prisma.game.findMany({
      orderBy: { createdAt: 'desc' },
      include: { category: true },
    });
  }

  async getAllActive() {
    const games = await this.prisma.game.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        reviews: {
          select: {
            rating: true,
          },
        },
      },
    });
    return this.withAvgRating(games);
  }

  // ── Популярные игры — по количеству заказов ────────────────────────────
  async getPopular(limit = 10) {
    const games = await this.prisma.game.findMany({
      where: { isActive: true },
      include: {
        category: true,
        // считаем количество OrderItem через позиции
        positions: {
          include: {
            _count: { select: { orderItems: true } },
          },
        },
        reviews: {
          select: { rating: true },
        },
      },
    });

    return games
      .map((game) => {
        const ordersCount = game.positions.reduce(
          (acc, pos) => acc + pos._count.orderItems,
          0,
        );

        // средний рейтинг
        const avgRating = game.reviews.length
          ? game.reviews.reduce((acc, r) => acc + r.rating, 0) /
            game.reviews.length
          : null;

        return {
          ...game,
          ordersCount,
          avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        };
      })
      .sort((a, b) => b.ordersCount - a.ordersCount)
      .slice(0, limit);
  }

  async getById(id: number) {
    const game = await this.prisma.game.findUnique({
      where: { id: Number(id) },
      include: {
        category: true,
        reviews: {
          include: { user: true },
        },
        positions: true,
        fields: true,
      },
    });

    if (!game) return null;

    // Средний рейтинг
    const avgRating = game.reviews.length
      ? game.reviews.reduce((acc, r) => acc + r.rating, 0) / game.reviews.length
      : null;

    return {
      ...game,
      avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      reviewsCount: game.reviews.length,
    };
  }

  async getBySlug(slug: string) {
    const game = await this.prisma.game.findUnique({
      where: {
        slug: slug,
      },
      include: {
        category: true,
        reviews: {
          include: { user: true },
          orderBy: {
            createdAt: 'desc',
          },
        },
        positions: true,
        fields: true,
      },
    });

    if (!game) return null;

    // Средний рейтинг
    const avgRating = game.reviews.length
      ? game.reviews.reduce((acc, r) => acc + r.rating, 0) / game.reviews.length
      : null;

    return {
      ...game,
      avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      reviewsCount: game.reviews.length,
    };
  }

  async create(dto: GameDto) {
    return this.prisma.game.create({
      data: {
        name: dto.name,
        slug: dto.slug ?? '',
        decription: dto.description ?? '',
        isActive: dto.isActive ?? true,
        categoryId: dto.categoryId || null,
        icon: dto.icon ?? null,
        iconWide: dto.iconWide ?? null,
        bgDesktop: dto.bgDesktop ?? null,
        bgMobile: dto.bgMobile ?? null,
        ageLimit: dto.ageLimit ?? '',
        genre: dto.genre ?? '',
        releaseDate: dto.releaseDate ?? '',
        instructions: dto.instructions ?? [],
        type: dto.type,
        faq: dto.faq ?? [],
      },
    });
  }

  async update(id: number, dto: GameDto) {
    return this.prisma.game.update({
      where: { id: Number(id) },
      data: {
        name: dto.name,
        slug: dto.slug ?? '',
        decription: dto.description ?? '',
        isActive: dto.isActive,
        ageLimit: dto.ageLimit ?? '',
        genre: dto.genre ?? '',
        releaseDate: dto.releaseDate ?? '',
        instructions: dto.instructions ?? [],
        categoryId: dto.categoryId || null,
        icon: dto.icon ?? null,
        iconWide: dto.iconWide ?? null,
        bgDesktop: dto.bgDesktop ?? null,
        bgMobile: dto.bgMobile ?? null,
        type: dto.type,
        faq: dto.faq ?? [],
      },
    });
  }

  async delete(id: number) {
    return this.prisma.game.delete({
      where: { id: Number(id) },
      include: {
        positions: true,
        reviews: true,
      },
    });
  }
}
