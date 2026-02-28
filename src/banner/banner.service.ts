import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BannerDto } from './dto/banner.dto';

@Injectable()
export class BannerService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: number) {
    const banner = await this.prisma.banner.findUnique({
      where: {
        id: Number(id),
      },
    });
    if (!banner) {
      throw new NotFoundException({
        message: 'Категория не найдена',
      });
    }
    return banner;
  }

  async create(dto: BannerDto) {
    return this.prisma.banner.create({
      data: {
        images: dto.images,
        title: dto.title || '',
        description: dto.description || '',
      },
    });
  }

  async update(dto: BannerDto, id: number) {
    await this.getById(id);
    return this.prisma.banner.update({
      where: {
        id: Number(id),
      },
      data: {
        images: dto.images,
        title: dto.title || '',
        description: dto.description || '',
      },
    });
  }

  async delete(id: number) {
    await this.getById(id);
    return this.prisma.banner.delete({
      where: {
        id: id,
      },
    });
  }
}
