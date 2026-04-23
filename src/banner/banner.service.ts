import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { BannerDto } from './dto/banner.dto';

@Injectable()
export class BannerService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    const banners = await this.prisma.banner.findMany({});
    if (!banners) {
      throw new NotFoundException({
        message: 'Баннеры не найдены',
      });
    }
    return banners;
  }

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
        desktopImage: dto.desktopImage || '',
        mobileImage: dto.mobileImage || '',
        title: dto.title || '',
        description: dto.description || '',
        link: dto.link || '',
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
        desktopImage: dto.desktopImage || '',
        mobileImage: dto.mobileImage || '',
        title: dto.title || '',
        description: dto.description || '',
        link: dto.link || '',
      },
    });
  }

  async delete(id: number) {
    await this.getById(id);
    return this.prisma.banner.delete({
      where: {
        id: Number(id),
      },
    });
  }
}
