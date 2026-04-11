import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SideBannerDto } from './dto/side-banner.dto';

@Injectable()
export class SideBannerService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    const sideBanners = await this.prisma.sideBanner.findMany({});
    if (!sideBanners) {
      throw new NotFoundException({
        message: 'СайдБаннеры не найдены',
      });
    }
    return sideBanners;
  }

  async getById(id: number) {
    const sideBanner = await this.prisma.sideBanner.findUnique({
      where: {
        id: Number(id),
      },
    });
    if (!sideBanner) {
      throw new NotFoundException({
        message: 'Категория не найдена',
      });
    }
    return sideBanner;
  }

  async create(dto: SideBannerDto) {
    return this.prisma.sideBanner.create({
      data: {
        image: dto.image,
        link: dto.link || '',
      },
    });
  }

  async update(dto: SideBannerDto, id: number) {
    await this.getById(id);
    return this.prisma.sideBanner.update({
      where: {
        id: Number(id),
      },
      data: {
        image: dto.image,
        link: dto.link || '',
      },
    });
  }

  async delete(id: number) {
    await this.getById(id);
    return this.prisma.sideBanner.delete({
      where: {
        id: Number(id),
      },
    });
  }
}
