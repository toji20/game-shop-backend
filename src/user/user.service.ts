import { Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'argon2';
import { AuthDto } from './dto/auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        favorites: { include: { category: true } },
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
