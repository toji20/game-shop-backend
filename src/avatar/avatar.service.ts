import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AvatarDto } from './dto/avatar.dto';

@Injectable()
export class AvatarService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    return this.prisma.avatar.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string) {
    const avatar = await this.prisma.avatar.findUnique({
      where: { id },
    });
    if (!avatar) {
      throw new NotFoundException({ message: 'Аватар не найден' });
    }
    return avatar;
  }

  async create(dto: AvatarDto) {
    return this.prisma.avatar.create({
      data: { image: dto.image },
    });
  }

  async update(id: string, dto: AvatarDto) {
    await this.getById(id);
    return this.prisma.avatar.update({
      where: { id },
      data: { image: dto.image },
    });
  }

  async delete(id: string) {
    await this.getById(id);
    return this.prisma.avatar.delete({ where: { id } });
  }
}
