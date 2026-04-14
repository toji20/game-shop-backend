import { Injectable } from '@nestjs/common';
import { EnumOrderStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

const monthNames = [
  'янв',
  'фев',
  'мар',
  'апр',
  'май',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
];

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Главные метрики — карточки на дашборде
  // ---------------------------------------------------------------------------
  async getMainStatistics() {
    const [
      gameRevenue,
      steamRevenue,
      gameOrdersCount,
      steamOrdersCount,
      usersCount,
      averageRating,
    ] = await Promise.all([
      this.calculateGameRevenue(),
      this.calculateSteamRevenue(),
      this.countOrders(),
      this.countSteamOrders(),
      this.countUsers(),
      this.calculateAverageRating(),
    ]);

    const totalRevenue = gameRevenue + steamRevenue;
    const totalOrdersCount = gameOrdersCount + steamOrdersCount;
    const averageRevenue =
      totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;

    return [
      { id: 1, name: 'Общая выручка', value: totalRevenue },
      { id: 2, name: 'Средняя выручка с заказа', value: averageRevenue },
      { id: 3, name: 'Всего заказов', value: totalOrdersCount },
      { id: 4, name: 'Пользователей', value: usersCount },
      { id: 5, name: 'Средний рейтинг игр', value: averageRating ?? 0 },
    ];
  }

  // ---------------------------------------------------------------------------
  // Детальная аналитика — графики и таблицы
  // ---------------------------------------------------------------------------
  async getDetailedStatistics() {
    const [monthlySales, topGames, lastUsers] = await Promise.all([
      this.calculateMonthlySales(),
      this.getTopGames(),
      this.getLastUsers(),
    ]);

    return { monthlySales, topGames, lastUsers };
  }

  // ---------------------------------------------------------------------------
  // Приватные методы
  // ---------------------------------------------------------------------------

  // Выручка по игровым заказам
  private async calculateGameRevenue() {
    const result = await this.prisma.order.aggregate({
      where: { status: EnumOrderStatus.PAID },
      _sum: { total: true },
    });
    return Number(result._sum.total ?? 0);
  }

  // Выручка по Steam заказам
  private async calculateSteamRevenue() {
    const result = await this.prisma.steamOrder.aggregate({
      where: { status: EnumOrderStatus.PAID },
      _sum: { total: true },
    });
    return Number(result._sum.total ?? 0);
  }

  // Кол-во игровых заказов
  private async countOrders() {
    return this.prisma.order.count({
      where: { status: EnumOrderStatus.PAID },
    });
  }

  // Кол-во Steam заказов
  private async countSteamOrders() {
    return this.prisma.steamOrder.count({
      where: { status: EnumOrderStatus.PAID },
    });
  }

  // Кол-во пользователей
  private async countUsers() {
    return this.prisma.user.count();
  }

  // Средний рейтинг по всем играм
  private async calculateAverageRating() {
    const result = await this.prisma.review.aggregate({
      _avg: { rating: true },
    });
    return result._avg.rating ? Math.round(result._avg.rating * 10) / 10 : null;
  }

  // Продажи по дням за последние 30 дней (игры + Steam вместе)
  private async calculateMonthlySales() {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const [gameOrders, steamOrders] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          status: EnumOrderStatus.PAID,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { createdAt: true, total: true },
      }),
      this.prisma.steamOrder.findMany({
        where: {
          status: EnumOrderStatus.PAID,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { createdAt: true, total: true },
      }),
    ]);

    const formatDate = (date: Date): string =>
      `${date.getDate()} ${monthNames[date.getMonth()]}`;

    const salesByDate = new Map<string, number>();

    [...gameOrders, ...steamOrders].forEach((order) => {
      const key = formatDate(new Date(order.createdAt));
      salesByDate.set(key, (salesByDate.get(key) ?? 0) + Number(order.total));
    });

    return Array.from(salesByDate, ([date, value]) => ({ date, value })).sort(
      (a, b) => {
        const parse = (s: string) => {
          const [day, month] = s.split(' ');
          return monthNames.indexOf(month) * 31 + parseInt(day);
        };
        return parse(a.date) - parse(b.date);
      },
    );
  }

  // Топ 5 игр по количеству продаж
  private async getTopGames() {
    const result = await this.prisma.orderItem.groupBy({
      by: ['gameId'],
      where: { order: { status: EnumOrderStatus.PAID } },
      _count: { id: true },
      _sum: { price: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const games = await this.prisma.game.findMany({
      where: { id: { in: result.map((r) => r.gameId) } },
      select: { id: true, name: true, icon: true },
    });

    return result.map((r) => {
      const game = games.find((g) => g.id === r.gameId);
      return {
        gameId: r.gameId,
        name: game?.name ?? 'Неизвестно',
        image: game?.icon ?? null,
        ordersCount: r._count.id,
        revenue: Number(r._sum.price ?? 0),
      };
    });
  }

  // Последние 5 пользователей с суммой их трат
  private async getLastUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        picture: true,
        orders: {
          where: { status: EnumOrderStatus.PAID },
          select: { total: true },
        },
        steamOrders: {
          where: { status: EnumOrderStatus.PAID },
          select: { total: true },
        },
      },
    });

    return users.map((user) => {
      const totalSpent =
        user.orders.reduce((acc, o) => acc + Number(o.total), 0) +
        user.steamOrders.reduce((acc, o) => acc + Number(o.total), 0);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        totalSpent,
      };
    });
  }
}
