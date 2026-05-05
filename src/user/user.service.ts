import { Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'argon2';
import { AuthDto } from './dto/auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, Role } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        avatar: true,
        favorites: { include: { category: true } },
        steamOrders: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                position: true,
                game: true,
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException({ message: 'User not found' });
    return user;
  }

  async getByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        favorites: true,
        orders: true,
      },
    });
    return user;
  }

  async search(query: string) {
    const trimmed = query.trim();

    if (!trimmed) {
      return [];
    }

    const where: Prisma.UserWhereInput = {
      OR: [
        { id: { equals: trimmed } },
        { email: { contains: trimmed, mode: 'insensitive' } },
        { name: { contains: trimmed, mode: 'insensitive' } },
      ],
    };

    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        _count: {
          select: {
            orders: true,
            steamOrders: true,
            favorites: true,
          },
        },
      },
    });
  }

  async updateRole(id: string, role: Role) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException({ message: 'User not found' });
    }

    return this.prisma.user.update({
      where: { id },
      data: { role },
    });
  }

  async updateAvatar(userId: string, avatarId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarId },
    });
  }

  async toogleFavorite(gameId: number, userId: string) {
    const user = await this.getById(userId);
    const isExists = user.favorites.some((game) => game.id === gameId);

    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        favorites: {
          [isExists ? 'disconnect' : 'connect']: {
            id: gameId,
          },
        },
      },
    });

    return true;
  }

  async create(dto: AuthDto) {
    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: await hash(dto.password),
        role: dto.role || Role.USER,
      },
    });
  }
}
